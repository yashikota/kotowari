package cli

import (
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"

	"github.com/yashikota/kotowari/internal/appdir"
	"github.com/yashikota/kotowari/internal/store"
	"github.com/yashikota/kotowari/internal/term"
	"github.com/yashikota/kotowari/skills"
)

func cmdInit(stdout io.Writer) error {
	root, err := appdir.Home()
	if err != nil {
		return err
	}
	if appdir.Initialized(root) {
		return fmt.Errorf("already initialized: %s", root)
	}
	st, err := store.Open(root)
	if err != nil {
		return err
	}
	defer func() { _ = st.Close() }()
	if err := copyProductSkills(root); err != nil {
		return err
	}
	term.For(stdout).Success(stdout, "initialized %s\n", root)
	return nil
}

func copyProductSkills(workspaceRoot string) error {
	destBase := workspaceRoot
	if filepath.Base(workspaceRoot) == ".kotowari" {
		destBase = filepath.Dir(workspaceRoot)
	}
	dest := filepath.Join(destBase, ".agents", "skills")
	return fs.WalkDir(skills.FS, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if path == "." {
			return nil
		}
		target := filepath.Join(dest, path)
		if d.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		b, err := skills.FS.ReadFile(path)
		if err != nil {
			return err
		}
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		return os.WriteFile(target, b, 0o644)
	})
}
