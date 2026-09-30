package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"testing"
)

func TestWorkspaceResourceEndpoints(t *testing.T) {
	s := testAPI(t)
	created := doJSON(t, s, http.MethodPost, "/api/workspace/resources", `{"url":"https://example.test/guide","title":"Guide"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create resource %d %s", created.Code, created.Body.String())
	}
	var resource struct {
		ID        int64  `json:"id"`
		URL       string `json:"url"`
		Title     string `json:"title"`
		CreatedAt string `json:"createdAt"`
	}
	if err := json.Unmarshal(created.Body.Bytes(), &resource); err != nil {
		t.Fatal(err)
	}
	if resource.ID < 1 || resource.URL != "https://example.test/guide" || resource.Title != "Guide" || resource.CreatedAt == "" {
		t.Fatalf("created resource %#v", resource)
	}
	duplicate := doJSON(t, s, http.MethodPost, "/api/workspace/resources", `{"url":"https://example.test/guide"}`)
	if duplicate.Code != http.StatusConflict {
		t.Fatalf("duplicate resource %d %s", duplicate.Code, duplicate.Body.String())
	}
	invalid := doJSON(t, s, http.MethodPost, "/api/workspace/resources", `{"url":"javascript:alert(1)"}`)
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("invalid resource %d %s", invalid.Code, invalid.Body.String())
	}
	workspace := doJSON(t, s, http.MethodGet, "/api/workspace", "")
	var got struct {
		Resources []struct {
			ID    int64  `json:"id"`
			URL   string `json:"url"`
			Title string `json:"title"`
		} `json:"resources"`
	}
	if err := json.Unmarshal(workspace.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if workspace.Code != http.StatusOK || len(got.Resources) != 1 || got.Resources[0].ID != resource.ID {
		t.Fatalf("workspace resources %d %s", workspace.Code, workspace.Body.String())
	}
	removed := doJSON(t, s, http.MethodDelete, "/api/workspace/resources/"+strconv.FormatInt(resource.ID, 10), "")
	if removed.Code != http.StatusNoContent {
		t.Fatalf("remove resource %d %s", removed.Code, removed.Body.String())
	}
	missing := doJSON(t, s, http.MethodDelete, "/api/workspace/resources/"+strconv.FormatInt(resource.ID, 10), "")
	if missing.Code != http.StatusNotFound {
		t.Fatalf("remove missing resource %d %s", missing.Code, missing.Body.String())
	}
}
