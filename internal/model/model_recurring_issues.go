package model

type RecurringIssue struct {
	Slug                string                 `json:"slug"`
	Name                string                 `json:"name"`
	Title               string                 `json:"title"`
	Body                string                 `json:"body"`
	Status              string                 `json:"status"`
	Assignee            string                 `json:"assignee,omitempty"`
	Type                string                 `json:"type,omitempty"`
	Priority            int                    `json:"priority"`
	Estimate            *int                   `json:"estimate,omitempty"`
	ProjectSlug         *string                `json:"projectSlug,omitempty"`
	Labels              []string               `json:"labels"`
	Links               []CreateIssueLinkInput `json:"links,omitempty"`
	FirstDueDate        string                 `json:"firstDueDate"`
	Interval            int                    `json:"interval"`
	Unit                string                 `json:"unit"`
	NextDueDate         string                 `json:"nextDueDate"`
	LastIssueIdentifier string                 `json:"lastIssueIdentifier,omitempty"`
	Enabled             bool                   `json:"enabled"`
}

type CreateRecurringIssueInput struct {
	Name         string `json:"name"`
	FirstDueDate string `json:"firstDueDate"`
	Interval     int    `json:"interval"`
	Unit         string `json:"unit"`
}

type SetRecurringIssueEnabledInput struct {
	Enabled *bool `json:"enabled"`
}
