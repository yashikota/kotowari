package store

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/pelletier/go-toml/v2"
	"github.com/yashikota/kotowari/internal/domain"
)

func save(root string, m *mem) error {
	if err := os.MkdirAll(filepath.Join(root, "issues"), 0o755); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Join(root, "adr"), 0o755); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Join(root, "pages"), 0o755); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Join(root, "projects"), 0o755); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Join(root, "initiatives"), 0o755); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Join(root, "cycles"), 0o755); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Join(root, "views"), 0o755); err != nil {
		return err
	}

	if err := writeTOML(filepath.Join(root, "workspace.toml"), m.Workspace); err != nil {
		return err
	}
	if err := writeTOML(filepath.Join(root, "labels.toml"), labelsFile{Labels: m.Labels}); err != nil {
		return err
	}
	_ = os.Remove(filepath.Join(root, "workspace.yaml"))
	_ = os.Remove(filepath.Join(root, "labels.yaml"))

	wantProjects := map[string]struct{}{}
	for _, p := range m.Projects {
		wantProjects[p.Slug+".toml"] = struct{}{}
		if err := writeTOML(filepath.Join(root, "projects", p.Slug+".toml"), p); err != nil {
			return err
		}
	}
	if err := pruneDir(filepath.Join(root, "projects"), ".toml", wantProjects); err != nil {
		return err
	}
	_ = pruneDir(filepath.Join(root, "projects"), ".yaml", map[string]struct{}{})

	wantInitiatives := map[string]struct{}{}
	for _, initiative := range m.Initiatives {
		name := initiative.Slug + ".toml"
		wantInitiatives[name] = struct{}{}
		if err := writeTOML(filepath.Join(root, "initiatives", name), initiative); err != nil {
			return err
		}
	}
	if err := pruneDir(filepath.Join(root, "initiatives"), ".toml", wantInitiatives); err != nil {
		return err
	}

	wantCycles := map[string]struct{}{}
	for _, c := range m.Cycles {
		name := fmt.Sprintf("%d.toml", c.Number)
		wantCycles[name] = struct{}{}
		if err := writeTOML(filepath.Join(root, "cycles", name), c); err != nil {
			return err
		}
	}
	if err := pruneDir(filepath.Join(root, "cycles"), ".toml", wantCycles); err != nil {
		return err
	}
	_ = pruneDir(filepath.Join(root, "cycles"), ".yaml", map[string]struct{}{})

	wantViews := map[string]struct{}{}
	for _, v := range m.Views {
		wantViews[v.Slug+".toml"] = struct{}{}
		if err := writeTOML(filepath.Join(root, "views", v.Slug+".toml"), v); err != nil {
			return err
		}
	}
	if err := pruneDir(filepath.Join(root, "views"), ".toml", wantViews); err != nil {
		return err
	}

	wantIssueDirs := map[string]struct{}{}
	for _, iss := range m.Issues {
		dirName := domain.DirName(iss.Number)
		wantIssueDirs[dirName] = struct{}{}
		md := renderIssueMarkdown(iss, m.Comments[iss.Identifier], m)
		if err := atomicWrite(filepath.Join(root, "issues", dirName, "README.md"), []byte(md)); err != nil {
			return err
		}
	}
	if err := pruneEntityDirs(filepath.Join(root, "issues"), wantIssueDirs); err != nil {
		return err
	}

	for _, a := range m.ADRs {
		dirName := domain.DirName(a.Number)
		md := renderADRMarkdown(a)
		if err := atomicWrite(filepath.Join(root, "adr", dirName, "README.md"), []byte(md)); err != nil {
			return err
		}
		pubPath := filepath.Join(root, "adr", dirName, "PUBLISH.md")
		if a.PublishBody != "" {
			if err := atomicWrite(pubPath, []byte(a.PublishBody)); err != nil {
				return err
			}
		}
	}
	// ADR directories are append-only, like RFCs. Do not remove numbered trees.

	wantPages := map[string]struct{}{}
	for _, p := range m.Pages {
		name := p.Slug + ".md"
		wantPages[name] = struct{}{}
		md := renderPageMarkdown(p, m)
		if err := atomicWrite(filepath.Join(root, "pages", name), []byte(md)); err != nil {
			return err
		}
	}
	if err := pruneDir(filepath.Join(root, "pages"), ".md", wantPages); err != nil {
		return err
	}

	var buf bytes.Buffer
	for _, a := range m.Activities {
		b, err := json.Marshal(a)
		if err != nil {
			return err
		}
		buf.Write(b)
		buf.WriteByte('\n')
	}
	if err := atomicWrite(filepath.Join(root, "activities.jsonl"), buf.Bytes()); err != nil {
		return err
	}
	return nil
}

func readTOMLDir(dir string, fn func(name string, b []byte) error) error {
	ents, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	for _, ent := range ents {
		if ent.IsDir() || !strings.HasSuffix(ent.Name(), ".toml") {
			continue
		}
		b, err := os.ReadFile(filepath.Join(dir, ent.Name()))
		if err != nil {
			return err
		}
		if err := fn(ent.Name(), b); err != nil {
			return fmt.Errorf("%s: %w", ent.Name(), err)
		}
	}
	return nil
}

func writeTOML(path string, v any) error {
	b, err := toml.Marshal(v)
	if err != nil {
		return err
	}
	return atomicWrite(path, b)
}

func atomicWrite(path string, data []byte) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	f, err := os.CreateTemp(filepath.Dir(path), ".kotowari-*")
	if err != nil {
		return err
	}
	tmp := f.Name()
	defer func() { _ = os.Remove(tmp) }()
	if _, err := f.Write(data); err != nil {
		_ = f.Close()
		return err
	}
	if err := f.Sync(); err != nil {
		_ = f.Close()
		return err
	}
	if err := f.Close(); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func pruneDir(dir, ext string, keep map[string]struct{}) error {
	ents, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	for _, ent := range ents {
		if ent.IsDir() || !strings.HasSuffix(ent.Name(), ext) {
			continue
		}
		if _, ok := keep[ent.Name()]; ok {
			continue
		}
		if err := os.Remove(filepath.Join(dir, ent.Name())); err != nil {
			return err
		}
	}
	return nil
}
