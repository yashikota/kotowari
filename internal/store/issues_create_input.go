package store

import (
	"strings"
	"time"

	"github.com/yashikota/kotowari/internal/domain"
)

type preparedCreateIssueInput struct {
	input         CreateIssueInput
	now           string
	automationNow time.Time
	externalLinks []IssueLink
}

func (s *Store) prepareCreateIssueInput(in CreateIssueInput) (preparedCreateIssueInput, error) {
	in.Title = strings.TrimSpace(in.Title)
	if in.Title == "" {
		return preparedCreateIssueInput{}, validationf("title required")
	}
	if in.Status == "" {
		in.Status = "backlog"
	}
	if !domain.ValidIssueStatus(in.Status) {
		return preparedCreateIssueInput{}, validationf("invalid status")
	}
	if !domain.ValidPriority(in.Priority) {
		return preparedCreateIssueInput{}, validationf("invalid priority")
	}
	if !domain.ValidIssueType(in.Type) {
		return preparedCreateIssueInput{}, validationf("invalid issue type")
	}
	if !domain.ValidEstimate(in.Estimate) {
		return preparedCreateIssueInput{}, validationf("invalid estimate")
	}
	if !domain.ValidIssueAssignee(in.Assignee) {
		return preparedCreateIssueInput{}, validationf("invalid issue assignee")
	}
	if in.Creator == "" {
		in.Creator = "self"
	}
	if !domain.ValidIssueCreator(in.Creator) {
		return preparedCreateIssueInput{}, validationf("invalid issue creator")
	}
	if in.TemplateSlug != "" {
		if issueTemplateSlug(in.TemplateSlug) != in.TemplateSlug {
			return preparedCreateIssueInput{}, validationf("invalid issue template")
		}
		templates, err := s.ListIssueTemplates()
		if err != nil {
			return preparedCreateIssueInput{}, err
		}
		found := false
		for _, template := range templates {
			if template.Slug == in.TemplateSlug {
				found = true
				break
			}
		}
		if !found {
			return preparedCreateIssueInput{}, validationf("issue template not found")
		}
	}
	now := domain.Now()
	automationNow, _ := time.Parse(time.RFC3339, now)
	normalizedLinks, err := normalizeIssueLinks(in.ExternalLinks)
	if err != nil {
		return preparedCreateIssueInput{}, err
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
	return preparedCreateIssueInput{
		input: in, now: now, automationNow: automationNow, externalLinks: externalLinks,
	}, nil
}
