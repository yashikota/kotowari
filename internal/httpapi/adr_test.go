package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func TestListADRsEmptyJSONArray(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "GET", "/api/adrs", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("code %d %s", rec.Code, rec.Body.String())
	}
	if rec.Body.String() != "[]\n" {
		t.Fatalf("empty list want [], got %s", rec.Body.String())
	}
}

func TestCreateADRSupersedesMarksOld(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "POST", "/api/adrs", `{"title":"postgres"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "POST", "/api/adrs", `{"title":"mysql","supersedes":1}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("supersede %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "GET", "/api/adrs/1", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("get old %d %s", rec.Code, rec.Body.String())
	}
	var old map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &old); err != nil {
		t.Fatal(err)
	}
	if old["status"] != "superseded" {
		t.Fatalf("old %#v", old)
	}
}

func TestCreateADRRequiresTitle(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "POST", "/api/adrs", `{"title":""}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("code %d body %s", rec.Code, rec.Body.String())
	}
}

func TestADRCRUDLinkAndPublish(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "POST", "/api/issues", `{"title":"cache"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("issue %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "POST", "/api/adrs", `{"title":"local cache"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create adr %d %s", rec.Code, rec.Body.String())
	}
	var adr map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &adr); err != nil {
		t.Fatal(err)
	}
	if adr["identifier"] != "ADR-1" || adr["status"] != "proposed" {
		t.Fatalf("adr %#v", adr)
	}
	body, _ := adr["body"].(string)
	if body == "" || !strings.Contains(body, "評価関数") {
		t.Fatalf("template body %q", body)
	}

	rec = doJSON(t, s, "POST", "/api/issues/ISS-1/links/adrs", `{"number":1}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("link issue %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "GET", "/api/adrs/ADR-1", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("get adr %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &adr); err != nil {
		t.Fatal(err)
	}
	nums, _ := adr["issueNumbers"].([]any)
	if len(nums) != 1 || nums[0] != float64(1) {
		t.Fatalf("issueNumbers %#v", adr["issueNumbers"])
	}

	rec = doJSON(t, s, "GET", "/api/issues/ISS-1", "")
	var issue map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &issue); err != nil {
		t.Fatal(err)
	}
	adrs, _ := issue["adrNumbers"].([]any)
	if len(adrs) != 1 || adrs[0] != float64(1) {
		t.Fatalf("adrNumbers %#v", issue["adrNumbers"])
	}

	rec = doJSON(t, s, "POST", "/api/adrs/1/links/issues", `{"number":1}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("idempotent link %d %s", rec.Code, rec.Body.String())
	}

	rec = doJSON(t, s, "POST", "/api/adrs/ADR-1/publish", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("publish %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &adr); err != nil {
		t.Fatal(err)
	}
	if adr["status"] != "accepted" {
		t.Fatalf("status after publish %#v", adr["status"])
	}
	pub, _ := adr["publishBody"].(string)
	if !strings.Contains(pub, "## Decision Outcome") {
		t.Fatalf("publish template %q", pub)
	}

	rec = doJSON(t, s, "PATCH", "/api/adrs/ADR-1", `{"publishBody":"kept"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("patch publishBody %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "POST", "/api/adrs/ADR-1/publish", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("republish %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &adr); err != nil {
		t.Fatal(err)
	}
	if adr["publishBody"] != "kept" {
		t.Fatalf("publish overwrote existing body: %q", adr["publishBody"])
	}

	rec = doJSON(t, s, "DELETE", "/api/issues/ISS-1/links/adrs/1", "")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("unlink %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "GET", "/api/adrs/ADR-1", "")
	if err := json.Unmarshal(rec.Body.Bytes(), &adr); err != nil {
		t.Fatal(err)
	}
	nums, _ = adr["issueNumbers"].([]any)
	if len(nums) != 0 {
		t.Fatalf("unlinked issues %#v", adr["issueNumbers"])
	}

	rec = doJSON(t, s, "DELETE", "/api/adrs/ADR-1", "")
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("delete %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "GET", "/api/adrs/ADR-1", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("adr should remain %d %s", rec.Code, rec.Body.String())
	}
}

func TestGetMissingADR(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "GET", "/api/adrs/ADR-99", "")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("code %d %s", rec.Code, rec.Body.String())
	}
}

func TestCreateADRRejectsInvalidStatus(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "POST", "/api/adrs", `{"title":"x","status":"draft"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("code %d %s", rec.Code, rec.Body.String())
	}
}

func TestPatchADRStatusAndSupersedes(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "POST", "/api/adrs", `{"title":"postgres"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create old %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "POST", "/api/adrs", `{"title":"mysql"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create next %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "PATCH", "/api/adrs/2", `{"supersedes":1,"status":"accepted"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("patch %d %s", rec.Code, rec.Body.String())
	}
	var next map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &next); err != nil {
		t.Fatal(err)
	}
	if next["status"] != "accepted" || next["supersedes"] != float64(1) {
		t.Fatalf("next %#v", next)
	}
	rec = doJSON(t, s, "GET", "/api/adrs/1", "")
	var old map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &old); err != nil {
		t.Fatal(err)
	}
	if old["status"] != "superseded" {
		t.Fatalf("old %#v", old)
	}
}

func TestPatchADRRejected(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "POST", "/api/adrs", `{"title":"maybe"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "PATCH", "/api/adrs/ADR-1", `{"status":"rejected"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("patch %d %s", rec.Code, rec.Body.String())
	}
	var adr map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &adr); err != nil {
		t.Fatal(err)
	}
	if adr["status"] != "rejected" {
		t.Fatalf("adr %#v", adr)
	}
}

func TestDeleteMissingADRIsNotFound(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "DELETE", "/api/adrs/ADR-9", "")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("code %d %s", rec.Code, rec.Body.String())
	}
}

func TestLinkAndUnlinkFromADRSide(t *testing.T) {
	s := testAPI(t)
	if rec := doJSON(t, s, "POST", "/api/issues", `{"title":"work"}`); rec.Code != http.StatusCreated {
		t.Fatalf("issue %d %s", rec.Code, rec.Body.String())
	}
	if rec := doJSON(t, s, "POST", "/api/adrs", `{"title":"decide"}`); rec.Code != http.StatusCreated {
		t.Fatalf("adr %d %s", rec.Code, rec.Body.String())
	}
	rec := doJSON(t, s, "POST", "/api/adrs/ADR-1/links/issues", `{"number":1}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("link %d %s", rec.Code, rec.Body.String())
	}
	var adr map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &adr); err != nil {
		t.Fatal(err)
	}
	nums, _ := adr["issueNumbers"].([]any)
	if len(nums) != 1 || nums[0] != float64(1) {
		t.Fatalf("linked %#v", adr["issueNumbers"])
	}
	rec = doJSON(t, s, "DELETE", "/api/adrs/ADR-1/links/issues/1", "")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("unlink %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "GET", "/api/adrs/ADR-1", "")
	if err := json.Unmarshal(rec.Body.Bytes(), &adr); err != nil {
		t.Fatal(err)
	}
	nums, _ = adr["issueNumbers"].([]any)
	if len(nums) != 0 {
		t.Fatalf("still linked %#v", adr["issueNumbers"])
	}
}
