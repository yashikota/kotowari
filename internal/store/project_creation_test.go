package store

import (
	"errors"
	"testing"
)

func TestCreateProjectWithDependenciesUpdatesBothProjectsAtomically(t *testing.T) {
	s := openTest(t)
	base, err := s.CreateProject("Core platform", "core-platform", "", "started", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	created, err := s.CreateProjectWithWorkflowAndOptions(
		"Release experience", "release-experience", "", "", "", "", "planned", "", 0, nil, nil, nil,
		ProjectCreationOptions{Dependencies: []ProjectDependency{{ProjectSlug: base.Slug, Kind: "blocked_by"}}},
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(created.Dependencies) != 1 || created.Dependencies[0] != (ProjectDependency{ProjectSlug: base.Slug, Kind: "blocked_by"}) {
		t.Fatalf("created dependencies %#v", created.Dependencies)
	}
	updatedBase, err := s.GetProject(base.Slug)
	if err != nil {
		t.Fatal(err)
	}
	if len(updatedBase.Dependencies) != 1 || updatedBase.Dependencies[0] != (ProjectDependency{ProjectSlug: created.Slug, Kind: "blocks"}) {
		t.Fatalf("reciprocal dependencies %#v", updatedBase.Dependencies)
	}
	if _, err := s.CreateProjectWithWorkflowAndOptions(
		"Broken plan", "broken-plan", "", "", "", "", "planned", "", 0, nil, nil, nil,
		ProjectCreationOptions{Dependencies: []ProjectDependency{{ProjectSlug: "missing-project", Kind: "related"}}},
	); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing dependency target: %v", err)
	}
	if _, err := s.GetProject("broken-plan"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("failed create left a partial project: %v", err)
	}
}

func TestProjectLeadCanBeSetClearedAndValidated(t *testing.T) {
	s := openTest(t)
	created, err := s.CreateProjectWithWorkflowAndOptions(
		"Lead project", "lead-project", "", "", "", "", "planned", "", 0, nil, nil, nil,
		ProjectCreationOptions{Lead: "self"},
	)
	if err != nil {
		t.Fatal(err)
	}
	if created.Lead != "self" {
		t.Fatalf("created lead = %q, want self", created.Lead)
	}
	if _, err := s.CreateProjectWithWorkflowAndOptions(
		"Invalid lead", "invalid-lead", "", "", "", "", "planned", "", 0, nil, nil, nil,
		ProjectCreationOptions{Lead: "another-user"},
	); err == nil {
		t.Fatal("expected unsupported multi-user lead to be rejected")
	}
	cleared := ""
	updated, err := s.UpdateProjectWithWorkflowInitiativesAndLead(
		created.Slug, nil, nil, nil, nil, nil, nil, nil, nil, &cleared, nil, nil, nil, nil, nil,
	)
	if err != nil {
		t.Fatal(err)
	}
	if updated.Lead != "" {
		t.Fatalf("updated lead = %q, want unassigned", updated.Lead)
	}
	invalid := "another-user"
	if _, err := s.UpdateProjectWithWorkflowInitiativesAndLead(
		created.Slug, nil, nil, nil, nil, nil, nil, nil, nil, &invalid, nil, nil, nil, nil, nil,
	); err == nil {
		t.Fatal("expected unsupported multi-user lead update to be rejected")
	}
}
