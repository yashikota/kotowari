package store

import (
	"strings"
	"unicode/utf8"

	"github.com/yashikota/kotowari/internal/domain"
)

func (s *Store) CreateView(in CreateViewInput) (View, error) {
	in.Name = strings.TrimSpace(in.Name)
	in.Slug = strings.TrimSpace(in.Slug)
	description := ""
	if in.Description != nil {
		description = strings.TrimSpace(*in.Description)
		if utf8.RuneCountInString(description) > 1000 {
			return View{}, validationf("view description is too long")
		}
	}
	icon := "list"
	if in.Icon != nil && *in.Icon != "" {
		icon = *in.Icon
	}
	if !validViewIcon(icon) {
		return View{}, validationf("invalid view icon")
	}
	if in.Name == "" {
		return View{}, validationf("name required")
	}
	if err := validateIssueFilterGroup(in.AdvancedFilterGroup); err != nil {
		return View{}, err
	}
	if in.LabelOperator != "" && !validIssueLabelOperator(in.LabelOperator) {
		return View{}, validationf("invalid label operator")
	}
	if in.LabelOperator == "" {
		in.LabelOperator = defaultIssueLabelOperator(in.Labels)
	}
	if !domain.ValidSlug(in.Slug) {
		return View{}, validationf("invalid slug")
	}
	if in.Display == "" {
		in.Display = "list"
	}
	if !domain.ValidViewDisplay(in.Display) {
		return View{}, validationf("invalid display")
	}
	if in.GroupBy == "" {
		in.GroupBy = "priority"
	}
	if !domain.ValidViewGroupBy(in.GroupBy) {
		return View{}, validationf("invalid group by")
	}
	if in.OrderBy == "" {
		in.OrderBy = "manual"
	}
	if !domain.ValidViewOrderBy(in.OrderBy) {
		return View{}, validationf("invalid order by")
	}
	if in.SubGroupBy == "" {
		in.SubGroupBy = "none"
	}
	if !domain.ValidViewGroupBy(in.SubGroupBy) {
		return View{}, validationf("invalid sub-group by")
	}
	if in.Direction == "" {
		in.Direction = "asc"
	}
	if !domain.ValidViewDirection(in.Direction) {
		return View{}, validationf("invalid order direction")
	}
	if in.CompletedIssues == "" {
		in.CompletedIssues = "all"
	}
	if !domain.ValidCompletedIssues(in.CompletedIssues) {
		return View{}, validationf("invalid completed issues filter")
	}
	if in.NestedSubIssues == "" {
		in.NestedSubIssues = "showMatching"
	}
	if !domain.ValidNestedSubIssues(in.NestedSubIssues) {
		return View{}, validationf("invalid nested sub-issues mode")
	}
	if in.Status != nil && *in.Status != "" && !domain.ValidIssueStatus(*in.Status) {
		return View{}, validationf("invalid status")
	}
	if len(in.Statuses) > 0 {
		var normalized []string
		if err := s.snapshot(func(m *mem) error {
			var err error
			normalized, err = normalizeIssueWorkflowStatuses(m.Workspace, in.Statuses)
			return err
		}); err != nil {
			return View{}, err
		}
		in.Statuses = normalized
		in.Status = nil
	}
	if in.Assignee != nil && *in.Assignee != "none" && !domain.ValidIssueAssignee(*in.Assignee) {
		return View{}, validationf("invalid assignee")
	}
	if in.Assignee != nil && *in.Assignee == "" {
		in.Assignee = nil
	}
	if in.Subscriber != nil && *in.Subscriber != "" && *in.Subscriber != "self" && *in.Subscriber != "none" {
		return View{}, validationf("invalid subscriber filter")
	}
	if in.Priority != nil && !domain.ValidPriority(*in.Priority) {
		return View{}, validationf("invalid priority")
	}
	if len(in.Priorities) > 0 {
		normalized, err := normalizeIssuePriorities(in.Priorities)
		if err != nil {
			return View{}, err
		}
		in.Priorities = normalized
		in.Priority = nil
	}
	if in.Type != nil && !domain.ValidIssueType(*in.Type) {
		return View{}, validationf("invalid issue type")
	}
	if !domain.ValidEstimate(in.Estimate) {
		return View{}, validationf("invalid estimate")
	}
	if len(in.Estimates) > 0 || (in.NoEstimate != nil && *in.NoEstimate) {
		if in.NoEstimate != nil && *in.NoEstimate && in.Estimate != nil && len(in.Estimates) == 0 {
			in.Estimates = []int{*in.Estimate}
		}
		estimates, err := normalizeIssueEstimates(in.Estimates)
		if err != nil {
			return View{}, err
		}
		in.Estimates = estimates
		in.Estimate = nil
	}
	if in.DueDate != nil && !domain.ValidDueDateFilter(*in.DueDate) {
		return View{}, validationf("invalid due date filter")
	}
	if in.Relation != nil && !domain.ValidIssueRelationFilter(*in.Relation) {
		return View{}, validationf("invalid issue relation filter")
	}
	if err := validateViewLinkSources(in.LinkSources); err != nil {
		return View{}, err
	}
	if err := validateIssueTemplateSlugs(in.TemplateSlugs); err != nil {
		return View{}, err
	}
	if in.ProjectStatus != nil && *in.ProjectStatus != "" {
		statuses, err := s.ProjectWorkflowStatuses()
		if err != nil {
			return View{}, err
		}
		if !containsProjectWorkflowStatus(statuses, *in.ProjectStatus) {
			return View{}, validationf("invalid project status")
		}
	}
	if in.ProjectPriority != nil && !domain.ValidPriority(*in.ProjectPriority) {
		return View{}, validationf("invalid project priority")
	}
	var err error
	in.Content, err = normalizeViewTextFilter(in.Content, "content")
	if err != nil {
		return View{}, err
	}
	in.MilestoneName, err = normalizeViewTextFilter(in.MilestoneName, "milestone name")
	if err != nil {
		return View{}, err
	}
	in.LinkSources = normalizeIssueLinkSources(in.LinkSources)
	in.TemplateSlugs = normalizeIssueTemplateSlugs(in.TemplateSlugs)
	if err := validateViewProjectLabelCount(in.ProjectLabels); err != nil {
		return View{}, err
	}
	if err := validateAddedToCycle(in.AddedToCycle); err != nil {
		return View{}, err
	}
	if err := validateViewProjectLabelNames(in.ProjectLabels); err != nil {
		return View{}, err
	}
	dateField, dateRange := "", ""
	if in.DateField != nil {
		dateField = *in.DateField
	}
	if in.DateRange != nil {
		dateRange = *in.DateRange
	}
	if !domain.ValidIssueDateFilter(dateField, dateRange) {
		return View{}, validationf("invalid issue date filter")
	}
	for _, property := range in.DisplayProperties {
		if !domain.ValidDisplayProperty(property) {
			return View{}, validationf("invalid display property")
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
	now := domain.Now()
	var out View
	err = s.mutate(func(m *mem) error {
		if _, ok := viewBySlug(m, in.Slug); ok {
			return errf(ErrConflict, "slug %q exists", in.Slug)
		}
		out = View{
			ID: m.nextID(), Name: in.Name, Slug: in.Slug, IsFavorite: in.IsFavorite != nil && *in.IsFavorite, Description: description, Icon: icon, Display: in.Display,
			GroupBy: in.GroupBy, SubGroupBy: in.SubGroupBy, OrderBy: in.OrderBy, Direction: in.Direction,
			CompletedIssues: in.CompletedIssues, ShowSubIssues: in.ShowSubIssues, NestedSubIssues: in.NestedSubIssues,
			ShowEmptyGroups: in.ShowEmptyGroups != nil && *in.ShowEmptyGroups, DisplayProperties: in.DisplayProperties,
			Status: in.Status, Statuses: in.Statuses, Assignee: in.Assignee, Subscriber: subscriber, Project: in.Project, Cycle: in.Cycle, Labels: in.Labels, LabelOperator: in.LabelOperator,
			Priority: in.Priority, Priorities: in.Priorities, Type: in.Type, Estimate: in.Estimate, Estimates: in.Estimates, NoEstimate: in.NoEstimate != nil && *in.NoEstimate, Relation: in.Relation, LinkSources: in.LinkSources, TemplateSlugs: in.TemplateSlugs, Content: in.Content, DateField: dateField, DateRange: dateRange,
			ProjectStatus: in.ProjectStatus, ProjectPriority: in.ProjectPriority, ProjectLabels: in.ProjectLabels, AddedToCycle: in.AddedToCycle, MilestoneName: in.MilestoneName, CreatedAt: now, UpdatedAt: now,
			AdvancedFilter: in.AdvancedFilter != nil && *in.AdvancedFilter, AdvancedFilterGroup: in.AdvancedFilterGroup,
		}
		if in.DueDate != nil {
			out.DueDate = *in.DueDate
		}
		if out.Labels == nil {
			out.Labels = []string{}
		}
		if out.ProjectLabels == nil {
			out.ProjectLabels = []string{}
		}
		if out.AddedToCycle == nil {
			out.AddedToCycle = []string{}
		}
		m.Views = append(m.Views, out)
		m.bump(now)
		return nil
	})
	return out, err
}
