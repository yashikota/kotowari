package store

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

var (
	ErrNotFound   = errors.New("not found")
	ErrValidation = errors.New("validation")
	ErrConflict   = errors.New("conflict")
)

type Store struct {
	mu          sync.Mutex
	recurringMu sync.Mutex
	root        string
}

type Workspace struct {
	Name            string                  `json:"name"`
	Timezone        string                  `json:"timezone"`
	Locale          string                  `json:"locale"`
	URL             string                  `json:"url"`
	Description     string                  `json:"description"`
	GitHubURL       string                  `json:"githubUrl"`
	IssueStatuses   []IssueWorkflowStatus   `json:"issueStatuses"`
	ProjectStatuses []ProjectWorkflowStatus `json:"projectStatuses"`
	UpdatedAt       string                  `json:"updatedAt"`
}

// IssueWorkflowStatus is a user-configurable workflow state grouped under one
// of the five status categories used for issue lifecycle calculations.
type IssueWorkflowStatus struct {
	ID          string `json:"id" toml:"id"`
	Name        string `json:"name" toml:"name"`
	Category    string `json:"category" toml:"category"`
	Description string `json:"description,omitempty" toml:"description,omitempty"`
}

type ProjectWorkflowStatus struct {
	ID          string `json:"id" toml:"id"`
	Name        string `json:"name" toml:"name"`
	Category    string `json:"category" toml:"category"`
	Description string `json:"description,omitempty" toml:"description,omitempty"`
}

func DefaultIssueWorkflowStatuses() []IssueWorkflowStatus {
	return []IssueWorkflowStatus{
		{ID: "backlog", Name: "Backlog", Category: "backlog"},
		{ID: "todo", Name: "Todo", Category: "todo"},
		{ID: "in_progress", Name: "In Progress", Category: "in_progress"},
		{ID: "done", Name: "Done", Category: "done"},
		{ID: "canceled", Name: "Canceled", Category: "canceled"},
		{ID: "duplicate", Name: "Duplicate", Category: "canceled"},
	}
}

type Label struct {
	ID    int64  `json:"id" toml:"id"`
	Name  string `json:"name" toml:"name"`
	Color string `json:"color" toml:"color"`
}

type Project struct {
	ID              int64               `json:"id" toml:"id"`
	Name            string              `json:"name" toml:"name"`
	Slug            string              `json:"slug" toml:"slug"`
	Summary         string              `json:"summary" toml:"summary,omitempty"`
	Icon            string              `json:"icon,omitempty" toml:"icon,omitempty"`
	IconColor       string              `json:"iconColor,omitempty" toml:"icon_color,omitempty"`
	Description     string              `json:"description" toml:"description"`
	Status          string              `json:"status" toml:"status"`
	WorkflowStatus  string              `json:"workflowStatus,omitempty" toml:"workflow_status,omitempty"`
	TemplateSlug    string              `json:"templateSlug,omitempty" toml:"template_slug,omitempty"`
	InitiativeSlugs []string            `json:"initiativeSlugs,omitempty" toml:"initiative_slugs,omitempty"`
	Health          string              `json:"health,omitempty" toml:"health,omitempty"`
	HealthUpdatedAt *string             `json:"healthUpdatedAt,omitempty" toml:"health_updated_at,omitempty"`
	CompletedAt     *string             `json:"completedAt,omitempty" toml:"completedAt,omitempty"`
	Priority        int                 `json:"priority" toml:"priority"`
	StartDate       *string             `json:"startDate" toml:"startDate,omitempty"`
	TargetDate      *string             `json:"targetDate" toml:"targetDate,omitempty"`
	Labels          []string            `json:"labels" toml:"labels,omitempty"`
	Dependencies    []ProjectDependency `json:"dependencies" toml:"dependencies,omitempty"`
	Progress        float64             `json:"progress" toml:"-"`
	Milestones      []Milestone         `json:"milestones" toml:"milestones,omitempty"`
	CreatedAt       string              `json:"createdAt" toml:"createdAt"`
	UpdatedAt       string              `json:"updatedAt" toml:"updatedAt"`
}

// Initiative groups projects around a single strategic outcome.
type Initiative struct {
	ID           int64    `json:"id" toml:"id"`
	Name         string   `json:"name" toml:"name"`
	Slug         string   `json:"slug" toml:"slug"`
	Description  string   `json:"description" toml:"description,omitempty"`
	Status       string   `json:"status" toml:"status"`
	Color        string   `json:"color,omitempty" toml:"color,omitempty"`
	StartDate    *string  `json:"startDate" toml:"start_date,omitempty"`
	TargetDate   *string  `json:"targetDate" toml:"target_date,omitempty"`
	ProjectSlugs []string `json:"projectSlugs" toml:"-"`
	CreatedAt    string   `json:"createdAt" toml:"created_at"`
	UpdatedAt    string   `json:"updatedAt" toml:"updated_at"`
}

type UpdateInitiativeInput struct {
	Name         *string
	Description  *string
	Status       *string
	Color        *string
	StartDate    **string
	TargetDate   **string
	ProjectSlugs *[]string
}

type Milestone struct {
	ID          int64   `json:"id" toml:"id"`
	Name        string  `json:"name" toml:"name"`
	Description string  `json:"description,omitempty" toml:"description,omitempty"`
	TargetDate  *string `json:"targetDate" toml:"targetDate,omitempty"`
	CreatedAt   string  `json:"createdAt" toml:"createdAt"`
	UpdatedAt   string  `json:"updatedAt" toml:"updatedAt"`
}

type MilestoneInput struct {
	Name        string  `json:"name"`
	Description string  `json:"description,omitempty"`
	TargetDate  *string `json:"targetDate,omitempty"`
}

type ProjectCreationOptions struct {
	TemplateSlug string              `json:"templateSlug,omitempty"`
	Milestones   []MilestoneInput    `json:"milestones,omitempty"`
	Dependencies []ProjectDependency `json:"dependencies,omitempty"`
}

type ProjectDependency struct {
	ProjectSlug string `json:"projectSlug" toml:"project_slug"`
	Kind        string `json:"kind" toml:"kind"`
}

type Cycle struct {
	ID          int64       `json:"id" toml:"id"`
	Number      int         `json:"number" toml:"number"`
	Name        string      `json:"name" toml:"name"`
	Description string      `json:"description,omitempty" toml:"description,omitempty"`
	StartsAt    string      `json:"startsAt" toml:"startsAt"`
	EndsAt      string      `json:"endsAt" toml:"endsAt"`
	Status      string      `json:"status" toml:"status"`
	IsFavorite  bool        `json:"isFavorite,omitempty" toml:"is_favorite,omitempty"`
	Resources   []IssueLink `json:"resources,omitempty" toml:"resources,omitempty"`
	CreatedAt   string      `json:"createdAt" toml:"createdAt"`
	UpdatedAt   string      `json:"updatedAt" toml:"updatedAt"`
}

type UpdateCycleInput struct {
	Name        *string
	Description *string
	StartsAt    *string
	EndsAt      *string
	Status      *string
	IsFavorite  *bool
}

type Issue struct {
	ID               int64               `json:"id"`
	Number           int                 `json:"number"`
	Identifier       string              `json:"identifier"`
	Title            string              `json:"title"`
	Body             string              `json:"body"`
	Status           string              `json:"status"`
	WorkflowStatus   string              `json:"workflowStatus"`
	Type             string              `json:"type,omitempty"`
	Priority         int                 `json:"priority"`
	Estimate         *int                `json:"estimate,omitempty"`
	ProjectID        *int64              `json:"projectId"`
	ProjectSlug      *string             `json:"projectSlug,omitempty"`
	MilestoneID      *int64              `json:"milestoneId"`
	MilestoneName    *string             `json:"milestoneName,omitempty"`
	CycleID          *int64              `json:"cycleId"`
	CycleNumber      *int                `json:"cycleNumber,omitempty"`
	CycleAddedAt     *string             `json:"cycleAddedAt,omitempty" toml:"cycle_added_at,omitempty"`
	ParentID         *int64              `json:"parentId"`
	ParentIdentifier *string             `json:"parentIdentifier,omitempty"`
	Depth            int                 `json:"depth"`
	DueDate          *string             `json:"dueDate"`
	ReminderAt       *string             `json:"reminderAt"`
	SortOrder        float64             `json:"sortOrder"`
	Labels           []Label             `json:"labels"`
	ADRNumbers       []int               `json:"adrNumbers"`
	ExternalLinks    []IssueLink         `json:"externalLinks"`
	Relations        []IssueRelation     `json:"relations"`
	Reactions        []string            `json:"reactions"`
	Attachments      []CommentAttachment `json:"attachments"`
	RecurringSlug    *string             `json:"-"`
	IsFavorite       bool                `json:"isFavorite"`
	CreatedAt        string              `json:"createdAt"`
	UpdatedAt        string              `json:"updatedAt"`
	StatusChangedAt  string              `json:"statusChangedAt"`
	StartedAt        *string             `json:"startedAt,omitempty" toml:"started_at,omitempty"`
	CompletedAt      *string             `json:"completedAt"`
	ArchivedAt       *string             `json:"archivedAt"`
}

// IssueLink is a user-managed external resource attached to an issue.
// Kind distinguishes ordinary links, pull requests, and documents without
// requiring a multi-user integration service.
type IssueLink struct {
	ID        int64  `json:"id" toml:"id"`
	URL       string `json:"url" toml:"url"`
	Title     string `json:"title,omitempty" toml:"title,omitempty"`
	Kind      string `json:"kind" toml:"kind"`
	CreatedAt string `json:"createdAt" toml:"created_at"`
}

type CreateIssueLinkInput struct {
	URL   string `json:"url" toml:"url"`
	Title string `json:"title" toml:"title"`
	Kind  string `json:"kind" toml:"kind"`
}

type IssueRelation struct {
	ID               int64  `json:"id" toml:"id"`
	Kind             string `json:"kind" toml:"kind"`
	TargetIdentifier string `json:"targetIdentifier" toml:"target"`
}

type CreateIssueRelationInput struct {
	TargetIdentifier string
	Kind             string
}

type Comment struct {
	ID          int64               `json:"id"`
	IssueID     int64               `json:"issueId"`
	Body        string              `json:"body"`
	CreatedAt   string              `json:"createdAt"`
	UpdatedAt   string              `json:"updatedAt,omitempty"`
	Attachments []CommentAttachment `json:"attachments,omitempty"`
	Reactions   []string            `json:"reactions"`
}

type CommentAttachment struct {
	ID        string `json:"id" toml:"id"`
	Name      string `json:"name" toml:"name"`
	MediaType string `json:"mediaType" toml:"media_type"`
	Size      int64  `json:"size" toml:"size"`
}

type Activity struct {
	ID         int64           `json:"id"`
	EntityType string          `json:"entityType"`
	EntityID   int64           `json:"entityId"`
	Action     string          `json:"action"`
	Payload    json.RawMessage `json:"payload"`
	CreatedAt  string          `json:"createdAt"`
}

type Page struct {
	ID          int64    `json:"id"`
	Title       string   `json:"title"`
	Slug        string   `json:"slug"`
	Body        string   `json:"body"`
	ParentID    *int64   `json:"parentId"`
	ParentSlug  *string  `json:"parentSlug,omitempty"`
	ProjectID   *int64   `json:"projectId"`
	ProjectSlug *string  `json:"projectSlug,omitempty"`
	Status      string   `json:"status"`
	Date        *string  `json:"date"`
	Tags        []string `json:"tags"`
	CreatedAt   string   `json:"createdAt"`
	UpdatedAt   string   `json:"updatedAt"`
}

type View struct {
	ID                int64    `json:"id" toml:"id"`
	Name              string   `json:"name" toml:"name"`
	Slug              string   `json:"slug" toml:"slug"`
	Description       string   `json:"description,omitempty" toml:"description,omitempty"`
	Icon              string   `json:"icon,omitempty" toml:"icon,omitempty"`
	Display           string   `json:"display" toml:"display"`
	GroupBy           string   `json:"groupBy" toml:"group_by"`
	SubGroupBy        string   `json:"subGroupBy,omitempty" toml:"sub_group_by,omitempty"`
	OrderBy           string   `json:"orderBy" toml:"order_by"`
	Direction         string   `json:"direction,omitempty" toml:"direction,omitempty"`
	CompletedIssues   string   `json:"completedIssues,omitempty" toml:"completed_issues,omitempty"`
	ShowSubIssues     *bool    `json:"showSubIssues,omitempty" toml:"show_sub_issues,omitempty"`
	NestedSubIssues   string   `json:"nestedSubIssues,omitempty" toml:"nested_sub_issues,omitempty"`
	ShowEmptyGroups   bool     `json:"showEmptyGroups" toml:"show_empty_groups,omitempty"`
	DisplayProperties []string `json:"displayProperties,omitempty" toml:"display_properties,omitempty"`
	Status            *string  `json:"status" toml:"status,omitempty"`
	Project           *string  `json:"project" toml:"project,omitempty"`
	Cycle             *int     `json:"cycle" toml:"cycle,omitempty"`
	Labels            []string `json:"labels" toml:"labels,omitempty"`
	Priority          *int     `json:"priority" toml:"priority,omitempty"`
	Type              *string  `json:"type" toml:"type,omitempty"`
	Estimate          *int     `json:"estimate" toml:"estimate,omitempty"`
	DueDate           string   `json:"dueDate,omitempty" toml:"due_date,omitempty"`
	Relation          *string  `json:"relation,omitempty" toml:"relation,omitempty"`
	Content           *string  `json:"content,omitempty" toml:"content,omitempty"`
	MilestoneName     *string  `json:"milestoneName,omitempty" toml:"milestone_name,omitempty"`
	DateField         string   `json:"dateField,omitempty" toml:"date_field,omitempty"`
	DateRange         string   `json:"dateRange,omitempty" toml:"date_range,omitempty"`
	ProjectStatus     *string  `json:"projectStatus,omitempty" toml:"project_status,omitempty"`
	ProjectPriority   *int     `json:"projectPriority,omitempty" toml:"project_priority,omitempty"`
	ProjectLabels     []string `json:"projectLabels,omitempty" toml:"project_labels,omitempty"`
	AddedToCycle      []string `json:"addedToCycle,omitempty" toml:"added_to_cycle,omitempty"`
	CreatedAt         string   `json:"createdAt" toml:"createdAt"`
	UpdatedAt         string   `json:"updatedAt" toml:"updatedAt"`
}

func (v View) Filter() IssueFilter {
	f := IssueFilter{Labels: v.Labels, Priority: v.Priority, DueDate: v.DueDate}
	if v.Relation != nil {
		f.Relation = *v.Relation
	}
	if v.Content != nil {
		f.Content = *v.Content
	}
	if v.MilestoneName != nil {
		f.MilestoneName = *v.MilestoneName
	}
	f.DateField = v.DateField
	f.DateRange = v.DateRange
	if v.ProjectStatus != nil {
		f.ProjectStatus = *v.ProjectStatus
	}
	f.ProjectPriority = v.ProjectPriority
	f.ProjectLabels = v.ProjectLabels
	f.AddedToCycle = v.AddedToCycle
	f.Estimate = v.Estimate
	if v.Type != nil {
		f.Type = *v.Type
	}
	if v.Status != nil {
		f.Status = *v.Status
	}
	if v.Project != nil {
		f.ProjectSlug = *v.Project
	}
	if v.Cycle != nil {
		f.CycleNumber = *v.Cycle
	}
	return f
}

type ADR struct {
	ProjectSlug  *string `json:"projectSlug"`
	ID           int64   `json:"id"`
	Number       int     `json:"number"`
	Identifier   string  `json:"identifier"`
	Title        string  `json:"title"`
	Body         string  `json:"body"`
	PublishBody  string  `json:"publishBody"`
	Status       string  `json:"status"`
	Evaluation   string  `json:"evaluation"`
	Replay       string  `json:"replay"`
	Workload     string  `json:"workload"`
	Supersedes   *int    `json:"supersedes"`
	IssueNumbers []int   `json:"issueNumbers"`
	CreatedAt    string  `json:"createdAt"`
	UpdatedAt    string  `json:"updatedAt"`
}

type CreateADRInput struct {
	ProjectSlug  *string
	Title        string
	Body         string
	Status       string
	Evaluation   string
	Replay       string
	Workload     string
	IssueNumbers []int
	Supersedes   *int
}

type PatchADRInput struct {
	ProjectSlug  **string
	Title        *string
	Body         *string
	PublishBody  *string
	Status       *string
	Evaluation   *string
	Replay       *string
	Workload     *string
	Supersedes   **int
	IssueNumbers *[]int
}

type Diagnostic struct {
	Path    string `json:"path"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

type SearchHit struct {
	Snippet   string `json:"snippet,omitempty"`
	Kind      string `json:"kind"`
	ID        string `json:"id"`
	Title     string `json:"title"`
	Status    string `json:"status,omitempty"`
	Archived  bool   `json:"archived,omitempty"`
	CreatedAt string `json:"createdAt,omitempty"`
	UpdatedAt string `json:"updatedAt,omitempty"`
}

type IssueFilter struct {
	Status          string
	ProjectSlug     string
	CycleNumber     int
	Labels          []string
	Priority        *int
	Type            string
	Estimate        *int
	DueDate         string
	DueDateAsOf     string
	Relation        string
	Content         string
	MilestoneName   string
	ProjectLabels   []string
	AddedToCycle    []string
	DateField       string
	DateRange       string
	DateAsOf        string
	ProjectStatus   string
	ProjectPriority *int
	IsFavorite      *bool
	Archived        *bool
}

type CreateIssueInput struct {
	Title          string
	Body           string
	Status         string
	WorkflowStatus string
	Type           string
	Priority       int
	Estimate       *int
	ProjectID      *int64
	MilestoneID    *int64
	CycleID        *int64
	ParentID       *int64
	DueDate        *string
	LabelIDs       []int64
	ExternalLinks  []CreateIssueLinkInput
	RecurringSlug  *string
}

type PatchIssueInput struct {
	Title          *string
	Body           *string
	Status         *string
	WorkflowStatus *string
	Type           *string
	Priority       *int
	Estimate       **int
	ProjectID      **int64
	MilestoneID    **int64
	CycleID        **int64
	ParentID       **int64
	DueDate        **string
	ReminderAt     **string
	LabelIDs       *[]int64
	SortOrder      *float64
	IsFavorite     *bool
	Archived       *bool
}

type CreateViewInput struct {
	Name              string
	Slug              string
	Description       *string
	Icon              *string
	Display           string
	GroupBy           string
	OrderBy           string
	SubGroupBy        string
	Direction         string
	CompletedIssues   string
	ShowSubIssues     *bool
	NestedSubIssues   string
	ShowEmptyGroups   *bool
	DisplayProperties []string
	Status            *string
	Project           *string
	Cycle             *int
	Labels            []string
	Priority          *int
	Type              *string
	Estimate          *int
	DueDate           *string
	Relation          *string
	Content           *string
	MilestoneName     *string
	DateField         *string
	DateRange         *string
	ProjectStatus     *string
	ProjectPriority   *int
	ProjectLabels     []string
	AddedToCycle      []string
}

type mem struct {
	Workspace   workspaceFile
	Labels      []Label
	Projects    []Project
	Initiatives []Initiative
	Cycles      []Cycle
	Views       []View
	Issues      []Issue
	Comments    map[string][]Comment
	Pages       []Page
	ADRs        []ADR
	Activities  []Activity
	commentSeq  map[string]int64
	dirtyMeta   bool
	Diagnostics []Diagnostic
}

type workspaceFile struct {
	Name            string                  `toml:"name"`
	Timezone        string                  `toml:"timezone"`
	Locale          string                  `toml:"locale,omitempty"`
	URL             string                  `toml:"url,omitempty"`
	Description     string                  `toml:"description,omitempty"`
	GitHubURL       string                  `toml:"githubUrl,omitempty"`
	IssueStatuses   []IssueWorkflowStatus   `toml:"issueStatuses,omitempty"`
	ProjectStatuses []ProjectWorkflowStatus `toml:"projectStatuses,omitempty"`
	IssuePrefix     string                  `toml:"issuePrefix,omitempty"`
	ADRPrefix       string                  `toml:"adrPrefix,omitempty"`
	IssueCounter    int                     `toml:"issueCounter"`
	ADRCounter      int                     `toml:"adrCounter"`
	NextID          int64                   `toml:"nextID"`
	UpdatedAt       string                  `toml:"updatedAt"`
}

type labelsFile struct {
	Labels []Label `toml:"labels"`
}

func Open(root string) (*Store, error) {
	if err := os.MkdirAll(root, 0o755); err != nil {
		return nil, err
	}
	s := &Store{root: root}
	marker := filepath.Join(root, "workspace.toml")
	if _, err := os.Stat(marker); err != nil {
		if _, yamlErr := os.Stat(filepath.Join(root, "workspace.yaml")); yamlErr == nil {
			return nil, fmt.Errorf("found workspace.yaml in %s; this version uses workspace.toml (move the directory aside and run kotowari init)", root)
		}
		if err := seed(root); err != nil {
			return nil, err
		}
	}
	m, err := load(root)
	if err != nil {
		return nil, fmt.Errorf("open %s: %w", root, err)
	}
	if err := writeBundledTemplates(root); err != nil {
		return nil, err
	}
	if m.dirtyMeta {
		if err := save(root, m); err != nil {
			return nil, err
		}
	}
	return s, nil
}

func (s *Store) Close() error { return nil }

func (s *Store) Path() string { return s.root }

func validationf(format string, args ...any) error {
	return errf(ErrValidation, format, args...)
}
