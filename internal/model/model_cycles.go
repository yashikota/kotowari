package model

type Cycle struct {
	ID                     int64       `json:"id" toml:"id"`
	Number                 int         `json:"number" toml:"number"`
	Name                   string      `json:"name" toml:"name"`
	Description            string      `json:"description,omitempty" toml:"description,omitempty"`
	StartsAt               string      `json:"startsAt" toml:"startsAt"`
	EndsAt                 string      `json:"endsAt" toml:"endsAt"`
	Status                 string      `json:"status" toml:"status"`
	CompletedAt            *string     `json:"completedAt,omitempty" toml:"completed_at,omitempty"`
	ArchivedAt             *string     `json:"archivedAt,omitempty" toml:"archived_at,omitempty"`
	IsFavorite             bool        `json:"isFavorite,omitempty" toml:"is_favorite,omitempty"`
	NotifyOnIssueAdded     bool        `json:"notifyOnIssueAdded,omitempty" toml:"notify_on_issue_added,omitempty"`
	NotifyOnIssueCompleted bool        `json:"notifyOnIssueCompleted,omitempty" toml:"notify_on_issue_completed,omitempty"`
	Resources              []IssueLink `json:"resources,omitempty" toml:"resources,omitempty"`
	CreatedAt              string      `json:"createdAt" toml:"createdAt"`
	UpdatedAt              string      `json:"updatedAt" toml:"updatedAt"`
}

type CreateCycleInput struct {
	StartsAt string `json:"startsAt"`
	EndsAt   string `json:"endsAt"`
	Status   string `json:"status"`
}

type UpdateCycleInput struct {
	Name                   *string `json:"name"`
	Description            *string `json:"description"`
	StartsAt               *string `json:"startsAt"`
	EndsAt                 *string `json:"endsAt"`
	Status                 *string `json:"status"`
	IsFavorite             *bool   `json:"isFavorite"`
	NotifyOnIssueAdded     *bool   `json:"notifyOnIssueAdded"`
	NotifyOnIssueCompleted *bool   `json:"notifyOnIssueCompleted"`
	Archived               *bool   `json:"archived"`
}
