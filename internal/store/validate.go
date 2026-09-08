package store

import (
	"fmt"
	"strings"

	"github.com/yashikota/kotowari/internal/domain"
)

func (s *Store) Diagnostics() ([]Diagnostic, error) {
	var out []Diagnostic
	err := s.snapshot(func(m *mem) error {
		out = append([]Diagnostic{}, m.Diagnostics...)
		if out == nil {
			out = []Diagnostic{}
		}
		return nil
	})
	return out, err
}

func (m *mem) diag(path, code, message string) {
	m.Diagnostics = append(m.Diagnostics, Diagnostic{Path: path, Code: code, Message: message})
}

func diagnose(m *mem) {
	seenLabel := map[string]struct{}{}
	for _, l := range m.Labels {
		path := "labels.toml"
		if l.Name == "" {
			m.diag(path, "label_name", "label name is empty")
		} else if _, ok := seenLabel[l.Name]; ok {
			m.diag(path, "duplicate_label", fmt.Sprintf("duplicate label %q", l.Name))
		} else {
			seenLabel[l.Name] = struct{}{}
		}
		if l.Color != "" && !validColor(l.Color) {
			m.diag(path, "invalid_color", fmt.Sprintf("label %q color %q", l.Name, l.Color))
		}
	}

	seenProject := map[string]struct{}{}
	for _, p := range m.Projects {
		path := "projects/" + p.Slug + ".toml"
		if _, ok := seenProject[p.Slug]; ok {
			m.diag(path, "duplicate_slug", fmt.Sprintf("duplicate project slug %q", p.Slug))
		} else {
			seenProject[p.Slug] = struct{}{}
		}
		if !domain.ValidSlug(p.Slug) {
			m.diag(path, "invalid_slug", fmt.Sprintf("invalid slug %q", p.Slug))
		}
		if p.Name == "" {
			m.diag(path, "missing_name", "name is empty")
		}
		if !domain.ValidProjectStatus(p.Status) {
			m.diag(path, "invalid_status", fmt.Sprintf("invalid status %q", p.Status))
		}
	}

	active := 0
	seenCycle := map[int]struct{}{}
	for _, c := range m.Cycles {
		path := fmt.Sprintf("cycles/%d.toml", c.Number)
		if _, ok := seenCycle[c.Number]; ok {
			m.diag(path, "duplicate_number", fmt.Sprintf("duplicate cycle %d", c.Number))
		} else {
			seenCycle[c.Number] = struct{}{}
		}
		if !domain.ValidCycleStatus(c.Status) {
			m.diag(path, "invalid_status", fmt.Sprintf("invalid status %q", c.Status))
		}
		if c.Status == "active" {
			active++
		}
	}
	if active > 1 {
		m.diag("cycles", "multiple_active", fmt.Sprintf("%d cycles are active", active))
	}

	seenView := map[string]struct{}{}
	for _, v := range m.Views {
		path := "views/" + v.Slug + ".toml"
		if _, ok := seenView[v.Slug]; ok {
			m.diag(path, "duplicate_slug", fmt.Sprintf("duplicate view slug %q", v.Slug))
		} else {
			seenView[v.Slug] = struct{}{}
		}
		if !domain.ValidSlug(v.Slug) {
			m.diag(path, "invalid_slug", fmt.Sprintf("invalid slug %q", v.Slug))
		}
		if v.Name == "" {
			m.diag(path, "missing_name", "name is empty")
		}
		if !domain.ValidViewDisplay(v.Display) {
			m.diag(path, "invalid_display", fmt.Sprintf("invalid display %q", v.Display))
		}
		if v.Status != nil && *v.Status != "" && !domain.ValidIssueStatus(*v.Status) {
			m.diag(path, "invalid_status", fmt.Sprintf("invalid status %q", *v.Status))
		}
		if v.Priority != nil && !domain.ValidPriority(*v.Priority) {
			m.diag(path, "invalid_priority", fmt.Sprintf("invalid priority %d", *v.Priority))
		}
	}

	for _, iss := range m.Issues {
		path := "issues/" + domain.DirName(iss.Number) + "/README.md"
		if !domain.ValidIssueStatus(iss.Status) {
			m.diag(path, "invalid_status", fmt.Sprintf("invalid status %q", iss.Status))
		}
		if strings.TrimSpace(iss.Title) == "" {
			m.diag(path, "missing_title", "title is required")
		}
		if strings.TrimSpace(iss.CreatedAt) == "" {
			m.diag(path, "missing_created", "created is required")
		}
		if strings.TrimSpace(iss.UpdatedAt) == "" {
			m.diag(path, "missing_updated", "updated is required")
		}
		if !domain.ValidPriority(iss.Priority) {
			m.diag(path, "invalid_priority", fmt.Sprintf("invalid priority %d", iss.Priority))
		}
		if iss.ProjectSlug != nil && iss.ProjectID == nil {
			m.diag(path, "dangling_project", fmt.Sprintf("unknown project %q", *iss.ProjectSlug))
		}
		if iss.CycleNumber != nil && iss.CycleID == nil {
			m.diag(path, "dangling_cycle", fmt.Sprintf("unknown cycle %d", *iss.CycleNumber))
		}
		if iss.ParentIdentifier != nil && iss.ParentID == nil {
			m.diag(path, "dangling_parent", fmt.Sprintf("unknown parent %q", *iss.ParentIdentifier))
		}
		if err := checkIssueParent(m, iss.ID, iss.ParentID); err != nil {
			m.diag(path, "parent_cycle", err.Error())
		}
		for _, l := range iss.Labels {
			if _, ok := labelByName(m, l.Name); !ok {
				m.diag(path, "unknown_label", fmt.Sprintf("unknown label %q", l.Name))
			}
		}
	}

	seenPage := map[string]struct{}{}
	for _, p := range m.Pages {
		path := "pages/" + p.Slug + ".md"
		if _, ok := seenPage[p.Slug]; ok {
			m.diag(path, "duplicate_slug", fmt.Sprintf("duplicate page slug %q", p.Slug))
		} else {
			seenPage[p.Slug] = struct{}{}
		}
		if p.Title == "" {
			m.diag(path, "missing_title", "title is empty")
		}
		if !domain.ValidSlug(p.Slug) {
			m.diag(path, "invalid_slug", fmt.Sprintf("invalid slug %q", p.Slug))
		}
		if !domain.ValidPageStatus(p.Status) {
			m.diag(path, "invalid_status", fmt.Sprintf("invalid status %q", p.Status))
		}
		if p.ProjectSlug != nil && p.ProjectID == nil {
			m.diag(path, "dangling_project", fmt.Sprintf("unknown project %q", *p.ProjectSlug))
		}
		if p.ParentSlug != nil && *p.ParentSlug != "" && p.ParentID == nil {
			m.diag(path, "dangling_parent", fmt.Sprintf("unknown parent %q", *p.ParentSlug))
		}
		if err := checkPageParent(m, p.ID, p.ParentID); err != nil {
			m.diag(path, "parent_cycle", err.Error())
		}
	}

	seenADR := map[int]struct{}{}
	for _, a := range m.ADRs {
		path := "adr/" + domain.DirName(a.Number) + "/README.md"
		if _, ok := seenADR[a.Number]; ok {
			m.diag(path, "duplicate_number", fmt.Sprintf("duplicate ADR %d", a.Number))
		} else {
			seenADR[a.Number] = struct{}{}
		}
		if a.Title == "" {
			m.diag(path, "missing_title", "title is empty")
		}
		if strings.TrimSpace(a.CreatedAt) == "" {
			m.diag(path, "missing_created", "created is required")
		}
		if strings.TrimSpace(a.UpdatedAt) == "" {
			m.diag(path, "missing_updated", "updated is required")
		}
		if !domain.ValidADRStatus(a.Status) {
			m.diag(path, "invalid_status", fmt.Sprintf("invalid status %q", a.Status))
		}
		for _, n := range a.IssueNumbers {
			if indexIssue(m, domain.Ident(m.issuePrefix(), n)) < 0 {
				m.diag(path, "dangling_issue", fmt.Sprintf("unknown issue %d", n))
			}
		}
		if a.Supersedes != nil {
			if _, ok := adrByNumber(m, *a.Supersedes); !ok {
				m.diag(path, "dangling_supersedes", fmt.Sprintf("unknown ADR %d", *a.Supersedes))
			}
		}
	}
	for _, a := range m.ADRs {
		path := "adr/" + domain.DirName(a.Number) + "/README.md"
		if a.Status != "superseded" {
			continue
		}
		found := false
		for _, o := range m.ADRs {
			if o.Supersedes != nil && *o.Supersedes == a.Number {
				found = true
				break
			}
		}
		if !found {
			m.diag(path, "missing_successor", "superseded ADR has no successor")
		}
	}
	for _, iss := range m.Issues {
		path := "issues/" + domain.DirName(iss.Number) + "/README.md"
		for _, n := range iss.ADRNumbers {
			if indexADR(m, domain.Ident(m.adrPrefix(), n)) < 0 {
				m.diag(path, "dangling_adr", fmt.Sprintf("unknown ADR %d", n))
				continue
			}
			a, _ := adrByNumber(m, n)
			if !containsInt(a.IssueNumbers, iss.Number) {
				m.diag(path, "one_sided_link", fmt.Sprintf("%s links %s but ADR does not link back", iss.Identifier, domain.Ident(m.adrPrefix(), n)))
			}
		}
	}
	for _, a := range m.ADRs {
		path := "adr/" + domain.DirName(a.Number) + "/README.md"
		for _, n := range a.IssueNumbers {
			iss, ok := issueByNumber(m, n)
			if !ok {
				continue
			}
			if !containsInt(iss.ADRNumbers, a.Number) {
				m.diag(path, "one_sided_link", fmt.Sprintf("ADR-%d links issue %d but issue does not link back", a.Number, n))
			}
		}
	}
}
