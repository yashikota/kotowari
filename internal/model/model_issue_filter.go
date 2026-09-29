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

// CreateIssueRequest is the HTTP payload for creating an issue. Its links and
// recurring fields describe API behavior that is translated into the Store
// input separately.
type CreateIssueRequest struct {
	Title          string                     `json:"title"`
	Body           string                     `json:"body"`
	Status         string                     `json:"status"`
	WorkflowStatus string                     `json:"workflowStatus"`
	Assignee       string                     `json:"assignee"`
	Type           string                     `json:"type"`
	Priority       int                        `json:"priority"`
	Estimate       *int                       `json:"estimate"`
	ProjectID      *int64                     `json:"projectId"`
	MilestoneID    *int64                     `json:"milestoneId"`
	CycleID        *int64                     `json:"cycleId"`
	ParentID       *int64                     `json:"parentId"`
	DueDate        *string                    `json:"dueDate"`
	LabelIDs       []int64                    `json:"labelIds"`
	Links          []CreateIssueLinkInput     `json:"links"`
	TemplateSlug   string                     `json:"templateSlug"`
	Recurring      *CreateRecurringIssueInput `json:"recurring"`
}

func (in CreateIssueRequest) IssueInput() CreateIssueInput {
	return CreateIssueInput{
		Title: in.Title, Body: in.Body, Status: in.Status, WorkflowStatus: in.WorkflowStatus,
		Assignee: in.Assignee, Type: in.Type, Priority: in.Priority, Estimate: in.Estimate,
		ProjectID: in.ProjectID, MilestoneID: in.MilestoneID, CycleID: in.CycleID,
		ParentID: in.ParentID, DueDate: in.DueDate, LabelIDs: in.LabelIDs,
		ExternalLinks: in.Links, TemplateSlug: in.TemplateSlug,
	}
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
