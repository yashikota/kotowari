package cli_test

import (
	"bytes"
	"context"
	"strings"
	"testing"

	"github.com/yashikota/kotowari/internal/cli"
	"github.com/yashikota/kotowari/internal/store"
)

func TestListIssuesAndADRs(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("KOTOWARI_HOME", dir)
	if err := cli.Run(context.Background(), []string{"kotowari", "init"}, ioDiscard{}, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	st, err := store.Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := st.CreateIssue(store.CreateIssueInput{Title: "cache work", Status: "todo"}); err != nil {
		t.Fatal(err)
	}
	if _, err := st.CreateIssue(store.CreateIssueInput{Title: "done work", Status: "done"}); err != nil {
		t.Fatal(err)
	}
	if _, err := st.CreateADR(store.CreateADRInput{Title: "local cache"}); err != nil {
		t.Fatal(err)
	}
	_ = st.Close()

	var stdout bytes.Buffer
	if err := cli.Run(context.Background(), []string{"kotowari", "list", "--issues"}, &stdout, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(stdout.String(), "ISS-1 - cache work") {
		t.Fatalf("issues list %q", stdout.String())
	}
	if strings.Contains(stdout.String(), "ADR-1") {
		t.Fatalf("issues list leaked ADR: %q", stdout.String())
	}

	stdout.Reset()
	if err := cli.Run(context.Background(), []string{"kotowari", "list", "--adr"}, &stdout, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(stdout.String(), "ADR-1 - local cache") {
		t.Fatalf("adr list %q", stdout.String())
	}
	if strings.Contains(stdout.String(), "ISS-1") {
		t.Fatalf("adr list leaked issue: %q", stdout.String())
	}

	stdout.Reset()
	if err := cli.Run(context.Background(), []string{"kotowari", "list", "--issues", "--long"}, &stdout, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(stdout.String(), "ISS-1") || !strings.Contains(stdout.String(), "todo") {
		t.Fatalf("long issues %q", stdout.String())
	}

	stdout.Reset()
	if err := cli.Run(context.Background(), []string{"kotowari", "list", "--issues", "--status", "todo"}, &stdout, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(stdout.String(), "cache work") || strings.Contains(stdout.String(), "done work") {
		t.Fatalf("status filter %q", stdout.String())
	}

	stdout.Reset()
	if err := cli.Run(context.Background(), []string{"kotowari", "list"}, &stdout, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	out := stdout.String()
	if !strings.Contains(out, "ISS-1 - cache work") || !strings.Contains(out, "ADR-1 - local cache") {
		t.Fatalf("combined list %q", out)
	}
}

func TestHelpListsListCommand(t *testing.T) {
	var stdout bytes.Buffer
	if err := cli.Run(context.Background(), []string{"kotowari", "help"}, &stdout, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(stdout.String(), "list") {
		t.Fatalf("help missing list: %s", stdout.String())
	}
}
