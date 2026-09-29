package store

import (
	"errors"
	"testing"
)

func TestCreateProjectWithDependenciesUpdatesBothProjectsAtomically(t *testing.T) {
	s := openTest(t)
	base, err := s.CreateProjectFromInput(ProjectCreateInput{Name: "Core platform", Slug: "core-platform", Status: "started"})
	if err != nil {
		t.Fatal(err)
	}
	created, err := s.CreateProjectFromInput(ProjectCreateInput{
		Name: "Release experience", Slug: "release-experience", Status: "planned",
		Options: ProjectCreationOptions{Dependencies: []ProjectDependency{{ProjectSlug: base.Slug, Kind: "blocked_by"}}},
	})
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
	if _, err := s.CreateProjectFromInput(ProjectCreateInput{
		Name: "Broken plan", Slug: "broken-plan", Status: "planned",
		Options: ProjectCreationOptions{Dependencies: []ProjectDependency{{ProjectSlug: "missing-project", Kind: "related"}}},
	}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing dependency target: %v", err)
	}
	if _, err := s.GetProject("broken-plan"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("failed create left a partial project: %v", err)
	}
}

func TestProjectLeadCanBeSetClearedAndValidated(t *testing.T) {
	s := openTest(t)
	created, err := s.CreateProjectFromInput(ProjectCreateInput{
		Name: "Lead project", Slug: "lead-project", Status: "planned",
		Options: ProjectCreationOptions{Lead: "self"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if created.Lead != "self" {
		t.Fatalf("created lead = %q, want self", created.Lead)
	}
	if _, err := s.CreateProjectFromInput(ProjectCreateInput{
		Name: "Invalid lead", Slug: "invalid-lead", Status: "planned",
		Options: ProjectCreationOptions{Lead: "another-user"},
	}); err == nil {
		t.Fatal("expected unsupported multi-user lead to be rejected")
	}
	cleared := ""
	updated, err := s.UpdateProjectFromInput(ProjectUpdateInput{Slug: created.Slug, Lead: &cleared})
	if err != nil {
		t.Fatal(err)
	}
	if updated.Lead != "" {
		t.Fatalf("updated lead = %q, want unassigned", updated.Lead)
	}
	invalid := "another-user"
	if _, err := s.UpdateProjectFromInput(ProjectUpdateInput{Slug: created.Slug, Lead: &invalid}); err == nil {
		t.Fatal("expected unsupported multi-user lead update to be rejected")
	}
}
