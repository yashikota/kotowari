package store

import (
	"bytes"
	"encoding/json"
	"fmt"

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
	for _, initiative := range m.Initiatives {
		if err := put("initiatives/"+initiative.Slug+".toml", initiative); err != nil {
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
