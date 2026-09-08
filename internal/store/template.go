package store

import (
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	templates "github.com/yashikota/kotowari/TEMPLATE"
)

func writeBundledTemplates(root string) error {
	return copyTemplateFiles(root, false)
}

func copyTemplateFiles(destRoot string, overwrite bool) error {
	return fs.WalkDir(templates.FS, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if path == "." || d.IsDir() {
			return nil
		}
		target := filepath.Join(destRoot, "TEMPLATE", path)
		if !overwrite {
			if _, err := os.Stat(target); err == nil {
				return nil
			}
		}
		b, err := templates.FS.ReadFile(path)
		if err != nil {
			return err
		}
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		return os.WriteFile(target, b, 0o644)
	})
}

func copyWorkspaceTemplates(srcRoot, destRoot string) error {
	src := filepath.Join(srcRoot, "TEMPLATE")
	ents, err := os.ReadDir(src)
	if err != nil {
		if os.IsNotExist(err) {
			return writeBundledTemplates(destRoot)
		}
		return err
	}
	if err := os.MkdirAll(filepath.Join(destRoot, "TEMPLATE"), 0o755); err != nil {
		return err
	}
	copied := false
	keep := map[string]struct{}{}
	for _, ent := range ents {
		if ent.IsDir() || !strings.HasSuffix(ent.Name(), ".md") {
			continue
		}
		b, err := os.ReadFile(filepath.Join(src, ent.Name()))
		if err != nil {
			return err
		}
		if err := os.WriteFile(filepath.Join(destRoot, "TEMPLATE", ent.Name()), b, 0o644); err != nil {
			return err
		}
		keep[ent.Name()] = struct{}{}
		copied = true
	}
	if !copied {
		return writeBundledTemplates(destRoot)
	}
	return pruneDir(filepath.Join(destRoot, "TEMPLATE"), ".md", keep)
}

func templateBody(root, name, fallback string) string {
	raw := ""
	if b, err := os.ReadFile(filepath.Join(root, "TEMPLATE", name)); err == nil {
		raw = string(b)
	} else if b, err := templates.FS.ReadFile(name); err == nil {
		raw = string(b)
	}
	if raw == "" {
		return fallback
	}
	_, body, err := splitFrontmatter(raw)
	if err != nil {
		return fallback
	}
	if strings.TrimSpace(body) == "" {
		return fallback
	}
	return body
}
