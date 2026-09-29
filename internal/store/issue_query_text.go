package store

import "strings"

func matchesIssueTextFilters(issue Issue, filter IssueFilter) bool {
	if filter.Content != "" {
		needle := strings.ToLower(strings.TrimSpace(filter.Content))
		if !strings.Contains(strings.ToLower(issue.Title), needle) &&
			!strings.Contains(strings.ToLower(issue.Identifier), needle) &&
			!strings.Contains(strings.ToLower(issue.Body), needle) {
			return false
		}
	}
	if filter.MilestoneName != "" && (issue.MilestoneName == nil || !strings.Contains(strings.ToLower(*issue.MilestoneName), strings.ToLower(strings.TrimSpace(filter.MilestoneName)))) {
		return false
	}
	return true
}
