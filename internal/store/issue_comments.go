package store

import (
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

func (s *Store) AddComment(identifier string, in CreateCommentInput) (Comment, error) {
	body := strings.TrimSpace(in.Body)
	attachments := in.Attachments
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

func (s *Store) UpdateComment(identifier string, commentID int64, in UpdateCommentInput) (Comment, error) {
	body := strings.TrimSpace(in.Body)
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
