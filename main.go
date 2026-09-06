package main

import (
	"context"
	"io"
	"log/slog"
	"os"
	"runtime/debug"

	urfavecli "github.com/urfave/cli/v3"

	"github.com/yashikota/kotowari/internal/appdir"
	"github.com/yashikota/kotowari/internal/cli"
	"github.com/yashikota/kotowari/internal/term"
)

var Version string

func main() {
	setupLog()

	err := cli.Run(context.Background(), os.Args, os.Stdout, os.Stderr, getVersion())
	if err == nil {
		return
	}
	if ec, ok := err.(urfavecli.ExitCoder); ok {
		if msg := err.Error(); msg != "" {
			term.For(os.Stderr).Error(os.Stderr, "%s\n", msg)
		}
		os.Exit(ec.ExitCode())
	}
	term.For(os.Stderr).Error(os.Stderr, "command failed: %v\n", err)
	slog.Error("command failed", "err", err)
	os.Exit(1)
}

func setupLog() {
	f, err := appdir.OpenLog()
	if err != nil {
		slog.SetDefault(slog.New(slog.NewTextHandler(io.Discard, nil)))
		return
	}
	// Closed on process exit; kotowari is a short-lived CLI / long-lived serve child.
	slog.SetDefault(slog.New(slog.NewTextHandler(f, &slog.HandlerOptions{})))
}

func getVersion() string {
	if Version != "" {
		return Version
	}

	if info, ok := debug.ReadBuildInfo(); ok {
		if info.Main.Version != "(devel)" && info.Main.Version != "" {
			return info.Main.Version
		}
		if v, ok := getVCSBuildVersion(info); ok {
			return v
		}
	}

	return "(unset)"
}

func getVCSBuildVersion(info *debug.BuildInfo) (string, bool) {
	var (
		revision string
		dirty    string
	)

	for _, v := range info.Settings {
		switch v.Key {
		case "vcs.revision":
			revision = v.Value
		case "vcs.modified":
			if v.Value == "true" {
				dirty = " (dirty)"
			}
		}
	}

	if revision == "" {
		return "", false
	}

	return revision + dirty, true
}
