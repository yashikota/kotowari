package cli

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"time"

	urfavecli "github.com/urfave/cli/v3"

	"github.com/yashikota/kotowari/internal/appdir"
	"github.com/yashikota/kotowari/internal/httpapi"
	"github.com/yashikota/kotowari/internal/store"
	"github.com/yashikota/kotowari/internal/syncer"
	"github.com/yashikota/kotowari/internal/term"
	"github.com/yashikota/kotowari/internal/webembed"
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
		Usage:          "personal local issue tracker",
		Description:    "One-person workspace in ./.kotowari (override with KOTOWARI_HOME). No teams or assignees.",
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
	term.For(stdout).Success(stdout, "initialized %s\n", root)
	return nil
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
