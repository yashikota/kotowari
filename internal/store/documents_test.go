package store

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDocumentConflictHistoryAndUnrelatedFiles(t *testing.T) {
	s := openTest(t)
	a, err := s.CreateADR(CreateADRInput{Title: "Decision", Body: "initial"})
	if err != nil {
		t.Fatal(err)
	}
	other, err := s.CreateADR(CreateADRInput{Title: "Untouched"})
	if err != nil {
		t.Fatal(err)
	}
	_ = other
	path := filepath.Join(s.Path(), "adr", "00002", "README.md")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	raw = []byte(strings.Replace(string(raw), "+++\n", "+++\n# keep this comment\n", 1))
	if err := os.WriteFile(path, raw, 0600); err != nil {
		t.Fatal(err)
	}
	base, err := s.Document("adrs", a.Identifier, "body")
	if err != nil {
		t.Fatal(err)
	}
	next, err := s.SaveDocument("adrs", a.Identifier, "body", "external", base.Revision)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.SaveDocument("adrs", a.Identifier, "body", "stale", base.Revision); !errors.Is(err, ErrConflict) {
		t.Fatalf("want conflict, got %v", err)
	}
	got, err := s.Document("adrs", a.Identifier, "body")
	if err != nil || strings.TrimSpace(got.Body) != "external" {
		t.Fatalf("%+v %v", got, err)
	}
	history, err := s.DocumentHistory("adrs", a.Identifier, "body")
	if err != nil || len(history) != 1 || strings.TrimSpace(history[0].Body) != "initial" {
		t.Fatalf("%+v %v", history, err)
	}
	if _, err := s.SaveDocument("adrs", a.Identifier, "body", history[0].Body, next.Revision); err != nil {
		t.Fatal(err)
	}
	after, err := os.ReadFile(path)
	if err != nil || string(after) != string(raw) {
		t.Fatalf("unrelated file rewritten: %v", err)
	}
}

func TestAssetSnapshotAndDirty(t *testing.T) {
	s := openTest(t)
	if _, err := s.CreateADR(CreateADRInput{Title: "Assets"}); err != nil {
		t.Fatal(err)
	}
	asset := filepath.Join(s.Path(), "adr", "00001", "assets", "diagram.html")
	if err := atomicWrite(asset, []byte("<p>diagram</p>")); err != nil {
		t.Fatal(err)
	}
	if err := atomicWrite(filepath.Join(s.Path(), "adr", "00001", "experiments", "main.go"), []byte("experiment")); err != nil {
		t.Fatal(err)
	}
	if err := s.MarkPushed("digest"); err != nil {
		t.Fatal(err)
	}
	if dirty, err := s.Dirty(); err != nil || dirty {
		t.Fatalf("dirty %v: %v", dirty, err)
	}
	if err := atomicWrite(asset, []byte("<p>changed</p>")); err != nil {
		t.Fatal(err)
	}
	if dirty, err := s.Dirty(); err != nil || !dirty {
		t.Fatalf("asset change not detected: %v %v", dirty, err)
	}
	dest := t.TempDir()
	if err := s.Snapshot(dest); err != nil {
		t.Fatal(err)
	}
	if b, err := os.ReadFile(filepath.Join(dest, "adr", "00001", "assets", "diagram.html")); err != nil || string(b) != "<p>changed</p>" {
		t.Fatalf("asset missing %s %v", b, err)
	}
	if _, err := os.Stat(filepath.Join(dest, "adr", "00001", "experiments")); !os.IsNotExist(err) {
		t.Fatal("experiments were included")
	}
	if err := os.Remove(filepath.Join(dest, "adr", "00001", "assets", "diagram.html")); err != nil {
		t.Fatal(err)
	}
	if err := s.ReplaceFrom(dest); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(asset); !os.IsNotExist(err) {
		t.Fatal("deleted asset retained")
	}
	if _, err := os.Stat(filepath.Join(s.Path(), "adr", "00001", "experiments", "main.go")); err != nil {
		t.Fatal("local experiments lost", err)
	}
}

func TestADRProjectAndBodySearch(t *testing.T) {
	s := openTest(t)
	p, err := s.CreateProject("Project", "project", "", "", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	a, err := s.CreateADR(CreateADRInput{Title: "Decision", Body: "固有の判断根拠", ProjectSlug: &p.Slug})
	if err != nil {
		t.Fatal(err)
	}
	got, err := s.GetADR(a.Identifier)
	if err != nil || got.ProjectSlug == nil || *got.ProjectSlug != p.Slug {
		t.Fatalf("%+v %v", got, err)
	}
	hits, err := s.Search("判断根拠")
	if err != nil || len(hits) != 1 || !strings.Contains(hits[0].Snippet, "判断根拠") {
		t.Fatalf("%+v %v", hits, err)
	}
	if err := s.DeleteProject(p.Slug); err != nil {
		t.Fatal(err)
	}
	got, err = s.GetADR(a.Identifier)
	if err != nil || got.ProjectSlug != nil {
		t.Fatalf("deleted project reference retained: %+v %v", got, err)
	}
}
