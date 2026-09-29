package model

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
	IsFavorite      bool                `json:"isFavorite,omitempty" toml:"is_favorite,omitempty"`
	Lead            string              `json:"lead,omitempty" toml:"lead,omitempty"`
	TemplateSlug    string              `json:"templateSlug,omitempty" toml:"template_slug,omitempty"`
	InitiativeSlugs []string            `json:"initiativeSlugs,omitempty" toml:"initiative_slugs,omitempty"`
	Health          string              `json:"health,omitempty" toml:"health,omitempty"`
	HealthUpdatedAt *string             `json:"healthUpdatedAt,omitempty" toml:"health_updated_at,omitempty"`
	CompletedAt     *string             `json:"completedAt,omitempty" toml:"completedAt,omitempty"`
	ArchivedAt      *string             `json:"archivedAt,omitempty" toml:"archived_at,omitempty"`
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

type PostHealthUpdateInput struct {
	Health string `json:"health"`
	Body   string `json:"body"`
}

// Initiative groups projects around a single strategic outcome.
type Initiative struct {
	ID              int64    `json:"id" toml:"id"`
	Name            string   `json:"name" toml:"name"`
	Slug            string   `json:"slug" toml:"slug"`
	Description     string   `json:"description" toml:"description,omitempty"`
	Status          string   `json:"status" toml:"status"`
	Color           string   `json:"color,omitempty" toml:"color,omitempty"`
	Health          string   `json:"health,omitempty" toml:"health,omitempty"`
	HealthUpdatedAt *string  `json:"healthUpdatedAt,omitempty" toml:"health_updated_at,omitempty"`
	Priority        int      `json:"priority" toml:"priority"`
	Labels          []string `json:"labels,omitempty" toml:"labels,omitempty"`
	StartDate       *string  `json:"startDate" toml:"start_date,omitempty"`
	TargetDate      *string  `json:"targetDate" toml:"target_date,omitempty"`
	CompletedAt     *string  `json:"completedAt,omitempty" toml:"completed_at,omitempty"`
	ProjectSlugs    []string `json:"projectSlugs" toml:"-"`
	CreatedAt       string   `json:"createdAt" toml:"created_at"`
	UpdatedAt       string   `json:"updatedAt" toml:"updated_at"`
}

type CreateInitiativeInput struct {
	Name         string
	Slug         string
	Description  string
	Status       string
	Color        string
	StartDate    *string
	TargetDate   *string
	ProjectSlugs []string
	Health       string
	Priority     int
	Labels       []string
}

type UpdateInitiativeInput struct {
	Name         *string
	Description  *string
	Status       *string
	Color        *string
	Health       *string
	Priority     *int
	Labels       *[]string
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

type CreateMilestoneInput struct {
	ProjectSlug string
	Name        string
	Description string
	TargetDate  *string
}

type UpdateMilestoneInput struct {
	ProjectSlug string
	ID          int64
	Name        *string
	Description *string
	TargetDate  **string
}

type ProjectCreationOptions struct {
	TemplateSlug string              `json:"templateSlug,omitempty"`
	Lead         string              `json:"lead,omitempty"`
	Milestones   []MilestoneInput    `json:"milestones,omitempty"`
	Dependencies []ProjectDependency `json:"dependencies,omitempty"`
}

type ProjectCreateInput struct {
	Name           string
	Slug           string
	Summary        string
	Icon           string
	IconColor      string
	Description    string
	Status         string
	WorkflowStatus string
	Priority       int
	StartDate      *string
	TargetDate     *string
	Labels         []string
	Options        ProjectCreationOptions
}

type ProjectUpdateInput struct {
	Slug            string
	Name            *string
	Summary         *string
	Icon            *string
	IconColor       *string
	Description     *string
	Status          *string
	WorkflowStatus  *string
	Health          *string
	Lead            *string
	Priority        *int
	StartDate       **string
	TargetDate      **string
	Labels          *[]string
	InitiativeSlugs *[]string
}

type ProjectDependency struct {
	ProjectSlug string `json:"projectSlug" toml:"project_slug"`
	Kind        string `json:"kind" toml:"kind"`
}

type CreateProjectDependencyInput struct {
	ProjectSlug string `json:"projectSlug"`
	Kind        string `json:"kind"`
}
