package store

import (
	"github.com/yashikota/kotowari/internal/domain"
)

func ensureIssueActive(issue Issue) error {
	if issue.ArchivedAt != nil {
		return errf(ErrConflict, "issue is archived")
	}
	return nil
}

func (s *Store) GetIssue(identifier string) (Issue, error) {
	var iss Issue
	err := s.snapshot(func(m *mem) error {
		got, ok := issueByIdent(m, identifier)
		if !ok {
			return ErrNotFound
		}
		iss = got
		return nil
	})
	return iss, err
}

func (s *Store) DeleteIssue(identifier string) error {
	var attachmentIDs []string
	err := s.mutate(func(m *mem) error {
		i := indexIssue(m, identifier)
		if i < 0 {
			return ErrNotFound
		}
		deletedID := m.Issues[i].ID
		deletedNum := m.Issues[i].Number
		deletedIdentifier := m.Issues[i].Identifier
		for _, comment := range m.Comments[deletedIdentifier] {
			for _, attachment := range comment.Attachments {
				attachmentIDs = append(attachmentIDs, attachment.ID)
			}
		}
		for _, attachment := range m.Issues[i].Attachments {
			attachmentIDs = append(attachmentIDs, attachment.ID)
		}
		m.Issues = append(m.Issues[:i], m.Issues[i+1:]...)
		delete(m.Comments, identifier)
		for j := range m.Issues {
			relations := m.Issues[j].Relations[:0]
			for _, relation := range m.Issues[j].Relations {
				if relation.TargetIdentifier != deletedIdentifier {
					relations = append(relations, relation)
				}
			}
			m.Issues[j].Relations = relations
			if m.Issues[j].ParentID != nil && *m.Issues[j].ParentID == deletedID {
				m.Issues[j].ParentID = nil
				m.Issues[j].ParentIdentifier = nil
			}
		}
		for j := range m.ADRs {
			m.ADRs[j].IssueNumbers = removeInt(m.ADRs[j].IssueNumbers, deletedNum)
		}
		m.bump(domain.Now())
		return nil
	})
	if err != nil {
		return err
	}
	for _, attachmentID := range attachmentIDs {
		_ = s.DeleteCommentAttachment(attachmentID)
	}
	return nil
}
