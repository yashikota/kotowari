package store

import (
	"unicode/utf8"

	"github.com/yashikota/kotowari/internal/domain"
)

func normalizeIssuePriorities(selected []int) ([]int, error) {
	if len(selected) > 50 {
		return nil, validationf("too many issue priorities in filter")
	}
	seen := make(map[int]struct{}, len(selected))
	out := make([]int, 0, len(selected))
	for _, priority := range selected {
		if !domain.ValidPriority(priority) {
			return nil, validationf("invalid issue priority filter")
		}
		if _, exists := seen[priority]; exists {
			continue
		}
		seen[priority] = struct{}{}
		out = append(out, priority)
	}
	return out, nil
}

func normalizeIssueEstimates(selected []int) ([]int, error) {
	if len(selected) > 50 {
		return nil, validationf("too many issue estimates in filter")
	}
	seen := make(map[int]struct{}, len(selected))
	out := make([]int, 0, len(selected))
	for _, estimate := range selected {
		if !domain.ValidEstimate(&estimate) {
			return nil, validationf("invalid issue estimate filter")
		}
		if _, exists := seen[estimate]; exists {
			continue
		}
		seen[estimate] = struct{}{}
		out = append(out, estimate)
	}
	return out, nil
}

func (s *Store) normalizeIssueFilter(f IssueFilter) (IssueFilter, error) {
	if len(f.Statuses) > 0 {
		var normalized []string
		err := s.snapshot(func(m *mem) error {
			var err error
			normalized, err = normalizeIssueWorkflowStatuses(m.Workspace, f.Statuses)
			return err
		})
		if err != nil {
			return IssueFilter{}, err
		}
		f.Statuses = normalized
	}
	if len(f.Priorities) > 0 {
		normalized, err := normalizeIssuePriorities(f.Priorities)
		if err != nil {
			return IssueFilter{}, err
		}
		f.Priorities = normalized
		f.Priority = nil
	}
	if f.NoEstimate && f.Estimate != nil && len(f.Estimates) == 0 {
		f.Estimates = []int{*f.Estimate}
	}
	if len(f.Estimates) > 0 || f.NoEstimate {
		normalized, err := normalizeIssueEstimates(f.Estimates)
		if err != nil {
			return IssueFilter{}, err
		}
		f.Estimates = normalized
		f.Estimate = nil
	}
	if f.Assignee != "" && f.Assignee != "none" && !domain.ValidIssueAssignee(f.Assignee) {
		return IssueFilter{}, validationf("invalid issue assignee")
	}
	if f.ProjectStatus != "" {
		statuses, err := s.ProjectWorkflowStatuses()
		if err != nil {
			return IssueFilter{}, err
		}
		if !containsProjectWorkflowStatus(statuses, f.ProjectStatus) {
			return IssueFilter{}, validationf("invalid project status")
		}
	}
	if f.ProjectPriority != nil && !domain.ValidPriority(*f.ProjectPriority) {
		return IssueFilter{}, validationf("invalid project priority")
	}
	if utf8.RuneCountInString(f.Content) > 512 {
		return IssueFilter{}, validationf("content filter is too long")
	}
	if utf8.RuneCountInString(f.MilestoneName) > 512 {
		return IssueFilter{}, validationf("milestone name filter is too long")
	}
	if len(f.ProjectLabels) > 32 {
		return IssueFilter{}, validationf("too many project labels in filter")
	}
	if f.LabelOperator != "" && !validIssueLabelOperator(f.LabelOperator) {
		return IssueFilter{}, validationf("invalid label operator")
	}
	for _, name := range f.ProjectLabels {
		if utf8.RuneCountInString(name) > 100 {
			return IssueFilter{}, validationf("project label filter is too long")
		}
	}
	if err := validateAddedToCycle(f.AddedToCycle); err != nil {
		return IssueFilter{}, err
	}
	if !domain.ValidIssueRelationFilter(f.Relation) {
		return IssueFilter{}, validationf("invalid issue relation filter")
	}
	if len(f.LinkSources) > 32 {
		return IssueFilter{}, validationf("too many issue link sources in filter")
	}
	for _, source := range f.LinkSources {
		if !domain.ValidIssueLinkSource(source) {
			return IssueFilter{}, validationf("invalid issue link source filter")
		}
	}
	if err := validateIssueTemplateSlugs(f.TemplateSlugs); err != nil {
		return IssueFilter{}, err
	}
	return f, nil
}
