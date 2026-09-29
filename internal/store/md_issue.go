package store

import (
	"fmt"
	"strings"

	"github.com/pelletier/go-toml/v2"
)

type issueFM struct {
	Title          string              `toml:"title"`
	Status         string              `toml:"status"`
	WorkflowStatus string              `toml:"workflow_status,omitempty"`
	Assignee       string              `toml:"assignee,omitempty"`
	Type           string              `toml:"type,omitempty"`
	Priority       int                 `toml:"priority"`
	Estimate       *int                `toml:"estimate,omitempty"`
	Project        *string             `toml:"project,omitempty"`
	Milestone      *int64              `toml:"milestone,omitempty"`
	Cycle          *int                `toml:"cycle,omitempty"`
	CycleAddedAt   *string             `toml:"cycle_added_at,omitempty"`
	Parent         *string             `toml:"parent,omitempty"`
	Labels         []string            `toml:"labels"`
	Due            *string             `toml:"due,omitempty"`
	Reminder       *string             `toml:"reminder_at,omitempty"`
	Sort           float64             `toml:"sort"`
	Created        string              `toml:"created"`
	Updated        string              `toml:"updated"`
	StatusChanged  string              `toml:"status_changed,omitempty"`
	Started        *string             `toml:"started_at,omitempty"`
	Favorite       bool                `toml:"favorite,omitempty"`
	Completed      *string             `toml:"completed,omitempty"`
	Archived       *string             `toml:"archived_at,omitempty"`
	ADRs           []int               `toml:"adrs,omitempty"`
	Links          []IssueLink         `toml:"links,omitempty"`
	Relations      []IssueRelation     `toml:"relations,omitempty"`
	Reactions      []string            `toml:"reactions,omitempty"`
	Attachments    []CommentAttachment `toml:"attachments,omitempty"`
	RecurringSlug  *string             `toml:"recurring_slug,omitempty"`
	TemplateSlug   string              `toml:"template_slug,omitempty"`
	Comments       []commentFM         `toml:"comments,omitempty"`
}

type commentFM struct {
	ID          int64               `toml:"id"`
	Created     string              `toml:"created"`
	Updated     string              `toml:"updated,omitempty"`
	Body        string              `toml:"body"`
	Attachments []CommentAttachment `toml:"attachments,omitempty"`
	Reactions   []string            `toml:"reactions,omitempty"`
}

func parseIssueMarkdown(n int, ident, raw string, m *mem) (Issue, []Comment, error) {
	if n < 1 {
		return Issue{}, nil, fmt.Errorf("invalid identifier %q", ident)
	}
	block, body, err := splitFrontmatter(raw)
	if err != nil {
		return Issue{}, nil, err
	}
	var fm issueFM
	if strings.TrimSpace(block) != "" {
		if err := toml.Unmarshal([]byte(block), &fm); err != nil {
			return Issue{}, nil, err
		}
	}
	if fm.Status == "" {
		fm.Status = "backlog"
	}
	if fm.WorkflowStatus == "" {
		fm.WorkflowStatus = fm.Status
	}
	if fm.StatusChanged == "" {
		fm.StatusChanged = fm.Updated
		if fm.StatusChanged == "" {
			fm.StatusChanged = fm.Created
		}
	}
	iss := Issue{
		ID:               int64(n),
		Number:           n,
		Identifier:       ident,
		Title:            fm.Title,
		Body:             body,
		Status:           fm.Status,
		WorkflowStatus:   fm.WorkflowStatus,
		Assignee:         fm.Assignee,
		Type:             fm.Type,
		Priority:         fm.Priority,
		Estimate:         fm.Estimate,
		ProjectSlug:      fm.Project,
		MilestoneID:      fm.Milestone,
		CycleNumber:      fm.Cycle,
		CycleAddedAt:     fm.CycleAddedAt,
		ParentIdentifier: fm.Parent,
		DueDate:          fm.Due,
		ReminderAt:       fm.Reminder,
		SortOrder:        fm.Sort,
		CreatedAt:        fm.Created,
		UpdatedAt:        fm.Updated,
		StatusChangedAt:  fm.StatusChanged,
		StartedAt:        fm.Started,
		CompletedAt:      fm.Completed,
		ArchivedAt:       fm.Archived,
		ADRNumbers:       fm.ADRs,
		ExternalLinks:    fm.Links,
		Relations:        fm.Relations,
		Reactions:        fm.Reactions,
		Attachments:      fm.Attachments,
		RecurringSlug:    fm.RecurringSlug,
		TemplateSlug:     fm.TemplateSlug,
		IsFavorite:       fm.Favorite,
		Labels:           []Label{},
	}
	if iss.Reactions == nil {
		iss.Reactions = []string{}
	}
	if iss.Attachments == nil {
		iss.Attachments = []CommentAttachment{}
	}
	for _, name := range fm.Labels {
		if l, ok := labelByName(m, name); ok {
			iss.Labels = append(iss.Labels, l)
			continue
		}
		iss.Labels = append(iss.Labels, Label{Name: name})
	}
	comments := make([]Comment, 0, len(fm.Comments))
	for i, c := range fm.Comments {
		id := c.ID
		if id == 0 {
			id = int64(i + 1)
			m.dirtyMeta = true
		}
		reactions := c.Reactions
		if reactions == nil {
			reactions = []string{}
		}
		comments = append(comments, Comment{
			ID: id, IssueID: int64(n), Body: c.Body, CreatedAt: c.Created, UpdatedAt: c.Updated, Attachments: c.Attachments, Reactions: reactions,
		})
	}
	return iss, comments, nil
}

func renderIssueMarkdown(iss Issue, comments []Comment, m *mem) string {
	fm := issueFM{
		Title:          iss.Title,
		Status:         iss.Status,
		WorkflowStatus: iss.WorkflowStatus,
		Assignee:       iss.Assignee,
		Type:           iss.Type,
		Priority:       iss.Priority,
		Estimate:       iss.Estimate,
		Milestone:      iss.MilestoneID,
		CycleAddedAt:   iss.CycleAddedAt,
		Due:            iss.DueDate,
		Reminder:       iss.ReminderAt,
		Sort:           iss.SortOrder,
		Created:        iss.CreatedAt,
		Updated:        iss.UpdatedAt,
		StatusChanged:  iss.StatusChangedAt,
		Started:        iss.StartedAt,
		Favorite:       iss.IsFavorite,
		Completed:      iss.CompletedAt,
		Archived:       iss.ArchivedAt,
		ADRs:           iss.ADRNumbers,
		Links:          iss.ExternalLinks,
		Relations:      iss.Relations,
		Reactions:      iss.Reactions,
		Attachments:    iss.Attachments,
		RecurringSlug:  iss.RecurringSlug,
		TemplateSlug:   iss.TemplateSlug,
		Labels:         make([]string, 0, len(iss.Labels)),
	}
	if iss.ProjectID != nil {
		if p, ok := projectByID(m, *iss.ProjectID); ok {
			slug := p.Slug
			fm.Project = &slug
		}
	} else if iss.ProjectSlug != nil {
		fm.Project = iss.ProjectSlug
	}
	if iss.CycleID != nil {
		if c, ok := cycleByID(m, *iss.CycleID); ok {
			n := c.Number
			fm.Cycle = &n
		}
	} else if iss.CycleNumber != nil {
		fm.Cycle = iss.CycleNumber
	}
	if iss.ParentID != nil {
		if p, ok := issueByID(m, *iss.ParentID); ok {
			ident := p.Identifier
			fm.Parent = &ident
		}
	} else if iss.ParentIdentifier != nil {
		fm.Parent = iss.ParentIdentifier
	}
	for _, l := range iss.Labels {
		fm.Labels = append(fm.Labels, l.Name)
	}
	for _, c := range comments {
		fm.Comments = append(fm.Comments, commentFM{
			ID: c.ID, Created: c.CreatedAt, Updated: c.UpdatedAt, Body: c.Body, Attachments: c.Attachments, Reactions: c.Reactions,
		})
	}
	return marshalDoc(fm, iss.Body)
}
