package store

import (
	"strings"
	"time"

	"github.com/yashikota/kotowari/internal/domain"
)

func (s *Store) CreateIssue(in CreateIssueInput) (Issue, error) {
	in.Title = strings.TrimSpace(in.Title)
	if in.Title == "" {
		return Issue{}, validationf("title required")
	}
	if in.Status == "" {
		in.Status = "backlog"
	}
	if !domain.ValidIssueStatus(in.Status) {
		return Issue{}, validationf("invalid status")
	}
	if !domain.ValidPriority(in.Priority) {
		return Issue{}, validationf("invalid priority")
	}
	if !domain.ValidIssueType(in.Type) {
		return Issue{}, validationf("invalid issue type")
	}
	if !domain.ValidEstimate(in.Estimate) {
		return Issue{}, validationf("invalid estimate")
	}
	if !domain.ValidIssueAssignee(in.Assignee) {
		return Issue{}, validationf("invalid issue assignee")
	}
	if in.TemplateSlug != "" {
		if issueTemplateSlug(in.TemplateSlug) != in.TemplateSlug {
			return Issue{}, validationf("invalid issue template")
		}
		templates, err := s.ListIssueTemplates()
		if err != nil {
			return Issue{}, err
		}
		found := false
		for _, template := range templates {
			if template.Slug == in.TemplateSlug {
				found = true
				break
			}
		}
		if !found {
			return Issue{}, validationf("issue template not found")
		}
	}
	now := domain.Now()
	automationNow, _ := time.Parse(time.RFC3339, now)
	normalizedLinks, err := normalizeIssueLinks(in.ExternalLinks)
	if err != nil {
		return Issue{}, err
	}
	externalLinks := make([]IssueLink, 0, len(normalizedLinks))
	for index, link := range normalizedLinks {
		externalLinks = append(externalLinks, IssueLink{
			ID: int64(index + 1), URL: link.URL, Title: link.Title, Kind: link.Kind, CreatedAt: now,
		})
	}
	if strings.TrimSpace(in.Body) == "" {
		in.Body = templateBody(s.root, "ISSUE.md", "")
	}
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
