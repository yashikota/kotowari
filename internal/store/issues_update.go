package store

import (
	"github.com/yashikota/kotowari/internal/domain"
)

func isRestoreOnlyIssuePatch(in PatchIssueInput) bool {
	if in.Archived == nil || *in.Archived {
		return false
	}
	return in.Title == nil && in.Body == nil && in.Status == nil && in.WorkflowStatus == nil && in.Type == nil &&
		in.Priority == nil && in.Estimate == nil && in.ProjectID == nil && in.MilestoneID == nil &&
		in.Assignee == nil && in.CycleID == nil && in.ParentID == nil && in.DueDate == nil && in.ReminderAt == nil &&
		in.LabelIDs == nil && in.SortOrder == nil && in.IsFavorite == nil
}

func (s *Store) UpdateIssue(identifier string, in PatchIssueInput) (Issue, error) {
	var out Issue
	err := s.mutate(func(m *mem) error {
		i := indexIssue(m, identifier)
		if i < 0 {
			return ErrNotFound
		}
		iss := m.Issues[i]
		if iss.ArchivedAt != nil && !isRestoreOnlyIssuePatch(in) {
			return errf(ErrConflict, "issue is archived")
		}
		before := snapshotIssueUpdate(iss)
		if err := applyIssueUpdateFields(m, &iss, in); err != nil {
			return err
		}
		if err := applyIssueUpdateRelations(m, &iss, in); err != nil {
			return err
		}
		now := domain.Now()
		applyIssueUpdateTransitions(m, &iss, in, before, now)
		m.Issues[i] = iss
		recordIssueUpdateActivities(m, iss, in, before, now)
		m.bump(now)
		out = iss
		return nil
	})
	return out, err
}
