package store

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestCreateIssueDefaultsAndValidation(t *testing.T) {
	s := openTest(t)
	iss, err := s.CreateIssue(CreateIssueInput{Title: "untitled"})
	if err != nil {
		t.Fatal(err)
	}
	if iss.Status != "backlog" {
		t.Fatalf("default status %q", iss.Status)
	}
	if iss.Priority != 0 {
		t.Fatalf("default priority %d", iss.Priority)
	}
	if _, err := s.CreateIssue(CreateIssueInput{Title: "bad", Status: "ready"}); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid status: %v", err)
	}
	if _, err := s.CreateIssue(CreateIssueInput{Title: "bad", Priority: 5}); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid priority: %v", err)
	}
	if _, err := s.GetIssue("ISS-99"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing issue: %v", err)
	}
	if err := s.DeleteIssue("ISS-99"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("delete missing: %v", err)
	}
}

func TestIssueTypeAndEstimateRoundTrip(t *testing.T) {
	s := openTest(t)
	estimate := 8
	created, err := s.CreateIssue(CreateIssueInput{
		Title: "typed issue", Type: "feature", Estimate: &estimate,
	})
	if err != nil {
		t.Fatal(err)
	}
	if created.Type != "feature" || created.Estimate == nil || *created.Estimate != estimate {
		t.Fatalf("created issue properties: type=%q estimate=%v", created.Type, created.Estimate)
	}

	newType, newEstimate := "bug", 13
	newEstimatePointer := &newEstimate
	if _, err := s.UpdateIssue(created.Identifier, PatchIssueInput{Type: &newType, Estimate: &newEstimatePointer}); err != nil {
		t.Fatal(err)
	}
	reopened, err := Open(s.root)
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	got, err := reopened.GetIssue(created.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	if got.Type != newType || got.Estimate == nil || *got.Estimate != newEstimate {
		t.Fatalf("reopened issue properties: type=%q estimate=%v", got.Type, got.Estimate)
	}

	clearType := ""
	var clearEstimate *int
	if _, err := reopened.UpdateIssue(created.Identifier, PatchIssueInput{Type: &clearType, Estimate: &clearEstimate}); err != nil {
		t.Fatal(err)
	}
	cleared, err := reopened.GetIssue(created.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	if cleared.Type != "" || cleared.Estimate != nil {
		t.Fatalf("cleared issue properties: type=%q estimate=%v", cleared.Type, cleared.Estimate)
	}

	badType := "epic"
	badEstimate := 1000
	badEstimatePointer := &badEstimate
	if _, err := reopened.UpdateIssue(created.Identifier, PatchIssueInput{Type: &badType}); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid type: %v", err)
	}
	if _, err := reopened.UpdateIssue(created.Identifier, PatchIssueInput{Estimate: &badEstimatePointer}); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid estimate: %v", err)
	}
}

func TestIssueReminderRoundTripAndValidation(t *testing.T) {
	s := openTest(t)
	created, err := s.CreateIssue(CreateIssueInput{Title: "remind me"})
	if err != nil {
		t.Fatal(err)
	}
	reminder := "2026-09-25T00:30:00+09:00"
	reminderPointer := &reminder
	updated, err := s.UpdateIssue(created.Identifier, PatchIssueInput{ReminderAt: &reminderPointer})
	if err != nil {
		t.Fatal(err)
	}
	if updated.ReminderAt == nil || *updated.ReminderAt != "2026-09-24T15:30:00Z" {
		t.Fatalf("normalized reminder: %#v", updated.ReminderAt)
	}
	reopened, err := Open(s.root)
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	got, err := reopened.GetIssue(created.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	if got.ReminderAt == nil || *got.ReminderAt != *updated.ReminderAt {
		t.Fatalf("persisted reminder: %#v", got.ReminderAt)
	}
	invalid := "tomorrow morning"
	invalidPointer := &invalid
	if _, err := reopened.UpdateIssue(created.Identifier, PatchIssueInput{ReminderAt: &invalidPointer}); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid reminder: %v", err)
	}
	var clear *string
	cleared, err := reopened.UpdateIssue(created.Identifier, PatchIssueInput{ReminderAt: &clear})
	if err != nil {
		t.Fatal(err)
	}
	if cleared.ReminderAt != nil {
		t.Fatalf("reminder was not cleared: %#v", cleared.ReminderAt)
	}
}

func TestIssueExternalLinksPersistAndValidate(t *testing.T) {
	s := openTest(t)
	created, err := s.CreateIssue(CreateIssueInput{Title: "linked issue"})
	if err != nil {
		t.Fatal(err)
	}
	link, err := s.AddIssueLink(created.Identifier, CreateIssueLinkInput{
		URL: " https://example.test/pull/42 ", Title: "Fix startup", Kind: "pullRequest",
	})
	if err != nil {
		t.Fatal(err)
	}
	if link.ID != 1 || link.URL != "https://example.test/pull/42" || link.Title != "Fix startup" || link.Kind != "pullRequest" {
		t.Fatalf("created link %#v", link)
	}
	if _, err := s.AddIssueLink(created.Identifier, CreateIssueLinkInput{URL: link.URL}); !errors.Is(err, ErrConflict) {
		t.Fatalf("duplicate link: %v", err)
	}
	for _, invalidURL := range []string{"/relative/path", "javascript:alert(1)", "ftp://example.test/file"} {
		if _, err := s.AddIssueLink(created.Identifier, CreateIssueLinkInput{URL: invalidURL}); !errors.Is(err, ErrValidation) {
			t.Fatalf("invalid URL %q: %v", invalidURL, err)
		}
	}
	if _, err := s.AddIssueLink(created.Identifier, CreateIssueLinkInput{URL: link.URL, Kind: "integration"}); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid kind: %v", err)
	}

	reopened, err := Open(s.root)
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	got, err := reopened.GetIssue(created.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	if len(got.ExternalLinks) != 1 || got.ExternalLinks[0] != link {
		t.Fatalf("reopened links %#v, want %#v", got.ExternalLinks, link)
	}
	if err := reopened.RemoveIssueLink(created.Identifier, link.ID); err != nil {
		t.Fatal(err)
	}
	got, err = reopened.GetIssue(created.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	if len(got.ExternalLinks) != 0 {
		t.Fatalf("links after removal %#v", got.ExternalLinks)
	}
	if err := reopened.RemoveIssueLink(created.Identifier, link.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("remove missing link: %v", err)
	}
}

func TestCycleResourcesPersistAndValidate(t *testing.T) {
	s := openTest(t)
	cycle, err := s.CreateCycle("2026-09-24T00:00:00Z", "2026-10-01T00:00:00Z", "upcoming")
	if err != nil {
		t.Fatal(err)
	}
	resource, err := s.AddCycleLink(cycle.Number, CreateIssueLinkInput{
		URL: " https://example.test/cycle/brief ", Title: "Cycle brief", Kind: "document",
	})
	if err != nil {
		t.Fatal(err)
	}
	if resource.ID != 1 || resource.URL != "https://example.test/cycle/brief" || resource.Title != "Cycle brief" || resource.Kind != "document" {
		t.Fatalf("created resource %#v", resource)
	}
	if _, err := s.AddCycleLink(cycle.Number, CreateIssueLinkInput{URL: resource.URL}); !errors.Is(err, ErrConflict) {
		t.Fatalf("duplicate resource: %v", err)
	}
	for _, invalidURL := range []string{"/relative/path", "javascript:alert(1)", "ftp://example.test/file"} {
		if _, err := s.AddCycleLink(cycle.Number, CreateIssueLinkInput{URL: invalidURL}); !errors.Is(err, ErrValidation) {
			t.Fatalf("invalid URL %q: %v", invalidURL, err)
		}
	}
	if _, err := s.AddCycleLink(cycle.Number, CreateIssueLinkInput{URL: resource.URL, Kind: "integration"}); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid kind: %v", err)
	}

	reopened, err := Open(s.root)
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	got, err := reopened.GetCycle(cycle.Number)
	if err != nil {
		t.Fatal(err)
	}
	if len(got.Resources) != 1 || got.Resources[0] != resource {
		t.Fatalf("reopened resources %#v, want %#v", got.Resources, resource)
	}
	if err := reopened.RemoveCycleLink(cycle.Number, resource.ID); err != nil {
		t.Fatal(err)
	}
	got, err = reopened.GetCycle(cycle.Number)
	if err != nil {
		t.Fatal(err)
	}
	if len(got.Resources) != 0 {
		t.Fatalf("resources after removal %#v", got.Resources)
	}
	if err := reopened.RemoveCycleLink(cycle.Number, resource.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("remove missing resource: %v", err)
	}
}

func TestIssueFavoritePersistsAndFilters(t *testing.T) {
	s := openTest(t)
	created, err := s.CreateIssue(CreateIssueInput{Title: "favorite issue"})
	if err != nil {
		t.Fatal(err)
	}
	favorite := true
	updated, err := s.UpdateIssue(created.Identifier, PatchIssueInput{IsFavorite: &favorite})
	if err != nil {
		t.Fatal(err)
	}
	if !updated.IsFavorite {
		t.Fatalf("favorite state not set: %#v", updated)
	}
	favorites, err := s.ListIssues(IssueFilter{IsFavorite: &favorite})
	if err != nil {
		t.Fatal(err)
	}
	if len(favorites) != 1 || favorites[0].Identifier != created.Identifier {
		t.Fatalf("favorite filter returned %#v", favorites)
	}

	reopened, err := Open(s.root)
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	got, err := reopened.GetIssue(created.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	if !got.IsFavorite {
		t.Fatalf("favorite state did not persist: %#v", got)
	}
	favorite = false
	if _, err := reopened.UpdateIssue(created.Identifier, PatchIssueInput{IsFavorite: &favorite}); err != nil {
		t.Fatal(err)
	}
	falseFavorites, err := reopened.ListIssues(IssueFilter{IsFavorite: &favorite})
	if err != nil {
		t.Fatal(err)
	}
	if len(falseFavorites) == 0 {
		t.Fatal("false favorite filter should include ordinary issues")
	}
}

func TestIssueRelationsAreReciprocalAndPersist(t *testing.T) {
	s := openTest(t)
	first, err := s.CreateIssue(CreateIssueInput{Title: "blocks another"})
	if err != nil {
		t.Fatal(err)
	}
	second, err := s.CreateIssue(CreateIssueInput{Title: "blocked issue"})
	if err != nil {
		t.Fatal(err)
	}
	relation, err := s.AddIssueRelation(first.Identifier, CreateIssueRelationInput{
		TargetIdentifier: second.Identifier,
		Kind:             "blocks",
	})
	if err != nil {
		t.Fatal(err)
	}
	if relation.ID != 1 || relation.Kind != "blocks" || relation.TargetIdentifier != second.Identifier {
		t.Fatalf("created relation %#v", relation)
	}
	gotFirst, err := s.GetIssue(first.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	gotSecond, err := s.GetIssue(second.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	if len(gotFirst.Relations) != 1 || gotFirst.Relations[0] != relation {
		t.Fatalf("source relation %#v", gotFirst.Relations)
	}
	if len(gotSecond.Relations) != 1 || gotSecond.Relations[0].Kind != "blockedBy" || gotSecond.Relations[0].TargetIdentifier != first.Identifier {
		t.Fatalf("reciprocal relation %#v", gotSecond.Relations)
	}
	parent, err := s.CreateIssue(CreateIssueInput{Title: "parent issue"})
	if err != nil {
		t.Fatal(err)
	}
	child, err := s.CreateIssue(CreateIssueInput{Title: "sub-issue", ParentID: &parent.ID})
	if err != nil {
		t.Fatal(err)
	}
	for filter, want := range map[string]string{
		"parent":   parent.Identifier,
		"subissue": child.Identifier,
		"blocking": first.Identifier,
		"blocked":  second.Identifier,
	} {
		filtered, err := s.ListIssues(IssueFilter{Relation: filter})
		if err != nil {
			t.Fatalf("relation filter %q: %v", filter, err)
		}
		if len(filtered) != 1 || filtered[0].Identifier != want {
			t.Errorf("relation filter %q got %#v, want %s", filter, filtered, want)
		}
	}
	withRelations, err := s.ListIssues(IssueFilter{Relation: "related"})
	if err != nil || len(withRelations) != 2 {
		t.Fatalf("related filter got %#v, error %v", withRelations, err)
	}
	if _, err := s.AddIssueRelation(first.Identifier, CreateIssueRelationInput{TargetIdentifier: second.Identifier, Kind: "blockedBy"}); !errors.Is(err, ErrConflict) {
		t.Fatalf("duplicate inverse relation: %v", err)
	}
	if _, err := s.AddIssueRelation(first.Identifier, CreateIssueRelationInput{TargetIdentifier: first.Identifier, Kind: "related"}); !errors.Is(err, ErrValidation) {
		t.Fatalf("self relation: %v", err)
	}
	if _, err := s.AddIssueRelation(first.Identifier, CreateIssueRelationInput{TargetIdentifier: "ISS-999", Kind: "related"}); !errors.Is(err, ErrValidation) {
		t.Fatalf("missing target: %v", err)
	}
	if _, err := s.AddIssueRelation(first.Identifier, CreateIssueRelationInput{TargetIdentifier: second.Identifier, Kind: "parent"}); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid kind: %v", err)
	}

	reopened, err := Open(s.root)
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	gotSecond, err = reopened.GetIssue(second.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	if len(gotSecond.Relations) != 1 || gotSecond.Relations[0].Kind != "blockedBy" {
		t.Fatalf("persisted reciprocal relation %#v", gotSecond.Relations)
	}
	if err := reopened.RemoveIssueRelation(first.Identifier, relation.ID); err != nil {
		t.Fatal(err)
	}
	gotFirst, err = reopened.GetIssue(first.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	gotSecond, err = reopened.GetIssue(second.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	if len(gotFirst.Relations) != 0 || len(gotSecond.Relations) != 0 {
		t.Fatalf("relations after unlink: first=%#v second=%#v", gotFirst.Relations, gotSecond.Relations)
	}

	related, err := reopened.AddIssueRelation(first.Identifier, CreateIssueRelationInput{TargetIdentifier: second.Identifier, Kind: "related"})
	if err != nil {
		t.Fatal(err)
	}
	if err := reopened.DeleteIssue(second.Identifier); err != nil {
		t.Fatal(err)
	}
	gotFirst, err = reopened.GetIssue(first.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	if len(gotFirst.Relations) != 0 {
		t.Fatalf("stale relation after target deletion %#v (added %#v)", gotFirst.Relations, related)
	}
}

func TestIssueStatusChangedAtTracksOnlyStatusTransitions(t *testing.T) {
	s := openTest(t)
	created, err := s.CreateIssue(CreateIssueInput{Title: "time in status"})
	if err != nil {
		t.Fatal(err)
	}
	if created.StatusChangedAt != created.CreatedAt {
		t.Fatalf("initial status timestamp: created=%s status=%s", created.CreatedAt, created.StatusChangedAt)
	}
	time.Sleep(1100 * time.Millisecond)

	status := "todo"
	changed, err := s.UpdateIssue(created.Identifier, PatchIssueInput{Status: &status})
	if err != nil {
		t.Fatal(err)
	}
	if changed.StatusChangedAt != changed.UpdatedAt || changed.StatusChangedAt <= created.StatusChangedAt {
		t.Fatalf("status transition timestamp: created=%s updated=%s status=%s", created.StatusChangedAt, changed.UpdatedAt, changed.StatusChangedAt)
	}
	time.Sleep(1100 * time.Millisecond)

	title := "a different title"
	updated, err := s.UpdateIssue(created.Identifier, PatchIssueInput{Title: &title})
	if err != nil {
		t.Fatal(err)
	}
	if updated.StatusChangedAt != changed.StatusChangedAt || updated.UpdatedAt == changed.UpdatedAt {
		t.Fatalf("non-status edit changed status age: before=%#v after=%#v", changed, updated)
	}

	reopened, err := Open(s.root)
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	got, err := reopened.GetIssue(created.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	if got.StatusChangedAt != changed.StatusChangedAt {
		t.Fatalf("status timestamp did not persist: want %q, got %q", changed.StatusChangedAt, got.StatusChangedAt)
	}
}

func TestListIssuesByTypeAndEstimate(t *testing.T) {
	s := openTest(t)
	one, three, eight := 1, 3, 8
	match, err := s.CreateIssue(CreateIssueInput{Title: "feature eight", Type: "feature", Estimate: &eight})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateIssue(CreateIssueInput{Title: "feature three", Type: "feature", Estimate: &three}); err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateIssue(CreateIssueInput{Title: "bug eight", Type: "bug", Estimate: &eight}); err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateIssue(CreateIssueInput{Title: "feature no estimate", Type: "feature", Estimate: nil}); err != nil {
		t.Fatal(err)
	}
	got, err := s.ListIssues(IssueFilter{Type: "feature", Estimate: &eight})
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || got[0].Identifier != match.Identifier {
		t.Fatalf("type and estimate filter: %#v", got)
	}
	got, err = s.ListIssues(IssueFilter{Estimate: &one})
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 0 {
		t.Fatalf("unexpected estimate result: %#v", got)
	}
}

func TestListIssuesByContentSearchesTitleIdentifierAndBody(t *testing.T) {
	s := openTest(t)
	titleMatch, err := s.CreateIssue(CreateIssueInput{Title: "Ship Quartz"})
	if err != nil {
		t.Fatal(err)
	}
	bodyMatch, err := s.CreateIssue(CreateIssueInput{Title: "Release checklist", Body: "Remember the Moonstone migration"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateIssue(CreateIssueInput{Title: "Unrelated", Body: "No matching content"}); err != nil {
		t.Fatal(err)
	}

	for _, test := range []struct {
		query string
		want  string
	}{
		{query: "quartz", want: titleMatch.Identifier},
		{query: "Moonstone", want: bodyMatch.Identifier},
	} {
		got, err := s.ListIssues(IssueFilter{Content: test.query})
		if err != nil {
			t.Fatalf("content %q: %v", test.query, err)
		}
		if len(got) != 1 || got[0].Identifier != test.want {
			t.Errorf("content %q got %#v, want %s", test.query, got, test.want)
		}
	}
}

func TestListIssuesByMilestoneNameAndSaveFilter(t *testing.T) {
	s := openTest(t)
	project, err := s.CreateProject("Release", "release", "", "started", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	milestone, err := s.CreateMilestone(project.Slug, "Beta rollout", nil)
	if err != nil {
		t.Fatal(err)
	}
	projectID, milestoneID := project.ID, milestone.ID
	wanted, err := s.CreateIssue(CreateIssueInput{Title: "ship beta", ProjectID: &projectID, MilestoneID: &milestoneID})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateIssue(CreateIssueInput{Title: "unassigned release", ProjectID: &projectID}); err != nil {
		t.Fatal(err)
	}

	query := "BETA roll"
	got, err := s.ListIssues(IssueFilter{MilestoneName: query})
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || got[0].Identifier != wanted.Identifier {
		t.Fatalf("milestone name filter got %#v", got)
	}

	view, err := s.CreateView(CreateViewInput{Name: "Beta milestone", Slug: "beta-milestone", MilestoneName: &query})
	if err != nil {
		t.Fatal(err)
	}
	if view.MilestoneName == nil || *view.MilestoneName != query || view.Filter().MilestoneName != query {
		t.Fatalf("saved milestone filter %#v", view)
	}
	cleared := ""
	view, err = s.UpdateView(view.Slug, CreateViewInput{MilestoneName: &cleared})
	if err != nil {
		t.Fatal(err)
	}
	if view.MilestoneName != nil {
		t.Fatalf("milestone filter was not cleared %#v", view.MilestoneName)
	}
}

func TestProjectLabelsFilterLinkedIssuesAndPersistWithViews(t *testing.T) {
	s := openTest(t)
	label, err := s.CreateLabel("Launch", "#336699")
	if err != nil {
		t.Fatal(err)
	}
	withLabel, err := s.CreateProject("Labeled", "labeled", "", "started", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	withoutLabel, err := s.CreateProject("Unlabeled", "unlabeled", "", "planned", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	projectLabels := []string{label.Name}
	withLabel, err = s.UpdateProject(withLabel.Slug, nil, nil, nil, nil, nil, nil, &projectLabels)
	if err != nil {
		t.Fatal(err)
	}
	first, err := s.CreateIssue(CreateIssueInput{Title: "Labeled project issue", ProjectID: &withLabel.ID})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateIssue(CreateIssueInput{Title: "Unlabeled project issue", ProjectID: &withoutLabel.ID}); err != nil {
		t.Fatal(err)
	}
	got, err := s.ListIssues(IssueFilter{ProjectLabels: []string{"launch"}})
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || got[0].Identifier != first.Identifier {
		t.Fatalf("project labels filter got %#v", got)
	}
	got, err = s.ListIssues(IssueFilter{ProjectLabels: []string{"__none__"}})
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || got[0].Title != "Unlabeled project issue" {
		t.Fatalf("no-project-labels filter got %#v", got)
	}
	view, err := s.CreateView(CreateViewInput{Name: "Launch projects", Slug: "launch-projects", ProjectLabels: projectLabels})
	if err != nil {
		t.Fatal(err)
	}
	if len(view.ProjectLabels) != 1 || view.ProjectLabels[0] != label.Name || len(view.Filter().ProjectLabels) != 1 {
		t.Fatalf("saved project label filter %#v", view)
	}
}

func TestListIssuesByDateFieldAndTimeframe(t *testing.T) {
	s := openTest(t)
	recent, err := s.CreateIssue(CreateIssueInput{Title: "recent"})
	if err != nil {
		t.Fatal(err)
	}
	old, err := s.CreateIssue(CreateIssueInput{Title: "old"})
	if err != nil {
		t.Fatal(err)
	}
	started, err := s.CreateIssue(CreateIssueInput{Title: "started"})
	if err != nil {
		t.Fatal(err)
	}
	completed, err := s.CreateIssue(CreateIssueInput{Title: "completed"})
	if err != nil {
		t.Fatal(err)
	}
	recentDate := "2026-09-23T12:00:00Z"
	oldDate := "2026-09-01T12:00:00Z"
	startedDate := "2026-09-20T12:00:00Z"
	completedDate := "2026-09-10T12:00:00Z"
	if err := s.mutate(func(m *mem) error {
		for i := range m.Issues {
			switch m.Issues[i].Identifier {
			case recent.Identifier:
				m.Issues[i].CreatedAt = recentDate
				m.Issues[i].StatusChangedAt = recentDate
			case old.Identifier:
				m.Issues[i].CreatedAt = oldDate
				m.Issues[i].StatusChangedAt = oldDate
			case started.Identifier:
				m.Issues[i].StartedAt = &startedDate
			case completed.Identifier:
				m.Issues[i].CompletedAt = &completedDate
			}
		}
		return nil
	}); err != nil {
		t.Fatal(err)
	}

	got, err := s.ListIssues(IssueFilter{DateField: "createdAt", DateRange: "weekAgo", DateAsOf: "2026-09-25"})
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 3 {
		t.Fatalf("created in last week: %#v", got)
	}
	got, err = s.ListIssues(IssueFilter{DateField: "timeInCurrentStatus", DateRange: "weekAgo", DateAsOf: "2026-09-25"})
	if err != nil || len(got) != 1 || got[0].Identifier != old.Identifier {
		t.Fatalf("issues in current status for at least one week: %#v, error %v", got, err)
	}
	got, err = s.ListIssues(IssueFilter{
		DateField: "timeInCurrentStatus", DateRange: "weekAgo", DateAsOf: "2026-09-25", Status: "done",
	})
	if err != nil || len(got) != 0 {
		t.Fatalf("combined status-age and issue-status filter: %#v, error %v", got, err)
	}
	got, err = s.ListIssues(IssueFilter{DateField: "startedAt", DateRange: "on:2026-09-20", DateAsOf: "2026-09-25"})
	if err != nil || len(got) != 1 || got[0].Identifier != started.Identifier {
		t.Fatalf("started on custom date: %#v, error %v", got, err)
	}
	got, err = s.ListIssues(IssueFilter{DateField: "completedAt", DateRange: "on:2026-09-10", DateAsOf: "2026-09-25"})
	if err != nil || len(got) != 1 || got[0].Identifier != completed.Identifier {
		t.Fatalf("completed on custom date: %#v, error %v", got, err)
	}
	if _, err := s.ListIssues(IssueFilter{DateField: "createdAt"}); !errors.Is(err, ErrValidation) {
		t.Fatalf("incomplete date filter: %v", err)
	}
}

func TestListIssuesByLinkedProjectProperties(t *testing.T) {
	s := openTest(t)
	startedProject, err := s.CreateProjectWithPriority("Started", "started-project", "", "started", 2, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	plannedProject, err := s.CreateProjectWithPriority("Planned", "planned-project", "", "planned", 1, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	startedIssue, err := s.CreateIssue(CreateIssueInput{Title: "started project issue", ProjectID: &startedProject.ID})
	if err != nil {
		t.Fatal(err)
	}
	plannedIssue, err := s.CreateIssue(CreateIssueInput{Title: "planned project issue", ProjectID: &plannedProject.ID})
	if err != nil {
		t.Fatal(err)
	}
	priority := 2
	view, err := s.CreateView(CreateViewInput{
		Name: "Started project", Slug: "started-project", ProjectStatus: stringPointer("started"), ProjectPriority: &priority,
	})
	if err != nil {
		t.Fatal(err)
	}
	got, err := s.ListIssues(view.Filter())
	if err != nil || len(got) != 1 || got[0].Identifier != startedIssue.Identifier {
		t.Fatalf("project property view got %#v, error %v", got, err)
	}
	byStatus, err := s.ListIssues(IssueFilter{ProjectStatus: "planned"})
	if err != nil || len(byStatus) != 1 || byStatus[0].Identifier != plannedIssue.Identifier {
		t.Fatalf("project status filter got %#v, error %v", byStatus, err)
	}
	byPriority, err := s.ListIssues(IssueFilter{ProjectPriority: &priority})
	if err != nil || len(byPriority) != 1 || byPriority[0].Identifier != startedIssue.Identifier {
		t.Fatalf("project priority filter got %#v, error %v", byPriority, err)
	}
}

func TestIssueStartedAtIsTrackedAndPersisted(t *testing.T) {
	s := openTest(t)
	created, err := s.CreateIssue(CreateIssueInput{Title: "started timestamp"})
	if err != nil {
		t.Fatal(err)
	}
	status := "in_progress"
	started, err := s.UpdateIssue(created.Identifier, PatchIssueInput{Status: &status})
	if err != nil {
		t.Fatal(err)
	}
	if started.StartedAt == nil || *started.StartedAt != started.StatusChangedAt {
		t.Fatalf("started timestamp %#v does not match transition %q", started.StartedAt, started.StatusChangedAt)
	}

	reopened, err := Open(s.root)
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	persisted, err := reopened.GetIssue(created.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	if persisted.StartedAt == nil || *persisted.StartedAt != *started.StartedAt {
		t.Fatalf("started timestamp did not persist: %#v", persisted.StartedAt)
	}
}

func TestCreateLabelValidation(t *testing.T) {
	s := openTest(t)
	if _, err := s.CreateLabel(" ", "#aabbcc"); !errors.Is(err, ErrValidation) {
		t.Fatalf("empty name: %v", err)
	}
	if _, err := s.CreateLabel("Ok", "red"); !errors.Is(err, ErrValidation) {
		t.Fatalf("bad color: %v", err)
	}
	if _, err := s.CreateLabel("Ok", "#gg0000"); !errors.Is(err, ErrValidation) {
		t.Fatalf("non-hex color: %v", err)
	}
	if _, err := s.CreateLabel("Bug", "#aabbcc"); !errors.Is(err, ErrConflict) {
		t.Fatalf("duplicate seeded name: %v", err)
	}
	got, err := s.CreateLabel("Harbor", "#6B9BD1")
	if err != nil {
		t.Fatal(err)
	}
	if got.Name != "Harbor" || got.Color != "#6B9BD1" {
		t.Fatalf("%#v", got)
	}
}

func TestCreateProjectDefaultsAndConflict(t *testing.T) {
	s := openTest(t)
	p, err := s.CreateProject("Harbor", "harbor", "", "", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	if p.Status != "planned" {
		t.Fatalf("default status %q", p.Status)
	}
	if _, err := s.CreateProject("Again", "harbor", "", "planned", nil, nil); !errors.Is(err, ErrConflict) {
		t.Fatalf("duplicate slug: %v", err)
	}
	if _, err := s.CreateProject("Bad", "Harbor", "", "", nil, nil); !errors.Is(err, ErrValidation) {
		t.Fatalf("uppercase slug: %v", err)
	}
	if _, err := s.CreateProject(" ", "ok", "", "", nil, nil); !errors.Is(err, ErrValidation) {
		t.Fatalf("empty name: %v", err)
	}
	if _, err := s.GetProject("missing"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing project: %v", err)
	}
}

func TestCreateProjectWithLabelsCanonicalizesAndValidatesLabels(t *testing.T) {
	s := openTest(t)
	project, err := s.CreateProjectWithPriorityAndLabels("Launch", "launch", "", "planned", 0, nil, nil, []string{" bug ", "BUG"})
	if err != nil {
		t.Fatal(err)
	}
	if len(project.Labels) != 1 || project.Labels[0] != "Bug" {
		t.Fatalf("project labels %#v", project.Labels)
	}
	if _, err := s.GetProject(project.Slug); err != nil {
		t.Fatal(err)
	} else if got, err := s.GetProject(project.Slug); err != nil || len(got.Labels) != 1 || got.Labels[0] != "Bug" {
		t.Fatalf("persisted project labels %#v, err %v", got.Labels, err)
	}
	if _, err := s.CreateProjectWithPriorityAndLabels("Unknown", "unknown", "", "planned", 0, nil, nil, []string{"not-a-label"}); !errors.Is(err, ErrValidation) {
		t.Fatalf("unknown label: %v", err)
	}
}

func TestProjectDependenciesAreReciprocalPersistedAndAcyclic(t *testing.T) {
	s := openTest(t)
	first, err := s.CreateProject("First", "first", "", "planned", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	second, err := s.CreateProject("Second", "second", "", "planned", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	third, err := s.CreateProject("Third", "third", "", "planned", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.AddProjectDependency(first.Slug, second.Slug, "blocks"); err != nil {
		t.Fatal(err)
	}
	if _, err := s.AddProjectDependency(second.Slug, third.Slug, "blocks"); err != nil {
		t.Fatal(err)
	}
	if _, err := s.AddProjectDependency(third.Slug, first.Slug, "blocks"); !errors.Is(err, ErrValidation) {
		t.Fatalf("blocking cycle: %v", err)
	}
	if _, err := s.AddProjectDependency(first.Slug, second.Slug, "related"); !errors.Is(err, ErrConflict) {
		t.Fatalf("duplicate dependency: %v", err)
	}
	if _, err := s.AddProjectDependency(first.Slug, first.Slug, "related"); !errors.Is(err, ErrValidation) {
		t.Fatalf("self dependency: %v", err)
	}

	reopened, err := Open(s.Path())
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	first, err = reopened.GetProject(first.Slug)
	if err != nil || len(first.Dependencies) != 1 || first.Dependencies[0] != (ProjectDependency{ProjectSlug: second.Slug, Kind: "blocks"}) {
		t.Fatalf("persisted first dependency %#v, err %v", first.Dependencies, err)
	}
	second, err = reopened.GetProject(second.Slug)
	if err != nil || len(second.Dependencies) != 2 || second.Dependencies[0] != (ProjectDependency{ProjectSlug: first.Slug, Kind: "blocked_by"}) {
		t.Fatalf("reciprocal second dependencies %#v, err %v", second.Dependencies, err)
	}
	if _, err := reopened.DeleteProjectDependency(first.Slug, second.Slug); err != nil {
		t.Fatal(err)
	}
	first, err = reopened.GetProject(first.Slug)
	if err != nil || len(first.Dependencies) != 0 {
		t.Fatalf("removed first dependencies %#v, err %v", first.Dependencies, err)
	}
	second, err = reopened.GetProject(second.Slug)
	if err != nil || len(second.Dependencies) != 1 || second.Dependencies[0].ProjectSlug != third.Slug {
		t.Fatalf("removed reciprocal dependency %#v, err %v", second.Dependencies, err)
	}
	if err := reopened.DeleteProject(third.Slug); err != nil {
		t.Fatal(err)
	}
	second, err = reopened.GetProject(second.Slug)
	if err != nil || len(second.Dependencies) != 0 {
		t.Fatalf("deleted project dependency cleanup %#v, err %v", second.Dependencies, err)
	}
}

func TestCreateProjectFromIssuePreservesAndAssociatesSourceIssue(t *testing.T) {
	s := openTest(t)
	issue, err := s.CreateIssue(CreateIssueInput{
		Title: "日本語のプロジェクト", Body: "Project context from the source issue.",
		Status: "in_progress", Priority: 2, Type: "feature",
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateProject("Existing", "project-1", "", "planned", nil, nil); err != nil {
		t.Fatal(err)
	}
	start := "2026-09-01"
	project, updatedIssue, err := s.CreateProjectFromIssue(issue.Identifier, CreateProjectFromIssueInput{
		Name: issue.Title, Description: issue.Body, Status: "started", Priority: 2, StartDate: &start,
	})
	if err != nil {
		t.Fatal(err)
	}
	if project.Slug != "project-1-2" || project.Priority != 2 || project.Description != issue.Body || project.StartDate == nil || *project.StartDate != start {
		t.Fatalf("converted project %#v", project)
	}
	if updatedIssue.Identifier != issue.Identifier || updatedIssue.Title != issue.Title || strings.TrimSpace(updatedIssue.Body) != strings.TrimSpace(issue.Body) ||
		updatedIssue.Status != issue.Status || updatedIssue.ProjectID == nil || *updatedIssue.ProjectID != project.ID {
		t.Fatalf("source issue was not carried into project: %#v", updatedIssue)
	}
	loaded, err := s.GetIssue(issue.Identifier)
	if err != nil || loaded.ProjectSlug == nil || *loaded.ProjectSlug != project.Slug {
		t.Fatalf("persisted issue project link %#v, %v", loaded, err)
	}
}

func TestProjectMilestonesPersistAndStayBoundToTheirProject(t *testing.T) {
	s := openTest(t)
	project, err := s.CreateProject("Release", "release", "", "started", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	otherProject, err := s.CreateProject("Other", "other", "", "planned", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	targetDate := "2026-11-15"
	milestone, err := s.CreateMilestone(project.Slug, "Beta", &targetDate)
	if err != nil {
		t.Fatal(err)
	}
	if milestone.ID < 1 || milestone.TargetDate == nil || *milestone.TargetDate != targetDate {
		t.Fatalf("milestone %#v", milestone)
	}
	if _, err := s.CreateMilestone(project.Slug, "beta", nil); !errors.Is(err, ErrConflict) {
		t.Fatalf("case-insensitive duplicate name: %v", err)
	}
	if _, err := s.CreateMilestone(project.Slug, "Bad date", stringPointer("2026-13-40")); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid target date: %v", err)
	}

	projectID := project.ID
	issue, err := s.CreateIssue(CreateIssueInput{Title: "Ship beta", ProjectID: &projectID})
	if err != nil {
		t.Fatal(err)
	}
	milestoneID := milestone.ID
	milestoneIDPointer := &milestoneID
	issue, err = s.UpdateIssue(issue.Identifier, PatchIssueInput{MilestoneID: &milestoneIDPointer})
	if err != nil {
		t.Fatal(err)
	}
	if issue.MilestoneID == nil || *issue.MilestoneID != milestone.ID || issue.MilestoneName == nil || *issue.MilestoneName != "Beta" {
		t.Fatalf("assigned milestone %#v", issue)
	}
	if _, err := s.CreateIssue(CreateIssueInput{Title: "Wrong project", ProjectID: &otherProject.ID, MilestoneID: &milestone.ID}); !errors.Is(err, ErrValidation) {
		t.Fatalf("cross-project milestone: %v", err)
	}

	newName := "Beta release"
	milestone, err = s.UpdateMilestone(project.Slug, milestone.ID, &newName, nil)
	if err != nil {
		t.Fatal(err)
	}
	if milestone.Name != newName {
		t.Fatalf("renamed milestone %#v", milestone)
	}
	if err := s.Close(); err != nil {
		t.Fatal(err)
	}
	reopened, err := Open(s.Path())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = reopened.Close() })
	stored, err := reopened.GetIssue(issue.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	if stored.MilestoneID == nil || *stored.MilestoneID != milestone.ID || stored.MilestoneName == nil || *stored.MilestoneName != newName {
		t.Fatalf("persisted issue milestone %#v", stored)
	}

	if err := reopened.DeleteMilestone(project.Slug, milestone.ID); err != nil {
		t.Fatal(err)
	}
	stored, err = reopened.GetIssue(issue.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	if stored.MilestoneID != nil || stored.MilestoneName != nil {
		t.Fatalf("deleted milestone remains assigned %#v", stored)
	}
}

func stringPointer(value string) *string { return &value }

func TestProjectProgressCountsDoneAndCanceled(t *testing.T) {
	s := openTest(t)
	p, err := s.CreateProject("Dock", "dock", "", "started", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateIssue(CreateIssueInput{Title: "open", Status: "todo", ProjectID: &p.ID}); err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateIssue(CreateIssueInput{Title: "shipped", Status: "done", ProjectID: &p.ID}); err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateIssue(CreateIssueInput{Title: "wont", Status: "canceled", ProjectID: &p.ID}); err != nil {
		t.Fatal(err)
	}
	got, err := s.GetProject("dock")
	if err != nil {
		t.Fatal(err)
	}
	if got.Progress != 2.0/3.0 {
		t.Fatalf("progress %v", got.Progress)
	}
}

func TestSearchEmptyAndByIdentifier(t *testing.T) {
	s := openTest(t)
	hits, err := s.Search("")
	if err != nil {
		t.Fatal(err)
	}
	if hits == nil || len(hits) != 0 {
		t.Fatalf("empty query %#v", hits)
	}
	iss, err := s.CreateIssue(CreateIssueInput{Title: "Find me"})
	if err != nil {
		t.Fatal(err)
	}
	hits, err = s.Search("iss-1")
	if err != nil {
		t.Fatal(err)
	}
	if len(hits) != 1 || hits[0].Kind != "issue" || hits[0].ID != iss.Identifier {
		t.Fatalf("identifier search %#v", hits)
	}
	hits, err = s.Search("no-such-thing")
	if err != nil {
		t.Fatal(err)
	}
	if hits == nil || len(hits) != 0 {
		t.Fatalf("no hits %#v", hits)
	}
}

func TestUpdateWorkspaceRejectsEmptyName(t *testing.T) {
	s := openTest(t)
	empty := "  "
	if _, err := s.UpdateWorkspace(&empty, nil, nil, nil, nil, nil); !errors.Is(err, ErrValidation) {
		t.Fatalf("empty name: %v", err)
	}
	tz := ""
	if _, err := s.UpdateWorkspace(nil, &tz, nil, nil, nil, nil); !errors.Is(err, ErrValidation) {
		t.Fatalf("empty timezone: %v", err)
	}
}

func TestCreateViewValidation(t *testing.T) {
	s := openTest(t)
	if _, err := s.CreateView(CreateViewInput{Name: "", Slug: "open"}); !errors.Is(err, ErrValidation) {
		t.Fatalf("empty name: %v", err)
	}
	if _, err := s.CreateView(CreateViewInput{Name: "Open", Slug: "OPEN"}); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid slug: %v", err)
	}
	if _, err := s.CreateView(CreateViewInput{Name: "Open", Slug: "open", Display: "table"}); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid display: %v", err)
	}
	if _, err := s.CreateView(CreateViewInput{Name: "Open", Slug: "open", GroupBy: "assignee"}); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid group by: %v", err)
	}
	if _, err := s.CreateView(CreateViewInput{Name: "Open", Slug: "open", OrderBy: "random"}); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid order by: %v", err)
	}
	if _, err := s.CreateView(CreateViewInput{Name: "Open", Slug: "bad-direction", Direction: "sideways"}); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid direction: %v", err)
	}
	if _, err := s.CreateView(CreateViewInput{Name: "Open", Slug: "bad-completed", CompletedIssues: "forever"}); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid completed issue range: %v", err)
	}
	if _, err := s.CreateView(CreateViewInput{Name: "Open", Slug: "bad-property", DisplayProperties: []string{"assignee"}}); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid display property: %v", err)
	}
	tooLongContent := strings.Repeat("x", 513)
	if _, err := s.CreateView(CreateViewInput{Name: "Open", Slug: "bad-content", Content: &tooLongContent}); !errors.Is(err, ErrValidation) {
		t.Fatalf("content filter too long: %v", err)
	}
	v, err := s.CreateView(CreateViewInput{Name: "Open", Slug: "open"})
	if err != nil {
		t.Fatal(err)
	}
	if v.Display != "list" {
		t.Fatalf("default display %q", v.Display)
	}
	if v.GroupBy != "priority" || v.OrderBy != "manual" {
		t.Fatalf("default display options: group=%q order=%q", v.GroupBy, v.OrderBy)
	}
	if v.Direction != "asc" || v.CompletedIssues != "all" || v.NestedSubIssues != "showMatching" || v.ShowSubIssues == nil || !*v.ShowSubIssues {
		t.Fatalf("default display preferences: %#v", v)
	}
	if len(v.DisplayProperties) == 0 || v.DisplayProperties[0] != "id" {
		t.Fatalf("default display properties: %#v", v.DisplayProperties)
	}
	if _, err := s.CreateView(CreateViewInput{Name: "Again", Slug: "open"}); !errors.Is(err, ErrConflict) {
		t.Fatalf("duplicate slug: %v", err)
	}
}

func TestViewDisplayOptionsPersist(t *testing.T) {
	s := openTest(t)
	showSubIssues, showEmptyGroups := false, true
	created, err := s.CreateView(CreateViewInput{
		Name: "Sprint board", Slug: "sprint-board", Display: "board", GroupBy: "status",
		SubGroupBy: "priority", OrderBy: "created", Direction: "desc", CompletedIssues: "pastWeek",
		ShowSubIssues: &showSubIssues, NestedSubIssues: "showAll", ShowEmptyGroups: &showEmptyGroups,
		DisplayProperties: []string{"id", "status", "cycle"},
	})
	if err != nil {
		t.Fatal(err)
	}
	showSubIssues = true
	_, err = s.UpdateView(created.Slug, CreateViewInput{
		ShowSubIssues: &showSubIssues, ShowEmptyGroups: boolPointer(false),
		DisplayProperties: []string{"priority", "estimate", "updated"},
	})
	if err != nil {
		t.Fatal(err)
	}

	reopened, err := Open(s.root)
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	got, err := reopened.GetView(created.Slug)
	if err != nil {
		t.Fatal(err)
	}
	if got.Display != "board" || got.GroupBy != "status" || got.SubGroupBy != "priority" || got.OrderBy != "created" || got.Direction != "desc" || got.CompletedIssues != "pastWeek" || got.NestedSubIssues != "showAll" {
		t.Fatalf("view preferences did not persist: %#v", got)
	}
	if got.ShowSubIssues == nil || !*got.ShowSubIssues || got.ShowEmptyGroups || len(got.DisplayProperties) != 3 || got.DisplayProperties[0] != "priority" {
		t.Fatalf("updated display properties did not persist: %#v", got)
	}
}

func boolPointer(value bool) *bool { return &value }

func TestListIssuesCycleFilter(t *testing.T) {
	s := openTest(t)
	start := time.Now().UTC().Format(time.RFC3339)
	end := time.Now().UTC().Add(24 * time.Hour).Format(time.RFC3339)
	c, err := s.CreateCycle(start, end, "active")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateIssue(CreateIssueInput{Title: "in cycle", CycleID: &c.ID}); err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateIssue(CreateIssueInput{Title: "out"}); err != nil {
		t.Fatal(err)
	}
	got, err := s.ListIssues(IssueFilter{CycleNumber: c.Number})
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || got[0].Title != "in cycle" {
		t.Fatalf("%#v", got)
	}
}

func TestListIssuesAddedToCyclePhaseFilterAndPersistence(t *testing.T) {
	s := openTest(t)
	now := time.Now().UTC()
	cycleFor := func(offsetStart, offsetEnd time.Duration, status string) Cycle {
		t.Helper()
		cycle, err := s.CreateCycle(
			now.Add(offsetStart).Format(time.RFC3339),
			now.Add(offsetEnd).Format(time.RFC3339),
			status,
		)
		if err != nil {
			t.Fatal(err)
		}
		return cycle
	}
	past := cycleFor(-72*time.Hour, -48*time.Hour, "completed")
	current := cycleFor(-24*time.Hour, 24*time.Hour, "active")
	future := cycleFor(48*time.Hour, 72*time.Hour, "upcoming")
	for _, cycle := range []Cycle{past, current, future} {
		if _, err := s.CreateIssue(CreateIssueInput{Title: cycle.Status, CycleID: &cycle.ID}); err != nil {
			t.Fatal(err)
		}
	}
	for phase, want := range map[string]string{
		"planned": "upcoming",
		"during":  "active",
		"after":   "completed",
	} {
		got, err := s.ListIssues(IssueFilter{AddedToCycle: []string{phase}})
		if err != nil {
			t.Fatal(err)
		}
		if len(got) != 1 || got[0].Title != want {
			t.Fatalf("phase %q got %#v, want %q", phase, got, want)
		}
		if got[0].CycleAddedAt == nil {
			t.Fatalf("phase %q did not persist cycle assignment timestamp", phase)
		}
	}

	view, err := s.CreateView(CreateViewInput{
		Name: "During this cycle", Slug: "during-this-cycle", AddedToCycle: []string{"during"},
	})
	if err != nil {
		t.Fatal(err)
	}
	reopened, err := Open(s.root)
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	persisted, err := reopened.GetView(view.Slug)
	if err != nil {
		t.Fatal(err)
	}
	got, err := reopened.ListIssues(persisted.Filter())
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || got[0].Title != "active" {
		t.Fatalf("persisted view returned %#v", got)
	}
}

func TestFirstUpcomingCycleBecomesActive(t *testing.T) {
	s := openTest(t)
	start := time.Now().UTC().Format(time.RFC3339)
	end := time.Now().UTC().Add(24 * time.Hour).Format(time.RFC3339)
	c, err := s.CreateCycle(start, end, "upcoming")
	if err != nil {
		t.Fatal(err)
	}
	if c.Number != 1 || c.Status != "active" {
		t.Fatalf("first cycle %#v", c)
	}
	if _, err := s.CreateCycle(start, end, "planned"); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid cycle status: %v", err)
	}
}

func TestCycleMetadataAndFavoritePersist(t *testing.T) {
	s := openTest(t)
	cycle, err := s.CreateCycle("2026-09-21T00:00:00Z", "2026-09-28T00:00:00Z", "upcoming")
	if err != nil {
		t.Fatal(err)
	}
	if cycle.Name != "Cycle 1" {
		t.Fatalf("default cycle name %q", cycle.Name)
	}
	name := "September planning"
	description := "Stabilize the next release."
	favorite := true
	updated, err := s.UpdateCycle(cycle.Number, UpdateCycleInput{
		Name: &name, Description: &description, IsFavorite: &favorite,
	})
	if err != nil {
		t.Fatal(err)
	}
	if updated.Name != name || updated.Description != description || !updated.IsFavorite {
		t.Fatalf("cycle update %#v", updated)
	}

	reopened, err := Open(s.root)
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	got, err := reopened.GetCycle(cycle.Number)
	if err != nil {
		t.Fatal(err)
	}
	if got.Name != name || got.Description != description || !got.IsFavorite {
		t.Fatalf("persisted cycle %#v", got)
	}
	invalidEnd := "2026-09-21T00:00:00Z"
	if _, err := reopened.UpdateCycle(cycle.Number, UpdateCycleInput{EndsAt: &invalidEnd}); !errors.Is(err, ErrValidation) {
		t.Fatalf("cycle end before start: %v", err)
	}
}

func TestCommentsEmptyAndAdd(t *testing.T) {
	s := openTest(t)
	iss, err := s.CreateIssue(CreateIssueInput{Title: "note me"})
	if err != nil {
		t.Fatal(err)
	}
	cs, err := s.ListComments(iss.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	if cs == nil || len(cs) != 0 {
		t.Fatalf("empty comments %#v", cs)
	}
	if _, err := s.AddComment(iss.Identifier, "  "); !errors.Is(err, ErrValidation) {
		t.Fatalf("empty body: %v", err)
	}
	c, err := s.AddComment(iss.Identifier, "remember this")
	if err != nil {
		t.Fatal(err)
	}
	if c.Body != "remember this" || c.IssueID != iss.ID {
		t.Fatalf("%#v", c)
	}
}

func TestCompletedAtSetOnDone(t *testing.T) {
	s := openTest(t)
	iss, err := s.CreateIssue(CreateIssueInput{Title: "ship", Status: "done"})
	if err != nil {
		t.Fatal(err)
	}
	if iss.CompletedAt == nil {
		t.Fatal("done issue needs completedAt")
	}
	todo := "todo"
	updated, err := s.UpdateIssue(iss.Identifier, PatchIssueInput{Status: &todo})
	if err != nil {
		t.Fatal(err)
	}
	if updated.CompletedAt != nil {
		t.Fatalf("reopened still completed %#v", updated.CompletedAt)
	}
}

func TestYAMLFrontmatterRejected(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	iss, err := s.CreateIssue(CreateIssueInput{Title: "yaml"})
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(dir, "issues", "00001", "README.md")
	if err := os.WriteFile(path, []byte("---\ntitle: yaml\n---\n\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := s.GetIssue(iss.Identifier); err == nil {
		t.Fatal("yaml frontmatter should fail")
	}
}

func TestDeleteProjectUnassignsIssues(t *testing.T) {
	s := openTest(t)
	p, err := s.CreateProject("Dock", "dock", "", "", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	iss, err := s.CreateIssue(CreateIssueInput{Title: "tied", ProjectID: &p.ID})
	if err != nil {
		t.Fatal(err)
	}
	if err := s.DeleteProject("dock"); err != nil {
		t.Fatal(err)
	}
	got, err := s.GetIssue(iss.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	if got.ProjectID != nil || got.ProjectSlug != nil {
		t.Fatalf("still assigned %#v %#v", got.ProjectID, got.ProjectSlug)
	}
}

func TestListIssuesByDueDateFilter(t *testing.T) {
	s := openTest(t)
	anchor := "2026-05-15"
	cases := []struct {
		title  string
		status string
		due    *string
	}{
		{title: "overdue", status: "todo", due: stringPointer("2026-05-14")},
		{title: "today", status: "todo", due: stringPointer(anchor)},
		{title: "tomorrow", status: "todo", due: stringPointer("2026-05-16")},
		{title: "three days", status: "todo", due: stringPointer("2026-05-18")},
		{title: "week end", status: "todo", due: stringPointer("2026-05-22")},
		{title: "after week", status: "todo", due: stringPointer("2026-05-23")},
		{title: "month end", status: "todo", due: stringPointer("2026-06-14")},
		{title: "quarter end", status: "todo", due: stringPointer("2026-08-13")},
		{title: "no due date", status: "todo"},
		{title: "completed overdue", status: "done", due: stringPointer("2026-05-14")},
	}
	for _, tc := range cases {
		if _, err := s.CreateIssue(CreateIssueInput{Title: tc.title, Status: tc.status, DueDate: tc.due}); err != nil {
			t.Fatal(err)
		}
	}

	for mode, want := range map[string][]string{
		"overdue":       {"overdue"},
		"today":         {"today"},
		"tomorrow":      {"tomorrow"},
		"threeDays":     {"tomorrow", "three days"},
		"week":          {"tomorrow", "three days", "week end"},
		"month":         {"tomorrow", "three days", "week end", "after week", "month end"},
		"quarter":       {"tomorrow", "three days", "week end", "after week", "month end", "quarter end"},
		"on:2026-05-18": {"three days"},
		"custom":        {},
		"none":          {"no due date"},
	} {
		got, err := s.ListIssues(IssueFilter{DueDate: mode, DueDateAsOf: anchor})
		if err != nil {
			t.Fatalf("filter %q: %v", mode, err)
		}
		gotTitles := make(map[string]bool, len(got))
		for _, issue := range got {
			gotTitles[issue.Title] = true
		}
		if len(gotTitles) != len(want) {
			t.Fatalf("filter %q got %v, want %v", mode, gotTitles, want)
		}
		for _, title := range want {
			if !gotTitles[title] {
				t.Errorf("filter %q missing %q in %v", mode, title, gotTitles)
			}
		}
	}
}

func TestListPagesEmptySlice(t *testing.T) {
	s := openTest(t)
	pages, err := s.ListPages()
	if err != nil {
		t.Fatal(err)
	}
	if pages == nil {
		t.Fatal("want empty slice, not nil")
	}
}

func TestCreatePageDefaultsAndInvalidSlug(t *testing.T) {
	s := openTest(t)
	p, err := s.CreatePage("ADR", "adr-1", "", "", nil, nil, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	if p.Status != "proposed" {
		t.Fatalf("default status %q", p.Status)
	}
	if p.Tags == nil {
		t.Fatal("tags should be empty slice")
	}
	if _, err := s.CreatePage("Bad", "ADR", "", "", nil, nil, nil, nil); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid slug: %v", err)
	}
}
