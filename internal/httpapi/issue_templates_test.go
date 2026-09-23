package httpapi

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"
)

func TestIssueTemplateAPI(t *testing.T) {
	s := testAPI(t)
	createdIssue := doJSON(t, s, http.MethodPost, "/api/issues", `{"title":"Release","body":"## Checklist","status":"todo"}`)
	if createdIssue.Code != http.StatusCreated {
		t.Fatalf("create issue %d %s", createdIssue.Code, createdIssue.Body.String())
	}
	var issue struct {
		Identifier string `json:"identifier"`
	}
	if err := json.Unmarshal(createdIssue.Body.Bytes(), &issue); err != nil {
		t.Fatal(err)
	}

	created := doJSON(t, s, http.MethodPost, "/api/issues/"+issue.Identifier+"/templates", `{"name":"Release checklist"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create template %d %s", created.Code, created.Body.String())
	}
	var template struct {
		Slug string `json:"slug"`
		Name string `json:"name"`
		Body string `json:"body"`
	}
	if err := json.Unmarshal(created.Body.Bytes(), &template); err != nil {
		t.Fatal(err)
	}
	if template.Slug != "release-checklist" || template.Name != "Release checklist" || template.Body != "## Checklist\n" {
		t.Fatalf("created template %#v", template)
	}

	listed := doJSON(t, s, http.MethodGet, "/api/issue-templates", "")
	var templates []struct {
		Slug string `json:"slug"`
	}
	if listed.Code != http.StatusOK || json.Unmarshal(listed.Body.Bytes(), &templates) != nil || len(templates) != 1 || templates[0].Slug != template.Slug {
		t.Fatalf("list templates %d %s", listed.Code, listed.Body.String())
	}

	deleted := doJSON(t, s, http.MethodDelete, "/api/issue-templates/"+template.Slug, "")
	if deleted.Code != http.StatusNoContent {
		t.Fatalf("delete template %d %s", deleted.Code, deleted.Body.String())
	}
	if missing := doJSON(t, s, http.MethodPost, "/api/issues/NOPE/templates", `{"name":"x"}`); missing.Code != http.StatusNotFound {
		t.Fatalf("missing issue conversion %d %s", missing.Code, missing.Body.String())
	}
}

func TestRecurringIssueAPI(t *testing.T) {
	s := testAPI(t)
	createdIssue := doJSON(t, s, http.MethodPost, "/api/issues", `{"title":"Weekly report","body":"Summarize the week.","priority":1}`)
	if createdIssue.Code != http.StatusCreated {
		t.Fatalf("create issue %d %s", createdIssue.Code, createdIssue.Body.String())
	}
	var issue struct {
		Identifier string `json:"identifier"`
	}
	if err := json.Unmarshal(createdIssue.Body.Bytes(), &issue); err != nil {
		t.Fatal(err)
	}
	firstDue := time.Now().AddDate(0, 0, 10).Format("2006-01-02")
	created := doJSON(t, s, http.MethodPost, "/api/issues/"+issue.Identifier+"/recurrences", `{"name":"Weekly report","firstDueDate":"`+firstDue+`","interval":1,"unit":"week"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create recurring issue %d %s", created.Code, created.Body.String())
	}
	var schedule struct {
		Slug                string `json:"slug"`
		LastIssueIdentifier string `json:"lastIssueIdentifier"`
		NextDueDate         string `json:"nextDueDate"`
		Enabled             bool   `json:"enabled"`
	}
	if err := json.Unmarshal(created.Body.Bytes(), &schedule); err != nil {
		t.Fatal(err)
	}
	if schedule.Slug != "weekly-report" || schedule.LastIssueIdentifier == "" || schedule.NextDueDate != firstDue || !schedule.Enabled {
		t.Fatalf("created schedule %#v", schedule)
	}
	issues := doJSON(t, s, http.MethodGet, "/api/issues", "")
	var listed []struct {
		Identifier string  `json:"identifier"`
		Title      string  `json:"title"`
		DueDate    *string `json:"dueDate"`
		Status     string  `json:"status"`
	}
	if err := json.Unmarshal(issues.Body.Bytes(), &listed); err != nil {
		t.Fatal(err)
	}
	var found bool
	for _, item := range listed {
		if item.Identifier == schedule.LastIssueIdentifier {
			found = true
			if item.Title != "Weekly report" || item.DueDate == nil || *item.DueDate != firstDue || item.Status != "backlog" {
				t.Fatalf("first generated issue %#v", item)
			}
		}
	}
	if !found {
		t.Fatalf("initial recurring issue %q missing from %s", schedule.LastIssueIdentifier, issues.Body.String())
	}

	paused := doJSON(t, s, http.MethodPatch, "/api/recurring-issues/"+schedule.Slug, `{"enabled":false}`)
	if paused.Code != http.StatusOK {
		t.Fatalf("pause recurring issue %d %s", paused.Code, paused.Body.String())
	}
	if deleted := doJSON(t, s, http.MethodDelete, "/api/recurring-issues/"+schedule.Slug, ""); deleted.Code != http.StatusNoContent {
		t.Fatalf("delete recurring schedule %d %s", deleted.Code, deleted.Body.String())
	}
	if remaining := doJSON(t, s, http.MethodGet, "/api/issues", ""); remaining.Code != http.StatusOK {
		t.Fatalf("existing issues should remain available: %d", remaining.Code)
	}
}
