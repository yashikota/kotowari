package store

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/yashikota/kotowari/internal/domain"
)

func TestCreateADRValidation(t *testing.T) {
	s := openTest(t)
	if _, err := s.CreateADR(CreateADRInput{Title: " "}); !errors.Is(err, ErrValidation) {
		t.Fatalf("empty title: %v", err)
	}
	if _, err := s.CreateADR(CreateADRInput{Title: "x", Status: "draft"}); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid status: %v", err)
	}
	if _, err := s.CreateADR(CreateADRInput{Title: "x", IssueNumbers: []int{9}}); !errors.Is(err, ErrValidation) {
		t.Fatalf("missing issue: %v", err)
	}
	n := 99
	if _, err := s.CreateADR(CreateADRInput{Title: "x", Supersedes: &n}); !errors.Is(err, ErrValidation) {
		t.Fatalf("missing superseded: %v", err)
	}
}

func TestCreateADRCannotSupersedeSelf(t *testing.T) {
	s := openTest(t)
	old, err := s.CreateADR(CreateADRInput{Title: "first"})
	if err != nil {
		t.Fatal(err)
	}
	n := old.Number
	sp := &n
	if _, err := s.UpdateADR(old.Identifier, PatchADRInput{Supersedes: &sp}); !errors.Is(err, ErrValidation) {
		t.Fatalf("self supersede: %v", err)
	}
}

func TestCreateADRLinksIssueAndWritesFrontmatter(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	iss, err := s.CreateIssue(CreateIssueInput{Title: "work"})
	if err != nil {
		t.Fatal(err)
	}
	adr, err := s.CreateADR(CreateADRInput{Title: "decide", IssueNumbers: []int{iss.Number}})
	if err != nil {
		t.Fatal(err)
	}
	if len(adr.IssueNumbers) != 1 || adr.IssueNumbers[0] != iss.Number {
		t.Fatalf("adr issues %#v", adr.IssueNumbers)
	}
	got, err := s.GetIssue(iss.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	if len(got.ADRNumbers) != 1 || got.ADRNumbers[0] != adr.Number {
		t.Fatalf("issue adrs %#v", got.ADRNumbers)
	}
	raw, err := os.ReadFile(filepath.Join(dir, "adr", domain.DirName(adr.Number), "README.md"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(raw), "issues") || !strings.Contains(string(raw), "1") {
		t.Fatalf("frontmatter %s", raw)
	}
}

func TestUpdateADRSupersedesMarksOld(t *testing.T) {
	s := openTest(t)
	old, err := s.CreateADR(CreateADRInput{Title: "postgres"})
	if err != nil {
		t.Fatal(err)
	}
	next, err := s.CreateADR(CreateADRInput{Title: "mysql"})
	if err != nil {
		t.Fatal(err)
	}
	n := old.Number
	sp := &n
	got, err := s.UpdateADR(next.Identifier, PatchADRInput{Supersedes: &sp})
	if err != nil {
		t.Fatal(err)
	}
	if got.Supersedes == nil || *got.Supersedes != old.Number {
		t.Fatalf("supersedes %#v", got.Supersedes)
	}
	oldGot, err := s.GetADR(old.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	if oldGot.Status != "superseded" {
		t.Fatalf("old status %s", oldGot.Status)
	}
}

func TestGetAndListADREmptyAndMissing(t *testing.T) {
	s := openTest(t)
	list, err := s.ListADRs()
	if err != nil {
		t.Fatal(err)
	}
	if list == nil || len(list) != 0 {
		t.Fatalf("empty list %#v", list)
	}
	if _, err := s.GetADR("ADR-1"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing get: %v", err)
	}
	if _, err := s.PublishADR("ADR-1"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing publish: %v", err)
	}
	if err := s.LinkIssueADR("ISS-1", 1); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing link: %v", err)
	}
}

func TestUnlinkIssueADR(t *testing.T) {
	s := openTest(t)
	iss, err := s.CreateIssue(CreateIssueInput{Title: "work"})
	if err != nil {
		t.Fatal(err)
	}
	adr, err := s.CreateADR(CreateADRInput{Title: "decide"})
	if err != nil {
		t.Fatal(err)
	}
	if err := s.LinkIssueADR(iss.Identifier, adr.Number); err != nil {
		t.Fatal(err)
	}
	if err := s.UnlinkIssueADR(iss.Identifier, adr.Number); err != nil {
		t.Fatal(err)
	}
	gotADR, err := s.GetADR(adr.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	if len(gotADR.IssueNumbers) != 0 {
		t.Fatalf("adr still linked %#v", gotADR.IssueNumbers)
	}
	gotISS, err := s.GetIssue(iss.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	if len(gotISS.ADRNumbers) != 0 {
		t.Fatalf("issue still linked %#v", gotISS.ADRNumbers)
	}
}

func TestPublishRejectedStaysRejected(t *testing.T) {
	s := openTest(t)
	adr, err := s.CreateADR(CreateADRInput{Title: "no", Status: "rejected"})
	if err != nil {
		t.Fatal(err)
	}
	pub, err := s.PublishADR(adr.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	if pub.Status != "rejected" {
		t.Fatalf("status %s", pub.Status)
	}
	if !strings.Contains(pub.PublishBody, "## Decision Outcome") {
		t.Fatalf("publish body %q", pub.PublishBody)
	}
}

func TestUpdateADRInvalidStatus(t *testing.T) {
	s := openTest(t)
	adr, err := s.CreateADR(CreateADRInput{Title: "x"})
	if err != nil {
		t.Fatal(err)
	}
	st := "draft"
	if _, err := s.UpdateADR(adr.Identifier, PatchADRInput{Status: &st}); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid patch status: %v", err)
	}
}

func TestDiagnosticsDanglingSupersedesAndLinks(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	if err := os.MkdirAll(filepath.Join(dir, "adr", "00001"), 0o755); err != nil {
		t.Fatal(err)
	}
	md := "+++\ntitle = 'ghost'\nstatus = 'proposed'\nsupersedes = 9\nissues = [9]\ncreated = '2026-01-01T00:00:00Z'\nupdated = '2026-01-01T00:00:00Z'\n+++\n\n"
	if err := os.WriteFile(filepath.Join(dir, "adr", "00001", "README.md"), []byte(md), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(dir, "issues", "00001"), 0o755); err != nil {
		t.Fatal(err)
	}
	iss := "+++\ntitle = 'work'\nstatus = 'todo'\npriority = 0\nadrs = [1]\ncreated = '2026-01-01T00:00:00Z'\nupdated = '2026-01-01T00:00:00Z'\n+++\n\n"
	if err := os.WriteFile(filepath.Join(dir, "issues", "00001", "README.md"), []byte(iss), 0o644); err != nil {
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
	if !codes["dangling_supersedes"] || !codes["dangling_issue"] || !codes["one_sided_link"] {
		t.Fatalf("codes %#v", diags)
	}
}

func TestDiagnosticsDanglingADROnIssue(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	if err := os.MkdirAll(filepath.Join(dir, "issues", "00001"), 0o755); err != nil {
		t.Fatal(err)
	}
	iss := "+++\ntitle = 'work'\nstatus = 'todo'\npriority = 0\nadrs = [9]\ncreated = '2026-01-01T00:00:00Z'\nupdated = '2026-01-01T00:00:00Z'\n+++\n\n"
	if err := os.WriteFile(filepath.Join(dir, "issues", "00001", "README.md"), []byte(iss), 0o644); err != nil {
		t.Fatal(err)
	}
	diags, err := s.Diagnostics()
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, d := range diags {
		if d.Code == "dangling_adr" {
			found = true
		}
	}
	if !found {
		t.Fatalf("diags %#v", diags)
	}
}

func TestDiagnosticsMissingADRReadme(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	if err := os.MkdirAll(filepath.Join(dir, "adr", "00001"), 0o755); err != nil {
		t.Fatal(err)
	}
	diags, err := s.Diagnostics()
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, d := range diags {
		if d.Code == "missing_readme" {
			found = true
		}
	}
	if !found {
		t.Fatalf("diags %#v", diags)
	}
}

func TestDiagnosticsSupersedeChainIsClean(t *testing.T) {
	s := openTest(t)
	old, err := s.CreateADR(CreateADRInput{Title: "postgres"})
	if err != nil {
		t.Fatal(err)
	}
	n := old.Number
	if _, err := s.CreateADR(CreateADRInput{Title: "mysql", Supersedes: &n}); err != nil {
		t.Fatal(err)
	}
	diags, err := s.Diagnostics()
	if err != nil {
		t.Fatal(err)
	}
	for _, d := range diags {
		if d.Code == "missing_successor" || d.Code == "dangling_supersedes" {
			t.Fatalf("clean chain diagnosed: %#v", diags)
		}
	}
}

func TestSupersedesPersistsInREADME(t *testing.T) {
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
	raw, err := os.ReadFile(filepath.Join(dir, "adr", domain.DirName(next.Number), "README.md"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(raw), "supersedes = 1") {
		t.Fatalf("frontmatter %s", raw)
	}
}
