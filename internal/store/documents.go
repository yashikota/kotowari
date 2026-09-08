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

type Document struct {
	Body     string `json:"body"`
	Revision string `json:"revision"`
	SavedAt  string `json:"savedAt,omitempty"`
}

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

func (s *Store) SaveDocument(kind, id, field, body, revision string) (Document, error) {
	if field == "body" && body != "" && !strings.HasSuffix(body, "\n") {
		body += "\n"
	}
	var out Document
	err := s.mutate(func(m *mem) error {
		b, at, key, err := document(m, kind, id, field)
		if err != nil {
			return err
		}
		if revision == "" || revision != bodyRevision(*b) {
			return fmt.Errorf("%w: document changed; compare your draft with the current document", ErrConflict)
		}
		if body != *b {
			old := Document{Body: *b, Revision: revision, SavedAt: time.Now().UTC().Format(time.RFC3339Nano)}
			raw, err := json.Marshal(old)
			if err != nil {
				return err
			}
			if err := atomicWrite(filepath.Join(s.root, ".history", kind, key, field, revision+".json"), raw); err != nil {
				return err
			}
			*b = body
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
