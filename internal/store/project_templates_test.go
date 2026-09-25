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
	label, err := s.CreateLabel("Release", "#336699")
	if err != nil {
		t.Fatal(err)
	}
	startDate := "2026-09-01"
	targetDate := "2026-10-01"
	project, err := s.CreateProjectWithWorkflowAndOptions(
		"Launch", "launch", "A short summary", "rocket", "blue", "## Brief\nShip the new flow.",
		"started", "started", 2, &startDate, &targetDate, []string{label.Name},
		ProjectCreationOptions{Milestones: []MilestoneInput{{
			Name: "Beta", Description: "Validate with users.", TargetDate: &targetDate,
		}}},
	)
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
		template.WorkflowStatus != project.WorkflowStatus || template.Priority != project.Priority ||
		len(template.Labels) != 1 || template.Labels[0] != label.Name || len(template.Milestones) != 1 ||
		template.Milestones[0] != (ProjectTemplateMilestone{Name: "Beta", Description: "Validate with users."}) {
		t.Fatalf("created template %#v", template)
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
