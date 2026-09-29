package model

type CreateProjectFromIssueInput struct {
	Name           string
	Description    string
	Status         string
	WorkflowStatus string
	Priority       int
	StartDate      *string
	TargetDate     *string
}
