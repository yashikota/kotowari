package httpapi

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/yashikota/kotowari/internal/store"
)

func TestCreateProjectAcceptsDependenciesAndUpdatesTheirInverse(t *testing.T) {
	s := testAPI(t)
	baseResponse := doJSON(t, s, "POST", "/api/projects", `{"name":"Core platform","slug":"core-platform"}`)
	if baseResponse.Code != http.StatusCreated {
		t.Fatalf("create base project %d %s", baseResponse.Code, baseResponse.Body.String())
	}
	response := doJSON(t, s, "POST", "/api/projects", `{"name":"Release experience","slug":"release-experience","dependencies":[{"projectSlug":"core-platform","kind":"blocked_by"}]}`)
	if response.Code != http.StatusCreated {
		t.Fatalf("create dependent project %d %s", response.Code, response.Body.String())
	}
	var created store.Project
	if err := json.Unmarshal(response.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if len(created.Dependencies) != 1 || created.Dependencies[0].Kind != "blocked_by" {
		t.Fatalf("created project dependencies %#v", created.Dependencies)
	}
	response = doJSON(t, s, "GET", "/api/projects/core-platform", "")
	if response.Code != http.StatusOK {
		t.Fatalf("get dependency target %d %s", response.Code, response.Body.String())
	}
	var target store.Project
	if err := json.Unmarshal(response.Body.Bytes(), &target); err != nil {
		t.Fatal(err)
	}
	if len(target.Dependencies) != 1 || target.Dependencies[0] != (store.ProjectDependency{ProjectSlug: created.Slug, Kind: "blocks"}) {
		t.Fatalf("inverse dependency %#v", target.Dependencies)
	}
}
