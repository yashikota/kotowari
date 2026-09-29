package store

import "encoding/json"

// InboxActivity is an issue activity enriched with the issue identity needed
// by the workspace inbox. It intentionally contains no user or team data: the
// application is a single-user workspace.
type InboxActivity struct {
	ID         int64           `json:"id"`
	EntityType string          `json:"entityType"`
	EntityID   int64           `json:"entityId"`
	Action     string          `json:"action"`
	Payload    json.RawMessage `json:"payload"`
	CreatedAt  string          `json:"createdAt"`
	Identifier string          `json:"identifier"`
	Title      string          `json:"title"`
}
