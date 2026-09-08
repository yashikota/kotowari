package store

import (
	"crypto/sha256"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
)

// ContentHash excludes synchronization metadata, experiments and local AI history.
func (s *Store) ContentHash() (string, error) {
	var result string
	err := s.snapshot(func(m *mem) error {
		m.Workspace.ContentHash = ""
		m.Workspace.LastPushedAt = nil
		m.Workspace.LastPushedDigest = nil
		m.Workspace.UpdatedAt = ""
		files, err := workspaceFiles(m)
		if err != nil {
			return err
		}
		for _, a := range m.ADRs {
			base := filepath.Join("adr", fmt.Sprintf("%05d", a.Number), "assets")
			err := filepath.WalkDir(filepath.Join(s.root, base), func(path string, d fs.DirEntry, walkErr error) error {
				if os.IsNotExist(walkErr) {
					return nil
				}
				if walkErr != nil {
					return walkErr
				}
				if d.Type()&os.ModeSymlink != 0 {
					return validationf("asset symlinks are not supported")
				}
				if d.IsDir() {
					return nil
				}
				if !d.Type().IsRegular() {
					return validationf("asset must be a regular file")
				}
				rel, err := filepath.Rel(s.root, path)
				if err != nil {
					return err
				}
				b, err := os.ReadFile(path)
				if err != nil {
					return err
				}
				files[filepath.ToSlash(rel)] = b
				return nil
			})
			if err != nil {
				return err
			}
		}
		names := make([]string, 0, len(files))
		for p := range files {
			names = append(names, p)
		}
		sort.Strings(names)
		h := sha256.New()
		for _, p := range names {
			fmt.Fprintf(h, "%d:%s:%d:", len(p), p, len(files[p]))
			_, _ = h.Write(files[p])
		}
		result = fmt.Sprintf("%x", h.Sum(nil))
		return nil
	})
	return result, err
}
