package store

import (
	"os"
	"strings"
	"time"

	"github.com/pelletier/go-toml/v2"
	"github.com/yashikota/kotowari/internal/domain"
)

type recurringIssueFM struct {
	Name                string                 `toml:"name"`
	Title               string                 `toml:"title"`
	Status              string                 `toml:"status"`
	Creator             string                 `toml:"creator,omitempty"`
	Assignee            string                 `toml:"assignee,omitempty"`
	Type                string                 `toml:"type,omitempty"`
	Priority            int                    `toml:"priority"`
	Estimate            *int                   `toml:"estimate,omitempty"`
	Project             *string                `toml:"project,omitempty"`
	Labels              []string               `toml:"labels,omitempty"`
	Links               []CreateIssueLinkInput `toml:"links,omitempty"`
	FirstDueDate        string                 `toml:"first_due_date"`
	Interval            int                    `toml:"interval"`
	Unit                string                 `toml:"unit"`
	NextDueDate         string                 `toml:"next_due_date"`
	LastIssueIdentifier string                 `toml:"last_issue,omitempty"`
	Enabled             bool                   `toml:"enabled"`
}

func readRecurringIssue(path string) (RecurringIssue, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return RecurringIssue{}, err
	}
	block, body, err := splitFrontmatter(string(raw))
	if err != nil {
		return RecurringIssue{}, err
	}
	var fm recurringIssueFM
	if err := toml.Unmarshal([]byte(block), &fm); err != nil {
		return RecurringIssue{}, err
	}
	if strings.TrimSpace(fm.Name) == "" || strings.TrimSpace(fm.Title) == "" ||
		!validRecurringUnit(fm.Unit) || fm.Interval < 1 || fm.Interval > 365 {
		return RecurringIssue{}, validationf("invalid recurring issue metadata")
	}
	if _, err := time.Parse("2006-01-02", fm.FirstDueDate); err != nil {
		return RecurringIssue{}, validationf("invalid recurring issue first due date")
	}
	if _, err := time.Parse("2006-01-02", fm.NextDueDate); err != nil {
		return RecurringIssue{}, validationf("invalid recurring issue next due date")
	}
	if fm.Creator == "" {
		fm.Creator = "self"
	}
	if !validTemplateProperties(fm.Status, fm.Type, fm.Priority, fm.Estimate) ||
		!domain.ValidIssueAssignee(fm.Assignee) || !domain.ValidIssueCreator(fm.Creator) {
		return RecurringIssue{}, validationf("recurring issue contains invalid issue properties")
	}
	links, err := normalizeIssueLinks(fm.Links)
	if err != nil {
		return RecurringIssue{}, err
	}
	return RecurringIssue{
		Name: fm.Name, Title: fm.Title, Body: body, Status: fm.Status, Creator: fm.Creator, Assignee: fm.Assignee,
		Type: fm.Type, Priority: fm.Priority, Estimate: fm.Estimate,
		ProjectSlug: fm.Project, Labels: append([]string{}, fm.Labels...),
		Links:        links,
		FirstDueDate: fm.FirstDueDate, Interval: fm.Interval, Unit: fm.Unit,
		NextDueDate: fm.NextDueDate, LastIssueIdentifier: fm.LastIssueIdentifier,
		Enabled: fm.Enabled,
	}, nil
}

func writeRecurringIssue(path string, recurring RecurringIssue) error {
	links, err := normalizeIssueLinks(recurring.Links)
	if err != nil {
		return err
	}
	fm := recurringIssueFM{
		Name: recurring.Name, Title: recurring.Title, Status: recurring.Status, Creator: recurring.Creator, Assignee: recurring.Assignee,
		Type: recurring.Type, Priority: recurring.Priority, Estimate: recurring.Estimate,
		Project: recurring.ProjectSlug, Labels: recurring.Labels, Links: links,
		FirstDueDate: recurring.FirstDueDate, Interval: recurring.Interval,
		Unit: recurring.Unit, NextDueDate: recurring.NextDueDate,
		LastIssueIdentifier: recurring.LastIssueIdentifier, Enabled: recurring.Enabled,
	}
	if !validRecurringUnit(fm.Unit) || fm.Interval < 1 || fm.Interval > 365 ||
		!validTemplateProperties(fm.Status, fm.Type, fm.Priority, fm.Estimate) ||
		!domain.ValidIssueAssignee(fm.Assignee) || !domain.ValidIssueCreator(fm.Creator) {
		return validationf("invalid recurring issue")
	}
	metadata, err := toml.Marshal(fm)
	if err != nil {
		return err
	}
	content := append([]byte("+++\n"), metadata...)
	content = append(content, []byte("+++\n\n")...)
	content = append(content, []byte(recurring.Body)...)
	if len(recurring.Body) > 0 && !strings.HasSuffix(recurring.Body, "\n") {
		content = append(content, '\n')
	}
	return atomicWrite(path, content)
}
