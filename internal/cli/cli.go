package cli

import (
	"context"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	urfavecli "github.com/urfave/cli/v3"

	"github.com/yashikota/kotowari/internal/appdir"
	"github.com/yashikota/kotowari/internal/domain"
	"github.com/yashikota/kotowari/internal/httpapi"
	"github.com/yashikota/kotowari/internal/store"
	"github.com/yashikota/kotowari/internal/syncer"
	"github.com/yashikota/kotowari/internal/term"
	"github.com/yashikota/kotowari/internal/webembed"
	"github.com/yashikota/kotowari/skills"
)

func Run(ctx context.Context, osArgs []string, stdout, stderr io.Writer, version string) error {
	if len(osArgs) == 0 {
		osArgs = []string{"kotowari"}
	} else {
		base := filepath.Base(osArgs[0])
		if base == "kotowari" || base == "kotowari.exe" {
			osArgs[0] = "kotowari"
		} else {
			osArgs = append([]string{"kotowari"}, osArgs...)
		}
	}

	prevPrinter := urfavecli.VersionPrinter
	urfavecli.VersionPrinter = func(c *urfavecli.Command) {
		fmt.Fprintln(c.Root().Writer, c.Version)
	}
	defer func() { urfavecli.VersionPrinter = prevPrinter }()

	root := newRootCommand(stdout, stderr, version)
	root.ExitErrHandler = func(_ context.Context, _ *urfavecli.Command, _ error) {}
	return root.Run(ctx, osArgs)
}

func newRootCommand(stdout, stderr io.Writer, version string) *urfavecli.Command {
	return &urfavecli.Command{
		Name:           "kotowari",
		Usage:          "personal local issue and ADR workspace",
		Description:    "One-person workspace in ./.kotowari (override with KOTOWARI_HOME). Issues and ADRs are separate. No teams or assignees.",
		Writer:         stdout,
		ErrWriter:      stderr,
		Version:        version,
		DefaultCommand: "help",
		ExtraInfo: func() map[string]string {
			return map[string]string{
				"Daily use (Task)":   "task serve / task stop",
				"Development (Task)": "task dev",
			}
		},
		Commands: []*urfavecli.Command{
			{
				Name:  "init",
				Usage: "create .kotowari/ in the current directory",
				Action: func(_ context.Context, _ *urfavecli.Command) error {
					return cmdInit(stdout)
				},
			},
			{
				Name:  "serve",
				Usage: "JSON API and UI (background by default)",
				Flags: []urfavecli.Flag{
					&urfavecli.StringFlag{
						Name:  "addr",
						Value: "127.0.0.1:7730",
						Usage: "listen address",
					},
					&urfavecli.BoolFlag{
						Name:    "foreground",
						Aliases: []string{"fg"},
						Usage:   "run in foreground (also set by re-exec)",
					},
					&urfavecli.BoolFlag{
						Name:  "strict-port",
						Usage: "fail if port is in use instead of trying the next port",
					},
				},
				Action: func(ctx context.Context, c *urfavecli.Command) error {
					return cmdServe(ctx, c.String("addr"), c.Bool("foreground"), c.Bool("strict-port"), c.ErrWriter)
				},
			},
			{
				Name:  "stop",
				Usage: "stop background kotowari serve",
				Action: func(_ context.Context, _ *urfavecli.Command) error {
					return cmdStop(stdout)
				},
			},
			{
				Name:  "push",
				Usage: "snapshot workspace to GHCR",
				Action: func(ctx context.Context, _ *urfavecli.Command) error {
					return cmdPush(ctx, stdout, version)
				},
			},
			{
				Name:  "pull",
				Usage: "restore workspace from GHCR",
				Flags: []urfavecli.Flag{
					&urfavecli.StringFlag{
						Name:  "tag",
						Value: "latest",
						Usage: "artifact tag",
					},
				},
				Action: func(ctx context.Context, c *urfavecli.Command) error {
					return cmdPull(ctx, c.String("tag"), stdout, c.ErrWriter)
				},
			},
			{
				Name:  "status",
				Usage: "show path, dirty state, last digest",
				Action: func(_ context.Context, _ *urfavecli.Command) error {
					return cmdStatus(stdout)
				},
			},
			{
				Name:  "check",
				Usage: "list semantic file issues",
				Action: func(_ context.Context, _ *urfavecli.Command) error {
					return cmdCheck(stdout)
				},
			},
			{
				Name:  "list",
				Usage: "list issues and ADRs",
				Flags: []urfavecli.Flag{
					&urfavecli.BoolFlag{Name: "issues", Usage: "list issues"},
					&urfavecli.BoolFlag{Name: "adr", Aliases: []string{"adrs"}, Usage: "list ADRs"},
					&urfavecli.BoolFlag{Name: "long", Aliases: []string{"l"}, Usage: "show status and date"},
					&urfavecli.StringFlag{Name: "status", Usage: "filter by status"},
				},
				Action: func(_ context.Context, c *urfavecli.Command) error {
					return cmdList(stdout, c.Bool("issues"), c.Bool("adr"), c.Bool("long"), c.String("status"))
				},
			},
			{
				Name:  "adr",
				Usage: "architecture decision records",
				Commands: []*urfavecli.Command{
					{
						Name:      "new",
						Usage:     "create an ADR",
						ArgsUsage: "<title>",
						Flags: []urfavecli.Flag{
							&urfavecli.IntFlag{Name: "supersedes", Usage: "ADR number this replaces"},
							&urfavecli.StringFlag{Name: "status", Usage: "initial status"},
							&urfavecli.IntFlag{Name: "issue", Usage: "link an issue number"},
						},
						Action: func(_ context.Context, c *urfavecli.Command) error {
							return cmdADRNew(stdout, strings.Join(c.Args().Slice(), " "), int(c.Int("supersedes")), c.String("status"), int(c.Int("issue")))
						},
					},
					{
						Name:      "status",
						Usage:     "change an ADR status",
						ArgsUsage: "<id> <status>",
						Flags: []urfavecli.Flag{
							&urfavecli.IntFlag{Name: "by", Usage: "successor ADR number when marking superseded"},
						},
						Action: func(_ context.Context, c *urfavecli.Command) error {
							args := c.Args().Slice()
							id, st := "", ""
							if len(args) > 0 {
								id = args[0]
							}
							if len(args) > 1 {
								st = args[1]
							}
							return cmdADRSetStatus(stdout, id, st, int(c.Int("by")))
						},
					},
					{
						Name:  "generate",
						Usage: "generate ADR documentation",
						Commands: []*urfavecli.Command{
							{
								Name:  "toc",
								Usage: "print a markdown table of contents",
								Action: func(_ context.Context, _ *urfavecli.Command) error {
									return cmdADRGenerate(stdout, "toc")
								},
							},
							{
								Name:  "graph",
								Usage: "print a mermaid graph of supersede links",
								Action: func(_ context.Context, _ *urfavecli.Command) error {
									return cmdADRGenerate(stdout, "graph")
								},
							},
						},
					},
					{
						Name:      "export",
						Usage:     "print PUBLISH.md to stdout",
						ArgsUsage: "<id>",
						Action: func(_ context.Context, c *urfavecli.Command) error {
							return cmdADRExport(stdout, c.Args().First())
						},
					},
				},
			},
			{
				Name:  "version",
				Usage: "print build version",
				Action: func(_ context.Context, c *urfavecli.Command) error {
					fmt.Fprintln(c.Root().Writer, version)
					return nil
				},
			},
		},
	}
}

func openStore() (*store.Store, error) {
	root, err := appdir.Home()
	if err != nil {
		return nil, err
	}
	if !appdir.Initialized(root) {
		return nil, fmt.Errorf("workspace not found at %s (run kotowari init)", root)
	}
	st, err := store.Open(root)
	if err != nil {
		return nil, fmt.Errorf("open %s: %w", root, err)
	}
	return st, nil
}

func cmdInit(stdout io.Writer) error {
	root, err := appdir.Home()
	if err != nil {
		return err
	}
	if appdir.Initialized(root) {
		return fmt.Errorf("already initialized: %s", root)
	}
	st, err := store.Open(root)
	if err != nil {
		return err
	}
	defer func() { _ = st.Close() }()
	if err := copyProductSkills(root); err != nil {
		return err
	}
	term.For(stdout).Success(stdout, "initialized %s\n", root)
	return nil
}

func copyProductSkills(workspaceRoot string) error {
	destBase := workspaceRoot
	if filepath.Base(workspaceRoot) == ".kotowari" {
		destBase = filepath.Dir(workspaceRoot)
	}
	dest := filepath.Join(destBase, ".agents", "skills")
	return fs.WalkDir(skills.FS, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if path == "." {
			return nil
		}
		target := filepath.Join(dest, path)
		if d.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		b, err := skills.FS.ReadFile(path)
		if err != nil {
			return err
		}
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		return os.WriteFile(target, b, 0o644)
	})
}

func cmdADRExport(stdout io.Writer, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return fmt.Errorf("usage: kotowari adr export <id>")
	}
	st, err := openStore()
	if err != nil {
		return err
	}
	defer func() { _ = st.Close() }()
	adr, err := st.GetADR(id)
	if err != nil {
		return err
	}
	if strings.TrimSpace(adr.PublishBody) == "" {
		return fmt.Errorf("%s has no PUBLISH.md yet", adr.Identifier)
	}
	if _, err := fmt.Fprint(stdout, adr.PublishBody); err != nil {
		return err
	}
	if !strings.HasSuffix(adr.PublishBody, "\n") {
		_, err = fmt.Fprintln(stdout)
	}
	return err
}

func cmdServe(ctx context.Context, addr string, foreground, strictPort bool, stderr io.Writer) error {
	foreground = foreground || os.Getenv(serveChildEnv) == "1"
	if !foreground {
		return spawnServeBackground()
	}

	st, err := openStore()
	if err != nil {
		return err
	}
	defer func() { _ = st.Close() }()
	h := httpapi.New(st, webembed.Dist())
	defer h.Close()
	styl := term.For(stderr)
	warn := func(msg string) { styl.Warn(stderr, "kotowari: %s\n", msg) }
	ln, listenAddr, err := listenTCP(addr, strictPort, warn)
	if err != nil {
		return err
	}
	srv := &http.Server{
		Handler:           h,
		ReadHeaderTimeout: 5 * time.Second,
		BaseContext:       func(net.Listener) context.Context { return ctx },
	}
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()
	styl.Listen(stderr, "http://"+listenAddr)
	err = srv.Serve(ln)
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}

func newService(st *store.Store, version string, warn func(string)) (*syncer.Service, error) {
	token, err := syncer.GitHubToken()
	if err != nil {
		return nil, err
	}
	return &syncer.Service{
		Store:    st,
		Registry: &syncer.ORAS{Token: token},
		Version:  version,
		Warn:     warn,
	}, nil
}

func cmdPush(ctx context.Context, stdout io.Writer, version string) error {
	st, err := openStore()
	if err != nil {
		return err
	}
	defer func() { _ = st.Close() }()
	svc, err := newService(st, version, nil)
	if err != nil {
		return err
	}
	tag, digest, err := svc.Push(ctx)
	if err != nil {
		return err
	}
	term.For(stdout).Success(stdout, "pushed %s (%s)\n", tag, digest)
	return nil
}

func cmdPull(ctx context.Context, tag string, stdout, stderr io.Writer) error {
	st, err := openStore()
	if err != nil {
		return err
	}
	svc, err := newService(st, "", func(msg string) {
		term.For(stderr).Warn(stderr, "%s\n", msg)
	})
	if err != nil {
		_ = st.Close()
		return err
	}
	if err := svc.Pull(ctx, tag); err != nil {
		_ = st.Close()
		return err
	}
	term.For(stdout).Success(stdout, "pulled %s into %s\n", tag, st.Path())
	return nil
}

func cmdStatus(stdout io.Writer) error {
	st, err := openStore()
	if err != nil {
		return err
	}
	defer func() { _ = st.Close() }()
	ws, err := st.Workspace()
	if err != nil {
		return err
	}
	dirty, err := st.Dirty()
	if err != nil {
		return err
	}
	digest := ""
	if ws.LastPushedDigest != nil {
		digest = *ws.LastPushedDigest
	}
	styl := term.For(stdout)
	styl.Label(stdout, "path", st.Path())
	styl.Label(stdout, "name", ws.Name)
	styl.Label(stdout, "ghcr", ws.GHCRRef)
	styl.Bool(stdout, "dirty", dirty)
	styl.Label(stdout, "digest", digest)
	return nil
}

func cmdCheck(stdout io.Writer) error {
	st, err := openStore()
	if err != nil {
		return err
	}
	defer func() { _ = st.Close() }()
	diags, err := st.Diagnostics()
	if err != nil {
		return err
	}
	if len(diags) == 0 {
		term.For(stdout).Success(stdout, "ok\n")
		return nil
	}
	styl := term.For(stdout)
	for _, d := range diags {
		styl.Error(stdout, "%s: %s\n", d.Path, d.Message)
	}
	return fmt.Errorf("check failed: %d issue(s)", len(diags))
}

func cmdList(stdout io.Writer, issues, adrs, long bool, status string) error {
	if !issues && !adrs {
		issues, adrs = true, true
	}
	st, err := openStore()
	if err != nil {
		return err
	}
	defer func() { _ = st.Close() }()
	if issues {
		list, err := st.ListIssues(store.IssueFilter{Status: status})
		if err != nil {
			return err
		}
		sort.Slice(list, func(i, j int) bool { return list[i].Number < list[j].Number })
		for _, iss := range list {
			printListLine(stdout, iss.Identifier, iss.Status, iss.CreatedAt, iss.Title, long)
		}
	}
	if adrs {
		list, err := st.ListADRs()
		if err != nil {
			return err
		}
		sort.Slice(list, func(i, j int) bool { return list[i].Number < list[j].Number })
		for _, a := range list {
			if status != "" && a.Status != status {
				continue
			}
			printListLine(stdout, a.Identifier, a.Status, a.CreatedAt, a.Title, long)
		}
	}
	return nil
}

func printListLine(stdout io.Writer, ident, status, created, title string, long bool) {
	if !long {
		fmt.Fprintf(stdout, "%s - %s\n", ident, title)
		return
	}
	day := created
	if len(day) >= 10 {
		day = day[:10]
	}
	fmt.Fprintf(stdout, "%s\t%s\t%s\t%s\n", ident, status, day, title)
}

func cmdADRNew(stdout io.Writer, title string, supersedes int, status string, issue int) error {
	title = strings.TrimSpace(title)
	if title == "" {
		return fmt.Errorf("usage: kotowari adr new <title>")
	}
	st, err := openStore()
	if err != nil {
		return err
	}
	defer func() { _ = st.Close() }()
	in := store.CreateADRInput{Title: title, Status: status}
	if supersedes > 0 {
		in.Supersedes = &supersedes
	}
	if issue > 0 {
		in.IssueNumbers = []int{issue}
	}
	adr, err := st.CreateADR(in)
	if err != nil {
		return err
	}
	fmt.Fprintf(stdout, "%s\nadr/%s/README.md\n", adr.Identifier, domain.DirName(adr.Number))
	return nil
}

func cmdADRSetStatus(stdout io.Writer, id, status string, by int) error {
	id = strings.TrimSpace(id)
	status = strings.TrimSpace(status)
	if id == "" || status == "" {
		return fmt.Errorf("usage: kotowari adr status <id> <status>")
	}
	st, err := openStore()
	if err != nil {
		return err
	}
	defer func() { _ = st.Close() }()
	if by > 0 {
		old, err := st.GetADR(id)
		if err != nil {
			return err
		}
		n := old.Number
		sp := &n
		if _, err := st.UpdateADR(strconv.Itoa(by), store.PatchADRInput{Supersedes: &sp}); err != nil {
			return err
		}
	}
	in := store.PatchADRInput{Status: &status}
	out, err := st.UpdateADR(id, in)
	if err != nil {
		return err
	}
	fmt.Fprintf(stdout, "%s\t%s\n", out.Identifier, out.Status)
	return nil
}

func cmdADRGenerate(stdout io.Writer, kind string) error {
	st, err := openStore()
	if err != nil {
		return err
	}
	defer func() { _ = st.Close() }()
	list, err := st.ListADRs()
	if err != nil {
		return err
	}
	sort.Slice(list, func(i, j int) bool { return list[i].Number < list[j].Number })
	switch kind {
	case "toc":
		fmt.Fprint(stdout, store.RenderADRTOC(list))
	case "graph":
		fmt.Fprint(stdout, store.RenderADRGraph(list))
	default:
		return fmt.Errorf("unknown generate %s", kind)
	}
	return nil
}
