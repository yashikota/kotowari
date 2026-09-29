package store

import (
	"encoding/json"
)

type Issue struct {
	ID               int64               `json:"id"`
	Number           int                 `json:"number"`
	Identifier       string              `json:"identifier"`
	Title            string              `json:"title"`
	Body             string              `json:"body"`
	Status           string              `json:"status"`
	WorkflowStatus   string              `json:"workflowStatus"`
	Assignee         string              `json:"assignee,omitempty" toml:"assignee,omitempty"`
	Type             string              `json:"type,omitempty"`
	Priority         int                 `json:"priority"`
	Estimate         *int                `json:"estimate,omitempty"`
	ProjectID        *int64              `json:"projectId"`
	ProjectSlug      *string             `json:"projectSlug,omitempty"`
	MilestoneID      *int64              `json:"milestoneId"`
	MilestoneName    *string             `json:"milestoneName,omitempty"`
	CycleID          *int64              `json:"cycleId"`
	CycleNumber      *int                `json:"cycleNumber,omitempty"`
	CycleAddedAt     *string             `json:"cycleAddedAt,omitempty" toml:"cycle_added_at,omitempty"`
	ParentID         *int64              `json:"parentId"`
	ParentIdentifier *string             `json:"parentIdentifier,omitempty"`
	Depth            int                 `json:"depth"`
	DueDate          *string             `json:"dueDate"`
	ReminderAt       *string             `json:"reminderAt"`
	SortOrder        float64             `json:"sortOrder"`
	Labels           []Label             `json:"labels"`
	ADRNumbers       []int               `json:"adrNumbers"`
	ExternalLinks    []IssueLink         `json:"externalLinks"`
	TemplateSlug     string              `json:"templateSlug,omitempty" toml:"template_slug,omitempty"`
	Relations        []IssueRelation     `json:"relations"`
	Reactions        []string            `json:"reactions"`
	Attachments      []CommentAttachment `json:"attachments"`
	RecurringSlug    *string             `json:"-"`
	IsFavorite       bool                `json:"isFavorite"`
	CreatedAt        string              `json:"createdAt"`
	UpdatedAt        string              `json:"updatedAt"`
	StatusChangedAt  string              `json:"statusChangedAt"`
	StartedAt        *string             `json:"startedAt,omitempty" toml:"started_at,omitempty"`
	CompletedAt      *string             `json:"completedAt"`
	ArchivedAt       *string             `json:"archivedAt"`
}

// IssueLink is a user-managed external resource attached to an issue.
// Kind distinguishes ordinary links, pull requests, and documents without
// requiring a multi-user integration service.
type IssueLink struct {
	ID        int64  `json:"id" toml:"id"`
	URL       string `json:"url" toml:"url"`
	Title     string `json:"title,omitempty" toml:"title,omitempty"`
	Kind      string `json:"kind" toml:"kind"`
	CreatedAt string `json:"createdAt" toml:"created_at"`
}

type IssueLinkSource struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Count int    `json:"count"`
}

type IssueTemplateFilterOption struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Count int    `json:"count"`
}

type CreateIssueLinkInput struct {
	URL   string `json:"url" toml:"url"`
	Title string `json:"title" toml:"title"`
	Kind  string `json:"kind" toml:"kind"`
}

type IssueRelation struct {
	ID               int64  `json:"id" toml:"id"`
	Kind             string `json:"kind" toml:"kind"`
	TargetIdentifier string `json:"targetIdentifier" toml:"target"`
}

type CreateIssueRelationInput struct {
	TargetIdentifier string
	Kind             string
}

type Comment struct {
	ID          int64               `json:"id"`
	IssueID     int64               `json:"issueId"`
	Body        string              `json:"body"`
	CreatedAt   string              `json:"createdAt"`
	UpdatedAt   string              `json:"updatedAt,omitempty"`
	Attachments []CommentAttachment `json:"attachments,omitempty"`
	Reactions   []string            `json:"reactions"`
}

type CommentAttachment struct {
	ID        string `json:"id" toml:"id"`
	Name      string `json:"name" toml:"name"`
	MediaType string `json:"mediaType" toml:"media_type"`
	Size      int64  `json:"size" toml:"size"`
}

type Activity struct {
	ID         int64           `json:"id"`
	EntityType string          `json:"entityType"`
	EntityID   int64           `json:"entityId"`
	Action     string          `json:"action"`
	Payload    json.RawMessage `json:"payload"`
	CreatedAt  string          `json:"createdAt"`
}
