package store

import "github.com/yashikota/kotowari/internal/domain"

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
