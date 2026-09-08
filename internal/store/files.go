package store

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/pelletier/go-toml/v2"
	"github.com/yashikota/kotowari/internal/domain"
)

// workspaceFiles serializes managed records; assets and experiments are never rewritten.
func workspaceFiles(m *mem) (map[string][]byte, error) {
	out := map[string][]byte{}
	put := func(path string, v any) error { b, err := toml.Marshal(v); out[path] = b; return err }
	if err := put("workspace.toml", m.Workspace); err != nil {
		return nil, err
	}
	if err := put("labels.toml", labelsFile{Labels: m.Labels}); err != nil {
		return nil, err
	}
	for _, p := range m.Projects {
		if err := put("projects/"+p.Slug+".toml", p); err != nil {
			return nil, err
		}
	}
	for _, c := range m.Cycles {
		if err := put(fmt.Sprintf("cycles/%d.toml", c.Number), c); err != nil {
			return nil, err
		}
	}
	for _, v := range m.Views {
		if err := put("views/"+v.Slug+".toml", v); err != nil {
			return nil, err
		}
	}
	for _, i := range m.Issues {
		out["issues/"+domain.DirName(i.Number)+"/README.md"] = []byte(renderIssueMarkdown(i, m.Comments[i.Identifier], m))
	}
	for _, a := range m.ADRs {
		base := "adr/" + domain.DirName(a.Number) + "/"
		out[base+"README.md"] = []byte(renderADRMarkdown(a))
		if a.PublishBody != "" {
			out[base+"PUBLISH.md"] = []byte(a.PublishBody)
		}
	}
	for _, p := range m.Pages {
		out["pages/"+p.Slug+".md"] = []byte(renderPageMarkdown(p, m))
	}
	var buf bytes.Buffer
	for _, a := range m.Activities {
		b, err := json.Marshal(a)
		if err != nil {
			return nil, err
		}
		buf.Write(b)
		buf.WriteByte('\n')
	}
	out["activities.jsonl"] = buf.Bytes()
	return out, nil
}

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
	// Check every changed record before writing any of them. External tools do not
	// participate in our mutex; a writer racing after this check remains possible.
	for _, p := range ordered {
		b, err := os.ReadFile(filepath.Join(root, p))
		if err != nil && !os.IsNotExist(err) {
			return err
		}
		if !bytes.Equal(b, raw[p]) {
			return fmt.Errorf("%w: %s changed on disk; reload before saving", ErrConflict, p)
		}
	}
	for _, p := range ordered {
		target := filepath.Join(root, p)
		if b, ok := after[p]; ok {
			if err := atomicWrite(target, b); err != nil {
				return err
			}
		} else if strings.HasPrefix(p, "issues/") && strings.HasSuffix(p, "/README.md") {
			// An issue deletion owns the whole issue directory, including auxiliary files.
			if err := os.RemoveAll(filepath.Dir(target)); err != nil {
				return err
			}
		} else if err := os.Remove(target); err != nil && !os.IsNotExist(err) {
			return err
		}
	}
	return nil
}

// copyADRAssets copies only regular files from the explicit document asset tree.
func copyADRAssets(src, dest string) error {
	dirs, err := os.ReadDir(filepath.Join(src, "adr"))
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	for _, d := range dirs {
		if _, ok := domain.ParseDirName(d.Name()); !ok || !d.IsDir() {
			continue
		}
		base := filepath.Join(src, "adr", d.Name(), "assets")
		if _, err := os.Lstat(base); os.IsNotExist(err) {
			continue
		}
		err := filepath.WalkDir(base, func(path string, entry fs.DirEntry, walkErr error) error {
			if walkErr != nil {
				return walkErr
			}
			if entry.Type()&os.ModeSymlink != 0 {
				return validationf("asset symlinks are not supported: %s", path)
			}
			if entry.IsDir() {
				return nil
			}
			if !entry.Type().IsRegular() {
				return validationf("asset must be a regular file: %s", path)
			}
			rel, err := filepath.Rel(base, path)
			if err != nil {
				return err
			}
			b, err := os.ReadFile(path)
			if err != nil {
				return err
			}
			return atomicWrite(filepath.Join(dest, "adr", d.Name(), "assets", rel), b)
		})
		if err != nil {
			return err
		}
	}
	return nil
}

func replaceADRAssets(src, dest string) error {
	// Validate and stage incoming assets before removing an old asset tree.
	stage, err := os.MkdirTemp(dest, ".assets-*")
	if err != nil {
		return err
	}
	defer func() { _ = os.RemoveAll(stage) }()
	if err := copyADRAssets(src, stage); err != nil {
		return err
	}
	dirs, err := os.ReadDir(filepath.Join(dest, "adr"))
	if err != nil {
		return err
	}
	for _, d := range dirs {
		if _, ok := domain.ParseDirName(d.Name()); !ok || !d.IsDir() {
			continue
		}
		target := filepath.Join(dest, "adr", d.Name(), "assets")
		incoming := filepath.Join(stage, "adr", d.Name(), "assets")
		if err := os.RemoveAll(target); err != nil {
			return err
		}
		if _, err := os.Stat(incoming); os.IsNotExist(err) {
			continue
		} else if err != nil {
			return err
		}
		if err := os.Rename(incoming, target); err != nil {
			return err
		}
	}
	return nil
}
