package store

import (
	"sort"
	"strings"
)

func validateIssueTemplateSlugs(slugs []string) error {
	if len(slugs) > 32 {
		return validationf("too many issue templates in filter")
	}
	for _, slug := range slugs {
		if slug != "no-template" && (slug == "" || issueTemplateSlug(slug) != slug) {
			return validationf("invalid issue template filter")
		}
	}
	return nil
}

func normalizeIssueTemplateSlugs(slugs []string) []string {
	seen := make(map[string]struct{}, len(slugs))
	out := make([]string, 0, len(slugs))
	for _, slug := range slugs {
		if _, ok := seen[slug]; ok {
			continue
		}
		seen[slug] = struct{}{}
		out = append(out, slug)
	}
	sort.Strings(out)
	return out
}

func matchesIssueTemplateSlugs(issue Issue, selected []string) bool {
	for _, slug := range selected {
		if slug == "no-template" && issue.TemplateSlug == "" ||
			slug != "no-template" && issue.TemplateSlug == slug {
			return true
		}
	}
	return false
}

func (s *Store) IssueTemplateFilterOptions() ([]IssueTemplateFilterOption, error) {
	templates, err := s.ListIssueTemplates()
	if err != nil {
		return nil, err
	}
	var out []IssueTemplateFilterOption
	err = s.snapshot(func(m *mem) error {
		counts := make(map[string]int)
		for _, issue := range m.Issues {
			if issue.ArchivedAt != nil {
				continue
			}
			id := issue.TemplateSlug
			if id == "" {
				id = "no-template"
			}
			counts[id]++
		}
		out = append(out, IssueTemplateFilterOption{
			ID: "no-template", Name: "No template", Count: counts["no-template"],
		})
		for _, template := range templates {
			out = append(out, IssueTemplateFilterOption{
				ID: template.Slug, Name: template.Name, Count: counts[template.Slug],
			})
		}
		sort.Slice(out, func(i, j int) bool {
			return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name)
		})
		return nil
	})
	return out, err
}
