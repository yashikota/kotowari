package store

import (
	"encoding/json"
	"mime"
	"strings"

	"github.com/yashikota/kotowari/internal/domain"
)

func (s *Store) ListComments(identifier string) ([]Comment, error) {
	var out []Comment
	err := s.snapshot(func(m *mem) error {
		iss, ok := issueByIdent(m, identifier)
		if !ok {
			return ErrNotFound
		}
		out = append([]Comment{}, m.Comments[iss.Identifier]...)
		if out == nil {
			out = []Comment{}
		}
		return nil
	})
	return out, err
}

func (s *Store) AddComment(identifier, body string) (Comment, error) {
	return s.AddCommentWithAttachments(identifier, body, nil)
}

func (s *Store) AddCommentWithAttachments(identifier, body string, attachments []CommentAttachment) (Comment, error) {
	body = strings.TrimSpace(body)
	if body == "" && len(attachments) == 0 {
		return Comment{}, validationf("body required")
	}
	if len(attachments) > 10 {
		return Comment{}, validationf("too many comment attachments")
	}
	seen := make(map[string]struct{}, len(attachments))
	for _, attachment := range attachments {
		mediaType, _, err := mime.ParseMediaType(attachment.MediaType)
		if !validCommentAttachmentID(attachment.ID) || attachment.Name == "" || len([]rune(attachment.Name)) > 255 ||
			strings.ContainsAny(attachment.Name, "/\\") || err != nil || mediaType == "" || attachment.Size <= 0 || attachment.Size > 20<<20 {
			return Comment{}, validationf("invalid comment attachment")
		}
		if _, ok := seen[attachment.ID]; ok {
			return Comment{}, validationf("duplicate comment attachment")
		}
		seen[attachment.ID] = struct{}{}
	}
	var out Comment
	err := s.mutate(func(m *mem) error {
		iss, ok := issueByIdent(m, identifier)
		if !ok {
			return ErrNotFound
		}
		if err := ensureIssueActive(iss); err != nil {
			return err
		}
		now := domain.Now()
		identifier = iss.Identifier
		m.commentSeq[identifier]++
		out = Comment{
			ID: m.commentSeq[identifier], IssueID: iss.ID, Body: body, CreatedAt: now,
			Attachments: append([]CommentAttachment{}, attachments...), Reactions: []string{},
		}
		m.Comments[identifier] = append(m.Comments[identifier], out)
		addActivity(m, "issue", iss.ID, "commented", map[string]any{"commentId": out.ID}, now)
		m.bump(now)
		return nil
	})
	return out, err
}

func (s *Store) UpdateComment(identifier string, commentID int64, body string) (Comment, error) {
	body = strings.TrimSpace(body)
	if commentID < 1 {
		return Comment{}, validationf("invalid comment id")
	}
	var out Comment
	err := s.mutate(func(m *mem) error {
		iss, ok := issueByIdent(m, identifier)
		if !ok {
			return ErrNotFound
		}
		if err := ensureIssueActive(iss); err != nil {
			return err
		}
		comments := m.Comments[iss.Identifier]
		for i := range comments {
			if comments[i].ID != commentID {
				continue
			}
			if body == "" && len(comments[i].Attachments) == 0 {
				return validationf("body required")
			}
			comments[i].Body = body
			comments[i].UpdatedAt = domain.Now()
			m.Comments[iss.Identifier] = comments
			addActivity(m, "issue", iss.ID, "comment_edited", map[string]any{"commentId": commentID}, comments[i].UpdatedAt)
			m.bump(comments[i].UpdatedAt)
			out = comments[i]
			return nil
		}
		return ErrNotFound
	})
	return out, err
}

func toggleReaction(current []string, emoji string) ([]string, bool) {
	for i, existing := range current {
		if existing == emoji {
			return append(append([]string{}, current[:i]...), current[i+1:]...), false
		}
	}
	return append(append([]string{}, current...), emoji), true
}

func (s *Store) ToggleIssueReaction(identifier, emoji string) (Issue, error) {
	if !validReactionEmoji(emoji) {
		return Issue{}, validationf("invalid reaction")
	}
	var out Issue
	err := s.mutate(func(m *mem) error {
		i := indexIssue(m, identifier)
		if i < 0 {
			return ErrNotFound
		}
		iss := m.Issues[i]
		if err := ensureIssueActive(iss); err != nil {
			return err
		}
		reactions, added := toggleReaction(iss.Reactions, emoji)
		iss.Reactions = reactions
		now := domain.Now()
		iss.UpdatedAt = now
		m.Issues[i] = iss
		action := "reaction_removed"
		if added {
			action = "reaction_added"
		}
		addActivity(m, "issue", iss.ID, action, map[string]any{"emoji": emoji}, now)
		m.bump(now)
		out = iss
		return nil
	})
	return out, err
}

func (s *Store) AddIssueAttachments(identifier string, attachments []CommentAttachment) ([]CommentAttachment, error) {
	if len(attachments) == 0 || len(attachments) > 10 {
		return nil, validationf("invalid issue attachment count")
	}
	seen := make(map[string]struct{}, len(attachments))
	for _, attachment := range attachments {
		if !validCommentAttachmentID(attachment.ID) || attachment.Name == "" || len([]rune(attachment.Name)) > 255 ||
			attachment.MediaType == "" || attachment.Size < 1 || attachment.Size > 20<<20 {
			return nil, validationf("invalid issue attachment")
		}
		if _, ok := seen[attachment.ID]; ok {
			return nil, validationf("duplicate issue attachment")
		}
		seen[attachment.ID] = struct{}{}
	}
	var out []CommentAttachment
	err := s.mutate(func(m *mem) error {
		i := indexIssue(m, identifier)
		if i < 0 {
			return ErrNotFound
		}
		iss := m.Issues[i]
		if err := ensureIssueActive(iss); err != nil {
			return err
		}
		for _, comment := range m.Comments[iss.Identifier] {
			for _, attachment := range comment.Attachments {
				if _, ok := seen[attachment.ID]; ok {
					return validationf("duplicate issue attachment")
				}
			}
		}
		for _, attachment := range iss.Attachments {
			if _, ok := seen[attachment.ID]; ok {
				return validationf("duplicate issue attachment")
			}
		}
		iss.Attachments = append(append([]CommentAttachment{}, iss.Attachments...), attachments...)
		now := domain.Now()
		iss.UpdatedAt = now
		m.Issues[i] = iss
		addActivity(m, "issue", iss.ID, "attachment_added", map[string]any{"count": len(attachments)}, now)
		m.bump(now)
		out = append([]CommentAttachment{}, iss.Attachments...)
		return nil
	})
	return out, err
}

func (s *Store) DeleteIssueAttachment(identifier, attachmentID string) error {
	err := s.mutate(func(m *mem) error {
		i := indexIssue(m, identifier)
		if i < 0 {
			return ErrNotFound
		}
		iss := m.Issues[i]
		if err := ensureIssueActive(iss); err != nil {
			return err
		}
		for index, attachment := range iss.Attachments {
			if attachment.ID != attachmentID {
				continue
			}
			iss.Attachments = append(iss.Attachments[:index], iss.Attachments[index+1:]...)
			now := domain.Now()
			iss.UpdatedAt = now
			m.Issues[i] = iss
			addActivity(m, "issue", iss.ID, "attachment_removed", map[string]any{"name": attachment.Name}, now)
			m.bump(now)
			return nil
		}
		return ErrNotFound
	})
	if err != nil {
		return err
	}
	return s.DeleteCommentAttachment(attachmentID)
}

func (s *Store) ToggleCommentReaction(identifier string, commentID int64, emoji string) (Comment, error) {
	if commentID < 1 {
		return Comment{}, validationf("invalid comment id")
	}
	if !validReactionEmoji(emoji) {
		return Comment{}, validationf("invalid reaction")
	}
	var out Comment
	err := s.mutate(func(m *mem) error {
		iss, ok := issueByIdent(m, identifier)
		if !ok {
			return ErrNotFound
		}
		if err := ensureIssueActive(iss); err != nil {
			return err
		}
		comments := m.Comments[iss.Identifier]
		for i := range comments {
			if comments[i].ID != commentID {
				continue
			}
			reactions, added := toggleReaction(comments[i].Reactions, emoji)
			comments[i].Reactions = reactions
			m.Comments[iss.Identifier] = comments
			action := "comment_reaction_removed"
			if added {
				action = "comment_reaction_added"
			}
			now := domain.Now()
			addActivity(m, "issue", iss.ID, action, map[string]any{"commentId": commentID, "emoji": emoji}, now)
			m.bump(now)
			out = comments[i]
			return nil
		}
		return ErrNotFound
	})
	return out, err
}

func (s *Store) DeleteComment(identifier string, commentID int64) error {
	if commentID < 1 {
		return validationf("invalid comment id")
	}
	var attachmentIDs []string
	err := s.mutate(func(m *mem) error {
		iss, ok := issueByIdent(m, identifier)
		if !ok {
			return ErrNotFound
		}
		if err := ensureIssueActive(iss); err != nil {
			return err
		}
		comments := m.Comments[iss.Identifier]
		for i, comment := range comments {
			if comment.ID != commentID {
				continue
			}
			for _, attachment := range comment.Attachments {
				attachmentIDs = append(attachmentIDs, attachment.ID)
			}
			m.Comments[iss.Identifier] = append(comments[:i], comments[i+1:]...)
			now := domain.Now()
			addActivity(m, "issue", iss.ID, "comment_deleted", map[string]any{"commentId": commentID}, now)
			m.bump(now)
			return nil
		}
		return ErrNotFound
	})
	if err != nil {
		return err
	}
	for _, attachmentID := range attachmentIDs {
		_ = s.DeleteCommentAttachment(attachmentID)
	}
	return nil
}

func (s *Store) GetCommentAttachment(identifier, attachmentID string) (CommentAttachment, error) {
	var out CommentAttachment
	err := s.snapshot(func(m *mem) error {
		iss, ok := issueByIdent(m, identifier)
		if !ok {
			return ErrNotFound
		}
		for _, attachment := range iss.Attachments {
			if attachment.ID == attachmentID {
				out = attachment
				return nil
			}
		}
		for _, comment := range m.Comments[iss.Identifier] {
			for _, attachment := range comment.Attachments {
				if attachment.ID == attachmentID {
					out = attachment
					return nil
				}
			}
		}
		return ErrNotFound
	})
	return out, err
}

func (s *Store) ListActivities(identifier string) ([]Activity, error) {
	var out []Activity
	err := s.snapshot(func(m *mem) error {
		iss, ok := issueByIdent(m, identifier)
		if !ok {
			return ErrNotFound
		}
		out = []Activity{}
		for i := len(m.Activities) - 1; i >= 0; i-- {
			a := m.Activities[i]
			if a.EntityType == "issue" && a.EntityID == iss.ID {
				out = append(out, a)
			}
		}
		return nil
	})
	return out, err
}

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

// ListRecentIssueActivities returns issue changes and subscribed cycle
// notifications with enough context for the single-user inbox to render them
// without an N+1 API request for each issue.
func (s *Store) ListRecentIssueActivities(limit int) ([]InboxActivity, error) {
	if limit <= 0 {
		limit = 100
	}
	if limit > 500 {
		limit = 500
	}
	var out []InboxActivity
	err := s.snapshot(func(m *mem) error {
		issuesByID := make(map[int64]Issue, len(m.Issues))
		for _, issue := range m.Issues {
			issuesByID[issue.ID] = issue
		}
		out = make([]InboxActivity, 0, limit)
		for i := len(m.Activities) - 1; i >= 0 && len(out) < limit; i-- {
			activity := m.Activities[i]
			identifier, title := "", ""
			if activity.EntityType == "issue" {
				issue, ok := issuesByID[activity.EntityID]
				if !ok {
					continue
				}
				identifier, title = issue.Identifier, issue.Title
			} else if activity.EntityType == "cycle" && (activity.Action == "cycle_issue_added" || activity.Action == "cycle_issue_completed") {
				var payload map[string]any
				if err := json.Unmarshal(activity.Payload, &payload); err != nil {
					continue
				}
				identifier, _ = payload["issueIdentifier"].(string)
				title, _ = payload["issueTitle"].(string)
				if identifier == "" || title == "" {
					continue
				}
			} else {
				continue
			}
			out = append(out, InboxActivity{
				ID: activity.ID, EntityType: activity.EntityType, EntityID: activity.EntityID,
				Action: activity.Action, Payload: activity.Payload, CreatedAt: activity.CreatedAt,
				Identifier: identifier, Title: title,
			})
		}
		return nil
	})
	return out, err
}

// ListCycleActivities returns status history for the issues currently assigned
// to a cycle, newest first. The cycle progress view uses this to reconstruct
// how work moved through the cycle without loading one activity feed per issue.
func (s *Store) ListCycleActivities(number int) ([]Activity, error) {
	var out []Activity
	err := s.snapshot(func(m *mem) error {
		cycle, ok := cycleByNumber(m, number)
		if !ok {
			return ErrNotFound
		}
		issueIDs := make(map[int64]struct{})
		for _, issue := range m.Issues {
			if (issue.CycleID != nil && *issue.CycleID == cycle.ID) ||
				(issue.CycleNumber != nil && *issue.CycleNumber == cycle.Number) {
				issueIDs[issue.ID] = struct{}{}
			}
		}
		out = []Activity{}
		for i := len(m.Activities) - 1; i >= 0; i-- {
			activity := m.Activities[i]
			if activity.EntityType != "issue" || activity.Action != "status_changed" {
				continue
			}
			if _, inCycle := issueIDs[activity.EntityID]; inCycle {
				out = append(out, activity)
			}
		}
		return nil
	})
	return out, err
}

func (s *Store) ListProjectActivities(slug string) ([]Activity, error) {
	var out []Activity
	err := s.snapshot(func(m *mem) error {
		i := indexProject(m, slug)
		if i < 0 {
			return ErrNotFound
		}
		projectID := m.Projects[i].ID
		out = []Activity{}
		for i := len(m.Activities) - 1; i >= 0; i-- {
			activity := m.Activities[i]
			if activity.EntityType == "project" && activity.EntityID == projectID {
				out = append(out, activity)
			}
		}
		return nil
	})
	return out, err
}
