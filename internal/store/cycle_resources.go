package store

import (
	"net/url"
	"strings"

	"github.com/yashikota/kotowari/internal/domain"
)

func (s *Store) AddCycleLink(number int, in CreateIssueLinkInput) (IssueLink, error) {
	in.URL = strings.TrimSpace(in.URL)
	in.Title = strings.TrimSpace(in.Title)
	in.Kind = strings.TrimSpace(in.Kind)
	parsed, err := url.Parse(in.URL)
	if err != nil || !parsed.IsAbs() || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return IssueLink{}, validationf("link URL must be an absolute http or https URL")
	}
	if in.Kind == "" {
		in.Kind = "link"
	}
	if in.Kind != "link" && in.Kind != "document" {
		return IssueLink{}, validationf("invalid cycle resource kind")
	}
	var out IssueLink
	err = s.mutate(func(m *mem) error {
		i := indexCycle(m, number)
		if i < 0 {
			return ErrNotFound
		}
		cycle := m.Cycles[i]
		for _, existing := range cycle.Resources {
			if existing.URL == in.URL {
				return errf(ErrConflict, "resource already exists")
			}
		}
		var id int64 = 1
		for _, existing := range cycle.Resources {
			if existing.ID >= id {
				id = existing.ID + 1
			}
		}
		now := domain.Now()
		out = IssueLink{ID: id, URL: in.URL, Title: in.Title, Kind: in.Kind, CreatedAt: now}
		cycle.Resources = append(cycle.Resources, out)
		cycle.UpdatedAt = now
		m.Cycles[i] = cycle
		m.bump(now)
		return nil
	})
	return out, err
}

func (s *Store) RemoveCycleLink(number int, linkID int64) error {
	if linkID < 1 {
		return validationf("invalid resource id")
	}
	return s.mutate(func(m *mem) error {
		i := indexCycle(m, number)
		if i < 0 {
			return ErrNotFound
		}
		cycle := m.Cycles[i]
		for index, resource := range cycle.Resources {
			if resource.ID != linkID {
				continue
			}
			cycle.Resources = append(cycle.Resources[:index], cycle.Resources[index+1:]...)
			cycle.UpdatedAt = domain.Now()
			m.Cycles[i] = cycle
			m.bump(cycle.UpdatedAt)
			return nil
		}
		return ErrNotFound
	})
}
