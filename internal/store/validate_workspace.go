package store

import (
	"fmt"

	"github.com/yashikota/kotowari/internal/domain"
)

func diagnoseWorkspace(m *mem) {
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
		if p.WorkflowStatus != "" {
			if status, ok := projectWorkflowStatusByID(m.Workspace, p.WorkflowStatus); !ok || status.Category != p.Status {
				m.diag(path, "invalid_workflow_status", fmt.Sprintf("invalid workflow status %q for category %q", p.WorkflowStatus, p.Status))
			}
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
}
