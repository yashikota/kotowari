package store

import (
	"crypto/sha256"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
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
		diskFiles := map[string]string{}
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
				diskFiles[filepath.ToSlash(rel)] = path
				return nil
			})
			if err != nil {
				return err
			}
		}
		templates, err := os.ReadDir(filepath.Join(s.root, "TEMPLATE"))
		if err != nil && !os.IsNotExist(err) {
			return err
		}
		for _, ent := range templates {
			if !ent.IsDir() && strings.HasSuffix(ent.Name(), ".md") {
				diskFiles["TEMPLATE/"+ent.Name()] = filepath.Join(s.root, "TEMPLATE", ent.Name())
			}
		}
		names := make([]string, 0, len(files))
		for p := range files {
			names = append(names, p)
		}
		for p := range diskFiles {
			names = append(names, p)
		}
		sort.Strings(names)
		h := sha256.New()
		for _, p := range names {
			if path, ok := diskFiles[p]; ok {
				if err := hashFile(h, p, path); err != nil {
					return err
				}
			} else {
				fmt.Fprintf(h, "%d:%s:%d:", len(p), p, len(files[p]))
				_, _ = h.Write(files[p])
			}
		}
		result = fmt.Sprintf("%x", h.Sum(nil))
		return nil
	})
	return result, err
}

// Stream one file at a time so revision polling does not retain the asset collection.
func hashFile(w io.Writer, name, path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer func() { _ = f.Close() }()
	info, err := f.Stat()
	if err != nil {
		return err
	}
	if !info.Mode().IsRegular() {
		return validationf("synchronized file must be regular: %s", name)
	}
	if _, err := fmt.Fprintf(w, "%d:%s:%d:", len(name), name, info.Size()); err != nil {
		return err
	}
	n, err := io.Copy(w, f)
	if err != nil {
		return err
	}
	if n != info.Size() {
		return fmt.Errorf("%w: %s changed while hashing", ErrConflict, name)
	}
	return nil
}
