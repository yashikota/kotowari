package store

// These positional methods preserve older internal callers. New code should use
// ProjectCreateInput and ProjectUpdateInput with the FromInput methods.

func (s *Store) CreateProject(name, slug, description, status string, start, target *string) (Project, error) {
	return s.CreateProjectWithPriority(name, slug, description, status, 0, start, target)
}

func (s *Store) CreateProjectWithPriority(name, slug, description, status string, priority int, start, target *string) (Project, error) {
	return s.CreateProjectWithPriorityAndLabels(name, slug, description, status, priority, start, target, nil)
}

func (s *Store) CreateProjectWithPriorityAndLabels(name, slug, description, status string, priority int, start, target *string, labels []string) (Project, error) {
	return s.CreateProjectWithSummaryAndLabels(name, slug, "", description, status, priority, start, target, labels)
}

func (s *Store) CreateProjectWithSummaryAndLabels(name, slug, summary, description, status string, priority int, start, target *string, labels []string) (Project, error) {
	return s.CreateProjectWithAppearance(name, slug, summary, "", "", description, status, priority, start, target, labels)
}

func (s *Store) CreateProjectWithAppearance(name, slug, summary, icon, iconColor, description, status string, priority int, start, target *string, labels []string) (Project, error) {
	return s.CreateProjectWithWorkflow(name, slug, summary, icon, iconColor, description, status, "", priority, start, target, labels)
}

func (s *Store) CreateProjectWithWorkflow(name, slug, summary, icon, iconColor, description, status, workflowStatus string, priority int, start, target *string, labels []string) (Project, error) {
	return s.CreateProjectWithWorkflowAndOptions(name, slug, summary, icon, iconColor, description, status, workflowStatus, priority, start, target, labels, ProjectCreationOptions{})
}

func (s *Store) CreateProjectWithWorkflowAndOptions(name, slug, summary, icon, iconColor, description, status, workflowStatus string, priority int, start, target *string, labels []string, options ProjectCreationOptions) (Project, error) {
	return s.CreateProjectFromInput(ProjectCreateInput{
		Name: name, Slug: slug, Summary: summary, Icon: icon, IconColor: iconColor,
		Description: description, Status: status, WorkflowStatus: workflowStatus,
		Priority: priority, StartDate: start, TargetDate: target, Labels: labels, Options: options,
	})
}

func (s *Store) UpdateProject(slug string, name, description, status, health *string, priority *int, start, target **string, labels *[]string) (Project, error) {
	return s.UpdateProjectWithSummary(slug, name, nil, description, status, health, priority, start, target, labels)
}

func (s *Store) UpdateProjectWithSummary(slug string, name, summary, description, status, health *string, priority *int, start, target **string, labels *[]string) (Project, error) {
	return s.UpdateProjectWithAppearance(slug, name, summary, nil, nil, description, status, health, priority, start, target, labels)
}

func (s *Store) UpdateProjectWithAppearance(slug string, name, summary, icon, iconColor, description, status, health *string, priority *int, start, target **string, labels *[]string) (Project, error) {
	return s.UpdateProjectWithWorkflow(slug, name, summary, icon, iconColor, description, status, nil, health, priority, start, target, labels)
}

func (s *Store) UpdateProjectWithWorkflow(slug string, name, summary, icon, iconColor, description, status, workflowStatus, health *string, priority *int, start, target **string, labels *[]string) (Project, error) {
	return s.UpdateProjectWithWorkflowAndInitiatives(slug, name, summary, icon, iconColor, description, status, workflowStatus, health, priority, start, target, labels, nil)
}

func (s *Store) UpdateProjectWithWorkflowAndInitiatives(slug string, name, summary, icon, iconColor, description, status, workflowStatus, health *string, priority *int, start, target **string, labels, initiativeSlugs *[]string) (Project, error) {
	return s.UpdateProjectWithWorkflowInitiativesAndLead(slug, name, summary, icon, iconColor, description, status, workflowStatus, health, nil, priority, start, target, labels, initiativeSlugs)
}

func (s *Store) UpdateProjectWithWorkflowInitiativesAndLead(slug string, name, summary, icon, iconColor, description, status, workflowStatus, health, lead *string, priority *int, start, target **string, labels, initiativeSlugs *[]string) (Project, error) {
	return s.UpdateProjectFromInput(ProjectUpdateInput{
		Slug: slug, Name: name, Summary: summary, Icon: icon, IconColor: iconColor,
		Description: description, Status: status, WorkflowStatus: workflowStatus,
		Health: health, Lead: lead, Priority: priority, StartDate: start, TargetDate: target,
		Labels: labels, InitiativeSlugs: initiativeSlugs,
	})
}
