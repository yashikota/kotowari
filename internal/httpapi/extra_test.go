package httpapi

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"
)

func TestInvalidIssueQueryParams(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "GET", "/api/issues?cycle=abc", "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("cycle %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "GET", "/api/issues?priority=high", "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("priority %d %s", rec.Code, rec.Body.String())
	}
}

func TestCommandsAndSearch(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "GET", "/api/commands", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("commands %d %s", rec.Code, rec.Body.String())
	}
	var cmds []map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &cmds); err != nil {
		t.Fatal(err)
	}
	ids := map[string]bool{}
	for _, c := range cmds {
		ids[c["id"]] = true
	}
	if !ids["new-issue"] || !ids["new-view"] || !ids["assign-cycle:none"] || !ids["new-adr"] || !ids["goto-adrs"] {
		t.Fatalf("commands %#v", cmds)
	}

	rec = doJSON(t, s, "GET", "/api/search?q=", "")
	if rec.Code != http.StatusOK || rec.Body.String() != "[]\n" {
		t.Fatalf("empty search %d %s", rec.Code, rec.Body.String())
	}
	if rec := doJSON(t, s, "POST", "/api/issues", `{"title":"Findable"}`); rec.Code != http.StatusCreated {
		t.Fatalf("create %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "GET", "/api/search?q=Findable", "")
	var hits []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &hits); err != nil {
		t.Fatal(err)
	}
	if len(hits) != 1 || hits[0]["kind"] != "issue" {
		t.Fatalf("search %#v", hits)
	}
}

func TestCreateIssueWithExternalLinks(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "POST", "/api/issues", `{"title":"Linked issue","links":[{"url":"https://example.test/spec","title":"Spec"}]}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create %d %s", rec.Code, rec.Body.String())
	}
	var created struct {
		Identifier    string `json:"identifier"`
		ExternalLinks []struct {
			URL   string `json:"url"`
			Title string `json:"title"`
			Kind  string `json:"kind"`
		} `json:"externalLinks"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if len(created.ExternalLinks) != 1 || created.ExternalLinks[0].URL != "https://example.test/spec" || created.ExternalLinks[0].Title != "Spec" || created.ExternalLinks[0].Kind != "link" {
		t.Fatalf("created issue links %#v", created.ExternalLinks)
	}

	got := doJSON(t, s, "GET", "/api/issues/"+created.Identifier, "")
	if got.Code != http.StatusOK || !json.Valid(got.Body.Bytes()) {
		t.Fatalf("get %d %s", got.Code, got.Body.String())
	}
	var persisted struct {
		ExternalLinks []struct {
			URL string `json:"url"`
		} `json:"externalLinks"`
	}
	if err := json.Unmarshal(got.Body.Bytes(), &persisted); err != nil {
		t.Fatal(err)
	}
	if len(persisted.ExternalLinks) != 1 || persisted.ExternalLinks[0].URL != "https://example.test/spec" {
		t.Fatalf("persisted links %#v", persisted.ExternalLinks)
	}

	bad := doJSON(t, s, "POST", "/api/issues", `{"title":"Bad linked issue","links":[{"url":"javascript:alert(1)"}]}`)
	if bad.Code != http.StatusBadRequest {
		t.Fatalf("invalid link status %d %s", bad.Code, bad.Body.String())
	}
}

func TestCreateRecurringIssueFromNewIssueRequest(t *testing.T) {
	s := testAPI(t)
	firstDueDate := time.Now().AddDate(0, 0, 14).Format("2006-01-02")
	body := `{"title":"Monthly review","body":"Review changes.","status":"todo","links":[{"url":"https://example.test/spec","title":"Spec"}],"recurring":{"firstDueDate":"` + firstDueDate + `","interval":2,"unit":"month"}}`
	created := doJSON(t, s, "POST", "/api/issues", body)
	if created.Code != http.StatusCreated {
		t.Fatalf("create recurring issue %d %s", created.Code, created.Body.String())
	}
	var issue struct {
		Identifier    string `json:"identifier"`
		Title         string `json:"title"`
		DueDate       string `json:"dueDate"`
		ExternalLinks []struct {
			URL string `json:"url"`
		} `json:"externalLinks"`
	}
	if err := json.Unmarshal(created.Body.Bytes(), &issue); err != nil {
		t.Fatal(err)
	}
	if issue.Title != "Monthly review" || issue.DueDate != firstDueDate || len(issue.ExternalLinks) != 1 {
		t.Fatalf("created recurring instance %#v", issue)
	}

	issuesResponse := doJSON(t, s, "GET", "/api/issues", "")
	var issues []map[string]any
	if err := json.Unmarshal(issuesResponse.Body.Bytes(), &issues); err != nil {
		t.Fatal(err)
	}
	if len(issues) != 1 {
		t.Fatalf("expected no unlinked seed issue, got %d issues", len(issues))
	}

	schedulesResponse := doJSON(t, s, "GET", "/api/recurring-issues", "")
	var schedules []map[string]any
	if err := json.Unmarshal(schedulesResponse.Body.Bytes(), &schedules); err != nil {
		t.Fatal(err)
	}
	if len(schedules) != 1 || schedules[0]["firstDueDate"] != firstDueDate || schedules[0]["interval"] != float64(2) || schedules[0]["unit"] != "month" {
		t.Fatalf("recurring schedules %#v", schedules)
	}
}

func TestMissingResourcesAndEmptyLists(t *testing.T) {
	s := testAPI(t)
	if rec := doJSON(t, s, "GET", "/api/pages/missing", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("page %d", rec.Code)
	}
	if rec := doJSON(t, s, "GET", "/api/projects/missing", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("project %d", rec.Code)
	}
	if rec := doJSON(t, s, "GET", "/api/cycles/9", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("cycle %d", rec.Code)
	}
	if rec := doJSON(t, s, "GET", "/api/projects", ""); rec.Code != http.StatusOK || rec.Body.String() != "[]\n" {
		t.Fatalf("projects %s", rec.Body.String())
	}
	if rec := doJSON(t, s, "GET", "/api/cycles", ""); rec.Code != http.StatusOK || rec.Body.String() != "[]\n" {
		t.Fatalf("cycles %s", rec.Body.String())
	}
	if rec := doJSON(t, s, "GET", "/api/pages", ""); rec.Code != http.StatusOK || rec.Body.String() != "[]\n" {
		t.Fatalf("pages %s", rec.Body.String())
	}
}

func TestPatchInvalidStatusAndUnknownAPI(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "POST", "/api/issues", `{"title":"x"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create %d %s", rec.Code, rec.Body.String())
	}
	var issue map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &issue); err != nil {
		t.Fatal(err)
	}
	id := issue["identifier"].(string)
	rec = doJSON(t, s, "PATCH", "/api/issues/"+id, `{"status":"ready"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("invalid status %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "GET", "/api/nope", "")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("unknown api %d", rec.Code)
	}
	rec = doJSON(t, s, "GET", "/issues", "")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("spa without dist %d", rec.Code)
	}
}

func TestCommentsEmptyJSONArray(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "POST", "/api/issues", `{"title":"x"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create %d %s", rec.Code, rec.Body.String())
	}
	var issue map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &issue); err != nil {
		t.Fatal(err)
	}
	id := issue["identifier"].(string)
	rec = doJSON(t, s, "GET", "/api/issues/"+id+"/comments", "")
	if rec.Code != http.StatusOK || rec.Body.String() != "[]\n" {
		t.Fatalf("comments %d %s", rec.Code, rec.Body.String())
	}
}

func TestDuplicateLabelAndProjectConflict(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "POST", "/api/labels", `{"name":"Bug","color":"#ffffff"}`)
	if rec.Code != http.StatusConflict {
		t.Fatalf("label conflict %d %s", rec.Code, rec.Body.String())
	}
	if rec := doJSON(t, s, "POST", "/api/projects", `{"name":"A","slug":"dock"}`); rec.Code != http.StatusCreated {
		t.Fatalf("project %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "POST", "/api/projects", `{"name":"B","slug":"dock"}`)
	if rec.Code != http.StatusConflict {
		t.Fatalf("project conflict %d %s", rec.Code, rec.Body.String())
	}
}

func TestCreateIssueOmitsStatusDefaultsBacklog(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "POST", "/api/issues", `{"title":"from api"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create %d %s", rec.Code, rec.Body.String())
	}
	var issue map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &issue); err != nil {
		t.Fatal(err)
	}
	if issue["status"] != "backlog" {
		t.Fatalf("status %#v", issue["status"])
	}
}

func TestWorkspaceEmptyNameRejected(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "PATCH", "/api/workspace", `{"name":"  "}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("empty name %d %s", rec.Code, rec.Body.String())
	}
}
