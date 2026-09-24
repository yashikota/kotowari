package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/yashikota/kotowari/internal/store"
)

func TestProjectWorkflowStatusAPI(t *testing.T) {
	server := testAPI(t)
	listed := doJSON(t, server, http.MethodGet, "/api/project-workflow-statuses", "")
	if listed.Code != http.StatusOK {
		t.Fatalf("list project statuses: %d %s", listed.Code, listed.Body.String())
	}
	var statuses []store.ProjectWorkflowStatus
	if err := json.Unmarshal(listed.Body.Bytes(), &statuses); err != nil {
		t.Fatal(err)
	}
	if len(statuses) != 5 {
		t.Fatalf("expected five default project statuses, got %#v", statuses)
	}
	statuses = append(statuses, store.ProjectWorkflowStatus{ID: "in-review", Name: "In Review", Category: "started"})
	body, err := json.Marshal(map[string]any{"statuses": statuses})
	if err != nil {
		t.Fatal(err)
	}
	updated := doJSON(t, server, http.MethodPut, "/api/project-workflow-statuses", string(body))
	if updated.Code != http.StatusOK {
		t.Fatalf("save project statuses: %d %s", updated.Code, updated.Body.String())
	}

	created := doJSON(t, server, http.MethodPost, "/api/projects", `{"name":"Review project","slug":"review-project","status":"started","workflowStatus":"in-review","priority":2}`)
	if created.Code != http.StatusCreated || !bytes.Contains(created.Body.Bytes(), []byte(`"workflowStatus":"in-review"`)) {
		t.Fatalf("create project in custom state: %d %s", created.Code, created.Body.String())
	}
	patched := doJSON(t, server, http.MethodPatch, "/api/projects/review-project", `{"workflowStatus":"completed","status":"completed"}`)
	if patched.Code != http.StatusOK || !bytes.Contains(patched.Body.Bytes(), []byte(`"workflowStatus":"completed"`)) {
		t.Fatalf("update project workflow state: %d %s", patched.Code, patched.Body.String())
	}

	bad := doJSON(t, server, http.MethodPut, "/api/project-workflow-statuses", `{"statuses":[]}`)
	if bad.Code != http.StatusBadRequest {
		t.Fatalf("invalid project workflow should return 400, got %d %s", bad.Code, bad.Body.String())
	}
}
