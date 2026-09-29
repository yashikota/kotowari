package model

type CreateProjectFromIssueInput struct {
	Name           string  `json:"name"`
	Description    string  `json:"description"`
	Status         string  `json:"status"`
	WorkflowStatus string  `json:"workflowStatus"`
	Priority       int     `json:"priority"`
	StartDate      *string `json:"startDate"`
	TargetDate     *string `json:"targetDate"`
}
