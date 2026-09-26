package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func TestInitiativeAPIManagesProjectsAndDates(t *testing.T) {
	s := testAPI(t)
	for _, project := range []string{"alpha", "beta"} {
		created := doJSON(t, s, http.MethodPost, "/api/projects", `{"name":"`+project+`","slug":"`+project+`"}`)
		if created.Code != http.StatusCreated {
			t.Fatalf("create project %s: %d %s", project, created.Code, created.Body.String())
		}
	}
	createdLabel := doJSON(t, s, http.MethodPost, "/api/labels", `{"name":"Initiative QA","color":"#7950f2"}`)
	if createdLabel.Code != http.StatusCreated {
		t.Fatalf("create label %d %s", createdLabel.Code, createdLabel.Body.String())
	}

	created := doJSON(t, s, http.MethodPost, "/api/initiatives", `{"name":"Platform launch","slug":"platform-launch","description":"Ship the platform","status":"planned","color":"purple","health":"on_track","priority":2,"labels":["Initiative QA"],"startDate":"2026-09-01","targetDate":"2026-12-31"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create initiative %d %s", created.Code, created.Body.String())
	}
	updated := doJSON(t, s, http.MethodPatch, "/api/initiatives/platform-launch", `{"status":"completed","projectSlugs":["alpha","beta"]}`)
	if updated.Code != http.StatusOK {
		t.Fatalf("update initiative %d %s", updated.Code, updated.Body.String())
	}
	var initiative struct {
		Status       string   `json:"status"`
		ProjectSlugs []string `json:"projectSlugs"`
		Health       string   `json:"health"`
		Priority     int      `json:"priority"`
		Labels       []string `json:"labels"`
		CompletedAt  *string  `json:"completedAt"`
	}
	if err := json.Unmarshal(updated.Body.Bytes(), &initiative); err != nil {
		t.Fatal(err)
	}
	if initiative.Status != "completed" || len(initiative.ProjectSlugs) != 2 || initiative.Health != "on_track" || initiative.Priority != 2 || len(initiative.Labels) != 1 || initiative.CompletedAt == nil {
		t.Fatalf("updated initiative %#v", initiative)
	}
	project := doJSON(t, s, http.MethodGet, "/api/projects/alpha", "")
	if project.Code != http.StatusOK || !strings.Contains(project.Body.String(), `"initiativeSlugs":["platform-launch"]`) {
		t.Fatalf("initiative project relation %d %s", project.Code, project.Body.String())
	}
	project = doJSON(t, s, http.MethodPatch, "/api/projects/alpha", `{"initiativeSlugs":[]}`)
	if project.Code != http.StatusOK || strings.Contains(project.Body.String(), `"initiativeSlugs":["platform-launch"]`) {
		t.Fatalf("project initiative property could not be cleared: %d %s", project.Code, project.Body.String())
	}
	project = doJSON(t, s, http.MethodPatch, "/api/projects/alpha", `{"initiativeSlugs":["platform-launch"]}`)
	if project.Code != http.StatusOK || !strings.Contains(project.Body.String(), `"initiativeSlugs":["platform-launch"]`) {
		t.Fatalf("project initiative property could not be assigned: %d %s", project.Code, project.Body.String())
	}
	list := doJSON(t, s, http.MethodGet, "/api/initiatives", "")
	if list.Code != http.StatusOK || !strings.Contains(list.Body.String(), `"platform-launch"`) {
		t.Fatalf("list initiatives %d %s", list.Code, list.Body.String())
	}
	invalid := doJSON(t, s, http.MethodPatch, "/api/initiatives/platform-launch", `{"projectSlugs":["missing"]}`)
	if invalid.Code != http.StatusNotFound {
		t.Fatalf("invalid project assignment %d %s", invalid.Code, invalid.Body.String())
	}
	invalid = doJSON(t, s, http.MethodPatch, "/api/projects/alpha", `{"initiativeSlugs":["missing"]}`)
	if invalid.Code != http.StatusNotFound {
		t.Fatalf("invalid initiative assignment %d %s", invalid.Code, invalid.Body.String())
	}
	deleted := doJSON(t, s, http.MethodDelete, "/api/initiatives/platform-launch", "")
	if deleted.Code != http.StatusNoContent {
		t.Fatalf("delete initiative %d %s", deleted.Code, deleted.Body.String())
	}
	project = doJSON(t, s, http.MethodGet, "/api/projects/alpha", "")
	if project.Code != http.StatusOK || strings.Contains(project.Body.String(), `"initiativeSlugs":["platform-launch"]`) {
		t.Fatalf("deleted initiative remained linked %d %s", project.Code, project.Body.String())
	}
}

func TestInitiativeAPIRejectsInvalidStatusAndDateRange(t *testing.T) {
	s := testAPI(t)
	invalid := doJSON(t, s, http.MethodPost, "/api/initiatives", `{"name":"Broken","slug":"broken","status":"paused"}`)
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("invalid status %d %s", invalid.Code, invalid.Body.String())
	}
	invalid = doJSON(t, s, http.MethodPost, "/api/initiatives", `{"name":"Broken","slug":"broken","startDate":"2026-12-31","targetDate":"2026-09-01"}`)
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("invalid date range %d %s", invalid.Code, invalid.Body.String())
	}
	invalid = doJSON(t, s, http.MethodPost, "/api/initiatives", `{"name":"Broken","slug":"broken","priority":5}`)
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("invalid priority %d %s", invalid.Code, invalid.Body.String())
	}
	invalid = doJSON(t, s, http.MethodPost, "/api/initiatives", `{"name":"Broken","slug":"broken","health":"unknown"}`)
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("invalid health %d %s", invalid.Code, invalid.Body.String())
	}
}

func TestInitiativeUpdateAPIStoresAndListsHealthUpdates(t *testing.T) {
	s := testAPI(t)
	created := doJSON(t, s, http.MethodPost, "/api/initiatives", `{"name":"Platform","slug":"platform","status":"active"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create initiative %d %s", created.Code, created.Body.String())
	}
	posted := doJSON(t, s, http.MethodPost, "/api/initiatives/platform/updates", `{"health":"off_track","body":"The launch date is at risk."}`)
	if posted.Code != http.StatusCreated || !strings.Contains(posted.Body.String(), `"action":"status_update_posted"`) {
		t.Fatalf("post initiative update %d %s", posted.Code, posted.Body.String())
	}
	var activity struct {
		Action  string         `json:"action"`
		Payload map[string]any `json:"payload"`
	}
	if err := json.Unmarshal(posted.Body.Bytes(), &activity); err != nil {
		t.Fatal(err)
	}
	if activity.Action != "status_update_posted" || activity.Payload["health"] != "off_track" || activity.Payload["body"] != "The launch date is at risk." {
		t.Fatalf("initiative update payload %#v", activity)
	}
	listed := doJSON(t, s, http.MethodGet, "/api/initiatives/platform/activities", "")
	if listed.Code != http.StatusOK || !strings.Contains(listed.Body.String(), `"health":"off_track"`) {
		t.Fatalf("list initiative updates %d %s", listed.Code, listed.Body.String())
	}
	updated := doJSON(t, s, http.MethodGet, "/api/initiatives/platform", "")
	if updated.Code != http.StatusOK || !strings.Contains(updated.Body.String(), `"health":"off_track"`) || !strings.Contains(updated.Body.String(), `"healthUpdatedAt":`) {
		t.Fatalf("initiative health was not updated %d %s", updated.Code, updated.Body.String())
	}
	invalid := doJSON(t, s, http.MethodPost, "/api/initiatives/platform/updates", `{"health":"unknown","body":"Update"}`)
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("invalid initiative health %d %s", invalid.Code, invalid.Body.String())
	}
	if missing := doJSON(t, s, http.MethodGet, "/api/initiatives/missing/activities", ""); missing.Code != http.StatusNotFound {
		t.Fatalf("missing initiative activity list %d %s", missing.Code, missing.Body.String())
	}
}
