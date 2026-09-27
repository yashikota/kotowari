package httpapi

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/yashikota/kotowari/internal/store"
)

func TestIssueStatusFilterQueryAndSavedView(t *testing.T) {
	s := testAPI(t)
	backlog, err := s.store.CreateIssue(store.CreateIssueInput{Title: "status backlog", Status: "backlog"})
	if err != nil {
		t.Fatal(err)
	}
	inProgress, err := s.store.CreateIssue(store.CreateIssueInput{Title: "status in progress", Status: "in_progress"})
	if err != nil {
		t.Fatal(err)
	}
	done, err := s.store.CreateIssue(store.CreateIssueInput{Title: "status done", Status: "done"})
	if err != nil {
		t.Fatal(err)
	}
	filtered := doJSON(t, s, http.MethodGet, "/api/issues?statuses=in_progress,done", "")
	if filtered.Code != http.StatusOK {
		t.Fatalf("list multi-status issues %d %s", filtered.Code, filtered.Body.String())
	}
	var issues []store.Issue
	if err := json.Unmarshal(filtered.Body.Bytes(), &issues); err != nil {
		t.Fatal(err)
	}
	if len(issues) != 2 {
		t.Fatalf("multi-status result = %#v", issues)
	}
	identifiers := map[string]bool{issues[0].Identifier: true, issues[1].Identifier: true}
	if !identifiers[inProgress.Identifier] || !identifiers[done.Identifier] || identifiers[backlog.Identifier] {
		t.Fatalf("multi-status returned wrong issues: %#v", issues)
	}
	invalid := doJSON(t, s, http.MethodGet, "/api/issues?statuses=not-a-status", "")
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("invalid status filter %d %s", invalid.Code, invalid.Body.String())
	}

	created := doJSON(t, s, http.MethodPost, "/api/views", `{"name":"Status view","slug":"status-view","statuses":["done","in_progress"]}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create multi-status view %d %s", created.Code, created.Body.String())
	}
	var view store.View
	if err := json.Unmarshal(created.Body.Bytes(), &view); err != nil {
		t.Fatal(err)
	}
	if len(view.Statuses) != 2 {
		t.Fatalf("created view statuses = %#v", view.Statuses)
	}
	updated := doJSON(t, s, http.MethodPatch, "/api/views/status-view", `{"statuses":[]}`)
	if updated.Code != http.StatusOK {
		t.Fatalf("clear multi-status view %d %s", updated.Code, updated.Body.String())
	}
	var clearedView store.View
	if err := json.Unmarshal(updated.Body.Bytes(), &clearedView); err != nil {
		t.Fatal(err)
	}
	if len(clearedView.Statuses) != 0 {
		t.Fatalf("cleared view statuses = %#v", clearedView.Statuses)
	}
}
