package store

import (
	"errors"
	"testing"
)

func TestCreateProjectWithMilestones(t *testing.T) {
	s := openTest(t)
	targetDate := "2026-12-01"
	project, err := s.CreateProjectWithWorkflowAndOptions(
		"Release plan", "release-plan", "", "", "", "", "planned", "", 0, nil, nil, nil,
		ProjectCreationOptions{Milestones: []MilestoneInput{
			{Name: "Beta", Description: "Private preview", TargetDate: &targetDate},
			{Name: "Launch", Description: "Public release"},
		}},
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(project.Milestones) != 2 {
		t.Fatalf("milestones %#v", project.Milestones)
	}
	if project.Milestones[0].ID <= project.ID || project.Milestones[0].Name != "Beta" ||
		project.Milestones[0].Description != "Private preview" || project.Milestones[0].TargetDate == nil ||
		*project.Milestones[0].TargetDate != targetDate || project.Milestones[1].Name != "Launch" {
		t.Fatalf("created milestone details %#v", project.Milestones)
	}
	if _, err := s.CreateProjectWithWorkflowAndOptions(
		"Duplicate milestones", "duplicate-milestones", "", "", "", "", "planned", "", 0, nil, nil, nil,
		ProjectCreationOptions{Milestones: []MilestoneInput{{Name: "Beta"}, {Name: " beta "}}},
	); !errors.Is(err, ErrConflict) {
		t.Fatalf("duplicate milestone names: %v", err)
	}
	if _, err := s.GetProject("duplicate-milestones"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("invalid create left a partial project: %v", err)
	}
}

func TestMilestoneDescriptionPersistsAndUpdates(t *testing.T) {
	s := openTest(t)
	project, err := s.CreateProject("Roadmap", "roadmap", "", "planned", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	milestone, err := s.CreateMilestoneWithDescription(project.Slug, "Preview", "Customer validation", nil)
	if err != nil {
		t.Fatal(err)
	}
	description := "Feedback incorporated"
	milestone, err = s.UpdateMilestoneDetails(project.Slug, milestone.ID, nil, &description, nil)
	if err != nil {
		t.Fatal(err)
	}
	if milestone.Description != description {
		t.Fatalf("updated milestone %#v", milestone)
	}
	if err := s.Close(); err != nil {
		t.Fatal(err)
	}
	reopened, err := Open(s.Path())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = reopened.Close() })
	stored, err := reopened.GetProject(project.Slug)
	if err != nil {
		t.Fatal(err)
	}
	if got := stored.Milestones[0].Description; got != description {
		t.Fatalf("persisted milestone description = %q", got)
	}
}
