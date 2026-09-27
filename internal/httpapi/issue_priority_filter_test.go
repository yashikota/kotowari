package httpapi

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/yashikota/kotowari/internal/store"
)

func TestIssuePriorityFilterQueryAndSavedView(t *testing.T) {
	s := testAPI(t)
	issues := make(map[int]string)
	for priority, title := range map[int]string{
		0: "no priority",
		1: "urgent",
		2: "high",
		3: "medium",
	} {
		created, err := s.store.CreateIssue(store.CreateIssueInput{Title: title, Priority: priority})
		if err != nil {
			t.Fatal(err)
		}
		issues[priority] = created.Identifier
	}

	filtered := doJSON(t, s, http.MethodGet, "/api/issues?priorities=0,2", "")
	if filtered.Code != http.StatusOK {
		t.Fatalf("list multi-priority issues %d %s", filtered.Code, filtered.Body.String())
	}
	var got []store.Issue
	if err := json.Unmarshal(filtered.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 {
		t.Fatalf("multi-priority result = %#v", got)
	}
	identifiers := map[string]bool{got[0].Identifier: true, got[1].Identifier: true}
	if !identifiers[issues[0]] || !identifiers[issues[2]] || identifiers[issues[1]] || identifiers[issues[3]] {
		t.Fatalf("multi-priority result returned wrong issues: %#v", got)
	}
	invalid := doJSON(t, s, http.MethodGet, "/api/issues?priorities=1,8", "")
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("invalid priority filter %d %s", invalid.Code, invalid.Body.String())
	}

	created := doJSON(t, s, http.MethodPost, "/api/views", `{"name":"Priority view","slug":"priority-view","priorities":[1,2]}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create multi-priority view %d %s", created.Code, created.Body.String())
	}
	var view store.View
	if err := json.Unmarshal(created.Body.Bytes(), &view); err != nil {
		t.Fatal(err)
	}
	if len(view.Priorities) != 2 || view.Priority != nil {
		t.Fatalf("created view priorities = %#v", view)
	}

	single := doJSON(t, s, http.MethodPatch, "/api/views/priority-view", `{"priority":3,"priorities":[]}`)
	if single.Code != http.StatusOK {
		t.Fatalf("set single view priority %d %s", single.Code, single.Body.String())
	}
	view = store.View{}
	if err := json.Unmarshal(single.Body.Bytes(), &view); err != nil {
		t.Fatal(err)
	}
	if view.Priority == nil || *view.Priority != 3 || len(view.Priorities) != 0 {
		t.Fatalf("single priority update cleared filter: %#v", view)
	}

	cleared := doJSON(t, s, http.MethodPatch, "/api/views/priority-view", `{"priority":-1,"priorities":[]}`)
	if cleared.Code != http.StatusOK {
		t.Fatalf("clear priority view %d %s", cleared.Code, cleared.Body.String())
	}
	view = store.View{}
	if err := json.Unmarshal(cleared.Body.Bytes(), &view); err != nil {
		t.Fatal(err)
	}
	if view.Priority != nil || len(view.Priorities) != 0 {
		t.Fatalf("cleared view priority = %#v", view)
	}
}
