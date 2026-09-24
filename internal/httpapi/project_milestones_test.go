package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"testing"

	"github.com/yashikota/kotowari/internal/store"
)

func TestProjectCreateAcceptsMilestonesAndDescriptions(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "POST", "/api/projects", `{"name":"Release","slug":"release","milestones":[{"name":"Preview","description":"Validate with customers","targetDate":"2026-12-01"}]}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create project %d %s", rec.Code, rec.Body.String())
	}
	var project store.Project
	if err := json.Unmarshal(rec.Body.Bytes(), &project); err != nil {
		t.Fatal(err)
	}
	if len(project.Milestones) != 1 || project.Milestones[0].Description != "Validate with customers" {
		t.Fatalf("created project milestones %#v", project.Milestones)
	}
	milestoneID := project.Milestones[0].ID
	rec = doJSON(t, s, "PATCH", "/api/projects/release/milestones/"+strconv.FormatInt(milestoneID, 10), `{"description":"Final validation"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("update milestone %d %s", rec.Code, rec.Body.String())
	}
	var milestone store.Milestone
	if err := json.Unmarshal(rec.Body.Bytes(), &milestone); err != nil {
		t.Fatal(err)
	}
	if milestone.Description != "Final validation" {
		t.Fatalf("updated milestone %#v", milestone)
	}
}
