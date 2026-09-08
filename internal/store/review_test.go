package store

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestCommentAliasesPersistCanonicalSequence(t *testing.T) {
	s := openTest(t)
	iss, err := s.CreateIssue(CreateIssueInput{Title: "aliases"})
	if err != nil {
		t.Fatal(err)
	}
	for i, alias := range []string{"1", "SEN-1", "ISS-1"} {
		c, err := s.AddComment(alias, alias)
		if err != nil || c.ID != int64(i+1) {
			t.Fatalf("%+v %v", c, err)
		}
		for _, lookup := range []string{alias, iss.Identifier} {
			got, err := s.ListComments(lookup)
			if err != nil || len(got) != i+1 {
				t.Fatalf("%s: %+v %v", lookup, got, err)
			}
		}
	}
}

func TestDeleteIssueRemovesDirectoryWithoutDiagnostics(t *testing.T) {
	s := openTest(t)
	iss, err := s.CreateIssue(CreateIssueInput{Title: "delete"})
	if err != nil {
		t.Fatal(err)
	}
	dir := filepath.Join(s.Path(), "issues", "00001")
	if err := os.WriteFile(filepath.Join(dir, "note.txt"), []byte("auxiliary"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := s.DeleteIssue(iss.Identifier); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(dir); !os.IsNotExist(err) {
		t.Fatalf("directory retained: %v", err)
	}
	if err := s.snapshot(func(m *mem) error {
		for _, d := range m.Diagnostics {
			if d.Code == "missing_readme" {
				t.Fatalf("%+v", d)
			}
		}
		return nil
	}); err != nil {
		t.Fatal(err)
	}
}

func TestMissingADRReadmeReservesNumber(t *testing.T) {
	s := openTest(t)
	old := filepath.Join(s.Path(), "adr", "00042", "assets", "old.svg")
	if err := atomicWrite(old, []byte("old")); err != nil {
		t.Fatal(err)
	}
	a, err := s.CreateADR(CreateADRInput{Title: "next"})
	if err != nil || a.Number != 43 {
		t.Fatalf("%+v %v", a, err)
	}
	if _, err := os.Stat(filepath.Join(s.Path(), "adr", "00042", "README.md")); !os.IsNotExist(err) {
		t.Fatal("historical number reused", err)
	}
}

func TestEstablishedSupersedesCannotBeChanged(t *testing.T) {
	s := openTest(t)
	first, err := s.CreateADR(CreateADRInput{Title: "first", Status: "accepted"})
	if err != nil {
		t.Fatal(err)
	}
	second, err := s.CreateADR(CreateADRInput{Title: "second", Supersedes: &first.Number})
	if err != nil {
		t.Fatal(err)
	}
	third, err := s.CreateADR(CreateADRInput{Title: "third"})
	if err != nil {
		t.Fatal(err)
	}
	for _, next := range []*int{nil, &third.Number} {
		if _, err := s.UpdateADR(second.Identifier, PatchADRInput{Supersedes: &next}); !errors.Is(err, ErrValidation) {
			t.Fatalf("got %v", err)
		}
	}
	got, err := s.GetADR(second.Identifier)
	if err != nil || got.Supersedes == nil || *got.Supersedes != first.Number {
		t.Fatalf("%+v %v", got, err)
	}
}

func TestTemplateChangesAreDirty(t *testing.T) {
	s := openTest(t)
	path := filepath.Join(s.Path(), "TEMPLATE", "custom.md")
	if err := atomicWrite(path, []byte("before")); err != nil {
		t.Fatal(err)
	}
	if err := s.MarkPushed("digest"); err != nil {
		t.Fatal(err)
	}
	if err := atomicWrite(path, []byte("after")); err != nil {
		t.Fatal(err)
	}
	if dirty, err := s.Dirty(); err != nil || !dirty {
		t.Fatalf("%v %v", dirty, err)
	}
	if err := s.MarkPushed("digest2"); err != nil {
		t.Fatal(err)
	}
	if err := os.Remove(path); err != nil {
		t.Fatal(err)
	}
	if dirty, err := s.Dirty(); err != nil || !dirty {
		t.Fatalf("%v %v", dirty, err)
	}
}

func TestInvalidWorkspacePrefixRejected(t *testing.T) {
	for _, prefix := range []string{"TEAM/ISS", "ISS#", "ADR?", "x y"} {
		t.Run(prefix, func(t *testing.T) {
			s := openTest(t)
			path := filepath.Join(s.Path(), "workspace.toml")
			raw, err := os.ReadFile(path)
			if err != nil {
				t.Fatal(err)
			}
			// Seeded workspaces omit the default prefix.
			raw = []byte(strings.ReplaceAll(string(raw), "issuePrefix = \"\"\n", ""))
			raw = append(raw, []byte("\nissuePrefix = \""+prefix+"\"\n")...)
			if err := os.WriteFile(path, raw, 0600); err != nil {
				t.Fatal(err)
			}
			if _, err := s.CreateIssue(CreateIssueInput{Title: "invalid"}); !errors.Is(err, ErrValidation) {
				t.Fatalf("got %v", err)
			}
		})
	}
}
