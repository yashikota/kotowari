package store

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/yashikota/kotowari/internal/domain"
)

func document(m *mem, kind, id, field string) (*string, *string, string, error) {
	if field != "body" && (kind != "adrs" || field != "publishBody") {
		return nil, nil, "", validationf("invalid document field")
	}
	switch kind {
	case "adrs":
		i := indexADR(m, id)
		if i >= 0 {
			a := &m.ADRs[i]
			b := &a.Body
			if field == "publishBody" {
				b = &a.PublishBody
			}
			return b, &a.UpdatedAt, domain.DirName(a.Number), nil
		}
	case "issues":
		i := indexIssue(m, id)
		if i >= 0 {
			a := &m.Issues[i]
			return &a.Body, &a.UpdatedAt, domain.DirName(a.Number), nil
		}
	case "pages":
		for i := range m.Pages {
			a := &m.Pages[i]
			if a.Slug == id {
				return &a.Body, &a.UpdatedAt, a.Slug, nil
			}
		}
	}
	return nil, nil, "", ErrNotFound
}

func bodyRevision(body string) string { return fmt.Sprintf("%x", sha256.Sum256([]byte(body))) }

func (s *Store) Document(kind, id, field string) (Document, error) {
	var out Document
	err := s.snapshot(func(m *mem) error {
		b, at, _, err := document(m, kind, id, field)
		if err != nil {
			return err
		}
		out = Document{Body: *b, Revision: bodyRevision(*b), SavedAt: *at}
		return nil
	})
	return out, err
}

func (s *Store) SaveDocument(in SaveDocumentInput) (Document, error) {
	if in.Field == "body" && in.Body != "" && !strings.HasSuffix(in.Body, "\n") {
		in.Body += "\n"
	}
	var out Document
	err := s.mutate(func(m *mem) error {
		b, at, key, err := document(m, in.Kind, in.ID, in.Field)
		if err != nil {
			return err
		}
		if in.Revision == "" || in.Revision != bodyRevision(*b) {
			return fmt.Errorf("%w: document changed; compare your draft with the current document", ErrConflict)
		}
		if in.Body != *b {
			old := Document{Body: *b, Revision: in.Revision, SavedAt: time.Now().UTC().Format(time.RFC3339Nano)}
			raw, err := json.Marshal(old)
			if err != nil {
				return err
			}
			if err := atomicWrite(filepath.Join(s.root, ".history", in.Kind, key, in.Field, in.Revision+".json"), raw); err != nil {
				return err
			}
			*b = in.Body
			*at = domain.Now()
			m.bump(*at)
		}
		out = Document{Body: *b, Revision: bodyRevision(*b), SavedAt: *at}
		return nil
	})
	return out, err
}

func (s *Store) DocumentHistory(kind, id, field string) ([]Document, error) {
	out := []Document{}
	err := s.snapshot(func(m *mem) error {
		_, _, key, err := document(m, kind, id, field)
		if err != nil {
			return err
		}
		dir := filepath.Join(s.root, ".history", kind, key, field)
		entries, err := os.ReadDir(dir)
		if os.IsNotExist(err) {
			return nil
		}
		if err != nil {
			return err
		}
		for _, e := range entries {
			if e.IsDir() || filepath.Ext(e.Name()) != ".json" {
				continue
			}
			b, err := os.ReadFile(filepath.Join(dir, e.Name()))
			if err != nil {
				return err
			}
			var d Document
			if err := json.Unmarshal(b, &d); err != nil {
				return err
			}
			out = append(out, d)
		}
		sort.Slice(out, func(i, j int) bool { return out[i].SavedAt > out[j].SavedAt })
		return nil
	})
	return out, err
}
