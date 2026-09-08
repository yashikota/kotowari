package store

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestIssueLivesInNumberedDirectory(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	iss, err := s.CreateIssue(CreateIssueInput{Title: "dir layout"})
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(dir, "issues", "00001", "README.md")
	if _, err := os.Stat(path); err != nil {
		t.Fatal(err)
	}
	if iss.Identifier != "ISS-1" {
		t.Fatalf("identifier %s", iss.Identifier)
	}
}

func TestLoadsLegacyFlatIssueFile(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	md := "+++\ntitle = 'legacy'\nstatus = 'todo'\npriority = 0\ncreated = '2026-01-01T00:00:00Z'\nupdated = '2026-01-01T00:00:00Z'\n+++\n\n"
	if err := os.MkdirAll(filepath.Join(dir, "issues"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "issues", "ISS-1.md"), []byte(md), 0o644); err != nil {
		t.Fatal(err)
	}
	got, err := s.GetIssue("ISS-1")
	if err != nil {
		t.Fatal(err)
	}
	if got.Title != "legacy" {
		t.Fatalf("title %q", got.Title)
	}
	if _, err := s.CreateIssue(CreateIssueInput{Title: "touch"}); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(dir, "issues", "00001", "README.md")); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(dir, "issues", "ISS-1.md")); !os.IsNotExist(err) {
		t.Fatalf("legacy file should be pruned: %v", err)
	}
}

func TestADRCreateLinkAndSandbox(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	iss, err := s.CreateIssue(CreateIssueInput{Title: "cache"})
	if err != nil {
		t.Fatal(err)
	}
	adr, err := s.CreateADR(CreateADRInput{Title: "local cache"})
	if err != nil {
		t.Fatal(err)
	}
	if adr.Identifier != "ADR-1" || adr.Status != "proposed" {
		t.Fatalf("adr %#v", adr)
	}
	readme := filepath.Join(dir, "adr", "00001", "README.md")
	raw, err := os.ReadFile(readme)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(raw), "## 評価関数") {
		t.Fatalf("template: %s", raw)
	}
	junk := filepath.Join(dir, "adr", "00001", "bench.go")
	if err := os.WriteFile(junk, []byte("package main\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := s.LinkIssueADR(iss.Identifier, adr.Number); err != nil {
		t.Fatal(err)
	}
	gotADR, err := s.GetADR("ADR-1")
	if err != nil {
		t.Fatal(err)
	}
	if len(gotADR.IssueNumbers) != 1 || gotADR.IssueNumbers[0] != 1 {
		t.Fatalf("adr issues %#v", gotADR.IssueNumbers)
	}
	gotISS, err := s.GetIssue(iss.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	if len(gotISS.ADRNumbers) != 1 || gotISS.ADRNumbers[0] != 1 {
		t.Fatalf("issue adrs %#v", gotISS.ADRNumbers)
	}
	if _, err := os.Stat(junk); err != nil {
		t.Fatalf("experiment file removed: %v", err)
	}
	pub, err := s.PublishADR("ADR-1")
	if err != nil {
		t.Fatal(err)
	}
	if pub.PublishBody == "" || !strings.Contains(pub.PublishBody, "## Decision Outcome") {
		t.Fatalf("publish template: %q", pub.PublishBody)
	}
	if _, err := os.Stat(filepath.Join(dir, "adr", "00001", "PUBLISH.md")); err != nil {
		t.Fatal(err)
	}
}

func TestSnapshotOmitsADRExperiments(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	if _, err := s.CreateADR(CreateADRInput{Title: "snap"}); err != nil {
		t.Fatal(err)
	}
	junk := filepath.Join(dir, "adr", "00001", "bench.go")
	if err := os.WriteFile(junk, []byte("package main\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := s.PublishADR("ADR-1"); err != nil {
		t.Fatal(err)
	}
	dest := t.TempDir()
	if err := s.Snapshot(dest); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(dest, "adr", "00001", "README.md")); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(dest, "adr", "00001", "PUBLISH.md")); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(dest, "adr", "00001", "bench.go")); !os.IsNotExist(err) {
		t.Fatalf("experiment file should not be snapshotted: %v", err)
	}
}

func TestDeleteADRIsRejected(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	if _, err := s.CreateADR(CreateADRInput{Title: "keep"}); err != nil {
		t.Fatal(err)
	}
	err = s.DeleteADR("ADR-1")
	if err == nil || !errors.Is(err, ErrValidation) {
		t.Fatalf("delete ADR: %v", err)
	}
	if _, err := s.GetADR("ADR-1"); err != nil {
		t.Fatalf("ADR should remain: %v", err)
	}
	next, err := s.CreateADR(CreateADRInput{Title: "later"})
	if err != nil {
		t.Fatal(err)
	}
	if next.Identifier != "ADR-2" {
		t.Fatalf("next identifier %s", next.Identifier)
	}
}

func TestCreateADRSupersedesMarksOld(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	old, err := s.CreateADR(CreateADRInput{Title: "postgres"})
	if err != nil {
		t.Fatal(err)
	}
	n := old.Number
	next, err := s.CreateADR(CreateADRInput{Title: "mysql", Supersedes: &n})
	if err != nil {
		t.Fatal(err)
	}
	if next.Supersedes == nil || *next.Supersedes != 1 {
		t.Fatalf("supersedes %#v", next.Supersedes)
	}
	got, err := s.GetADR("ADR-1")
	if err != nil {
		t.Fatal(err)
	}
	if got.Status != "superseded" {
		t.Fatalf("old status %s", got.Status)
	}
}

func TestCreateADRRejected(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	adr, err := s.CreateADR(CreateADRInput{Title: "no", Status: "rejected"})
	if err != nil {
		t.Fatal(err)
	}
	if adr.Status != "rejected" {
		t.Fatalf("status %s", adr.Status)
	}
}

func TestSupersededWithoutSuccessorIsDiagnosed(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	adr, err := s.CreateADR(CreateADRInput{Title: "orphan"})
	if err != nil {
		t.Fatal(err)
	}
	st := "superseded"
	if _, err := s.UpdateADR(adr.Identifier, PatchADRInput{Status: &st}); err != nil {
		t.Fatal(err)
	}
	diags, err := s.Diagnostics()
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, d := range diags {
		if d.Code == "missing_successor" {
			found = true
		}
	}
	if !found {
		t.Fatalf("diags %#v", diags)
	}
}

func TestADRTOCAndGraph(t *testing.T) {
	adrs := []ADR{
		{Number: 1, Identifier: "ADR-1", Title: "first", Status: "superseded"},
		{Number: 2, Identifier: "ADR-2", Title: "second", Status: "accepted", Supersedes: intPtr(1)},
	}
	toc := RenderADRTOC(adrs)
	if !strings.Contains(toc, "[ADR-1. first]") || !strings.Contains(toc, "adr/00001/README.md") {
		t.Fatalf("toc %s", toc)
	}
	g := RenderADRGraph(adrs)
	if !strings.Contains(g, "flowchart") || !strings.Contains(g, "ADR-2") || !strings.Contains(g, "supersedes") {
		t.Fatalf("graph %s", g)
	}
}

func intPtr(n int) *int { return &n }

func TestADRDirectoriesAreNotPruned(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	if _, err := s.CreateADR(CreateADRInput{Title: "keep"}); err != nil {
		t.Fatal(err)
	}
	orphan := filepath.Join(dir, "adr", "00099", "notes.txt")
	if err := os.MkdirAll(filepath.Dir(orphan), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(orphan, []byte("lab notes\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateIssue(CreateIssueInput{Title: "touch"}); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(orphan); err != nil {
		t.Fatalf("ADR dir pruned: %v", err)
	}
}
