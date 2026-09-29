package store

import (
	"strings"

	"github.com/pelletier/go-toml/v2"
	"github.com/yashikota/kotowari/internal/domain"
)

type pageFM struct {
	ID      int64    `toml:"id"`
	Title   string   `toml:"title"`
	Slug    string   `toml:"slug"`
	Status  string   `toml:"status"`
	Date    *string  `toml:"date,omitempty"`
	Tags    []string `toml:"tags"`
	Project *string  `toml:"project,omitempty"`
	Parent  *string  `toml:"parent,omitempty"`
	Created string   `toml:"created"`
	Updated string   `toml:"updated"`
}

func parsePageMarkdown(raw string, m *mem) (Page, error) {
	block, body, err := splitFrontmatter(raw)
	if err != nil {
		return Page{}, err
	}
	var fm pageFM
	if strings.TrimSpace(block) != "" {
		if err := toml.Unmarshal([]byte(block), &fm); err != nil {
			return Page{}, err
		}
	}
	if fm.Status == "" {
		fm.Status = "proposed"
	}
	if fm.Tags == nil {
		fm.Tags = []string{}
	}
	if fm.Created == "" {
		fm.Created = domain.Now()
	}
	if fm.Updated == "" {
		fm.Updated = fm.Created
	}
	p := Page{
		ID:          fm.ID,
		Title:       fm.Title,
		Slug:        fm.Slug,
		Body:        body,
		Status:      fm.Status,
		Date:        fm.Date,
		Tags:        fm.Tags,
		ProjectSlug: fm.Project,
		ParentSlug:  fm.Parent,
		CreatedAt:   fm.Created,
		UpdatedAt:   fm.Updated,
	}
	if p.ID == 0 {
		p.ID = m.nextID()
	} else {
		m.observeID(p.ID)
	}
	return p, nil
}

func renderPageMarkdown(p Page, m *mem) string {
	fm := pageFM{
		ID:      p.ID,
		Title:   p.Title,
		Slug:    p.Slug,
		Status:  p.Status,
		Date:    p.Date,
		Tags:    p.Tags,
		Created: p.CreatedAt,
		Updated: p.UpdatedAt,
	}
	if fm.Tags == nil {
		fm.Tags = []string{}
	}
	if p.ProjectID != nil {
		if proj, ok := projectByID(m, *p.ProjectID); ok {
			slug := proj.Slug
			fm.Project = &slug
		}
	} else if p.ProjectSlug != nil {
		fm.Project = p.ProjectSlug
	}
	if p.ParentID != nil {
		if parent, ok := pageByID(m, *p.ParentID); ok {
			slug := parent.Slug
			fm.Parent = &slug
		}
	} else if p.ParentSlug != nil {
		fm.Parent = p.ParentSlug
	}
	return marshalDoc(fm, p.Body)
}
