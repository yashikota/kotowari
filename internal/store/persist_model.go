package store

type workspaceFile struct {
	Name                    string                   `toml:"name"`
	Timezone                string                   `toml:"timezone"`
	Locale                  string                   `toml:"locale,omitempty"`
	URL                     string                   `toml:"url,omitempty"`
	Description             string                   `toml:"description,omitempty"`
	GitHubURL               string                   `toml:"githubUrl,omitempty"`
	CycleSettings           *CycleSettings           `toml:"cycleSettings,omitempty"`
	IssueAutomationSettings *IssueAutomationSettings `toml:"issueAutomationSettings,omitempty"`
	IssueStatuses           []IssueWorkflowStatus    `toml:"issueStatuses,omitempty"`
	ProjectStatuses         []ProjectWorkflowStatus  `toml:"projectStatuses,omitempty"`
	IssuePrefix             string                   `toml:"issuePrefix,omitempty"`
	ADRPrefix               string                   `toml:"adrPrefix,omitempty"`
	IssueCounter            int                      `toml:"issueCounter"`
	ADRCounter              int                      `toml:"adrCounter"`
	NextID                  int64                    `toml:"nextID"`
	UpdatedAt               string                   `toml:"updatedAt"`
}

type labelsFile struct {
	Labels []Label `toml:"labels"`
}
