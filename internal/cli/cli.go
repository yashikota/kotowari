package cli

import (
	"context"
	"fmt"
	"io"
	"net"
	"path/filepath"
	"strconv"
	"strings"

	urfavecli "github.com/urfave/cli/v3"
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
						Value: net.JoinHostPort(defaultServeHost, strconv.Itoa(defaultServePort)),
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
				Name:  "status",
				Usage: "show workspace path and name",
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
