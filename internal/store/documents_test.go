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

func TestAssetChangesContentHash(t *testing.T) {
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
	before, err := s.ContentHash()
	if err != nil {
		t.Fatal(err)
	}
	if err := atomicWrite(asset, []byte("<p>changed</p>")); err != nil {
		t.Fatal(err)
	}
	after, err := s.ContentHash()
	if err != nil || before == after {
		t.Fatalf("asset change not detected: %v", err)
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
