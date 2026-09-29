package model

// IssueTemplate is a reusable, workspace-local issue recipe stored as Markdown
// under TEMPLATE/ so it remains editable and versionable outside the UI.
type IssueTemplate struct {
	Slug     string   `json:"slug"`
	Name     string   `json:"name"`
	Title    string   `json:"title"`
	Body     string   `json:"body"`
	Status   string   `json:"status"`
	Assignee string   `json:"assignee,omitempty"`
	Type     string   `json:"type,omitempty"`
	Priority int      `json:"priority"`
	Estimate *int     `json:"estimate,omitempty"`
	Labels   []string `json:"labels"`
}
