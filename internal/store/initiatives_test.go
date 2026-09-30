package store

import (
	"errors"
	"testing"
)

func TestInitiativeProjectsPersistAndAreUnlinkedOnDelete(t *testing.T) {
	s := openTest(t)
	first, err := s.CreateProject(ProjectCreateInput{Name: "First", Slug: "first", Status: "started"})
	if err != nil {
		t.Fatal(err)
	}
	second, err := s.CreateProject(ProjectCreateInput{Name: "Second", Slug: "second", Status: "planned"})
	if err != nil {
		t.Fatal(err)
	}
	start, target := "2026-09-01", "2026-12-31"
	initiative, err := s.CreateInitiative(CreateInitiativeInput{
		Name: "Platform launch", Slug: "platform-launch", Description: "Ship the platform",
		Status: "planned", Color: "blue", StartDate: &start, TargetDate: &target,
	})
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

func TestInitiativeOwnerPersistsAndCanBeCleared(t *testing.T) {
	s := openTest(t)
	initiative, err := s.CreateInitiative(CreateInitiativeInput{
		Name: "Owned initiative", Slug: "owned-initiative", Status: "active", Owner: "self",
	})
	if err != nil {
		t.Fatal(err)
	}
	if initiative.Owner != "self" {
		t.Fatalf("created owner = %q, want self", initiative.Owner)
	}

	reopened, err := Open(s.root)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = reopened.Close() })
	persisted, err := reopened.GetInitiative(initiative.Slug)
	if err != nil || persisted.Owner != "self" {
		t.Fatalf("persisted owner = %q, error %v", persisted.Owner, err)
	}

	cleared, err := reopened.UpdateInitiative(initiative.Slug, UpdateInitiativeInput{
		Owner: stringPointer(""),
	})
	if err != nil || cleared.Owner != "" {
		t.Fatalf("cleared owner = %q, error %v", cleared.Owner, err)
	}
	if _, err := reopened.UpdateInitiative(initiative.Slug, UpdateInitiativeInput{
		Owner: stringPointer("another-user"),
	}); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid owner error = %v, want validation error", err)
	}
}

func TestCreateInitiativeRejectsInvalidDatesAndProjectLinks(t *testing.T) {
	s := openTest(t)
	start, target := "2026-12-31", "2026-09-01"
	if _, err := s.CreateInitiative(CreateInitiativeInput{
		Name: "Invalid dates", Slug: "invalid-dates", Status: "planned", StartDate: &start, TargetDate: &target,
	}); !errors.Is(err, ErrValidation) {
		t.Fatalf("reversed initiative date range error %v", err)
	}
	if _, err := s.CreateInitiative(CreateInitiativeInput{
		Name: "Missing project", Slug: "missing-project", Status: "planned", ProjectSlugs: []string{"missing"},
	}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing project error %v", err)
	}
	if _, err := s.GetInitiative("missing-project"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("failed initiative create left a record: %v", err)
	}
}

func TestProposedInitiativeStatusPersists(t *testing.T) {
	s := openTest(t)
	initiative, err := s.CreateInitiative(CreateInitiativeInput{
		Name: "Proposed launch", Slug: "proposed-launch", Status: "proposed", Color: "blue",
	})
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
	label, err := s.CreateLabel(CreateLabelInput{Name: "Initiative QA", Color: "#7950f2"})
	if err != nil {
		t.Fatal(err)
	}
	initiative, err := s.CreateInitiative(CreateInitiativeInput{
		Name: "Release quality", Slug: "release-quality", Status: "active", Color: "purple",
		Health: "on_track", Priority: 2, Labels: []string{label.Name},
	})
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

func TestInitiativeUpdatesPersistHealthAndActivityHistory(t *testing.T) {
	s := openTest(t)
	initiative, err := s.CreateInitiative(CreateInitiativeInput{
		Name: "Platform", Slug: "platform", Status: "active", Color: "purple",
	})
	if err != nil {
		t.Fatal(err)
	}
	first, err := s.PostInitiativeUpdate(initiative.Slug, PostHealthUpdateInput{Health: "on_track", Body: "The launch is on schedule."})
	if err != nil {
		t.Fatal(err)
	}
	second, err := s.PostInitiativeUpdate(initiative.Slug, PostHealthUpdateInput{Health: "at_risk", Body: "The integration needs attention."})
	if err != nil {
		t.Fatal(err)
	}
	if first.Action != "status_update_posted" || second.Action != "status_update_posted" {
		t.Fatalf("update activities %#v %#v", first, second)
	}
	activities, err := s.ListInitiativeActivities(initiative.Slug)
	if err != nil || len(activities) != 3 || activities[0].ID != second.ID || activities[1].ID != first.ID || activities[2].Action != "created" {
		t.Fatalf("initiative activities %#v (%v)", activities, err)
	}
	updated, err := s.GetInitiative(initiative.Slug)
	if err != nil || updated.Health != "at_risk" || updated.HealthUpdatedAt == nil || *updated.HealthUpdatedAt == "" {
		t.Fatalf("latest initiative health %#v (%v)", updated, err)
	}
	if _, err := s.PostInitiativeUpdate(initiative.Slug, PostHealthUpdateInput{Health: "unknown", Body: "Bad health"}); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid health error %v", err)
	}
	if _, err := s.PostInitiativeUpdate(initiative.Slug, PostHealthUpdateInput{Health: "on_track", Body: "  "}); !errors.Is(err, ErrValidation) {
		t.Fatalf("empty body error %v", err)
	}
	if _, err := s.PostInitiativeUpdate("missing", PostHealthUpdateInput{Health: "on_track", Body: "Update"}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing initiative error %v", err)
	}
	reopened, err := Open(s.root)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = reopened.Close() })
	persisted, err := reopened.ListInitiativeActivities(initiative.Slug)
	if err != nil || len(persisted) != 3 || persisted[0].Action != "status_update_posted" {
		t.Fatalf("initiative activity history did not persist: %#v (%v)", persisted, err)
	}
}

func TestProjectInitiativePropertyUpdatesBothSides(t *testing.T) {
	s := openTest(t)
	project, err := s.CreateProject(ProjectCreateInput{Name: "Roadmap", Slug: "roadmap", Status: "started"})
	if err != nil {
		t.Fatal(err)
	}
	initiative, err := s.CreateInitiative(CreateInitiativeInput{
		Name: "Platform", Slug: "platform", Status: "planned", Color: "purple",
	})
	if err != nil {
		t.Fatal(err)
	}
	assigned, err := s.UpdateProject(ProjectUpdateInput{
		Slug: project.Slug, InitiativeSlugs: &[]string{initiative.Slug},
	})
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
	if _, err := s.UpdateProject(ProjectUpdateInput{
		Slug: project.Slug, InitiativeSlugs: &[]string{"missing"},
	}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing initiative assignment error %v", err)
	}
	if _, err := s.UpdateProject(ProjectUpdateInput{
		Slug: project.Slug, InitiativeSlugs: &[]string{},
	}); err != nil {
		t.Fatal(err)
	}
	initiative, err = s.GetInitiative(initiative.Slug)
	if err != nil || len(initiative.ProjectSlugs) != 0 {
		t.Fatalf("initiative projects were not unlinked %#v (%v)", initiative.ProjectSlugs, err)
	}
}
