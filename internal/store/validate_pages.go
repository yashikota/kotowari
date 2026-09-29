package store

import (
	"fmt"

	"github.com/yashikota/kotowari/internal/domain"
)

func diagnosePages(m *mem) {
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
}
