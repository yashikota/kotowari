package store

import (
	"strings"

	"github.com/yashikota/kotowari/internal/domain"
)

func (s *Store) ListPages() ([]Page, error) {
	var out []Page
	err := s.snapshot(func(m *mem) error {
		out = append([]Page{}, m.Pages...)
		if out == nil {
			out = []Page{}
		}
		return nil
	})
	return out, err
}

func (s *Store) GetPage(slug string) (Page, error) {
	var p Page
	err := s.snapshot(func(m *mem) error {
		got, ok := pageBySlug(m, slug)
		if !ok {
			return ErrNotFound
		}
		p = got
		return nil
	})
	return p, err
}

func (s *Store) CreatePage(title, slug, body, status string, parentID, projectID *int64, date *string, tags []string) (Page, error) {
	return s.CreatePageFromInput(CreatePageInput{
		Title: title, Slug: slug, Body: body, Status: status,
		ParentID: parentID, ProjectID: projectID, Date: date, Tags: tags,
	})
}

func (s *Store) CreatePageFromInput(in CreatePageInput) (Page, error) {
	title, slug, body, status := in.Title, in.Slug, in.Body, in.Status
	parentID, projectID, date, tags := in.ParentID, in.ProjectID, in.Date, in.Tags
	title = strings.TrimSpace(title)
	slug = strings.TrimSpace(slug)
	if title == "" {
		return Page{}, validationf("title required")
	}
	if !domain.ValidSlug(slug) {
		return Page{}, validationf("invalid slug")
	}
	if status == "" {
		status = "proposed"
	}
	if !domain.ValidPageStatus(status) {
		return Page{}, validationf("invalid status")
	}
	if tags == nil {
		tags = []string{}
	}
	now := domain.Now()
	var out Page
	err := s.mutate(func(m *mem) error {
		if _, ok := pageBySlug(m, slug); ok {
			return errf(ErrConflict, "slug")
		}
		if err := checkPageParent(m, 0, parentID); err != nil {
			return err
		}
		out = Page{
			ID: m.nextID(), Title: title, Slug: slug, Body: body, ParentID: parentID, ProjectID: projectID,
			Status: status, Date: date, Tags: tags, CreatedAt: now, UpdatedAt: now,
		}
		if parentID != nil {
			if parent, ok := pageByID(m, *parentID); ok {
				ps := parent.Slug
				out.ParentSlug = &ps
			}
		}
		if projectID != nil {
			if proj, ok := projectByID(m, *projectID); ok {
				ps := proj.Slug
				out.ProjectSlug = &ps
			}
		}
		m.Pages = append(m.Pages, out)
		addActivity(m, "page", out.ID, "created", map[string]any{"slug": slug}, now)
		m.bump(now)
		return nil
	})
	return out, err
}

func (s *Store) UpdatePage(slug string, title, body, status *string, parentID, projectID **int64, date **string, tags *[]string) (Page, error) {
	return s.UpdatePageFromInput(UpdatePageInput{
		Slug: slug, Title: title, Body: body, Status: status,
		ParentID: parentID, ProjectID: projectID, Date: date, Tags: tags,
	})
}

func (s *Store) UpdatePageFromInput(in UpdatePageInput) (Page, error) {
	slug, title, body, status := in.Slug, in.Title, in.Body, in.Status
	parentID, projectID, date, tags := in.ParentID, in.ProjectID, in.Date, in.Tags
	var out Page
	err := s.mutate(func(m *mem) error {
		i := indexPage(m, slug)
		if i < 0 {
			return ErrNotFound
		}
		p := m.Pages[i]
		if title != nil {
			if strings.TrimSpace(*title) == "" {
				return validationf("title required")
			}
			p.Title = strings.TrimSpace(*title)
		}
		if body != nil {
			p.Body = *body
		}
		if status != nil {
			if !domain.ValidPageStatus(*status) {
				return validationf("invalid status")
			}
			p.Status = *status
		}
		if parentID != nil {
			if err := checkPageParent(m, p.ID, *parentID); err != nil {
				return err
			}
			p.ParentID = *parentID
			p.ParentSlug = nil
			if p.ParentID != nil {
				if parent, ok := pageByID(m, *p.ParentID); ok {
					ps := parent.Slug
					p.ParentSlug = &ps
				}
			}
		}
		if projectID != nil {
			p.ProjectID = *projectID
			p.ProjectSlug = nil
			if p.ProjectID != nil {
				if proj, ok := projectByID(m, *p.ProjectID); ok {
					ps := proj.Slug
					p.ProjectSlug = &ps
				}
			}
		}
		if date != nil {
			p.Date = *date
		}
		if tags != nil {
			p.Tags = *tags
		}
		now := domain.Now()
		p.UpdatedAt = now
		m.Pages[i] = p
		m.bump(now)
		out = p
		return nil
	})
	return out, err
}

func (s *Store) DeletePage(slug string) error {
	return s.mutate(func(m *mem) error {
		i := indexPage(m, slug)
		if i < 0 {
			return ErrNotFound
		}
		m.Pages = append(m.Pages[:i], m.Pages[i+1:]...)
		m.bump(domain.Now())
		return nil
	})
}

func checkPageParent(m *mem, pageID int64, parentID *int64) error {
	if parentID == nil {
		return nil
	}
	if *parentID == pageID && pageID != 0 {
		return validationf("page cannot be its own parent")
	}
	cur := *parentID
	seen := map[int64]struct{}{pageID: {}}
	for cur != 0 {
		if _, ok := seen[cur]; ok {
			return validationf("page parent cycle")
		}
		seen[cur] = struct{}{}
		p, ok := pageByID(m, cur)
		if !ok {
			return validationf("parent not found")
		}
		if p.ParentID == nil {
			return nil
		}
		cur = *p.ParentID
	}
	return nil
}
