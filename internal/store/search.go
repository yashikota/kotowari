package store

import "strings"

func (s *Store) Search(q string) ([]SearchHit, error) {
	q = strings.ToLower(strings.TrimSpace(q))
	var hits []SearchHit
	err := s.snapshot(func(m *mem) error {
		if q == "" {
			hits = []SearchHit{}
			return nil
		}
		for _, iss := range m.Issues {
			commentSnippet := ""
			for _, comment := range m.Comments[iss.Identifier] {
				if strings.Contains(strings.ToLower(comment.Body), q) {
					commentSnippet = searchSnippet(comment.Body, q)
					break
				}
			}
			if strings.Contains(strings.ToLower(iss.Title), q) || strings.Contains(strings.ToLower(iss.Identifier), q) || strings.Contains(strings.ToLower(iss.Body), q) || commentSnippet != "" {
				snippet := searchSnippet(iss.Body, q)
				if snippet == "" {
					snippet = commentSnippet
				}
				hits = append(hits, SearchHit{
					Kind: "issue", ID: iss.Identifier, Title: iss.Title, Status: iss.Status,
					Archived:  iss.ArchivedAt != nil,
					CreatedAt: iss.CreatedAt, UpdatedAt: iss.UpdatedAt,
					Snippet: snippet,
				})
			}
		}
		for _, p := range m.Projects {
			if strings.Contains(strings.ToLower(p.Name), q) || strings.Contains(strings.ToLower(p.Slug), q) {
				hits = append(hits, SearchHit{
					Kind: "project", ID: p.Slug, Title: p.Name,
					CreatedAt: p.CreatedAt, UpdatedAt: p.UpdatedAt,
				})
			}
		}
		for _, v := range m.Views {
			if strings.Contains(strings.ToLower(v.Name), q) || strings.Contains(strings.ToLower(v.Slug), q) {
				hits = append(hits, SearchHit{
					Kind: "view", ID: v.Slug, Title: v.Name,
					CreatedAt: v.CreatedAt, UpdatedAt: v.UpdatedAt,
				})
			}
		}
		for _, a := range m.ADRs {
			if strings.Contains(strings.ToLower(a.Title), q) || strings.Contains(strings.ToLower(a.Identifier), q) || strings.Contains(strings.ToLower(a.Body+"\n"+a.PublishBody), q) {
				hits = append(hits, SearchHit{
					Kind: "adr", ID: a.Identifier, Title: a.Title,
					CreatedAt: a.CreatedAt, UpdatedAt: a.UpdatedAt,
					Snippet: searchSnippet(a.Body+"\n"+a.PublishBody, q),
				})
			}
		}
		for _, p := range m.Pages {
			if strings.Contains(strings.ToLower(p.Title), q) || strings.Contains(strings.ToLower(p.Slug), q) || strings.Contains(strings.ToLower(p.Body), q) {
				hits = append(hits, SearchHit{
					Kind: "page", ID: p.Slug, Title: p.Title,
					CreatedAt: p.CreatedAt, UpdatedAt: p.UpdatedAt,
					Snippet: searchSnippet(p.Body, q),
				})
			}
		}
		if hits == nil {
			hits = []SearchHit{}
		}
		return nil
	})
	return hits, err
}

func (s *Store) Counts() (issues, pages, adrs int, err error) {
	err = s.snapshot(func(m *mem) error {
		issues = len(m.Issues)
		pages = len(m.Pages)
		adrs = len(m.ADRs)
		return nil
	})
	return
}
