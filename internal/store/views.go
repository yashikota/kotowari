package store

import (
	"strings"
	"unicode/utf8"

	"github.com/yashikota/kotowari/internal/domain"
)

func (s *Store) ListViews() ([]View, error) {
	var out []View
	err := s.snapshot(func(m *mem) error {
		out = append([]View{}, m.Views...)
		if out == nil {
			out = []View{}
		}
		return nil
	})
	return out, err
}

func (s *Store) GetView(slug string) (View, error) {
	var v View
	err := s.snapshot(func(m *mem) error {
		got, ok := viewBySlug(m, slug)
		if !ok {
			return ErrNotFound
		}
		v = got
		return nil
	})
	return v, err
}

func validViewIcon(icon string) bool {
	switch icon {
	case "list", "circle", "bolt", "target", "bug", "rocket", "bookmark", "flag", "star", "sparkles", "chart", "calendar":
		return true
	default:
		return false
	}
}

func validateIssueFilterGroup(root *IssueFilterNode) error {
	if root == nil {
		return nil
	}
	fields := map[string]bool{
		"status": true, "assignee": true, "priority": true, "type": true, "estimate": true,
		"project": true, "cycle": true, "label": true, "title": true, "identifier": true,
		"dueDate": true, "createdAt": true, "updatedAt": true, "startedAt": true,
		"completedAt": true, "cycleAddedAt": true, "milestone": true, "relation": true,
		"content": true, "links": true, "recurring": true,
	}
	operators := map[string]bool{
		"is": true, "isNot": true, "contains": true, "doesNotContain": true,
		"before": true, "after": true, "onOrBefore": true, "onOrAfter": true,
		"isEmpty": true, "isNotEmpty": true,
	}
	textFields := map[string]bool{"title": true, "identifier": true, "content": true, "milestone": true}
	dateFields := map[string]bool{
		"dueDate": true, "createdAt": true, "updatedAt": true, "startedAt": true,
		"completedAt": true, "cycleAddedAt": true,
	}
	visited := 0
	var validate func(node *IssueFilterNode, depth int, isRoot bool) error
	validate = func(node *IssueFilterNode, depth int, isRoot bool) error {
		visited++
		if visited > 80 || depth > 6 {
			return validationf("issue filter group is too large")
		}
		switch node.Kind {
		case "group":
			if node.Operator != "and" && node.Operator != "or" {
				return validationf("invalid issue filter group operator")
			}
			if node.Field != "" || node.Value != "" || len(node.Children) > 40 {
				return validationf("invalid issue filter group")
			}
			for i := range node.Children {
				if err := validate(&node.Children[i], depth+1, false); err != nil {
					return err
				}
			}
		case "condition":
			if isRoot || len(node.Children) > 0 || (node.Field != "" && !fields[node.Field]) {
				return validationf("invalid issue filter condition")
			}
			if node.Operator != "" && !operators[node.Operator] {
				return validationf("invalid issue filter operator")
			}
			if node.Field != "" && node.Operator == "" {
				return validationf("issue filter operator is required")
			}
			if textFields[node.Field] && node.Operator != "" && node.Operator != "contains" && node.Operator != "doesNotContain" && node.Operator != "isEmpty" && node.Operator != "isNotEmpty" {
				return validationf("invalid issue text filter operator")
			}
			if dateFields[node.Field] && node.Operator != "" && node.Operator != "is" && node.Operator != "isNot" && node.Operator != "before" && node.Operator != "after" && node.Operator != "onOrBefore" && node.Operator != "onOrAfter" && node.Operator != "isEmpty" && node.Operator != "isNotEmpty" {
				return validationf("invalid issue date filter operator")
			}
			if node.Field != "" && !textFields[node.Field] && !dateFields[node.Field] && node.Operator != "" && node.Operator != "is" && node.Operator != "isNot" && node.Operator != "isEmpty" && node.Operator != "isNotEmpty" {
				return validationf("invalid issue property filter operator")
			}
			if utf8.RuneCountInString(node.Value) > 240 {
				return validationf("issue filter value is too long")
			}
		default:
			return validationf("invalid issue filter node")
		}
		return nil
	}
	if root.Kind != "group" {
		return validationf("issue filter root must be a group")
	}
	return validate(root, 0, true)
}

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
	if len(in.LinkSources) > 32 {
		return View{}, validationf("too many issue link sources in filter")
	}
	for _, source := range in.LinkSources {
		if !domain.ValidIssueLinkSource(source) {
			return View{}, validationf("invalid issue link source filter")
		}
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
	if in.Content != nil {
		content := *in.Content
		if utf8.RuneCountInString(content) > 512 {
			return View{}, validationf("content filter is too long")
		}
		if strings.TrimSpace(content) == "" {
			in.Content = nil
		}
	}
	if in.MilestoneName != nil {
		milestoneName := *in.MilestoneName
		if utf8.RuneCountInString(milestoneName) > 512 {
			return View{}, validationf("milestone name filter is too long")
		}
		if strings.TrimSpace(milestoneName) == "" {
			in.MilestoneName = nil
		}
	}
	in.LinkSources = normalizeIssueLinkSources(in.LinkSources)
	in.TemplateSlugs = normalizeIssueTemplateSlugs(in.TemplateSlugs)
	if len(in.ProjectLabels) > 32 {
		return View{}, validationf("too many project labels in filter")
	}
	if err := validateAddedToCycle(in.AddedToCycle); err != nil {
		return View{}, err
	}
	for _, name := range in.ProjectLabels {
		if utf8.RuneCountInString(name) > 100 {
			return View{}, validationf("project label filter is too long")
		}
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
	err := s.mutate(func(m *mem) error {
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

func (s *Store) UpdateView(slug string, in CreateViewInput) (View, error) {
	if in.LabelOperator != "" && !validIssueLabelOperator(in.LabelOperator) {
		return View{}, validationf("invalid label operator")
	}
	var out View
	err := s.mutate(func(m *mem) error {
		i := indexView(m, slug)
		if i < 0 {
			return ErrNotFound
		}
		v := m.Views[i]
		if in.AdvancedFilter != nil {
			v.AdvancedFilter = *in.AdvancedFilter
		}
		if in.AdvancedFilterGroup != nil {
			if err := validateIssueFilterGroup(in.AdvancedFilterGroup); err != nil {
				return err
			}
			v.AdvancedFilterGroup = in.AdvancedFilterGroup
		}
		if name := strings.TrimSpace(in.Name); name != "" {
			v.Name = name
		}
		if in.Description != nil {
			description := strings.TrimSpace(*in.Description)
			if utf8.RuneCountInString(description) > 1000 {
				return validationf("view description is too long")
			}
			v.Description = description
		}
		if in.Icon != nil {
			icon := *in.Icon
			if icon == "" {
				icon = "list"
			}
			if !validViewIcon(icon) {
				return validationf("invalid view icon")
			}
			v.Icon = icon
		}
		if in.Display != "" {
			if !domain.ValidViewDisplay(in.Display) {
				return validationf("invalid display")
			}
			v.Display = in.Display
		}
		if in.GroupBy != "" {
			if !domain.ValidViewGroupBy(in.GroupBy) {
				return validationf("invalid group by")
			}
			v.GroupBy = in.GroupBy
		}
		if in.OrderBy != "" {
			if !domain.ValidViewOrderBy(in.OrderBy) {
				return validationf("invalid order by")
			}
			v.OrderBy = in.OrderBy
		}
		if in.SubGroupBy != "" {
			if !domain.ValidViewGroupBy(in.SubGroupBy) {
				return validationf("invalid sub-group by")
			}
			v.SubGroupBy = in.SubGroupBy
		}
		if in.Direction != "" {
			if !domain.ValidViewDirection(in.Direction) {
				return validationf("invalid order direction")
			}
			v.Direction = in.Direction
		}
		if in.CompletedIssues != "" {
			if !domain.ValidCompletedIssues(in.CompletedIssues) {
				return validationf("invalid completed issues filter")
			}
			v.CompletedIssues = in.CompletedIssues
		}
		if in.ShowSubIssues != nil {
			v.ShowSubIssues = in.ShowSubIssues
		}
		if in.NestedSubIssues != "" {
			if !domain.ValidNestedSubIssues(in.NestedSubIssues) {
				return validationf("invalid nested sub-issues mode")
			}
			v.NestedSubIssues = in.NestedSubIssues
		}
		if in.ShowEmptyGroups != nil {
			v.ShowEmptyGroups = *in.ShowEmptyGroups
		}
		if in.DisplayProperties != nil {
			for _, property := range in.DisplayProperties {
				if !domain.ValidDisplayProperty(property) {
					return validationf("invalid display property")
				}
			}
			v.DisplayProperties = in.DisplayProperties
		}
		if in.Status != nil {
			if *in.Status == "" {
				v.Status = nil
			} else {
				if !domain.ValidIssueStatus(*in.Status) {
					return validationf("invalid status")
				}
				v.Status = in.Status
			}
			v.Statuses = nil
		}
		if in.Statuses != nil && (len(in.Statuses) > 0 || in.Status == nil) {
			statuses, err := normalizeIssueWorkflowStatuses(m.Workspace, in.Statuses)
			if err != nil {
				return err
			}
			v.Statuses = statuses
			v.Status = nil
		}
		if in.Assignee != nil {
			if *in.Assignee == "" {
				v.Assignee = nil
			} else {
				if *in.Assignee != "none" && !domain.ValidIssueAssignee(*in.Assignee) {
					return validationf("invalid assignee")
				}
				v.Assignee = in.Assignee
			}
		}
		if in.Subscriber != nil {
			if *in.Subscriber != "" && *in.Subscriber != "self" && *in.Subscriber != "none" {
				return validationf("invalid subscriber filter")
			}
			v.Subscriber = *in.Subscriber
		}
		if in.Project != nil {
			if *in.Project == "" {
				v.Project = nil
			} else {
				v.Project = in.Project
			}
		}
		if in.Cycle != nil {
			if *in.Cycle == 0 {
				v.Cycle = nil
			} else {
				v.Cycle = in.Cycle
			}
		}
		if in.Labels != nil {
			v.Labels = in.Labels
			if in.LabelOperator == "" {
				v.LabelOperator = defaultIssueLabelOperator(in.Labels)
			}
		}
		if in.LabelOperator != "" {
			v.LabelOperator = in.LabelOperator
		}
		if in.ProjectLabels != nil {
			if len(in.ProjectLabels) > 32 {
				return validationf("too many project labels in filter")
			}
			for _, name := range in.ProjectLabels {
				if utf8.RuneCountInString(name) > 100 {
					return validationf("project label filter is too long")
				}
			}
			v.ProjectLabels = in.ProjectLabels
		}
		if in.AddedToCycle != nil {
			if err := validateAddedToCycle(in.AddedToCycle); err != nil {
				return err
			}
			v.AddedToCycle = in.AddedToCycle
		}
		if in.Priority != nil {
			if *in.Priority < 0 {
				v.Priority = nil
			} else {
				if !domain.ValidPriority(*in.Priority) {
					return validationf("invalid priority")
				}
				v.Priority = in.Priority
			}
			v.Priorities = nil
		}
		if in.Priorities != nil && (len(in.Priorities) > 0 || in.Priority == nil) {
			priorities, err := normalizeIssuePriorities(in.Priorities)
			if err != nil {
				return err
			}
			v.Priorities = priorities
			v.Priority = nil
		}
		if in.Type != nil {
			if *in.Type == "" {
				v.Type = nil
			} else {
				if !domain.ValidIssueType(*in.Type) {
					return validationf("invalid issue type")
				}
				v.Type = in.Type
			}
		}
		if in.Estimate != nil {
			if *in.Estimate < 0 {
				v.Estimate = nil
			} else {
				if !domain.ValidEstimate(in.Estimate) {
					return validationf("invalid estimate")
				}
				v.Estimate = in.Estimate
			}
			v.Estimates = nil
			v.NoEstimate = false
		}
		if in.Estimates != nil || in.NoEstimate != nil {
			noEstimate := in.NoEstimate != nil && *in.NoEstimate
			selectedEstimates := in.Estimates
			if noEstimate && in.Estimate != nil && *in.Estimate >= 0 && len(selectedEstimates) == 0 {
				selectedEstimates = []int{*in.Estimate}
			}
			if len(selectedEstimates) > 0 || noEstimate || in.Estimate == nil {
				estimates, err := normalizeIssueEstimates(selectedEstimates)
				if err != nil {
					return err
				}
				v.Estimates = estimates
				v.NoEstimate = noEstimate
				v.Estimate = nil
			}
		}
		if in.DueDate != nil {
			if !domain.ValidDueDateFilter(*in.DueDate) {
				return validationf("invalid due date filter")
			}
			v.DueDate = *in.DueDate
		}
		if in.Relation != nil {
			if !domain.ValidIssueRelationFilter(*in.Relation) {
				return validationf("invalid issue relation filter")
			}
			if *in.Relation == "" {
				v.Relation = nil
			} else {
				v.Relation = in.Relation
			}
		}
		if in.LinkSources != nil {
			if len(in.LinkSources) > 32 {
				return validationf("too many issue link sources in filter")
			}
			for _, source := range in.LinkSources {
				if !domain.ValidIssueLinkSource(source) {
					return validationf("invalid issue link source filter")
				}
			}
			v.LinkSources = normalizeIssueLinkSources(in.LinkSources)
		}
		if in.TemplateSlugs != nil {
			if err := validateIssueTemplateSlugs(in.TemplateSlugs); err != nil {
				return err
			}
			v.TemplateSlugs = normalizeIssueTemplateSlugs(in.TemplateSlugs)
		}
		if in.Content != nil {
			content := *in.Content
			if utf8.RuneCountInString(content) > 512 {
				return validationf("content filter is too long")
			}
			if strings.TrimSpace(content) == "" {
				v.Content = nil
			} else {
				v.Content = &content
			}
		}
		if in.MilestoneName != nil {
			milestoneName := *in.MilestoneName
			if utf8.RuneCountInString(milestoneName) > 512 {
				return validationf("milestone name filter is too long")
			}
			if strings.TrimSpace(milestoneName) == "" {
				v.MilestoneName = nil
			} else {
				v.MilestoneName = &milestoneName
			}
		}
		if in.DateField != nil || in.DateRange != nil {
			dateField, dateRange := v.DateField, v.DateRange
			if in.DateField != nil {
				dateField = *in.DateField
			}
			if in.DateRange != nil {
				dateRange = *in.DateRange
			}
			if !domain.ValidIssueDateFilter(dateField, dateRange) {
				return validationf("invalid issue date filter")
			}
			v.DateField, v.DateRange = dateField, dateRange
		}
		if in.ProjectStatus != nil {
			if *in.ProjectStatus == "" {
				v.ProjectStatus = nil
			} else {
				if _, exists := projectWorkflowStatusByID(m.Workspace, *in.ProjectStatus); !exists {
					return validationf("invalid project status")
				}
				v.ProjectStatus = in.ProjectStatus
			}
		}
		if in.ProjectPriority != nil {
			if *in.ProjectPriority < 0 {
				v.ProjectPriority = nil
			} else {
				if !domain.ValidPriority(*in.ProjectPriority) {
					return validationf("invalid project priority")
				}
				v.ProjectPriority = in.ProjectPriority
			}
		}
		now := domain.Now()
		v.UpdatedAt = now
		m.Views[i] = v
		m.bump(now)
		out = v
		return nil
	})
	return out, err
}

// UpdateViewFavorite changes the personal favorite state without changing the
// saved view's content update timestamp.
func (s *Store) UpdateViewFavorite(slug string, favorite bool) (View, error) {
	var out View
	err := s.mutate(func(m *mem) error {
		i := indexView(m, slug)
		if i < 0 {
			return ErrNotFound
		}
		m.Views[i].IsFavorite = favorite
		out = m.Views[i]
		return nil
	})
	return out, err
}

func (s *Store) DeleteView(slug string) error {
	return s.mutate(func(m *mem) error {
		i := indexView(m, slug)
		if i < 0 {
			return ErrNotFound
		}
		m.Views = append(m.Views[:i], m.Views[i+1:]...)
		m.bump(domain.Now())
		return nil
	})
}

func viewBySlug(m *mem, slug string) (View, bool) {
	for _, v := range m.Views {
		if v.Slug == slug {
			return v, true
		}
	}
	return View{}, false
}

func indexView(m *mem, slug string) int {
	for i, v := range m.Views {
		if v.Slug == slug {
			return i
		}
	}
	return -1
}

func (s *Store) Search(q string) ([]SearchHit, error) {
	q = strings.ToLower(strings.TrimSpace(q))
	var hits []SearchHit
	err := s.snapshot(func(m *mem) error {
		if q == "" {
			hits = []SearchHit{}
			return nil
		}
		for _, iss := range m.Issues {
			commentSnippet := ""
			for _, comment := range m.Comments[iss.Identifier] {
				if strings.Contains(strings.ToLower(comment.Body), q) {
					commentSnippet = searchSnippet(comment.Body, q)
					break
				}
			}
			if strings.Contains(strings.ToLower(iss.Title), q) || strings.Contains(strings.ToLower(iss.Identifier), q) || strings.Contains(strings.ToLower(iss.Body), q) || commentSnippet != "" {
				snippet := searchSnippet(iss.Body, q)
				if snippet == "" {
					snippet = commentSnippet
				}
				hits = append(hits, SearchHit{
					Kind: "issue", ID: iss.Identifier, Title: iss.Title, Status: iss.Status,
					Archived:  iss.ArchivedAt != nil,
					CreatedAt: iss.CreatedAt, UpdatedAt: iss.UpdatedAt,
					Snippet: snippet,
				})
			}
		}
		for _, p := range m.Projects {
			if strings.Contains(strings.ToLower(p.Name), q) || strings.Contains(strings.ToLower(p.Slug), q) {
				hits = append(hits, SearchHit{
					Kind: "project", ID: p.Slug, Title: p.Name,
					CreatedAt: p.CreatedAt, UpdatedAt: p.UpdatedAt,
				})
			}
		}
		for _, v := range m.Views {
			if strings.Contains(strings.ToLower(v.Name), q) || strings.Contains(strings.ToLower(v.Slug), q) {
				hits = append(hits, SearchHit{
					Kind: "view", ID: v.Slug, Title: v.Name,
					CreatedAt: v.CreatedAt, UpdatedAt: v.UpdatedAt,
				})
			}
		}
		for _, a := range m.ADRs {
			if strings.Contains(strings.ToLower(a.Title), q) || strings.Contains(strings.ToLower(a.Identifier), q) || strings.Contains(strings.ToLower(a.Body+"\n"+a.PublishBody), q) {
				hits = append(hits, SearchHit{
					Kind: "adr", ID: a.Identifier, Title: a.Title,
					CreatedAt: a.CreatedAt, UpdatedAt: a.UpdatedAt,
					Snippet: searchSnippet(a.Body+"\n"+a.PublishBody, q),
				})
			}
		}
		for _, p := range m.Pages {
			if strings.Contains(strings.ToLower(p.Title), q) || strings.Contains(strings.ToLower(p.Slug), q) || strings.Contains(strings.ToLower(p.Body), q) {
				hits = append(hits, SearchHit{
					Kind: "page", ID: p.Slug, Title: p.Title,
					CreatedAt: p.CreatedAt, UpdatedAt: p.UpdatedAt,
					Snippet: searchSnippet(p.Body, q),
				})
			}
		}
		if hits == nil {
			hits = []SearchHit{}
		}
		return nil
	})
	return hits, err
}

func (s *Store) Counts() (issues, pages, adrs int, err error) {
	err = s.snapshot(func(m *mem) error {
		issues = len(m.Issues)
		pages = len(m.Pages)
		adrs = len(m.ADRs)
		return nil
	})
	return
}
