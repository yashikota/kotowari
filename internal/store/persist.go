package store

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/yashikota/kotowari/internal/domain"
)

func errf(kind error, format string, args ...any) error {
	return fmt.Errorf("%w: %s", kind, fmt.Sprintf(format, args...))
}

func (s *Store) snapshot(fn func(*mem) error) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	m, err := load(s.root)
	if err != nil {
		return err
	}
	if m.dirtyMeta {
		if err := save(s.root, m); err != nil {
			return err
		}
	}
	return fn(m)
}

func (s *Store) mutate(fn func(*mem) error) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	m, err := load(s.root)
	if err != nil {
		return err
	}
	before, err := workspaceFiles(m)
	if err != nil {
		return err
	}
	raw := map[string][]byte{}
	for path := range before {
		b, err := os.ReadFile(filepath.Join(s.root, path))
		if err != nil && !os.IsNotExist(err) {
			return err
		}
		raw[path] = b
	}
	if err := fn(m); err != nil {
		return err
	}
	after, err := workspaceFiles(m)
	if err != nil {
		return err
	}
	return commitFiles(s.root, before, after, raw)
}

func seed(root string) error {
	now := domain.Now()
	m := &mem{
		Workspace: workspaceFile{
			Name:         "kotowari",
			Timezone:     "Asia/Tokyo",
			IssueCounter: 0,
			NextID:       4,
			UpdatedAt:    now,
		},
		Labels: []Label{
			{ID: 1, Name: "Bug", Color: "#d4725a"},
			{ID: 2, Name: "Feature", Color: "#6b9bd1"},
			{ID: 3, Name: "Improvement", Color: "#c4a574"},
		},
		Comments:   map[string][]Comment{},
		commentSeq: map[string]int64{},
	}
	return save(root, m)
}
