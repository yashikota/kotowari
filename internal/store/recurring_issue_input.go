package store

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/yashikota/kotowari/internal/domain"
)

// CreateRecurringIssueFromInput creates the first due instance directly from a
// new issue form. Unlike converting an existing issue, it does not leave a
// separate seed issue behind.
func (s *Store) CreateRecurringIssueFromInput(issueInput CreateIssueInput, in CreateRecurringIssueInput) (RecurringIssue, error) {
	issueInput.Title = strings.TrimSpace(issueInput.Title)
	if issueInput.Title == "" {
		return RecurringIssue{}, validationf("title required")
	}
	if issueInput.Status == "" {
		issueInput.Status = "backlog"
	}
	if !domain.ValidIssueStatus(issueInput.Status) {
		return RecurringIssue{}, validationf("invalid status")
	}
	if !domain.ValidPriority(issueInput.Priority) {
		return RecurringIssue{}, validationf("invalid priority")
	}
	if !domain.ValidIssueType(issueInput.Type) {
		return RecurringIssue{}, validationf("invalid issue type")
	}
	if !domain.ValidEstimate(issueInput.Estimate) {
		return RecurringIssue{}, validationf("invalid estimate")
	}
	if !domain.ValidIssueAssignee(issueInput.Assignee) {
		return RecurringIssue{}, validationf("invalid issue assignee")
	}
	if issueInput.Creator == "" {
		issueInput.Creator = "self"
	}
	if !domain.ValidIssueCreator(issueInput.Creator) {
		return RecurringIssue{}, validationf("invalid issue creator")
	}

	normalizedLinks, err := normalizeIssueLinks(issueInput.ExternalLinks)
	if err != nil {
		return RecurringIssue{}, err
	}
	issueInput.ExternalLinks = normalizedLinks
	if in.Name == "" {
		in.Name = issueInput.Title
	}
	var slug string
	in, slug, err = normalizeCreateRecurringIssueInput(in)
	if err != nil {
		return RecurringIssue{}, err
	}
	if strings.TrimSpace(issueInput.Body) == "" {
		issueInput.Body = templateBody(s.root, "ISSUE.md", "")
	}

	var recurring RecurringIssue
	err = s.snapshot(func(m *mem) error {
		workflowStatus, ok := resolveIssueWorkflowStatus(m.Workspace, issueInput.Status, issueInput.WorkflowStatus)
		if !ok {
			return validationf("invalid workflow status")
		}
		recurring = RecurringIssue{
			Slug: slug, Name: in.Name, Title: issueInput.Title, Body: issueInput.Body,
			Status: workflowStatus.Category, Creator: issueInput.Creator, Assignee: issueInput.Assignee, Type: issueInput.Type, Priority: issueInput.Priority,
			Estimate: issueInput.Estimate, Labels: []string{}, Links: issueLinksForRecurringInput(issueInput.ExternalLinks),
			FirstDueDate: in.FirstDueDate, Interval: in.Interval, Unit: in.Unit,
			NextDueDate: in.FirstDueDate, Enabled: true,
		}
		if issueInput.ProjectID != nil {
			project, ok := projectByID(m, *issueInput.ProjectID)
			if !ok {
				return validationf("project not found")
			}
			projectSlug := project.Slug
			recurring.ProjectSlug = &projectSlug
		}
		if issueInput.MilestoneID != nil {
			project, _, ok := milestoneByID(m, *issueInput.MilestoneID)
			if !ok || (issueInput.ProjectID != nil && *issueInput.ProjectID != project.ID) {
				return validationf("milestone must belong to the issue project")
			}
			if recurring.ProjectSlug == nil {
				projectSlug := project.Slug
				recurring.ProjectSlug = &projectSlug
			}
		}
		if issueInput.CycleID != nil {
			if _, ok := cycleByID(m, *issueInput.CycleID); !ok {
				return validationf("cycle not found")
			}
		}
		if err := checkIssueParent(m, 0, issueInput.ParentID); err != nil {
			return err
		}
		for _, labelID := range issueInput.LabelIDs {
			if label, ok := labelByID(m, labelID); ok {
				recurring.Labels = append(recurring.Labels, label.Name)
			}
		}
		return nil
	})
	if err != nil {
		return RecurringIssue{}, err
	}

	in, slug, err = s.createUniqueRecurringIssueFile(in, recurring)
	if err != nil {
		return RecurringIssue{}, err
	}
	if err := s.ProcessDueRecurringIssues(); err != nil {
		return RecurringIssue{}, err
	}
	if issueInput.WorkflowStatus != "" || issueInput.CycleID != nil || issueInput.ParentID != nil || issueInput.MilestoneID != nil {
		issues, err := s.ListIssues(IssueFilter{})
		if err != nil {
			return RecurringIssue{}, err
		}
		firstInstance := findRecurringInstance(issues, slug, in.FirstDueDate)
		if firstInstance == nil {
			return RecurringIssue{}, ErrNotFound
		}
		patch := PatchIssueInput{
			CycleID: &issueInput.CycleID, ParentID: &issueInput.ParentID, MilestoneID: &issueInput.MilestoneID,
		}
		if issueInput.WorkflowStatus != "" {
			patch.WorkflowStatus = &issueInput.WorkflowStatus
		}
		if _, err := s.UpdateIssue(firstInstance.Identifier, patch); err != nil {
			return RecurringIssue{}, err
		}
	}
	items, err := s.ListRecurringIssues()
	if err != nil {
		return RecurringIssue{}, err
	}
	for _, item := range items {
		if item.Slug == slug {
			return item, nil
		}
	}
	return RecurringIssue{}, ErrNotFound
}

func normalizeCreateRecurringIssueInput(in CreateRecurringIssueInput) (CreateRecurringIssueInput, string, error) {
	in.Name = strings.TrimSpace(in.Name)
	slug := issueTemplateSlug(in.Name)
	if in.Name == "" || slug == "" || len([]rune(in.Name)) > 100 {
		return CreateRecurringIssueInput{}, "", validationf("recurring issue name must contain 1 to 100 characters")
	}
	if in.Interval < 1 || in.Interval > 365 || !validRecurringUnit(in.Unit) {
		return CreateRecurringIssueInput{}, "", validationf("invalid recurring interval")
	}
	if _, err := time.Parse("2006-01-02", in.FirstDueDate); err != nil {
		return CreateRecurringIssueInput{}, "", validationf("first due date must use YYYY-MM-DD")
	}
	return in, slug, nil
}

func uniqueRecurringIssueInput(root string, in CreateRecurringIssueInput) (CreateRecurringIssueInput, string, error) {
	base := []rune(strings.TrimSpace(in.Name))
	if len(base) > 100 {
		base = base[:100]
	}
	for suffix := 1; ; suffix++ {
		name := string(base)
		if suffix > 1 {
			ending := fmt.Sprintf(" (%d)", suffix)
			available := 100 - len([]rune(ending))
			candidate := base
			if len(candidate) > available {
				candidate = candidate[:available]
			}
			name = strings.TrimSpace(string(candidate)) + ending
		}
		candidateInput := in
		candidateInput.Name = name
		candidateInput, slug, err := normalizeCreateRecurringIssueInput(candidateInput)
		if err != nil {
			return CreateRecurringIssueInput{}, "", err
		}
		_, err = os.Stat(filepath.Join(root, "TEMPLATE", "RECURRING-"+slug+".md"))
		if os.IsNotExist(err) {
			return candidateInput, slug, nil
		}
		if err != nil {
			return CreateRecurringIssueInput{}, "", err
		}
	}
}

func issueLinksForRecurring(links []IssueLink) []CreateIssueLinkInput {
	inputs := make([]CreateIssueLinkInput, 0, len(links))
	for _, link := range links {
		inputs = append(inputs, CreateIssueLinkInput{URL: link.URL, Title: link.Title, Kind: link.Kind})
	}
	return inputs
}

func issueLinksForRecurringInput(links []CreateIssueLinkInput) []CreateIssueLinkInput {
	inputs := make([]CreateIssueLinkInput, len(links))
	copy(inputs, links)
	return inputs
}
