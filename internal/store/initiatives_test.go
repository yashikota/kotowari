package store

import (
	"errors"
	"testing"
)

func TestInitiativeProjectsPersistAndAreUnlinkedOnDelete(t *testing.T) {
	s := openTest(t)
	first, err := s.CreateProject("First", "first", "", "started", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	second, err := s.CreateProject("Second", "second", "", "planned", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	start, target := "2026-09-01", "2026-12-31"
	initiative, err := s.CreateInitiative("Platform launch", "platform-launch", "Ship the platform", "planned", "blue", &start, &target)
	if err != nil {
		t.Fatal(err)
	}
	initiative, err = s.UpdateInitiative(initiative.Slug, UpdateInitiativeInput{
		Status:       stringPointer("active"),
		ProjectSlugs: &[]string{first.Slug, second.Slug},
	})
	if err != nil {
		t.Fatal(err)
	}
	if initiative.Status != "active" || len(initiative.ProjectSlugs) != 2 {
		t.Fatalf("updated initiative %#v", initiative)
	}
	projects, err := s.ListProjects()
	if err != nil {
		t.Fatal(err)
	}
	for _, project := range projects {
		if !containsString(project.InitiativeSlugs, initiative.Slug) {
			t.Fatalf("project %q lost initiative link: %#v", project.Slug, project.InitiativeSlugs)
		}
	}
	reopened, err := Open(s.root)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = reopened.Close() })
	reloadedInitiative, err := reopened.GetInitiative(initiative.Slug)
	if err != nil || reloadedInitiative.Status != "active" || len(reloadedInitiative.ProjectSlugs) != 2 {
		t.Fatalf("initiative relation did not survive reopening: %#v (%v)", reloadedInitiative, err)
	}

	if _, err := s.UpdateInitiative(initiative.Slug, UpdateInitiativeInput{ProjectSlugs: &[]string{"missing"}}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing project link error %v", err)
	}
	initiative, err = s.GetInitiative(initiative.Slug)
	if err != nil || len(initiative.ProjectSlugs) != 2 {
		t.Fatalf("failed update changed links: %#v (%v)", initiative, err)
	}
	if err := s.DeleteInitiative(initiative.Slug); err != nil {
		t.Fatal(err)
	}
	for _, slug := range []string{first.Slug, second.Slug} {
		project, err := s.GetProject(slug)
		if err != nil {
			t.Fatal(err)
		}
		if containsString(project.InitiativeSlugs, initiative.Slug) {
			t.Fatalf("deleted initiative still linked from project %#v", project)
		}
	}
}

func TestCreateInitiativeRejectsInvalidDatesAndProjectLinks(t *testing.T) {
	s := openTest(t)
	start, target := "2026-12-31", "2026-09-01"
	if _, err := s.CreateInitiative("Invalid dates", "invalid-dates", "", "planned", "", &start, &target); !errors.Is(err, ErrValidation) {
		t.Fatalf("reversed initiative date range error %v", err)
	}
	if _, err := s.CreateInitiativeWithProjects("Missing project", "missing-project", "", "planned", "", nil, nil, []string{"missing"}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing project error %v", err)
	}
	if _, err := s.GetInitiative("missing-project"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("failed initiative create left a record: %v", err)
	}
}

func TestProposedInitiativeStatusPersists(t *testing.T) {
	s := openTest(t)
	initiative, err := s.CreateInitiative("Proposed launch", "proposed-launch", "", "proposed", "blue", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	reopened, err := Open(s.root)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = reopened.Close() })
	reloaded, err := reopened.GetInitiative(initiative.Slug)
	if err != nil || reloaded.Status != "proposed" {
		t.Fatalf("proposed initiative status did not persist: %#v (%v)", reloaded, err)
	}
}

func TestInitiativePriorityHealthLabelsAndCompletionPersist(t *testing.T) {
	s := openTest(t)
	label, err := s.CreateLabel("Initiative QA", "#7950f2")
	if err != nil {
		t.Fatal(err)
	}
	initiative, err := s.CreateInitiativeWithOptions(
		"Release quality", "release-quality", "", "active", "purple", nil, nil,
		nil, "on_track", 2, []string{label.Name},
	)
	if err != nil {
		t.Fatal(err)
	}
	if initiative.Health != "on_track" || initiative.HealthUpdatedAt == nil || *initiative.HealthUpdatedAt == "" || initiative.Priority != 2 || len(initiative.Labels) != 1 || initiative.Labels[0] != label.Name || initiative.CompletedAt != nil {
		t.Fatalf("initiative properties %#v", initiative)
	}
	completed, err := s.UpdateInitiative(initiative.Slug, UpdateInitiativeInput{Status: stringPointer("completed")})
	if err != nil {
		t.Fatal(err)
	}
	if completed.CompletedAt == nil {
		t.Fatalf("completion date not recorded: %#v", completed)
	}
	reopened, err := Open(s.root)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = reopened.Close() })
	reloaded, err := reopened.GetInitiative(initiative.Slug)
	if err != nil || reloaded.Priority != 2 || reloaded.Health != "on_track" || reloaded.HealthUpdatedAt == nil || reloaded.CompletedAt == nil || len(reloaded.Labels) != 1 || reloaded.Labels[0] != label.Name {
		t.Fatalf("initiative properties did not persist: %#v (%v)", reloaded, err)
	}
	active, err := reopened.UpdateInitiative(initiative.Slug, UpdateInitiativeInput{Status: stringPointer("active")})
	if err != nil || active.CompletedAt != nil {
		t.Fatalf("reopened initiative retained completion date: %#v (%v)", active, err)
	}
	cleared, err := reopened.UpdateInitiative(initiative.Slug, UpdateInitiativeInput{Health: stringPointer("")})
	if err != nil || cleared.HealthUpdatedAt != nil {
		t.Fatalf("cleared initiative health retained an update date: %#v (%v)", cleared, err)
	}
}

func TestProjectInitiativePropertyUpdatesBothSides(t *testing.T) {
	s := openTest(t)
	project, err := s.CreateProject("Roadmap", "roadmap", "", "started", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	initiative, err := s.CreateInitiative("Platform", "platform", "", "planned", "purple", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	assigned, err := s.UpdateProjectWithWorkflowAndInitiatives(project.Slug, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, &[]string{initiative.Slug})
	if err != nil {
		t.Fatal(err)
	}
	if len(assigned.InitiativeSlugs) != 1 || assigned.InitiativeSlugs[0] != initiative.Slug {
		t.Fatalf("project initiative property %#v", assigned.InitiativeSlugs)
	}
	initiative, err = s.GetInitiative(initiative.Slug)
	if err != nil || len(initiative.ProjectSlugs) != 1 || initiative.ProjectSlugs[0] != project.Slug {
		t.Fatalf("initiative projects %#v (%v)", initiative.ProjectSlugs, err)
	}
	if _, err := s.UpdateProjectWithWorkflowAndInitiatives(project.Slug, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, &[]string{"missing"}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing initiative assignment error %v", err)
	}
	if _, err := s.UpdateProjectWithWorkflowAndInitiatives(project.Slug, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, &[]string{}); err != nil {
		t.Fatal(err)
	}
	initiative, err = s.GetInitiative(initiative.Slug)
	if err != nil || len(initiative.ProjectSlugs) != 0 {
		t.Fatalf("initiative projects were not unlinked %#v (%v)", initiative.ProjectSlugs, err)
	}
}
