package store

import (
	"net/url"
	"sort"
	"strings"

	"github.com/yashikota/kotowari/internal/domain"
)

func issueLinkSource(rawURL string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return ""
	}
	host := strings.TrimPrefix(strings.ToLower(parsed.Hostname()), "www.")
	switch {
	case host == "github.com" || strings.HasSuffix(host, ".github.com"):
		return "github"
	case host == "slack.com" || strings.HasSuffix(host, ".slack.com"):
		return "slack"
	default:
		if domain.ValidIssueLinkSource(host) {
			return host
		}
		return ""
	}
}

func issueLinkSourceName(source string) string {
	switch source {
	case "github":
		return "GitHub"
	case "slack":
		return "Slack"
	case "no-source":
		return "No source"
	default:
		return source
	}
}

func normalizeIssueLinkSources(sources []string) []string {
	seen := make(map[string]struct{}, len(sources))
	out := make([]string, 0, len(sources))
	for _, source := range sources {
		source = strings.TrimSpace(source)
		if source == "" {
			continue
		}
		if _, ok := seen[source]; ok {
			continue
		}
		seen[source] = struct{}{}
		out = append(out, source)
	}
	sort.Strings(out)
	return out
}

func matchesIssueLinkSources(issue Issue, selected []string) bool {
	wanted := make(map[string]struct{}, len(selected))
	for _, source := range selected {
		wanted[source] = struct{}{}
	}
	if len(issue.ExternalLinks) == 0 {
		_, ok := wanted["no-source"]
		return ok
	}
	for _, link := range issue.ExternalLinks {
		if _, ok := wanted[issueLinkSource(link.URL)]; ok {
			return true
		}
	}
	return false
}

// IssueLinkSources returns the link providers currently represented in active issues.
func (s *Store) IssueLinkSources() ([]IssueLinkSource, error) {
	var out []IssueLinkSource
	err := s.snapshot(func(m *mem) error {
		counts := make(map[string]int)
		for _, issue := range m.Issues {
			if issue.ArchivedAt != nil {
				continue
			}
			if len(issue.ExternalLinks) == 0 {
				counts["no-source"]++
				continue
			}
			seen := make(map[string]struct{})
			for _, link := range issue.ExternalLinks {
				source := issueLinkSource(link.URL)
				if source == "" {
					continue
				}
				seen[source] = struct{}{}
			}
			for source := range seen {
				counts[source]++
			}
		}
		for source, count := range counts {
			out = append(out, IssueLinkSource{ID: source, Name: issueLinkSourceName(source), Count: count})
		}
		sort.Slice(out, func(i, j int) bool {
			if out[i].Name == out[j].Name {
				return out[i].ID < out[j].ID
			}
			return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name)
		})
		if out == nil {
			out = []IssueLinkSource{}
		}
		return nil
	})
	return out, err
}
