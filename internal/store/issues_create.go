package store

import (
	"github.com/yashikota/kotowari/internal/domain"
)

func (s *Store) CreateIssue(in CreateIssueInput) (Issue, error) {
	prepared, err := s.prepareCreateIssueInput(in)
	if err != nil {
		return Issue{}, err
	}
	in = prepared.input
	now := prepared.now
	automationNow := prepared.automationNow
	externalLinks := prepared.externalLinks
	var out Issue
	err = s.mutate(func(m *mem) error {
		workflowState, ok := resolveIssueWorkflowStatus(m.Workspace, in.Status, in.WorkflowStatus)
		if !ok {
			return validationf("invalid workflow status")
		}
		m.Workspace.IssueCounter++
		n := m.Workspace.IssueCounter
		ident := domain.Ident(m.issuePrefix(), n)
		sort := 1.0
		for _, iss := range m.Issues {
			if iss.SortOrder >= sort {
				sort = iss.SortOrder + 1
			}
		}
		var startedAt *string
		if workflowState.Category == "in_progress" {
			startedAt = &now
		}
		var cycleAddedAt *string
		if in.CycleID != nil {
			if _, ok := cycleByID(m, *in.CycleID); !ok {
				return validationf("cycle not found")
			}
			cycleAddedAt = &now
		}
		out = Issue{
			ID: int64(n), Number: n, Identifier: ident, Title: in.Title, Body: in.Body,
			Status: workflowState.Category, WorkflowStatus: workflowState.ID, Assignee: in.Assignee, Type: in.Type, Priority: in.Priority, Estimate: in.Estimate, ProjectID: in.ProjectID, CycleID: in.CycleID, CycleAddedAt: cycleAddedAt,
			DueDate: in.DueDate, TemplateSlug: in.TemplateSlug, RecurringSlug: in.RecurringSlug, SortOrder: sort, CreatedAt: now, UpdatedAt: now, StatusChangedAt: now,
			StartedAt: startedAt, CompletedAt: completedAt(workflowState.Category, now, nil), Labels: []Label{}, ADRNumbers: []int{}, ExternalLinks: externalLinks, Relations: []IssueRelation{}, Reactions: []string{}, Attachments: []CommentAttachment{},
		}
		if in.MilestoneID != nil {
			p, milestone, ok := milestoneByID(m, *in.MilestoneID)
			if !ok || (in.ProjectID != nil && *in.ProjectID != p.ID) {
				return validationf("milestone must belong to the issue project")
			}
			projectID := p.ID
			projectSlug := p.Slug
			milestoneName := milestone.Name
			out.ProjectID = &projectID
			out.ProjectSlug = &projectSlug
			out.MilestoneID = in.MilestoneID
			out.MilestoneName = &milestoneName
		}
		if in.ProjectID != nil {
			if p, ok := projectByID(m, *in.ProjectID); ok {
				slug := p.Slug
				out.ProjectSlug = &slug
			}
		}
		if in.CycleID != nil {
			if c, ok := cycleByID(m, *in.CycleID); ok {
				num := c.Number
				out.CycleNumber = &num
			}
		}
		if in.ParentID != nil {
			if err := checkIssueParent(m, 0, in.ParentID); err != nil {
				return err
			}
			p, ok := issueByID(m, *in.ParentID)
			if !ok {
				return validationf("parent not found")
			}
			out.ParentID = in.ParentID
			ident := p.Identifier
			out.ParentIdentifier = &ident
		}
		if in.CycleID == nil {
			autoAssignIssueCycle(m, &out, automationNow)
		}
		for _, id := range in.LabelIDs {
			if l, ok := labelByID(m, id); ok {
				out.Labels = append(out.Labels, l)
			}
		}
		m.Issues = append(m.Issues, out)
		m.Comments[ident] = []Comment{}
		addActivity(m, "issue", out.ID, "created", map[string]any{"identifier": ident}, now)
		addCycleNotification(m, out.CycleID, out, "cycle_issue_added", now)
		if issueIsClosed(out) {
			applyIssueCloseAutomation(m, out.ID, now)
		}
		m.bump(now)
		return nil
	})
	return out, err
}
