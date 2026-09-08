package cli_test

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/yashikota/kotowari/internal/cli"
	"github.com/yashikota/kotowari/internal/store"
)

func TestADRNewStatusGenerateAndList(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("KOTOWARI_HOME", dir)
	if err := cli.Run(context.Background(), []string{"kotowari", "init"}, ioDiscard{}, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	var stdout bytes.Buffer
	if err := cli.Run(context.Background(), []string{"kotowari", "adr", "new", "postgres"}, &stdout, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(stdout.String(), "ADR-1") {
		t.Fatalf("new %q", stdout.String())
	}

	stdout.Reset()
	if err := cli.Run(context.Background(), []string{"kotowari", "adr", "new", "--supersedes", "1", "mysql"}, &stdout, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(stdout.String(), "ADR-2") {
		t.Fatalf("supersede new %q", stdout.String())
	}

	st, err := store.Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	old, err := st.GetADR("ADR-1")
	if err != nil {
		t.Fatal(err)
	}
	if old.Status != "superseded" {
		t.Fatalf("old status %s", old.Status)
	}
	_ = st.Close()

	stdout.Reset()
	if err := cli.Run(context.Background(), []string{"kotowari", "adr", "status", "2", "accepted"}, &stdout, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}

	stdout.Reset()
	if err := cli.Run(context.Background(), []string{"kotowari", "list", "--adr", "--status", "accepted", "--long"}, &stdout, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	out := stdout.String()
	if !strings.Contains(out, "ADR-2") || !strings.Contains(out, "accepted") || !strings.Contains(out, "mysql") {
		t.Fatalf("long list %q", out)
	}
	if strings.Contains(out, "ADR-1") {
		t.Fatalf("status filter leaked superseded: %q", out)
	}

	stdout.Reset()
	if err := cli.Run(context.Background(), []string{"kotowari", "adr", "new", "sqlite"}, &stdout, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	stdout.Reset()
	if err := cli.Run(context.Background(), []string{"kotowari", "adr", "status", "2", "superseded", "--by", "3"}, &stdout, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}

	stdout.Reset()
	if err := cli.Run(context.Background(), []string{"kotowari", "adr", "generate", "toc"}, &stdout, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(stdout.String(), "ADR-1") || !strings.Contains(stdout.String(), "README.md") {
		t.Fatalf("toc %q", stdout.String())
	}

	stdout.Reset()
	if err := cli.Run(context.Background(), []string{"kotowari", "adr", "generate", "graph"}, &stdout, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(stdout.String(), "flowchart") || !strings.Contains(stdout.String(), "supersedes") {
		t.Fatalf("graph %q", stdout.String())
	}
}

func TestADRNewRequiresTitle(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("KOTOWARI_HOME", dir)
	if err := cli.Run(context.Background(), []string{"kotowari", "init"}, ioDiscard{}, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	err := cli.Run(context.Background(), []string{"kotowari", "adr", "new"}, ioDiscard{}, ioDiscard{}, "test")
	if err == nil {
		t.Fatal("expected usage error")
	}
}

func TestADRNewIssueAndRejectedStatus(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("KOTOWARI_HOME", dir)
	if err := cli.Run(context.Background(), []string{"kotowari", "init"}, ioDiscard{}, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	st, err := store.Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := st.CreateIssue(store.CreateIssueInput{Title: "work"}); err != nil {
		t.Fatal(err)
	}
	_ = st.Close()

	var stdout bytes.Buffer
	if err := cli.Run(context.Background(), []string{"kotowari", "adr", "new", "--issue", "1", "--status", "rejected", "no cache"}, &stdout, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(stdout.String(), "ADR-1") || !strings.Contains(stdout.String(), "adr/00001/README.md") {
		t.Fatalf("new %q", stdout.String())
	}
	st, err = store.Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	adr, err := st.GetADR("ADR-1")
	if err != nil {
		t.Fatal(err)
	}
	_ = st.Close()
	if adr.Status != "rejected" || len(adr.IssueNumbers) != 1 || adr.IssueNumbers[0] != 1 {
		t.Fatalf("adr %#v", adr)
	}
}

func TestADRStatusRequiresArgs(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("KOTOWARI_HOME", dir)
	if err := cli.Run(context.Background(), []string{"kotowari", "init"}, ioDiscard{}, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	if err := cli.Run(context.Background(), []string{"kotowari", "adr", "new", "x"}, ioDiscard{}, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	err := cli.Run(context.Background(), []string{"kotowari", "adr", "status"}, ioDiscard{}, ioDiscard{}, "test")
	if err == nil {
		t.Fatal("expected usage error")
	}
	err = cli.Run(context.Background(), []string{"kotowari", "adr", "status", "1", "draft"}, ioDiscard{}, ioDiscard{}, "test")
	if err == nil {
		t.Fatal("expected invalid status")
	}
}

func TestADRGenerateEmptyWorkspace(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("KOTOWARI_HOME", dir)
	if err := cli.Run(context.Background(), []string{"kotowari", "init"}, ioDiscard{}, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	var stdout bytes.Buffer
	if err := cli.Run(context.Background(), []string{"kotowari", "adr", "generate", "toc"}, &stdout, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	if stdout.String() != "" {
		t.Fatalf("empty toc %q", stdout.String())
	}
	stdout.Reset()
	if err := cli.Run(context.Background(), []string{"kotowari", "adr", "generate", "graph"}, &stdout, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	if stdout.String() != "flowchart LR\n" {
		t.Fatalf("empty graph %q", stdout.String())
	}
}

func TestADRHelpListsSubcommands(t *testing.T) {
	var stdout bytes.Buffer
	if err := cli.Run(context.Background(), []string{"kotowari", "adr", "--help"}, &stdout, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	out := stdout.String()
	for _, want := range []string{"new", "status", "generate", "export"} {
		if !strings.Contains(out, want) {
			t.Fatalf("help missing %s: %s", want, out)
		}
	}
}

func TestCheckReportsDanglingSupersedes(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("KOTOWARI_HOME", dir)
	if err := cli.Run(context.Background(), []string{"kotowari", "init"}, ioDiscard{}, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	st, err := store.Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	adr, err := st.CreateADR(store.CreateADRInput{Title: "ghost"})
	if err != nil {
		t.Fatal(err)
	}
	_ = st.Close()
	md := "+++\ntitle = 'ghost'\nstatus = 'proposed'\nsupersedes = 9\ncreated = '" + adr.CreatedAt + "'\nupdated = '" + adr.UpdatedAt + "'\n+++\n\n"
	if err := os.WriteFile(filepath.Join(dir, "adr", "00001", "README.md"), []byte(md), 0o644); err != nil {
		t.Fatal(err)
	}
	var stdout bytes.Buffer
	err = cli.Run(context.Background(), []string{"kotowari", "check"}, &stdout, ioDiscard{}, "test")
	if err == nil {
		t.Fatal("expected check failure")
	}
	if !strings.Contains(stdout.String(), "unknown ADR") {
		t.Fatalf("check %q err=%v", stdout.String(), err)
	}
}
