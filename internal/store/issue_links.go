package store

import (
	"net/url"
	"strings"

	"github.com/yashikota/kotowari/internal/domain"
)

func (s *Store) AddIssueLink(identifier string, in CreateIssueLinkInput) (IssueLink, error) {
	var err error
	in, err = normalizeIssueLink(in)
	if err != nil {
		return IssueLink{}, err
	}
	var out IssueLink
	err = s.mutate(func(m *mem) error {
		i := indexIssue(m, identifier)
		if i < 0 {
			return ErrNotFound
		}
		iss := m.Issues[i]
		if err := ensureIssueActive(iss); err != nil {
			return err
		}
		for _, existing := range iss.ExternalLinks {
			if existing.URL == in.URL {
				return errf(ErrConflict, "link already exists")
			}
		}
		var id int64 = 1
		for _, existing := range iss.ExternalLinks {
			if existing.ID >= id {
				id = existing.ID + 1
			}
		}
		now := domain.Now()
		out = IssueLink{ID: id, URL: in.URL, Title: in.Title, Kind: in.Kind, CreatedAt: now}
		iss.ExternalLinks = append(iss.ExternalLinks, out)
		iss.UpdatedAt = now
		m.Issues[i] = iss
		addActivity(m, "issue", iss.ID, "link_added", map[string]any{"url": out.URL, "title": out.Title, "kind": out.Kind}, now)
		m.bump(now)
		return nil
	})
	return out, err
}

func normalizeIssueLink(in CreateIssueLinkInput) (CreateIssueLinkInput, error) {
	in.URL = strings.TrimSpace(in.URL)
	in.Title = strings.TrimSpace(in.Title)
	in.Kind = strings.TrimSpace(in.Kind)
	parsed, err := url.Parse(in.URL)
	if err != nil || !parsed.IsAbs() || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return CreateIssueLinkInput{}, validationf("link URL must be an absolute http or https URL")
	}
	if in.Kind == "" {
		in.Kind = "link"
	}
	if in.Kind != "link" && in.Kind != "pullRequest" && in.Kind != "document" {
		return CreateIssueLinkInput{}, validationf("invalid link kind")
	}
	return in, nil
}

func normalizeIssueLinks(inputs []CreateIssueLinkInput) ([]CreateIssueLinkInput, error) {
	links := make([]CreateIssueLinkInput, 0, len(inputs))
	seen := make(map[string]struct{}, len(inputs))
	for _, input := range inputs {
		link, err := normalizeIssueLink(input)
		if err != nil {
			return nil, err
		}
		if _, exists := seen[link.URL]; exists {
			return nil, errf(ErrConflict, "link already exists")
		}
		seen[link.URL] = struct{}{}
		links = append(links, link)
	}
	return links, nil
}

func (s *Store) RemoveIssueLink(identifier string, linkID int64) error {
	if linkID < 1 {
		return validationf("invalid link id")
	}
	return s.mutate(func(m *mem) error {
		i := indexIssue(m, identifier)
		if i < 0 {
			return ErrNotFound
		}
		iss := m.Issues[i]
		if err := ensureIssueActive(iss); err != nil {
			return err
		}
		for index, link := range iss.ExternalLinks {
			if link.ID != linkID {
				continue
			}
			iss.ExternalLinks = append(iss.ExternalLinks[:index], iss.ExternalLinks[index+1:]...)
			now := domain.Now()
			iss.UpdatedAt = now
			m.Issues[i] = iss
			addActivity(m, "issue", iss.ID, "link_removed", map[string]any{"url": link.URL, "title": link.Title, "kind": link.Kind}, now)
			m.bump(now)
			return nil
		}
		return ErrNotFound
	})
}
