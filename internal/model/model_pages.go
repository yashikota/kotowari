package model

type Page struct {
	ID          int64    `json:"id"`
	Title       string   `json:"title"`
	Slug        string   `json:"slug"`
	Body        string   `json:"body"`
	ParentID    *int64   `json:"parentId"`
	ParentSlug  *string  `json:"parentSlug,omitempty"`
	ProjectID   *int64   `json:"projectId"`
	ProjectSlug *string  `json:"projectSlug,omitempty"`
	Status      string   `json:"status"`
	Date        *string  `json:"date"`
	Tags        []string `json:"tags"`
	CreatedAt   string   `json:"createdAt"`
	UpdatedAt   string   `json:"updatedAt"`
}

type CreatePageInput struct {
	Title     string
	Slug      string
	Body      string
	Status    string
	ParentID  *int64
	ProjectID *int64
	Date      *string
	Tags      []string
}

type UpdatePageInput struct {
	Slug      string
	Title     *string
	Body      *string
	Status    *string
	ParentID  **int64
	ProjectID **int64
	Date      **string
	Tags      *[]string
}
