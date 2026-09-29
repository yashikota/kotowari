package model

type IssueFilter struct {
	Status          string
	Statuses        []string
	Assignee        string
	ProjectSlug     string
	CycleNumber     int
	Labels          []string
	LabelOperator   string
	Priority        *int
	Priorities      []int
	Type            string
	Estimate        *int
	Estimates       []int
	NoEstimate      bool
	DueDate         string
	DueDateAsOf     string
	Relation        string
	LinkSources     []string
	TemplateSlugs   []string
	Content         string
	MilestoneName   string
	ProjectLabels   []string
	AddedToCycle    []string
	DateField       string
	DateRange       string
	DateAsOf        string
	ProjectStatus   string
	ProjectPriority *int
	IsFavorite      *bool
	Archived        *bool
}

type CreateIssueInput struct {
	Title          string
	Body           string
	Status         string
	WorkflowStatus string
	Assignee       string
	Type           string
	Priority       int
	Estimate       *int
	ProjectID      *int64
	MilestoneID    *int64
	CycleID        *int64
	ParentID       *int64
	DueDate        *string
	LabelIDs       []int64
	ExternalLinks  []CreateIssueLinkInput
	TemplateSlug   string
	RecurringSlug  *string
}

type PatchIssueInput struct {
	Title          *string
	Body           *string
	Status         *string
	WorkflowStatus *string
	Assignee       *string
	Type           *string
	Priority       *int
	Estimate       **int
	ProjectID      **int64
	MilestoneID    **int64
	CycleID        **int64
	ParentID       **int64
	DueDate        **string
	ReminderAt     **string
	LabelIDs       *[]int64
	SortOrder      *float64
	IsFavorite     *bool
	Archived       *bool
}
