package httpapi

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestProjectTemplateAPI(t *testing.T) {
	s := testAPI(t)
	projectResponse := doJSON(t, s, http.MethodPost, "/api/projects", `{"name":"Launch","slug":"launch","summary":"Ship it","description":"## Brief\nDetails","status":"started","workflowStatus":"started","priority":2,"milestones":[{"name":"Beta","description":"Validate"}]}`)
	if projectResponse.Code != http.StatusCreated {
		t.Fatalf("create project %d %s", projectResponse.Code, projectResponse.Body.String())
	}

	created := doJSON(t, s, http.MethodPost, "/api/projects/launch/templates", `{"name":"Launch plan"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create template %d %s", created.Code, created.Body.String())
	}
	var template struct {
		Slug        string `json:"slug"`
		Name        string `json:"name"`
		Description string `json:"description"`
		Milestones  []struct {
			Name        string `json:"name"`
			Description string `json:"description"`
		} `json:"milestones"`
	}
	if err := json.Unmarshal(created.Body.Bytes(), &template); err != nil {
		t.Fatal(err)
	}
	if template.Slug != "launch-plan" || template.Name != "Launch plan" || template.Description != "## Brief\nDetails" ||
		len(template.Milestones) != 1 || template.Milestones[0].Name != "Beta" || template.Milestones[0].Description != "Validate" {
		t.Fatalf("created template %#v", template)
	}

	listed := doJSON(t, s, http.MethodGet, "/api/project-templates", "")
	var templates []struct {
		Slug string `json:"slug"`
	}
	if listed.Code != http.StatusOK || json.Unmarshal(listed.Body.Bytes(), &templates) != nil || len(templates) != 1 || templates[0].Slug != template.Slug {
		t.Fatalf("list templates %d %s", listed.Code, listed.Body.String())
	}
	if duplicate := doJSON(t, s, http.MethodPost, "/api/projects/launch/templates", `{"name":"Launch plan"}`); duplicate.Code != http.StatusConflict {
		t.Fatalf("duplicate template %d %s", duplicate.Code, duplicate.Body.String())
	}
	if deleted := doJSON(t, s, http.MethodDelete, "/api/project-templates/launch-plan", ""); deleted.Code != http.StatusNoContent {
		t.Fatalf("delete template %d %s", deleted.Code, deleted.Body.String())
	}
	if missing := doJSON(t, s, http.MethodPost, "/api/projects/missing/templates", `{"name":"Plan"}`); missing.Code != http.StatusNotFound {
		t.Fatalf("missing project %d %s", missing.Code, missing.Body.String())
	}
}
