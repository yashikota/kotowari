package store

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSeedWritesIssueAndADRTemplates(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	for _, name := range []string{"ISSUE.md", "ADR.md"} {
		p := filepath.Join(dir, "TEMPLATE", name)
		b, err := os.ReadFile(p)
		if err != nil {
			t.Fatalf("%s: %v", p, err)
		}
		if !strings.Contains(string(b), "title") || !strings.Contains(string(b), "created") {
			t.Fatalf("%s missing required frontmatter keys: %s", name, b)
		}
		if name == "ADR.md" && (!strings.Contains(string(b), "選んだ候補:") || !strings.Contains(string(b), "### 確認") || !strings.Contains(string(b), "rejected")) {
			t.Fatalf("ADR template missing MADR skeleton: %s", b)
		}
	}
}

func TestCreateIssueUsesTemplateBody(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	iss, err := s.CreateIssue(CreateIssueInput{Title: "from template"})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(iss.Body, "## 目的") {
		t.Fatalf("issue body %q", iss.Body)
	}
	raw, err := os.ReadFile(filepath.Join(dir, "issues", "00001", "README.md"))
	if err != nil {
		t.Fatal(err)
	}
	md := string(raw)
	if !strings.Contains(md, "from template") || !strings.Contains(md, "created") || !strings.Contains(md, "updated") {
		t.Fatalf("issue file %s", md)
	}
}

func TestCreateIssueUsesWorkspaceTemplate(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	custom := "+++\ntitle = \"\"\nstatus = \"todo\"\ncreated = \"\"\nupdated = \"\"\n+++\n\n## カスタム骨格\n"
	if err := os.WriteFile(filepath.Join(dir, "TEMPLATE", "ISSUE.md"), []byte(custom), 0o644); err != nil {
		t.Fatal(err)
	}
	iss, err := s.CreateIssue(CreateIssueInput{Title: "custom"})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(iss.Body, "## カスタム骨格") {
		t.Fatalf("body %q", iss.Body)
	}
	if strings.Contains(iss.Body, "## 目的") {
		t.Fatalf("still used bundled template: %q", iss.Body)
	}
}

func TestCreateADRUsesTemplateBody(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	adr, err := s.CreateADR(CreateADRInput{Title: "from template"})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(adr.Body, "## 評価関数") {
		t.Fatalf("adr body %q", adr.Body)
	}
	if !strings.Contains(adr.Body, "選んだ候補:") || !strings.Contains(adr.Body, "### 確認") {
		t.Fatalf("madr sections %q", adr.Body)
	}
}

func TestMissingTitleAndCreatedAreDiagnosed(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	if err := os.MkdirAll(filepath.Join(dir, "issues", "00001"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "issues", "00001", "README.md"), []byte("+++\nstatus = \"todo\"\n+++\n\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(dir, "adr", "00001"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "adr", "00001", "README.md"), []byte("+++\nstatus = \"proposed\"\n+++\n\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	diags, err := s.Diagnostics()
	if err != nil {
		t.Fatal(err)
	}
	codes := map[string]bool{}
	for _, d := range diags {
		codes[d.Code] = true
	}
	if !codes["missing_title"] || !codes["missing_created"] || !codes["missing_updated"] {
		t.Fatalf("codes %#v", diags)
	}
}
