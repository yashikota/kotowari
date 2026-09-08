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

func TestHelpListsADRExport(t *testing.T) {
	var stdout bytes.Buffer
	if err := cli.Run(context.Background(), []string{"kotowari", "help"}, &stdout, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(stdout.String(), "adr") {
		t.Fatalf("help missing adr: %s", stdout.String())
	}
}

func TestADRExportPrintsPublishBody(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("KOTOWARI_HOME", dir)
	if err := cli.Run(context.Background(), []string{"kotowari", "init"}, ioDiscard{}, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	st, err := store.Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := st.CreateADR(store.CreateADRInput{Title: "cache"}); err != nil {
		t.Fatal(err)
	}
	var stdout bytes.Buffer
	err = cli.Run(context.Background(), []string{"kotowari", "adr", "export", "1"}, &stdout, ioDiscard{}, "test")
	if err == nil {
		t.Fatal("expected export without PUBLISH.md to fail")
	}
	if _, err := st.PublishADR("ADR-1"); err != nil {
		t.Fatal(err)
	}
	_ = st.Close()
	stdout.Reset()
	if err := cli.Run(context.Background(), []string{"kotowari", "adr", "export", "ADR-1"}, &stdout, ioDiscard{}, "test"); err != nil {
		t.Fatalf("export: %v", err)
	}
	if !strings.Contains(stdout.String(), "## Decision Outcome") {
		t.Fatalf("export body %q", stdout.String())
	}
}

func TestInitCopiesSkills(t *testing.T) {
	root := t.TempDir()
	proj := filepath.Join(root, "app")
	if err := os.MkdirAll(proj, 0o755); err != nil {
		t.Fatal(err)
	}
	t.Chdir(proj)
	t.Setenv("KOTOWARI_HOME", filepath.Join(proj, ".kotowari"))
	if err := cli.Run(context.Background(), []string{"kotowari", "init"}, ioDiscard{}, ioDiscard{}, "test"); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"kotowari", "design-doc", "ablation"} {
		p := filepath.Join(proj, ".agents", "skills", name, "SKILL.md")
		b, err := os.ReadFile(p)
		if err != nil {
			t.Fatalf("%s: %v", p, err)
		}
		if !strings.Contains(string(b), name) && name != "design-doc" {
			t.Fatalf("%s missing identity: %s", p, b)
		}
		if name == "ablation" && !strings.Contains(string(b), "比較") {
			t.Fatalf("ablation skill missing comparison rule: %s", b)
		}
	}
}
