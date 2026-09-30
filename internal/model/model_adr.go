package model

type ADR struct {
	ProjectSlug  *string `json:"projectSlug"`
	ID           int64   `json:"id"`
	Number       int     `json:"number"`
	Identifier   string  `json:"identifier"`
	Title        string  `json:"title"`
	Body         string  `json:"body"`
	PublishBody  string  `json:"publishBody"`
	Status       string  `json:"status"`
	Evaluation   string  `json:"evaluation"`
	Replay       string  `json:"replay"`
	Workload     string  `json:"workload"`
	Supersedes   *int    `json:"supersedes"`
	IssueNumbers []int   `json:"issueNumbers"`
	CreatedAt    string  `json:"createdAt"`
	UpdatedAt    string  `json:"updatedAt"`
}

type CreateADRInput struct {
	ProjectSlug  *string `json:"projectSlug"`
	Title        string  `json:"title"`
	Body         string  `json:"body"`
	Status       string  `json:"status"`
	Evaluation   string  `json:"evaluation"`
	Replay       string  `json:"replay"`
	Workload     string  `json:"workload"`
	IssueNumbers []int   `json:"issueNumbers"`
	Supersedes   *int    `json:"supersedes"`
}

type PatchADRInput struct {
	ProjectSlug  **string
	Title        *string
	Body         *string
	PublishBody  *string
	Status       *string
	Evaluation   *string
	Replay       *string
	Workload     *string
	Supersedes   **int
	IssueNumbers *[]int
}

type Diagnostic struct {
	Path    string `json:"path"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

type SearchHit struct {
	Snippet   string `json:"snippet,omitempty"`
	Kind      string `json:"kind"`
	ID        string `json:"id"`
	Title     string `json:"title"`
	Status    string `json:"status,omitempty"`
	Assignee  string `json:"assignee,omitempty"`
	Archived  bool   `json:"archived,omitempty"`
	CreatedAt string `json:"createdAt,omitempty"`
	UpdatedAt string `json:"updatedAt,omitempty"`
}
