package store

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/pelletier/go-toml/v2"
	"github.com/yashikota/kotowari/internal/domain"
)

func load(root string) (*mem, error) {
	raw, err := os.ReadFile(filepath.Join(root, "workspace.toml"))
	if err != nil {
		return nil, err
	}
	m := &mem{Comments: map[string][]Comment{}, commentSeq: map[string]int64{}}
	if err := toml.Unmarshal(raw, &m.Workspace); err != nil {
		return nil, fmt.Errorf("workspace.toml: %w", err)
	}
	if !domain.ValidPrefix(domain.NormalizePrefix(m.Workspace.IssuePrefix, domain.DefaultIssuePrefix)) ||
		!domain.ValidPrefix(domain.NormalizePrefix(m.Workspace.ADRPrefix, domain.DefaultADRPrefix)) {
		return nil, validationf("workspace prefixes must contain only ASCII letters, digits, underscores or hyphens")
	}
	if m.Workspace.NextID < 1 {
		m.Workspace.NextID = 1
	}

	if b, err := os.ReadFile(filepath.Join(root, "labels.toml")); err == nil {
		var lf labelsFile
		if err := toml.Unmarshal(b, &lf); err != nil {
			return nil, fmt.Errorf("labels.toml: %w", err)
		}
		m.Labels = lf.Labels
	}
	if m.Labels == nil {
		m.Labels = []Label{}
	}
	for i := range m.Labels {
		if m.Labels[i].ID == 0 {
			m.Labels[i].ID = m.nextID()
		} else {
			m.observeID(m.Labels[i].ID)
		}
	}

	if err := readTOMLDir(filepath.Join(root, "projects"), func(name string, b []byte) error {
		var p Project
		if err := toml.Unmarshal(b, &p); err != nil {
			return err
		}
		stem := strings.TrimSuffix(name, ".toml")
		if p.Slug != "" && p.Slug != stem {
			m.diag("projects/"+name, "slug_mismatch", fmt.Sprintf("slug %q does not match filename", p.Slug))
		}
		p.Slug = stem
		if p.ID == 0 {
			p.ID = m.nextID()
		} else {
			m.observeID(p.ID)
		}
		if p.Milestones == nil {
			p.Milestones = []Milestone{}
		}
		for i := range p.Milestones {
			if p.Milestones[i].ID == 0 {
				p.Milestones[i].ID = m.nextID()
			} else {
				m.observeID(p.Milestones[i].ID)
			}
		}
		m.Projects = append(m.Projects, p)
		return nil
	}); err != nil {
		return nil, err
	}

	if err := readTOMLDir(filepath.Join(root, "initiatives"), func(name string, b []byte) error {
		var initiative Initiative
		if err := toml.Unmarshal(b, &initiative); err != nil {
			return err
		}
		stem := strings.TrimSuffix(name, ".toml")
		if initiative.Slug != "" && initiative.Slug != stem {
			m.diag("initiatives/"+name, "slug_mismatch", fmt.Sprintf("slug %q does not match filename", initiative.Slug))
		}
		initiative.Slug = stem
		if initiative.ID == 0 {
			initiative.ID = m.nextID()
		} else {
			m.observeID(initiative.ID)
		}
		m.Initiatives = append(m.Initiatives, initiative)
		return nil
	}); err != nil {
		return nil, err
	}

	if err := readTOMLDir(filepath.Join(root, "cycles"), func(name string, b []byte) error {
		var c Cycle
		if err := toml.Unmarshal(b, &c); err != nil {
			return err
		}
		stem := strings.TrimSuffix(name, ".toml")
		n, err := strconv.Atoi(stem)
		if err != nil || n < 1 {
			return fmt.Errorf("filename must be <n>.toml")
		}
		if c.Number != 0 && c.Number != n {
			m.diag("cycles/"+name, "number_mismatch", fmt.Sprintf("number %d does not match filename", c.Number))
		}
		c.Number = n
		if c.ID == 0 {
			c.ID = m.nextID()
		} else {
			m.observeID(c.ID)
		}
		m.Cycles = append(m.Cycles, c)
		return nil
	}); err != nil {
		return nil, err
	}

	if err := readTOMLDir(filepath.Join(root, "views"), func(name string, b []byte) error {
		var v View
		if err := toml.Unmarshal(b, &v); err != nil {
			return err
		}
		stem := strings.TrimSuffix(name, ".toml")
		if v.Slug != "" && v.Slug != stem {
			m.diag("views/"+name, "slug_mismatch", fmt.Sprintf("slug %q does not match filename", v.Slug))
		}
		v.Slug = stem
		if v.ID == 0 {
			v.ID = m.nextID()
		} else {
			m.observeID(v.ID)
		}
		if v.Labels == nil {
			v.Labels = []string{}
		}
		m.Views = append(m.Views, v)
		return nil
	}); err != nil {
		return nil, err
	}

	issueDir := filepath.Join(root, "issues")
	if err := loadIssues(root, issueDir, m); err != nil {
		return nil, err
	}
	if err := loadADRs(root, filepath.Join(root, "adr"), m); err != nil {
		return nil, err
	}

	pageDir := filepath.Join(root, "pages")
	pents, err := os.ReadDir(pageDir)
	if err != nil && !os.IsNotExist(err) {
		return nil, err
	}
	for _, ent := range pents {
		if ent.IsDir() || !strings.HasSuffix(ent.Name(), ".md") {
			continue
		}
		b, err := os.ReadFile(filepath.Join(pageDir, ent.Name()))
		if err != nil {
			return nil, err
		}
		stem := strings.TrimSuffix(ent.Name(), ".md")
		p, err := parsePageMarkdown(string(b), m)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", ent.Name(), err)
		}
		if p.Slug != "" && p.Slug != stem {
			m.diag("pages/"+ent.Name(), "slug_mismatch", fmt.Sprintf("slug %q does not match filename", p.Slug))
		}
		p.Slug = stem
		m.Pages = append(m.Pages, p)
	}

	if b, err := os.ReadFile(filepath.Join(root, "activities.jsonl")); err == nil {
		for _, line := range strings.Split(string(b), "\n") {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}
			var a Activity
			if err := json.Unmarshal([]byte(line), &a); err != nil {
				return nil, fmt.Errorf("activities.jsonl: %w", err)
			}
			m.Activities = append(m.Activities, a)
		}
	}

	fillIssueRefs(m)
	fillPageRefs(m)
	fillADRRefs(m)
	diagnose(m)
	return m, nil
}
