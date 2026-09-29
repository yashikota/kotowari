package model

type View struct {
	ID                  int64            `json:"id" toml:"id"`
	Name                string           `json:"name" toml:"name"`
	Slug                string           `json:"slug" toml:"slug"`
	IsFavorite          bool             `json:"isFavorite,omitempty" toml:"is_favorite,omitempty"`
	Description         string           `json:"description,omitempty" toml:"description,omitempty"`
	Icon                string           `json:"icon,omitempty" toml:"icon,omitempty"`
	Display             string           `json:"display" toml:"display"`
	GroupBy             string           `json:"groupBy" toml:"group_by"`
	SubGroupBy          string           `json:"subGroupBy,omitempty" toml:"sub_group_by,omitempty"`
	OrderBy             string           `json:"orderBy" toml:"order_by"`
	Direction           string           `json:"direction,omitempty" toml:"direction,omitempty"`
	CompletedIssues     string           `json:"completedIssues,omitempty" toml:"completed_issues,omitempty"`
	ShowSubIssues       *bool            `json:"showSubIssues,omitempty" toml:"show_sub_issues,omitempty"`
	NestedSubIssues     string           `json:"nestedSubIssues,omitempty" toml:"nested_sub_issues,omitempty"`
	ShowEmptyGroups     bool             `json:"showEmptyGroups" toml:"show_empty_groups,omitempty"`
	DisplayProperties   []string         `json:"displayProperties,omitempty" toml:"display_properties,omitempty"`
	Status              *string          `json:"status" toml:"status,omitempty"`
	Statuses            []string         `json:"statuses,omitempty" toml:"statuses,omitempty"`
	Assignee            *string          `json:"assignee" toml:"assignee,omitempty"`
	Subscriber          string           `json:"subscriber,omitempty" toml:"subscriber,omitempty"`
	Project             *string          `json:"project" toml:"project,omitempty"`
	Cycle               *int             `json:"cycle" toml:"cycle,omitempty"`
	Labels              []string         `json:"labels" toml:"labels,omitempty"`
	LabelOperator       string           `json:"labelOperator,omitempty" toml:"label_operator,omitempty"`
	Priority            *int             `json:"priority" toml:"priority,omitempty"`
	Priorities          []int            `json:"priorities,omitempty" toml:"priorities,omitempty"`
	Type                *string          `json:"type" toml:"type,omitempty"`
	Estimate            *int             `json:"estimate" toml:"estimate,omitempty"`
	Estimates           []int            `json:"estimates,omitempty" toml:"estimates,omitempty"`
	NoEstimate          bool             `json:"noEstimate,omitempty" toml:"no_estimate,omitempty"`
	DueDate             string           `json:"dueDate,omitempty" toml:"due_date,omitempty"`
	Relation            *string          `json:"relation,omitempty" toml:"relation,omitempty"`
	LinkSources         []string         `json:"linkSources,omitempty" toml:"link_sources,omitempty"`
	TemplateSlugs       []string         `json:"templateSlugs,omitempty" toml:"template_slugs,omitempty"`
	Content             *string          `json:"content,omitempty" toml:"content,omitempty"`
	MilestoneName       *string          `json:"milestoneName,omitempty" toml:"milestone_name,omitempty"`
	DateField           string           `json:"dateField,omitempty" toml:"date_field,omitempty"`
	DateRange           string           `json:"dateRange,omitempty" toml:"date_range,omitempty"`
	ProjectStatus       *string          `json:"projectStatus,omitempty" toml:"project_status,omitempty"`
	ProjectPriority     *int             `json:"projectPriority,omitempty" toml:"project_priority,omitempty"`
	ProjectLabels       []string         `json:"projectLabels,omitempty" toml:"project_labels,omitempty"`
	AddedToCycle        []string         `json:"addedToCycle,omitempty" toml:"added_to_cycle,omitempty"`
	AdvancedFilter      bool             `json:"advancedFilter" toml:"advanced_filter,omitempty"`
	AdvancedFilterGroup *IssueFilterNode `json:"advancedFilterGroup,omitempty" toml:"advanced_filter_group,omitempty"`
	CreatedAt           string           `json:"createdAt" toml:"createdAt"`
	UpdatedAt           string           `json:"updatedAt" toml:"updatedAt"`
}

type IssueFilterNode struct {
	Kind     string            `json:"kind" toml:"kind"`
	Operator string            `json:"operator,omitempty" toml:"operator,omitempty"`
	Field    string            `json:"field,omitempty" toml:"field,omitempty"`
	Value    string            `json:"value,omitempty" toml:"value,omitempty"`
	Children []IssueFilterNode `json:"children,omitempty" toml:"children,omitempty"`
}

func (v View) Filter() IssueFilter {
	f := IssueFilter{Labels: v.Labels, LabelOperator: v.LabelOperator, Priority: v.Priority, Priorities: v.Priorities, DueDate: v.DueDate, Statuses: v.Statuses, Estimates: v.Estimates, NoEstimate: v.NoEstimate}
	if v.Assignee != nil {
		f.Assignee = *v.Assignee
	}
	if v.Relation != nil {
		f.Relation = *v.Relation
	}
	f.LinkSources = v.LinkSources
	f.TemplateSlugs = v.TemplateSlugs
	if v.Content != nil {
		f.Content = *v.Content
	}
	if v.MilestoneName != nil {
		f.MilestoneName = *v.MilestoneName
	}
	f.DateField = v.DateField
	f.DateRange = v.DateRange
	if v.ProjectStatus != nil {
		f.ProjectStatus = *v.ProjectStatus
	}
	f.ProjectPriority = v.ProjectPriority
	f.ProjectLabels = v.ProjectLabels
	f.AddedToCycle = v.AddedToCycle
	f.Estimate = v.Estimate
	if v.Type != nil {
		f.Type = *v.Type
	}
	if v.Status != nil && len(v.Statuses) == 0 {
		f.Status = *v.Status
	}
	if len(v.Priorities) > 0 {
		f.Priority = nil
	}
	if len(v.Estimates) > 0 || v.NoEstimate {
		f.Estimate = nil
	}
	if v.Project != nil {
		f.ProjectSlug = *v.Project
	}
	if v.Cycle != nil {
		f.CycleNumber = *v.Cycle
	}
	return f
}

type CreateViewInput struct {
	Name                string           `json:"name"`
	Slug                string           `json:"slug"`
	IsFavorite          *bool            `json:"isFavorite"`
	Description         *string          `json:"description"`
	Icon                *string          `json:"icon"`
	Display             string           `json:"display"`
	GroupBy             string           `json:"groupBy"`
	OrderBy             string           `json:"orderBy"`
	SubGroupBy          string           `json:"subGroupBy"`
	Direction           string           `json:"direction"`
	CompletedIssues     string           `json:"completedIssues"`
	ShowSubIssues       *bool            `json:"showSubIssues"`
	NestedSubIssues     string           `json:"nestedSubIssues"`
	ShowEmptyGroups     *bool            `json:"showEmptyGroups"`
	DisplayProperties   []string         `json:"displayProperties"`
	Status              *string          `json:"status"`
	Statuses            []string         `json:"statuses"`
	Assignee            *string          `json:"assignee"`
	Subscriber          *string          `json:"subscriber"`
	Project             *string          `json:"project"`
	Cycle               *int             `json:"cycle"`
	Labels              []string         `json:"labels"`
	LabelOperator       string           `json:"labelOperator"`
	Priority            *int             `json:"priority"`
	Priorities          []int            `json:"priorities"`
	Type                *string          `json:"type"`
	Estimate            *int             `json:"estimate"`
	Estimates           []int            `json:"estimates"`
	NoEstimate          *bool            `json:"noEstimate"`
	DueDate             *string          `json:"dueDate"`
	Relation            *string          `json:"relation"`
	LinkSources         []string         `json:"linkSources"`
	TemplateSlugs       []string         `json:"templateSlugs"`
	Content             *string          `json:"content"`
	MilestoneName       *string          `json:"milestoneName"`
	DateField           *string          `json:"dateField"`
	DateRange           *string          `json:"dateRange"`
	ProjectStatus       *string          `json:"projectStatus"`
	ProjectPriority     *int             `json:"projectPriority"`
	ProjectLabels       []string         `json:"projectLabels"`
	AddedToCycle        []string         `json:"addedToCycle"`
	AdvancedFilter      *bool            `json:"advancedFilter"`
	AdvancedFilterGroup *IssueFilterNode `json:"advancedFilterGroup"`
}

type UpdateViewInput CreateViewInput
