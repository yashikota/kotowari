package store

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/yashikota/kotowari/internal/domain"
)

func saveWorkspaceSettings(root string, m *mem) error {
	if err := writeTOML(filepath.Join(root, "workspace.toml"), m.Workspace); err != nil {
		return err
	}
	if err := writeTOML(filepath.Join(root, "labels.toml"), labelsFile{Labels: m.Labels}); err != nil {
		return err
	}
	_ = os.Remove(filepath.Join(root, "workspace.yaml"))
	_ = os.Remove(filepath.Join(root, "labels.yaml"))
	return nil
}

func saveProjects(root string, m *mem) error {
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
	return nil
}

func saveInitiatives(root string, m *mem) error {
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
	return nil
}

func saveCycles(root string, m *mem) error {
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
	return nil
}

func saveViews(root string, m *mem) error {
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
	return nil
}

func saveIssues(root string, m *mem) error {
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
	return nil
}

func saveADRs(root string, m *mem) error {
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
	return nil
}

func savePages(root string, m *mem) error {
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
	return nil
}

func saveActivities(root string, m *mem) error {
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
