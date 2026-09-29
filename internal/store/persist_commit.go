package store

import (
	"bytes"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type fileChange struct {
	target    string
	staged    string
	backupDir string
	backup    string
	hasBackup bool
	installed bool
}

// commitFiles stages all replacements and restores moved originals if an install fails.
func commitFiles(root string, before, after, raw map[string][]byte) error {
	paths := map[string]bool{}
	for p := range before {
		if !bytes.Equal(before[p], after[p]) {
			paths[p] = true
		}
	}
	for p := range after {
		if _, ok := before[p]; !ok || !bytes.Equal(before[p], after[p]) {
			paths[p] = true
		}
	}
	ordered := make([]string, 0, len(paths))
	for p := range paths {
		ordered = append(ordered, p)
	}
	sort.Strings(ordered)
	if err := checkFileConflicts(root, ordered, raw); err != nil {
		return err
	}

	changes := make([]fileChange, 0, len(ordered))
	defer func() {
		for _, change := range changes {
			if change.staged != "" {
				_ = os.Remove(change.staged)
			}
		}
	}()
	for _, p := range ordered {
		target := filepath.Join(root, p)
		if _, exists := after[p]; !exists && isIssueReadme(p) {
			// An issue deletion owns the whole issue directory, including auxiliary files.
			target = filepath.Dir(target)
		}
		change := fileChange{target: target}
		if contents, exists := after[p]; exists {
			staged, err := stageFile(target, contents)
			if err != nil {
				return err
			}
			change.staged = staged
		}
		changes = append(changes, change)
	}

	for i := range changes {
		if err := backupTarget(&changes[i]); err != nil {
			return rollbackCommit(err, changes)
		}
	}
	for i := range changes {
		change := &changes[i]
		if change.staged == "" {
			continue
		}
		if err := os.Rename(change.staged, change.target); err != nil {
			return rollbackCommit(err, changes)
		}
		change.installed = true
	}
	for _, change := range changes {
		if change.backupDir != "" {
			// The commit is already applied. A stale backup is harmless if cleanup fails.
			_ = os.RemoveAll(change.backupDir)
		}
	}
	return nil
}

func checkFileConflicts(root string, paths []string, raw map[string][]byte) error {
	// External tools do not participate in our mutex; a writer racing after this
	// check remains possible.
	for _, p := range paths {
		contents, err := os.ReadFile(filepath.Join(root, p))
		if err != nil && !os.IsNotExist(err) {
			return err
		}
		if !bytes.Equal(contents, raw[p]) {
			return fmt.Errorf("%w: %s changed on disk; reload before saving", ErrConflict, p)
		}
	}
	return nil
}

func stageFile(target string, contents []byte) (string, error) {
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		return "", err
	}
	file, err := os.CreateTemp(filepath.Dir(target), ".kotowari-*")
	if err != nil {
		return "", err
	}
	path := file.Name()
	if _, err := file.Write(contents); err != nil {
		_ = file.Close()
		_ = os.Remove(path)
		return "", err
	}
	if err := file.Sync(); err != nil {
		_ = file.Close()
		_ = os.Remove(path)
		return "", err
	}
	if err := file.Close(); err != nil {
		_ = os.Remove(path)
		return "", err
	}
	return path, nil
}

func backupTarget(change *fileChange) error {
	if _, err := os.Lstat(change.target); os.IsNotExist(err) {
		return nil
	} else if err != nil {
		return err
	}
	backupDir, err := os.MkdirTemp(filepath.Dir(change.target), ".kotowari-backup-*")
	if err != nil {
		return err
	}
	backup := filepath.Join(backupDir, filepath.Base(change.target))
	if err := os.Rename(change.target, backup); err != nil {
		_ = os.RemoveAll(backupDir)
		return err
	}
	change.backupDir = backupDir
	change.backup = backup
	change.hasBackup = true
	return nil
}

func rollbackCommit(cause error, changes []fileChange) error {
	var rollbackErr error
	for i := len(changes) - 1; i >= 0; i-- {
		change := &changes[i]
		if change.installed {
			if err := os.Remove(change.target); err != nil && !os.IsNotExist(err) {
				rollbackErr = errors.Join(rollbackErr, err)
				continue
			}
			change.installed = false
		}
		if !change.hasBackup {
			continue
		}
		if err := os.Rename(change.backup, change.target); err != nil {
			rollbackErr = errors.Join(rollbackErr, err)
			continue
		}
		change.hasBackup = false
		_ = os.RemoveAll(change.backupDir)
	}
	if rollbackErr != nil {
		return errors.Join(cause, fmt.Errorf("restore workspace files after commit failure: %w", rollbackErr))
	}
	return cause
}

func isIssueReadme(path string) bool {
	return strings.HasPrefix(path, "issues/") && strings.HasSuffix(path, "/README.md")
}
