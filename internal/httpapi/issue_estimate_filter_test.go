package httpapi

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/yashikota/kotowari/internal/store"
)

func TestIssueEstimateFilterQueryAndSavedView(t *testing.T) {
	s := testAPI(t)
	one, three, five := 1, 3, 5
	issues := make(map[string]string)
	for title, estimate := range map[string]*int{
		"no estimate":    nil,
		"estimate one":   &one,
		"estimate three": &three,
		"estimate five":  &five,
	} {
		created, err := s.store.CreateIssue(store.CreateIssueInput{Title: title, Estimate: estimate})
		if err != nil {
			t.Fatal(err)
		}
		issues[title] = created.Identifier
	}

	filtered := doJSON(t, s, http.MethodGet, "/api/issues?estimates=1,3&noEstimate=true", "")
	if filtered.Code != http.StatusOK {
		t.Fatalf("list multi-estimate issues %d %s", filtered.Code, filtered.Body.String())
	}
	var got []store.Issue
	if err := json.Unmarshal(filtered.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if len(got) != 3 {
		t.Fatalf("multi-estimate result = %#v", got)
	}
	identifiers := map[string]bool{}
	for _, issue := range got {
		identifiers[issue.Identifier] = true
	}
	if !identifiers[issues["no estimate"]] || !identifiers[issues["estimate one"]] || !identifiers[issues["estimate three"]] || identifiers[issues["estimate five"]] {
		t.Fatalf("multi-estimate result returned wrong issues: %#v", got)
	}
	invalid := doJSON(t, s, http.MethodGet, "/api/issues?estimates=1,1000", "")
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("invalid estimate filter %d %s", invalid.Code, invalid.Body.String())
	}
	legacyCombined := doJSON(t, s, http.MethodGet, "/api/issues?estimate=1&noEstimate=true", "")
	if legacyCombined.Code != http.StatusOK {
		t.Fatalf("legacy estimate with no-estimate filter %d %s", legacyCombined.Code, legacyCombined.Body.String())
	}
	got = nil
	if err := json.Unmarshal(legacyCombined.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 {
		t.Fatalf("legacy combined estimate result = %#v", got)
	}

	created := doJSON(t, s, http.MethodPost, "/api/views", `{"name":"Estimate view","slug":"estimate-view","estimates":[1],"noEstimate":true}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create multi-estimate view %d %s", created.Code, created.Body.String())
	}
	var view store.View
	if err := json.Unmarshal(created.Body.Bytes(), &view); err != nil {
		t.Fatal(err)
	}
	if len(view.Estimates) != 1 || !view.NoEstimate || view.Estimate != nil {
		t.Fatalf("created view estimates = %#v", view)
	}

	single := doJSON(t, s, http.MethodPatch, "/api/views/estimate-view", `{"estimate":3,"estimates":[],"noEstimate":false}`)
	if single.Code != http.StatusOK {
		t.Fatalf("set single view estimate %d %s", single.Code, single.Body.String())
	}
	view = store.View{}
	if err := json.Unmarshal(single.Body.Bytes(), &view); err != nil {
		t.Fatal(err)
	}
	if view.Estimate == nil || *view.Estimate != 3 || len(view.Estimates) != 0 || view.NoEstimate {
		t.Fatalf("single estimate update cleared filter: %#v", view)
	}

	noEstimate := doJSON(t, s, http.MethodPatch, "/api/views/estimate-view", `{"estimate":-1,"estimates":[],"noEstimate":true}`)
	if noEstimate.Code != http.StatusOK {
		t.Fatalf("set no-estimate filter %d %s", noEstimate.Code, noEstimate.Body.String())
	}
	view = store.View{}
	if err := json.Unmarshal(noEstimate.Body.Bytes(), &view); err != nil {
		t.Fatal(err)
	}
	if view.Estimate != nil || len(view.Estimates) != 0 || !view.NoEstimate {
		t.Fatalf("no-estimate filter update = %#v", view)
	}

	cleared := doJSON(t, s, http.MethodPatch, "/api/views/estimate-view", `{"estimate":-1,"estimates":[],"noEstimate":false}`)
	if cleared.Code != http.StatusOK {
		t.Fatalf("clear estimate view %d %s", cleared.Code, cleared.Body.String())
	}
	view = store.View{}
	if err := json.Unmarshal(cleared.Body.Bytes(), &view); err != nil {
		t.Fatal(err)
	}
	if view.Estimate != nil || len(view.Estimates) != 0 || view.NoEstimate {
		t.Fatalf("cleared estimate view = %#v", view)
	}
}
