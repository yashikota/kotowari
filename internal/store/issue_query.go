package store

func (s *Store) ListIssues(f IssueFilter) ([]Issue, error) {
	var out []Issue
	f, validationErr := s.normalizeIssueFilter(f)
	if validationErr != nil {
		return nil, validationErr
	}
	dates, err := newIssueQueryDates(f)
	if err != nil {
		return nil, err
	}
	err = s.snapshot(func(m *mem) error {
		for _, iss := range m.Issues {
			if matchesIssueQuery(m, dates, iss, f) {
				out = append(out, iss)
			}
		}
		if out == nil {
			out = []Issue{}
		}
		out = sortIssueTree(out)
		return nil
	})
	return out, err
}

func matchesIssueQuery(m *mem, dates issueQueryDates, issue Issue, filter IssueFilter) bool {
	if !matchesIssueWorkflowFilters(issue, filter) ||
		!dates.matchesDateRange(filter, issue) ||
		!matchesIssueTextFilters(issue, filter) {
		return false
	}
	if filter.Relation != "" && !matchesIssueRelationFilter(m, issue, filter.Relation) {
		return false
	}
	if len(filter.LinkSources) > 0 && !matchesIssueLinkSources(issue, filter.LinkSources) {
		return false
	}
	if len(filter.TemplateSlugs) > 0 && !matchesIssueTemplateSlugs(issue, filter.TemplateSlugs) {
		return false
	}
	return dates.matchesDueDate(filter, issue) &&
		matchesIssueProjectFilters(m, issue, filter) &&
		matchesIssueCycleFilters(m, issue, filter) &&
		matchesIssueAttributeFilters(issue, filter)
}
