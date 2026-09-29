package store

import (
	"strings"
	"unicode/utf8"

	"github.com/yashikota/kotowari/internal/domain"
)

type preparedCreateViewInput struct {
	input       CreateViewInput
	description string
	icon        string
	subscriber  string
	dateField   string
	dateRange   string
}

func (s *Store) prepareCreateViewInput(in CreateViewInput) (preparedCreateViewInput, error) {
	in.Name = strings.TrimSpace(in.Name)
	in.Slug = strings.TrimSpace(in.Slug)
	description := ""
	if in.Description != nil {
		description = strings.TrimSpace(*in.Description)
		if utf8.RuneCountInString(description) > 1000 {
			return preparedCreateViewInput{}, validationf("view description is too long")
		}
	}
	icon := "list"
	if in.Icon != nil && *in.Icon != "" {
		icon = *in.Icon
	}
	if !validViewIcon(icon) {
		return preparedCreateViewInput{}, validationf("invalid view icon")
	}
	if in.Name == "" {
		return preparedCreateViewInput{}, validationf("name required")
	}
	if err := validateIssueFilterGroup(in.AdvancedFilterGroup); err != nil {
		return preparedCreateViewInput{}, err
	}
	if in.LabelOperator != "" && !validIssueLabelOperator(in.LabelOperator) {
		return preparedCreateViewInput{}, validationf("invalid label operator")
	}
	if in.LabelOperator == "" {
		in.LabelOperator = defaultIssueLabelOperator(in.Labels)
	}
	if !domain.ValidSlug(in.Slug) {
		return preparedCreateViewInput{}, validationf("invalid slug")
	}
	if in.Display == "" {
		in.Display = "list"
	}
	if !domain.ValidViewDisplay(in.Display) {
		return preparedCreateViewInput{}, validationf("invalid display")
	}
	if in.GroupBy == "" {
		in.GroupBy = "priority"
	}
	if !domain.ValidViewGroupBy(in.GroupBy) {
		return preparedCreateViewInput{}, validationf("invalid group by")
	}
	if in.OrderBy == "" {
		in.OrderBy = "manual"
	}
	if !domain.ValidViewOrderBy(in.OrderBy) {
		return preparedCreateViewInput{}, validationf("invalid order by")
	}
	if in.SubGroupBy == "" {
		in.SubGroupBy = "none"
	}
	if !domain.ValidViewGroupBy(in.SubGroupBy) {
		return preparedCreateViewInput{}, validationf("invalid sub-group by")
	}
	if in.Direction == "" {
		in.Direction = "asc"
	}
	if !domain.ValidViewDirection(in.Direction) {
		return preparedCreateViewInput{}, validationf("invalid order direction")
	}
	if in.CompletedIssues == "" {
		in.CompletedIssues = "all"
	}
	if !domain.ValidCompletedIssues(in.CompletedIssues) {
		return preparedCreateViewInput{}, validationf("invalid completed issues filter")
	}
	if in.NestedSubIssues == "" {
		in.NestedSubIssues = "showMatching"
	}
	if !domain.ValidNestedSubIssues(in.NestedSubIssues) {
		return preparedCreateViewInput{}, validationf("invalid nested sub-issues mode")
	}
	if in.Status != nil && *in.Status != "" && !domain.ValidIssueStatus(*in.Status) {
		return preparedCreateViewInput{}, validationf("invalid status")
	}
	if len(in.Statuses) > 0 {
		var normalized []string
		if err := s.snapshot(func(m *mem) error {
			var err error
			normalized, err = normalizeIssueWorkflowStatuses(m.Workspace, in.Statuses)
			return err
		}); err != nil {
			return preparedCreateViewInput{}, err
		}
		in.Statuses = normalized
		in.Status = nil
	}
	if in.Assignee != nil && *in.Assignee != "none" && !domain.ValidIssueAssignee(*in.Assignee) {
		return preparedCreateViewInput{}, validationf("invalid assignee")
	}
	if in.Assignee != nil && *in.Assignee == "" {
		in.Assignee = nil
	}
	if in.Subscriber != nil && *in.Subscriber != "" && *in.Subscriber != "self" && *in.Subscriber != "none" {
		return preparedCreateViewInput{}, validationf("invalid subscriber filter")
	}
	if in.Priority != nil && !domain.ValidPriority(*in.Priority) {
		return preparedCreateViewInput{}, validationf("invalid priority")
	}
	if len(in.Priorities) > 0 {
		normalized, err := normalizeIssuePriorities(in.Priorities)
		if err != nil {
			return preparedCreateViewInput{}, err
		}
		in.Priorities = normalized
		in.Priority = nil
	}
	if in.Type != nil && !domain.ValidIssueType(*in.Type) {
		return preparedCreateViewInput{}, validationf("invalid issue type")
	}
	if !domain.ValidEstimate(in.Estimate) {
		return preparedCreateViewInput{}, validationf("invalid estimate")
	}
	if len(in.Estimates) > 0 || (in.NoEstimate != nil && *in.NoEstimate) {
		if in.NoEstimate != nil && *in.NoEstimate && in.Estimate != nil && len(in.Estimates) == 0 {
			in.Estimates = []int{*in.Estimate}
		}
		estimates, err := normalizeIssueEstimates(in.Estimates)
		if err != nil {
			return preparedCreateViewInput{}, err
		}
		in.Estimates = estimates
		in.Estimate = nil
	}
	if in.DueDate != nil && !domain.ValidDueDateFilter(*in.DueDate) {
		return preparedCreateViewInput{}, validationf("invalid due date filter")
	}
	if in.Relation != nil && !domain.ValidIssueRelationFilter(*in.Relation) {
		return preparedCreateViewInput{}, validationf("invalid issue relation filter")
	}
	if err := validateViewLinkSources(in.LinkSources); err != nil {
		return preparedCreateViewInput{}, err
	}
	if err := validateIssueTemplateSlugs(in.TemplateSlugs); err != nil {
		return preparedCreateViewInput{}, err
	}
	if in.ProjectStatus != nil && *in.ProjectStatus != "" {
		statuses, err := s.ProjectWorkflowStatuses()
		if err != nil {
			return preparedCreateViewInput{}, err
		}
		if !containsProjectWorkflowStatus(statuses, *in.ProjectStatus) {
			return preparedCreateViewInput{}, validationf("invalid project status")
		}
	}
	if in.ProjectPriority != nil && !domain.ValidPriority(*in.ProjectPriority) {
		return preparedCreateViewInput{}, validationf("invalid project priority")
	}
	var err error
	in.Content, err = normalizeViewTextFilter(in.Content, "content")
	if err != nil {
		return preparedCreateViewInput{}, err
	}
	in.MilestoneName, err = normalizeViewTextFilter(in.MilestoneName, "milestone name")
	if err != nil {
		return preparedCreateViewInput{}, err
	}
	in.LinkSources = normalizeIssueLinkSources(in.LinkSources)
	in.TemplateSlugs = normalizeIssueTemplateSlugs(in.TemplateSlugs)
	if err := validateViewProjectLabelCount(in.ProjectLabels); err != nil {
		return preparedCreateViewInput{}, err
	}
	if err := validateAddedToCycle(in.AddedToCycle); err != nil {
		return preparedCreateViewInput{}, err
	}
	if err := validateViewProjectLabelNames(in.ProjectLabels); err != nil {
		return preparedCreateViewInput{}, err
	}
	dateField, dateRange := "", ""
	if in.DateField != nil {
		dateField = *in.DateField
	}
	if in.DateRange != nil {
		dateRange = *in.DateRange
	}
	if !domain.ValidIssueDateFilter(dateField, dateRange) {
		return preparedCreateViewInput{}, validationf("invalid issue date filter")
	}
	for _, property := range in.DisplayProperties {
		if !domain.ValidDisplayProperty(property) {
			return preparedCreateViewInput{}, validationf("invalid display property")
		}
	}
	if in.ShowSubIssues == nil {
		showSubIssues := true
		in.ShowSubIssues = &showSubIssues
	}
	if in.DisplayProperties == nil {
		in.DisplayProperties = []string{"id", "status", "assignee", "priority", "project", "dueDate", "milestone", "cycle", "estimate", "labels", "links", "pullRequests"}
	}
	subscriber := ""
	if in.Subscriber != nil {
		subscriber = *in.Subscriber
	}
	return preparedCreateViewInput{
		input: in, description: description, icon: icon, subscriber: subscriber,
		dateField: dateField, dateRange: dateRange,
	}, nil
}
