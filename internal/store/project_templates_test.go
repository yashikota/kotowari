package store

import (
	"errors"
	"testing"
)

func TestProjectTemplateRoundTripAndDelete(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	label, err := s.CreateLabel(CreateLabelInput{Name: "Release", Color: "#336699"})
	if err != nil {
		t.Fatal(err)
	}
	startDate := "2026-09-01"
	targetDate := "2026-10-01"
	project, err := s.CreateProject(ProjectCreateInput{
		Name: "Launch", Slug: "launch", Summary: "A short summary", Icon: "rocket", IconColor: "blue",
		Description: "## Brief\nShip the new flow.", Status: "started", WorkflowStatus: "started", Priority: 2,
		StartDate: &startDate, TargetDate: &targetDate, Labels: []string{label.Name},
		Options: ProjectCreationOptions{Lead: "self", Milestones: []MilestoneInput{{
			Name: "Beta", Description: "Validate with users.", TargetDate: &targetDate,
		}}},
	})
	if err != nil {
		t.Fatal(err)
	}

	template, err := s.CreateProjectTemplate(project.Slug, "Launch plan")
	if err != nil {
		t.Fatal(err)
	}
	if template.Slug != "launch-plan" || template.Name != "Launch plan" || template.Summary != project.Summary ||
		template.Icon != project.Icon || template.IconColor != project.IconColor ||
		template.Description != project.Description || template.Status != project.Status ||
		template.WorkflowStatus != project.WorkflowStatus || template.Lead != project.Lead || template.Priority != project.Priority ||
		len(template.Labels) != 1 || template.Labels[0] != label.Name || len(template.Milestones) != 1 ||
		template.Milestones[0] != (ProjectTemplateMilestone{Name: "Beta", Description: "Validate with users."}) {
		t.Fatalf("created template %#v", template)
	}
	fromTemplate, err := s.CreateProject(ProjectCreateInput{
		Name: "Reused launch", Slug: "reused-launch", Summary: template.Summary,
		Icon: template.Icon, IconColor: template.IconColor, Description: template.Description,
		Status: template.Status, WorkflowStatus: template.WorkflowStatus, Priority: template.Priority,
		Labels:  template.Labels,
		Options: ProjectCreationOptions{TemplateSlug: template.Slug, Lead: template.Lead},
	})
	if err != nil {
		t.Fatal(err)
	}
	if fromTemplate.TemplateSlug != template.Slug || fromTemplate.Lead != "self" {
		t.Fatalf("created project template origin %q, want %q", fromTemplate.TemplateSlug, template.Slug)
	}
	if _, err := s.CreateProject(ProjectCreateInput{
		Name: "Invalid origin", Slug: "invalid-origin", Status: "planned", WorkflowStatus: "planned",
		Options: ProjectCreationOptions{TemplateSlug: "../escape"},
	}); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid template origin error %v", err)
	}
	if err := s.Close(); err != nil {
		t.Fatal(err)
	}

	reopened, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	listed, err := reopened.ListProjectTemplates()
	if err != nil {
		t.Fatal(err)
	}
	if len(listed) != 1 || listed[0].Slug != template.Slug || listed[0].Description != template.Description {
		t.Fatalf("listed templates %#v", listed)
	}
	t.Cleanup(func() { _ = reopened.Close() })
	if _, err := reopened.CreateProjectTemplate(project.Slug, "Launch plan"); !errors.Is(err, ErrConflict) {
		t.Fatalf("duplicate template error %v", err)
	}
	if err := reopened.DeleteProjectTemplate(template.Slug); err != nil {
		t.Fatal(err)
	}
	if err := reopened.DeleteProjectTemplate(template.Slug); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing template error %v", err)
	}
	if err := reopened.DeleteProjectTemplate("../escape"); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid template slug error %v", err)
	}
}

func TestCreateProjectTemplateRequiresExistingProject(t *testing.T) {
	s := openTest(t)
	if _, err := s.CreateProjectTemplate("missing", "Template"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing project error %v", err)
	}
}
