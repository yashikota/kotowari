package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/yashikota/kotowari/internal/store"
)

func TestIssueWorkflowStatusAPI(t *testing.T) {
	server := testAPI(t)
	listed := doJSON(t, server, http.MethodGet, "/api/issue-workflow-statuses", "")
	if listed.Code != http.StatusOK {
		t.Fatalf("list statuses: %d %s", listed.Code, listed.Body.String())
	}
	var statuses []store.IssueWorkflowStatus
	if err := json.Unmarshal(listed.Body.Bytes(), &statuses); err != nil {
		t.Fatal(err)
	}
	if len(statuses) != 6 {
		t.Fatalf("expected six default statuses, got %#v", statuses)
	}
	statuses = append(statuses, store.IssueWorkflowStatus{
		ID: "in-review", Name: "In Review", Category: "in_progress",
	})
	body, err := json.Marshal(map[string]any{"statuses": statuses})
	if err != nil {
		t.Fatal(err)
	}
	updated := doJSON(t, server, http.MethodPut, "/api/issue-workflow-statuses", string(body))
	if updated.Code != http.StatusOK {
		t.Fatalf("save statuses: %d %s", updated.Code, updated.Body.String())
	}

	created := doJSON(t, server, http.MethodPost, "/api/issues", `{"title":"Review","status":"in_progress","workflowStatus":"in-review"}`)
	if created.Code != http.StatusCreated || !bytes.Contains(created.Body.Bytes(), []byte(`"workflowStatus":"in-review"`)) {
		t.Fatalf("create issue in custom state: %d %s", created.Code, created.Body.String())
	}
	var issue store.Issue
	if err := json.Unmarshal(created.Body.Bytes(), &issue); err != nil {
		t.Fatal(err)
	}
	filtered := doJSON(t, server, http.MethodGet, "/api/issues?status=in-review", "")
	if filtered.Code != http.StatusOK || !bytes.Contains(filtered.Body.Bytes(), []byte(`"identifier":"`+issue.Identifier+`"`)) {
		t.Fatalf("filter by custom workflow state: %d %s", filtered.Code, filtered.Body.String())
	}

	bad := doJSON(t, server, http.MethodPut, "/api/issue-workflow-statuses", `{"statuses":[]}`)
	if bad.Code != http.StatusBadRequest {
		t.Fatalf("invalid workflow should return 400, got %d %s", bad.Code, bad.Body.String())
	}
}
