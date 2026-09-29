package store

func matchesIssueAttributeFilters(issue Issue, filter IssueFilter) bool {
	if len(filter.Priorities) > 0 {
		matches := false
		for _, priority := range filter.Priorities {
			if issue.Priority == priority {
				matches = true
				break
			}
		}
		if !matches {
			return false
		}
	} else if filter.Priority != nil && issue.Priority != *filter.Priority {
		return false
	}
	if filter.Type != "" && issue.Type != filter.Type {
		return false
	}
	if len(filter.Estimates) > 0 || filter.NoEstimate {
		matches := filter.NoEstimate && issue.Estimate == nil
		for _, estimate := range filter.Estimates {
			if issue.Estimate != nil && *issue.Estimate == estimate {
				matches = true
				break
			}
		}
		if !matches {
			return false
		}
	} else if filter.Estimate != nil && (issue.Estimate == nil || *issue.Estimate != *filter.Estimate) {
		return false
	}
	if filter.IsFavorite != nil && issue.IsFavorite != *filter.IsFavorite {
		return false
	}
	return matchesIssueLabelFilters(issue, filter)
}

func matchesIssueLabelFilters(issue Issue, filter IssueFilter) bool {
	if len(filter.Labels) == 0 {
		return true
	}
	have := make(map[string]struct{}, len(issue.Labels))
	for _, label := range issue.Labels {
		have[label.Name] = struct{}{}
	}
	matchesCount := 0
	for _, name := range filter.Labels {
		if _, found := have[name]; found {
			matchesCount++
		}
	}
	operator := filter.LabelOperator
	if operator == "" {
		operator = "includeAll"
	}
	switch operator {
	case "includeAny":
		return matchesCount > 0
	case "includeAll":
		return matchesCount == len(filter.Labels)
	case "excludeAny":
		return matchesCount == 0
	case "excludeAll":
		return matchesCount != len(filter.Labels)
	default:
		return false
	}
}
