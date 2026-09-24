package httpapi

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/yashikota/kotowari/internal/store"
)

func testAPI(t *testing.T) *Server {
	t.Helper()
	st, err := store.Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = st.Close() })
	return New(st, nil)
}

func doJSON(t *testing.T, h http.Handler, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestListIssuesEmptyJSONArray(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "GET", "/api/issues", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("code %d %s", rec.Code, rec.Body.String())
	}
	if rec.Body.String() != "[]\n" {
		t.Fatalf("empty list want [], got %s", rec.Body.String())
	}
}

func TestListIssuesByDueDateFilterValidatesAnchor(t *testing.T) {
	s := testAPI(t)
	created := doJSON(t, s, http.MethodPost, "/api/issues", `{"title":"overdue","status":"todo","dueDate":"2026-05-14"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create issue %d %s", created.Code, created.Body.String())
	}
	closed := doJSON(t, s, http.MethodPost, "/api/issues", `{"title":"completed overdue","status":"done","dueDate":"2026-05-14"}`)
	if closed.Code != http.StatusCreated {
		t.Fatalf("create completed issue %d %s", closed.Code, closed.Body.String())
	}

	filtered := doJSON(t, s, http.MethodGet, "/api/issues?dueDate=overdue&asOf=2026-05-15", "")
	if filtered.Code != http.StatusOK {
		t.Fatalf("filter issues %d %s", filtered.Code, filtered.Body.String())
	}
	var issues []struct {
		Title string `json:"title"`
	}
	if err := json.Unmarshal(filtered.Body.Bytes(), &issues); err != nil {
		t.Fatal(err)
	}
	if len(issues) != 1 || issues[0].Title != "overdue" {
		t.Fatalf("unexpected overdue issues %#v", issues)
	}

	for _, path := range []string{
		"/api/issues?dueDate=tomorrowish&asOf=2026-05-15",
		"/api/issues?dueDate=today&asOf=2026-02-30",
	} {
		bad := doJSON(t, s, http.MethodGet, path, "")
		if bad.Code != http.StatusBadRequest {
			t.Errorf("invalid filter %s: status %d body %s", path, bad.Code, bad.Body.String())
		}
	}
}

func TestCreateIssueRequiresTitle(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "POST", "/api/issues", `{"title":""}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("code %d body %s", rec.Code, rec.Body.String())
	}
}

func TestCreateProjectAcceptsKnownLabelsAndRejectsUnknownLabels(t *testing.T) {
	s := testAPI(t)
	created := doJSON(t, s, http.MethodPost, "/api/projects", `{"name":"Labeled release","slug":"labeled-release","labels":["bug","BUG"]}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create project %d %s", created.Code, created.Body.String())
	}
	var project struct {
		Labels []string `json:"labels"`
	}
	if err := json.Unmarshal(created.Body.Bytes(), &project); err != nil {
		t.Fatal(err)
	}
	if len(project.Labels) != 1 || project.Labels[0] != "Bug" {
		t.Fatalf("created labels %#v", project.Labels)
	}
	bad := doJSON(t, s, http.MethodPost, "/api/projects", `{"name":"Invalid release","slug":"invalid-release","labels":["missing"]}`)
	if bad.Code != http.StatusBadRequest {
		t.Fatalf("unknown label status %d body %s", bad.Code, bad.Body.String())
	}
}

func TestProjectSummaryCanBeCreatedAndUpdatedIndependently(t *testing.T) {
	s := testAPI(t)
	created := doJSON(t, s, http.MethodPost, "/api/projects", `{"name":"Launch","slug":"launch","summary":"Ship the first release","icon":"rocket","iconColor":"purple","description":"Detailed release plan"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create project %d %s", created.Code, created.Body.String())
	}
	var project struct {
		Summary     string `json:"summary"`
		Icon        string `json:"icon"`
		IconColor   string `json:"iconColor"`
		Description string `json:"description"`
	}
	if err := json.Unmarshal(created.Body.Bytes(), &project); err != nil {
		t.Fatal(err)
	}
	if project.Summary != "Ship the first release" || project.Description != "Detailed release plan" || project.Icon != "rocket" || project.IconColor != "purple" {
		t.Fatalf("project details = %#v", project)
	}

	updated := doJSON(t, s, http.MethodPatch, "/api/projects/launch", `{"summary":"Release is ready","icon":"emoji:package","iconColor":"#fa923e"}`)
	if updated.Code != http.StatusOK {
		t.Fatalf("update project %d %s", updated.Code, updated.Body.String())
	}
	if err := json.Unmarshal(updated.Body.Bytes(), &project); err != nil {
		t.Fatal(err)
	}
	if project.Summary != "Release is ready" || project.Description != "Detailed release plan" || project.Icon != "emoji:package" || project.IconColor != "#fa923e" {
		t.Fatalf("updated project details = %#v", project)
	}
	invalid := doJSON(t, s, http.MethodPatch, "/api/projects/launch", `{"icon":"script"}`)
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("invalid icon status %d body %s", invalid.Code, invalid.Body.String())
	}
}

func TestProjectActivityListsSingleUserChangesInNewestFirstOrder(t *testing.T) {
	s := testAPI(t)
	created := doJSON(t, s, http.MethodPost, "/api/projects", `{"name":"Launch","slug":"launch","status":"planned"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create project %d %s", created.Code, created.Body.String())
	}
	for _, body := range []string{
		`{"status":"started"}`,
		`{"health":"at_risk"}`,
		`{"priority":3}`,
	} {
		updated := doJSON(t, s, http.MethodPatch, "/api/projects/launch", body)
		if updated.Code != http.StatusOK {
			t.Fatalf("update project %s: %d %s", body, updated.Code, updated.Body.String())
		}
	}

	listed := doJSON(t, s, http.MethodGet, "/api/projects/launch/activities", "")
	if listed.Code != http.StatusOK {
		t.Fatalf("list project activity %d %s", listed.Code, listed.Body.String())
	}
	var activities []store.Activity
	if err := json.Unmarshal(listed.Body.Bytes(), &activities); err != nil {
		t.Fatal(err)
	}
	want := []string{"priority_changed", "health_changed", "status_changed", "created"}
	if len(activities) != len(want) {
		t.Fatalf("got %d project activities: %#v", len(activities), activities)
	}
	for i, action := range want {
		if activities[i].Action != action {
			t.Fatalf("activity %d action = %q, want %q", i, activities[i].Action, action)
		}
	}
	missing := doJSON(t, s, http.MethodGet, "/api/projects/missing/activities", "")
	if missing.Code != http.StatusNotFound {
		t.Fatalf("missing project activity status %d body %s", missing.Code, missing.Body.String())
	}
}

func TestCommentAttachmentsAreStoredScopedAndServedAsDownloads(t *testing.T) {
	s := testAPI(t)
	created := doJSON(t, s, http.MethodPost, "/api/issues", `{"title":"Attachment issue"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create issue %d %s", created.Code, created.Body.String())
	}
	var issue store.Issue
	if err := json.Unmarshal(created.Body.Bytes(), &issue); err != nil {
		t.Fatal(err)
	}

	var requestBody bytes.Buffer
	multipartWriter := multipart.NewWriter(&requestBody)
	if err := multipartWriter.WriteField("body", "See the attached note."); err != nil {
		t.Fatal(err)
	}
	file, err := multipartWriter.CreateFormFile("files", `../../release note.txt`)
	if err != nil {
		t.Fatal(err)
	}
	const contents = "private implementation note"
	if _, err := file.Write([]byte(contents)); err != nil {
		t.Fatal(err)
	}
	if err := multipartWriter.Close(); err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, "/api/issues/"+issue.Identifier+"/comments", &requestBody)
	request.Header.Set("Content-Type", multipartWriter.FormDataContentType())
	recorder := httptest.NewRecorder()
	s.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusCreated {
		t.Fatalf("add comment with attachment %d %s", recorder.Code, recorder.Body.String())
	}
	var comment store.Comment
	if err := json.Unmarshal(recorder.Body.Bytes(), &comment); err != nil {
		t.Fatal(err)
	}
	if len(comment.Attachments) != 1 || comment.Attachments[0].Name != "release note.txt" || comment.Attachments[0].Size != int64(len(contents)) {
		t.Fatalf("comment attachments %#v", comment.Attachments)
	}

	commentsResponse := doJSON(t, s, http.MethodGet, "/api/issues/"+issue.Identifier+"/comments", "")
	var comments []store.Comment
	if err := json.Unmarshal(commentsResponse.Body.Bytes(), &comments); err != nil {
		t.Fatal(err)
	}
	if len(comments) != 1 || len(comments[0].Attachments) != 1 {
		t.Fatalf("persisted comments %#v", comments)
	}

	attachmentID := comment.Attachments[0].ID
	attachment := doJSON(t, s, http.MethodGet, "/api/issues/"+issue.Identifier+"/attachments/"+attachmentID, "")
	if attachment.Code != http.StatusOK || attachment.Body.String() != contents {
		t.Fatalf("download attachment %d %q", attachment.Code, attachment.Body.String())
	}
	if !strings.Contains(attachment.Header().Get("Content-Disposition"), "attachment") || attachment.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Fatalf("unsafe attachment headers: %#v", attachment.Header())
	}
	if err := s.store.DeleteIssue(issue.Identifier); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(s.store.Path(), "attachments", "issues", attachmentID)); !os.IsNotExist(err) {
		t.Fatalf("issue attachment was not cleaned up: %v", err)
	}
}

func TestIssueCommentCanBeEditedAndDeleted(t *testing.T) {
	s := testAPI(t)
	created := doJSON(t, s, http.MethodPost, "/api/issues", `{"title":"Comment issue"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create issue %d %s", created.Code, created.Body.String())
	}
	var issue store.Issue
	if err := json.Unmarshal(created.Body.Bytes(), &issue); err != nil {
		t.Fatal(err)
	}
	added := doJSON(t, s, http.MethodPost, "/api/issues/"+issue.Identifier+"/comments", `{"body":"original note"}`)
	if added.Code != http.StatusCreated {
		t.Fatalf("add comment %d %s", added.Code, added.Body.String())
	}
	var comment store.Comment
	if err := json.Unmarshal(added.Body.Bytes(), &comment); err != nil {
		t.Fatal(err)
	}

	updated := doJSON(t, s, http.MethodPatch, "/api/issues/"+issue.Identifier+"/comments/"+strconv.FormatInt(comment.ID, 10), `{"body":"edited **note**"}`)
	if updated.Code != http.StatusOK {
		t.Fatalf("edit comment %d %s", updated.Code, updated.Body.String())
	}
	var edited store.Comment
	if err := json.Unmarshal(updated.Body.Bytes(), &edited); err != nil {
		t.Fatal(err)
	}
	if edited.Body != "edited **note**" || edited.UpdatedAt == "" || edited.ID != comment.ID {
		t.Fatalf("edited comment %#v", edited)
	}

	deleted := doJSON(t, s, http.MethodDelete, "/api/issues/"+issue.Identifier+"/comments/"+strconv.FormatInt(comment.ID, 10), "")
	if deleted.Code != http.StatusNoContent {
		t.Fatalf("delete comment %d %s", deleted.Code, deleted.Body.String())
	}
	commentsResponse := doJSON(t, s, http.MethodGet, "/api/issues/"+issue.Identifier+"/comments", "")
	var comments []store.Comment
	if err := json.Unmarshal(commentsResponse.Body.Bytes(), &comments); err != nil {
		t.Fatal(err)
	}
	if len(comments) != 0 {
		t.Fatalf("deleted comment remains: %#v", comments)
	}

	activitiesResponse := doJSON(t, s, http.MethodGet, "/api/issues/"+issue.Identifier+"/activities", "")
	var activities []store.Activity
	if err := json.Unmarshal(activitiesResponse.Body.Bytes(), &activities); err != nil {
		t.Fatal(err)
	}
	seenEdited, seenDeleted := false, false
	for _, activity := range activities {
		seenEdited = seenEdited || activity.Action == "comment_edited"
		seenDeleted = seenDeleted || activity.Action == "comment_deleted"
	}
	if !seenEdited || !seenDeleted {
		t.Fatalf("comment activity missing: %#v", activities)
	}
}

func TestIssueAndCommentReactionsCanBeToggled(t *testing.T) {
	s := testAPI(t)
	created := doJSON(t, s, http.MethodPost, "/api/issues", `{"title":"Reaction issue"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create issue %d %s", created.Code, created.Body.String())
	}
	var issue store.Issue
	if err := json.Unmarshal(created.Body.Bytes(), &issue); err != nil {
		t.Fatal(err)
	}
	issuePath := "/api/issues/" + issue.Identifier
	issueReaction := doJSON(t, s, http.MethodPost, issuePath+"/reactions", `{"emoji":"👍"}`)
	if issueReaction.Code != http.StatusOK || !strings.Contains(issueReaction.Body.String(), `"reactions":["👍"]`) {
		t.Fatalf("add issue reaction %d %s", issueReaction.Code, issueReaction.Body.String())
	}
	if invalid := doJSON(t, s, http.MethodPost, issuePath+"/reactions", `{"emoji":"<script>"}`); invalid.Code != http.StatusBadRequest {
		t.Fatalf("invalid reaction status %d %s", invalid.Code, invalid.Body.String())
	}

	added := doJSON(t, s, http.MethodPost, issuePath+"/comments", `{"body":"A note"}`)
	if added.Code != http.StatusCreated {
		t.Fatalf("add comment %d %s", added.Code, added.Body.String())
	}
	var comment store.Comment
	if err := json.Unmarshal(added.Body.Bytes(), &comment); err != nil {
		t.Fatal(err)
	}
	commentReactionPath := issuePath + "/comments/" + strconv.FormatInt(comment.ID, 10) + "/reactions"
	commentReaction := doJSON(t, s, http.MethodPost, commentReactionPath, `{"emoji":"❤️"}`)
	if commentReaction.Code != http.StatusOK || !strings.Contains(commentReaction.Body.String(), `"reactions":["❤️"]`) {
		t.Fatalf("add comment reaction %d %s", commentReaction.Code, commentReaction.Body.String())
	}

	removed := doJSON(t, s, http.MethodPost, commentReactionPath, `{"emoji":"❤️"}`)
	if removed.Code != http.StatusOK || !strings.Contains(removed.Body.String(), `"reactions":[]`) {
		t.Fatalf("remove comment reaction %d %s", removed.Code, removed.Body.String())
	}
}

func TestPatchProjectHealth(t *testing.T) {
	s := testAPI(t)
	created := doJSON(t, s, http.MethodPost, "/api/projects", `{"name":"Launch","slug":"launch"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create project %d %s", created.Code, created.Body.String())
	}
	updated := doJSON(t, s, http.MethodPatch, "/api/projects/launch", `{"health":"at_risk"}`)
	if updated.Code != http.StatusOK || !strings.Contains(updated.Body.String(), `"health":"at_risk"`) {
		t.Fatalf("update health %d %s", updated.Code, updated.Body.String())
	}
	invalid := doJSON(t, s, http.MethodPatch, "/api/projects/launch", `{"health":"unknown"}`)
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("invalid health status %d %s", invalid.Code, invalid.Body.String())
	}
}

func TestProjectCompletedAtTracksCompletionTransitions(t *testing.T) {
	s := testAPI(t)
	created := doJSON(t, s, http.MethodPost, "/api/projects", `{"name":"Launch","slug":"launch","status":"started"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create project %d %s", created.Code, created.Body.String())
	}
	completed := doJSON(t, s, http.MethodPatch, "/api/projects/launch", `{"status":"completed"}`)
	if completed.Code != http.StatusOK {
		t.Fatalf("complete project %d %s", completed.Code, completed.Body.String())
	}
	var project struct {
		CompletedAt *string `json:"completedAt"`
	}
	if err := json.Unmarshal(completed.Body.Bytes(), &project); err != nil {
		t.Fatal(err)
	}
	if project.CompletedAt == nil || *project.CompletedAt == "" {
		t.Fatalf("completed date missing: %s", completed.Body.String())
	}
	reopened := doJSON(t, s, http.MethodPatch, "/api/projects/launch", `{"status":"started"}`)
	if reopened.Code != http.StatusOK {
		t.Fatalf("reopen project %d %s", reopened.Code, reopened.Body.String())
	}
	var reopenedProject struct {
		CompletedAt *string `json:"completedAt"`
	}
	if err := json.Unmarshal(reopened.Body.Bytes(), &reopenedProject); err != nil {
		t.Fatal(err)
	}
	if reopenedProject.CompletedAt != nil {
		t.Fatalf("reopened project kept completion date: %s", reopened.Body.String())
	}
}

func TestProjectDependencyAPIIsReciprocalAndRemovable(t *testing.T) {
	s := testAPI(t)
	for _, project := range []struct{ name, slug string }{
		{"Blocker", "blocker"}, {"Blocked", "blocked"},
	} {
		created := doJSON(t, s, http.MethodPost, "/api/projects", `{"name":"`+project.name+`","slug":"`+project.slug+`"}`)
		if created.Code != http.StatusCreated {
			t.Fatalf("create project %s: %d %s", project.slug, created.Code, created.Body.String())
		}
	}
	added := doJSON(t, s, http.MethodPost, "/api/projects/blocker/dependencies", `{"projectSlug":"blocked","kind":"blocks"}`)
	if added.Code != http.StatusCreated {
		t.Fatalf("add dependency %d %s", added.Code, added.Body.String())
	}
	blocked := doJSON(t, s, http.MethodGet, "/api/projects/blocked", "")
	if blocked.Code != http.StatusOK || !strings.Contains(blocked.Body.String(), `"projectSlug":"blocker","kind":"blocked_by"`) {
		t.Fatalf("reciprocal dependency %d %s", blocked.Code, blocked.Body.String())
	}
	duplicate := doJSON(t, s, http.MethodPost, "/api/projects/blocked/dependencies", `{"projectSlug":"blocker","kind":"blocked_by"}`)
	if duplicate.Code != http.StatusConflict {
		t.Fatalf("duplicate dependency status %d body %s", duplicate.Code, duplicate.Body.String())
	}
	removed := doJSON(t, s, http.MethodDelete, "/api/projects/blocker/dependencies/blocked", "")
	if removed.Code != http.StatusOK {
		t.Fatalf("remove dependency %d %s", removed.Code, removed.Body.String())
	}
	blocker := doJSON(t, s, http.MethodGet, "/api/projects/blocker", "")
	if blocker.Code != http.StatusOK || !strings.Contains(blocker.Body.String(), `"dependencies":[]`) {
		t.Fatalf("removed dependency %d %s", blocker.Code, blocker.Body.String())
	}
}

func TestConvertIssueToProjectPreservesIssue(t *testing.T) {
	s := testAPI(t)
	created := doJSON(t, s, http.MethodPost, "/api/issues", `{"title":"Release plan","body":"Context","status":"in_progress","priority":2}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create issue %d %s", created.Code, created.Body.String())
	}
	var source struct {
		Identifier string `json:"identifier"`
	}
	if err := json.Unmarshal(created.Body.Bytes(), &source); err != nil {
		t.Fatal(err)
	}
	converted := doJSON(t, s, http.MethodPost, "/api/issues/"+source.Identifier+"/projects", `{"name":"Release plan","description":"Context","status":"started","priority":2,"startDate":"2026-09-01"}`)
	if converted.Code != http.StatusCreated {
		t.Fatalf("convert issue %d %s", converted.Code, converted.Body.String())
	}
	var result struct {
		Project struct {
			Slug     string `json:"slug"`
			Priority int    `json:"priority"`
		} `json:"project"`
		Issue struct {
			Identifier string `json:"identifier"`
			Title      string `json:"title"`
			Body       string `json:"body"`
			Status     string `json:"status"`
			ProjectID  *int64 `json:"projectId"`
		} `json:"issue"`
	}
	if err := json.Unmarshal(converted.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if result.Project.Slug != "release-plan" || result.Project.Priority != 2 || result.Issue.Identifier != source.Identifier ||
		result.Issue.Title != "Release plan" || strings.TrimSpace(result.Issue.Body) != "Context" || result.Issue.Status != "in_progress" || result.Issue.ProjectID == nil {
		t.Fatalf("converted result %#v", result)
	}
}

func TestIssueTypeAndEstimateAPI(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "POST", "/api/issues", `{"title":"typed","type":"feature","estimate":8}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create %d %s", rec.Code, rec.Body.String())
	}
	var created struct {
		Identifier string `json:"identifier"`
		Type       string `json:"type"`
		Estimate   *int   `json:"estimate"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.Type != "feature" || created.Estimate == nil || *created.Estimate != 8 {
		t.Fatalf("created properties: %#v", created)
	}
	rec = doJSON(t, s, "GET", "/api/issues?type=feature&estimate=8", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("filter %d %s", rec.Code, rec.Body.String())
	}
	var filtered []struct {
		Identifier string `json:"identifier"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &filtered); err != nil {
		t.Fatal(err)
	}
	if len(filtered) != 1 || filtered[0].Identifier != created.Identifier {
		t.Fatalf("filtered issues: %#v", filtered)
	}

	rec = doJSON(t, s, "POST", "/api/views", `{"name":"Feature eight","slug":"feature-eight","type":"feature","estimate":8}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create view %d %s", rec.Code, rec.Body.String())
	}
	var savedView struct {
		Type     *string `json:"type"`
		Estimate *int    `json:"estimate"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &savedView); err != nil {
		t.Fatal(err)
	}
	if savedView.Type == nil || *savedView.Type != "feature" || savedView.Estimate == nil || *savedView.Estimate != 8 {
		t.Fatalf("saved filters: %#v", savedView)
	}
	rec = doJSON(t, s, "PATCH", "/api/views/feature-eight", `{"type":"","estimate":-1}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("clear view filters %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &savedView); err != nil {
		t.Fatal(err)
	}
	if savedView.Type != nil || savedView.Estimate != nil {
		t.Fatalf("cleared saved filters: %#v", savedView)
	}

	rec = doJSON(t, s, "PATCH", "/api/issues/"+created.Identifier, `{"type":"bug","estimate":13}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("patch %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.Type != "bug" || created.Estimate == nil || *created.Estimate != 13 {
		t.Fatalf("updated properties: %#v", created)
	}

	rec = doJSON(t, s, "PATCH", "/api/issues/"+created.Identifier, `{"type":null,"estimate":null}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("clear %d %s", rec.Code, rec.Body.String())
	}
	created = struct {
		Identifier string `json:"identifier"`
		Type       string `json:"type"`
		Estimate   *int   `json:"estimate"`
	}{}
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.Type != "" || created.Estimate != nil {
		t.Fatalf("cleared properties: %#v", created)
	}

	rec = doJSON(t, s, "PATCH", "/api/issues/"+created.Identifier, `{"type":"epic"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("invalid type code %d: %s", rec.Code, rec.Body.String())
	}
}

func TestIssueReminderAPI(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "POST", "/api/issues", `{"title":"reminded"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create %d %s", rec.Code, rec.Body.String())
	}
	var created struct {
		Identifier string `json:"identifier"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	rec = doJSON(t, s, "PATCH", "/api/issues/"+created.Identifier, `{"reminderAt":"2026-09-25T00:30:00+09:00"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("set reminder %d %s", rec.Code, rec.Body.String())
	}
	var updated struct {
		ReminderAt *string `json:"reminderAt"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &updated); err != nil {
		t.Fatal(err)
	}
	if updated.ReminderAt == nil || *updated.ReminderAt != "2026-09-24T15:30:00Z" {
		t.Fatalf("reminder %#v", updated.ReminderAt)
	}
	rec = doJSON(t, s, "PATCH", "/api/issues/"+created.Identifier, `{"reminderAt":"not-a-date"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("invalid reminder %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "PATCH", "/api/issues/"+created.Identifier, `{"reminderAt":null}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("clear reminder %d %s", rec.Code, rec.Body.String())
	}
	updated = struct {
		ReminderAt *string `json:"reminderAt"`
	}{}
	if err := json.Unmarshal(rec.Body.Bytes(), &updated); err != nil {
		t.Fatal(err)
	}
	if updated.ReminderAt != nil {
		t.Fatalf("reminder wasn't cleared: %#v", updated.ReminderAt)
	}
}

func TestProjectMilestoneAPIAssignsAndClearsIssueProperty(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "POST", "/api/projects", `{"name":"Release","slug":"release"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create project %d %s", rec.Code, rec.Body.String())
	}
	var project struct {
		ID   int64  `json:"id"`
		Slug string `json:"slug"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &project); err != nil {
		t.Fatal(err)
	}
	rec = doJSON(t, s, "POST", "/api/projects/release/milestones", `{"name":"Beta","targetDate":"2026-11-15"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create milestone %d %s", rec.Code, rec.Body.String())
	}
	var milestone store.Milestone
	if err := json.Unmarshal(rec.Body.Bytes(), &milestone); err != nil {
		t.Fatal(err)
	}
	rec = doJSON(t, s, "POST", "/api/issues", `{"title":"Ship beta","projectId":`+strconv.FormatInt(project.ID, 10)+`}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create issue %d %s", rec.Code, rec.Body.String())
	}
	var issue struct {
		Identifier string `json:"identifier"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &issue); err != nil {
		t.Fatal(err)
	}
	rec = doJSON(t, s, "PATCH", "/api/issues/"+issue.Identifier, `{"milestoneId":`+strconv.FormatInt(milestone.ID, 10)+`}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("assign milestone %d %s", rec.Code, rec.Body.String())
	}
	var updated struct {
		MilestoneID   *int64  `json:"milestoneId"`
		MilestoneName *string `json:"milestoneName"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &updated); err != nil {
		t.Fatal(err)
	}
	if updated.MilestoneID == nil || *updated.MilestoneID != milestone.ID || updated.MilestoneName == nil || *updated.MilestoneName != milestone.Name {
		t.Fatalf("assigned milestone %#v", updated)
	}
	rec = doJSON(t, s, "DELETE", "/api/projects/release/milestones/"+strconv.FormatInt(milestone.ID, 10), "")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete milestone %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "GET", "/api/issues/"+issue.Identifier, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("get issue %d %s", rec.Code, rec.Body.String())
	}
	updated = struct {
		MilestoneID   *int64  `json:"milestoneId"`
		MilestoneName *string `json:"milestoneName"`
	}{}
	if err := json.Unmarshal(rec.Body.Bytes(), &updated); err != nil {
		t.Fatal(err)
	}
	if updated.MilestoneID != nil || updated.MilestoneName != nil {
		t.Fatalf("milestone not cleared after delete: %#v", updated)
	}
}

func TestGetMissingIssue(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "GET", "/api/issues/ISS-99", "")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("code %d", rec.Code)
	}
}

func TestScenarioIssueCommentPage(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "POST", "/api/issues", `{"title":"First"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create issue %d %s", rec.Code, rec.Body.String())
	}
	var issue map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &issue); err != nil {
		t.Fatal(err)
	}
	id := issue["identifier"].(string)
	rec = doJSON(t, s, "POST", "/api/issues/"+id+"/comments", `{"body":"looks good"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("comment %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "PATCH", "/api/issues/"+id, `{"status":"in_progress"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "POST", "/api/pages", `{"title":"ADR 1","slug":"adr-1","body":"# Decision\n","status":"proposed"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("page %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "GET", "/api/issues/"+id+"/activities", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("activities %d", rec.Code)
	}
	var acts []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &acts); err != nil {
		t.Fatal(err)
	}
	if len(acts) < 2 {
		t.Fatalf("want created+commented+status, got %d", len(acts))
	}
}

func TestIssueLabelsDueAndDiagnostics(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "GET", "/api/diagnostics", "")
	if rec.Code != http.StatusOK || rec.Body.String() != "[]\n" {
		t.Fatalf("empty diagnostics %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "GET", "/api/labels", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("labels %d %s", rec.Code, rec.Body.String())
	}
	var labels []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &labels); err != nil {
		t.Fatal(err)
	}
	if len(labels) < 1 {
		t.Fatal("want seeded labels")
	}
	id := int64(labels[0]["id"].(float64))
	rec = doJSON(t, s, "POST", "/api/issues", `{"title":"tagged"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create %d %s", rec.Code, rec.Body.String())
	}
	var issue map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &issue); err != nil {
		t.Fatal(err)
	}
	ident := issue["identifier"].(string)
	body := `{"labelIds":[` + strconv.FormatInt(id, 10) + `],"dueDate":"2026-09-01"}`
	rec = doJSON(t, s, "PATCH", "/api/issues/"+ident, body)
	if rec.Code != http.StatusOK {
		t.Fatalf("patch %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &issue); err != nil {
		t.Fatal(err)
	}
	gotLabels, _ := issue["labels"].([]any)
	if len(gotLabels) != 1 {
		t.Fatalf("labels %#v", issue["labels"])
	}
	if issue["dueDate"] != "2026-09-01" {
		t.Fatalf("dueDate %#v", issue["dueDate"])
	}
}

func TestIssueExternalLinksAPI(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "POST", "/api/issues", `{"title":"resources"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create issue %d %s", rec.Code, rec.Body.String())
	}
	var issue map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &issue); err != nil {
		t.Fatal(err)
	}
	identifier := issue["identifier"].(string)
	rec = doJSON(t, s, "POST", "/api/issues/"+identifier+"/links", `{"url":"https://example.test/docs","title":"API guide","kind":"document"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("add link %d %s", rec.Code, rec.Body.String())
	}
	var link map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &link); err != nil {
		t.Fatal(err)
	}
	if link["url"] != "https://example.test/docs" || link["kind"] != "document" {
		t.Fatalf("link response %#v", link)
	}
	rec = doJSON(t, s, "GET", "/api/issues/"+identifier, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("get linked issue %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &issue); err != nil {
		t.Fatal(err)
	}
	links, ok := issue["externalLinks"].([]any)
	if !ok || len(links) != 1 {
		t.Fatalf("external links %#v", issue["externalLinks"])
	}
	linkID := int64(link["id"].(float64))
	rec = doJSON(t, s, "POST", "/api/issues/"+identifier+"/links", `{"url":"https://example.test/docs","kind":"document"}`)
	if rec.Code != http.StatusConflict {
		t.Fatalf("duplicate link %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "POST", "/api/issues/"+identifier+"/links", `{"url":"javascript:alert(1)"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("unsafe link %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "DELETE", "/api/issues/"+identifier+"/links/"+strconv.FormatInt(linkID, 10), "")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("remove link %d %s", rec.Code, rec.Body.String())
	}
}

func TestCycleResourcesAPI(t *testing.T) {
	s := testAPI(t)
	start := "2026-09-24T00:00:00Z"
	end := "2026-10-01T00:00:00Z"
	rec := doJSON(t, s, http.MethodPost, "/api/cycles", `{"startsAt":"`+start+`","endsAt":"`+end+`","status":"upcoming"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create cycle %d %s", rec.Code, rec.Body.String())
	}
	var cycle map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &cycle); err != nil {
		t.Fatal(err)
	}
	number := int(cycle["number"].(float64))
	path := "/api/cycles/" + strconv.Itoa(number) + "/links"
	rec = doJSON(t, s, http.MethodPost, path, `{"url":"https://example.test/cycle/brief","title":"Cycle brief","kind":"document"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("add cycle resource %d %s", rec.Code, rec.Body.String())
	}
	var resource map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &resource); err != nil {
		t.Fatal(err)
	}
	if resource["url"] != "https://example.test/cycle/brief" || resource["kind"] != "document" {
		t.Fatalf("resource response %#v", resource)
	}
	cyclePath := "/api/cycles/" + strconv.Itoa(number)
	rec = doJSON(t, s, http.MethodGet, cyclePath, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("get linked cycle %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &cycle); err != nil {
		t.Fatal(err)
	}
	resources, ok := cycle["resources"].([]any)
	if !ok || len(resources) != 1 {
		t.Fatalf("cycle resources %#v", cycle["resources"])
	}
	rec = doJSON(t, s, http.MethodPost, path, `{"url":"https://example.test/cycle/brief"}`)
	if rec.Code != http.StatusConflict {
		t.Fatalf("duplicate resource %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, http.MethodPost, path, `{"url":"javascript:alert(1)"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("unsafe resource %d %s", rec.Code, rec.Body.String())
	}
	resourceID := int64(resource["id"].(float64))
	rec = doJSON(t, s, http.MethodDelete, path+"/"+strconv.FormatInt(resourceID, 10), "")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("remove cycle resource %d %s", rec.Code, rec.Body.String())
	}
}

func TestIssueFavoriteAPI(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "POST", "/api/issues", `{"title":"favorite me"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create issue %d %s", rec.Code, rec.Body.String())
	}
	var issue map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &issue); err != nil {
		t.Fatal(err)
	}
	identifier := issue["identifier"].(string)
	rec = doJSON(t, s, "PATCH", "/api/issues/"+identifier, `{"isFavorite":true}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("favorite issue %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &issue); err != nil {
		t.Fatal(err)
	}
	if issue["isFavorite"] != true {
		t.Fatalf("favorite response %#v", issue["isFavorite"])
	}
	rec = doJSON(t, s, "GET", "/api/issues?favorite=true", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("favorite filter %d %s", rec.Code, rec.Body.String())
	}
	var favorites []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &favorites); err != nil {
		t.Fatal(err)
	}
	if len(favorites) != 1 || favorites[0]["identifier"] != identifier {
		t.Fatalf("favorite issues %#v", favorites)
	}
	rec = doJSON(t, s, "GET", "/api/issues?favorite=maybe", "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("invalid favorite filter %d %s", rec.Code, rec.Body.String())
	}
}

func TestIssueRelationsAPI(t *testing.T) {
	s := testAPI(t)
	create := func(title string) map[string]any {
		rec := doJSON(t, s, "POST", "/api/issues", `{"title":"`+title+`"}`)
		if rec.Code != http.StatusCreated {
			t.Fatalf("create issue %d %s", rec.Code, rec.Body.String())
		}
		var issue map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &issue); err != nil {
			t.Fatal(err)
		}
		return issue
	}
	first := create("relation source")
	second := create("relation target")
	firstID := first["identifier"].(string)
	secondID := second["identifier"].(string)
	body := `{"targetIdentifier":"` + secondID + `","kind":"blocks"}`
	rec := doJSON(t, s, "POST", "/api/issues/"+firstID+"/relations", body)
	if rec.Code != http.StatusCreated {
		t.Fatalf("add relation %d %s", rec.Code, rec.Body.String())
	}
	var relation map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &relation); err != nil {
		t.Fatal(err)
	}
	if relation["kind"] != "blocks" || relation["targetIdentifier"] != secondID {
		t.Fatalf("relation response %#v", relation)
	}
	rec = doJSON(t, s, "GET", "/api/issues/"+secondID, "")
	var target map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &target); err != nil {
		t.Fatal(err)
	}
	relations, ok := target["relations"].([]any)
	if !ok || len(relations) != 1 || relations[0].(map[string]any)["kind"] != "blockedBy" {
		t.Fatalf("reciprocal relations %#v", target["relations"])
	}
	for filter, want := range map[string]string{"blocking": firstID, "blocked": secondID} {
		filtered := doJSON(t, s, http.MethodGet, "/api/issues?relation="+filter, "")
		var issues []map[string]any
		if filtered.Code != http.StatusOK || json.Unmarshal(filtered.Body.Bytes(), &issues) != nil || len(issues) != 1 || issues[0]["identifier"] != want {
			t.Errorf("relation filter %q returned %d %s", filter, filtered.Code, filtered.Body.String())
		}
	}
	invalidFilter := doJSON(t, s, http.MethodGet, "/api/issues?relation=unknown", "")
	if invalidFilter.Code != http.StatusBadRequest {
		t.Fatalf("invalid relation filter %d %s", invalidFilter.Code, invalidFilter.Body.String())
	}
	rec = doJSON(t, s, "POST", "/api/issues/"+firstID+"/relations", body)
	if rec.Code != http.StatusConflict {
		t.Fatalf("duplicate relation %d %s", rec.Code, rec.Body.String())
	}
	relationID := int64(relation["id"].(float64))
	rec = doJSON(t, s, "DELETE", "/api/issues/"+firstID+"/relations/"+strconv.FormatInt(relationID, 10), "")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("remove relation %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "GET", "/api/issues/"+secondID, "")
	if err := json.Unmarshal(rec.Body.Bytes(), &target); err != nil {
		t.Fatal(err)
	}
	if got := target["relations"].([]any); len(got) != 0 {
		t.Fatalf("relations after removal %#v", got)
	}
}

func TestIssueParentAndListDepth(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "POST", "/api/issues", `{"title":"root"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create parent %d %s", rec.Code, rec.Body.String())
	}
	var parent map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &parent); err != nil {
		t.Fatal(err)
	}
	parentID := int64(parent["id"].(float64))
	body := `{"title":"leaf","parentId":` + strconv.FormatInt(parentID, 10) + `}`
	rec = doJSON(t, s, "POST", "/api/issues", body)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create child %d %s", rec.Code, rec.Body.String())
	}
	var child map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &child); err != nil {
		t.Fatal(err)
	}
	if child["parentIdentifier"] != "ISS-1" {
		t.Fatalf("parentIdentifier %#v", child["parentIdentifier"])
	}
	rec = doJSON(t, s, "GET", "/api/issues", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("list %d %s", rec.Code, rec.Body.String())
	}
	var issues []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &issues); err != nil {
		t.Fatal(err)
	}
	if len(issues) != 2 {
		t.Fatalf("want 2 issues, got %d", len(issues))
	}
	if issues[0]["identifier"] != "ISS-1" || issues[1]["identifier"] != "ISS-2" {
		t.Fatalf("tree order %#v %#v", issues[0]["identifier"], issues[1]["identifier"])
	}
	if issues[1]["depth"].(float64) != 1 {
		t.Fatalf("child depth %#v", issues[1]["depth"])
	}
}

func TestViewCRUDAndIssueFilter(t *testing.T) {
	s := testAPI(t)
	if rec := doJSON(t, s, "POST", "/api/issues", `{"title":"open","status":"todo"}`); rec.Code != http.StatusCreated {
		t.Fatalf("todo issue %d %s", rec.Code, rec.Body.String())
	}
	if rec := doJSON(t, s, "POST", "/api/issues", `{"title":"closed","status":"done"}`); rec.Code != http.StatusCreated {
		t.Fatalf("done issue %d %s", rec.Code, rec.Body.String())
	}
	rec := doJSON(t, s, "POST", "/api/views", `{"name":"Open","slug":"open","display":"list","groupBy":"status","subGroupBy":"priority","orderBy":"title","direction":"desc","completedIssues":"pastWeek","showSubIssues":false,"nestedSubIssues":"showAll","showEmptyGroups":true,"displayProperties":["id","cycle"],"status":"todo"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create view %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "GET", "/api/views/open", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("get view %d %s", rec.Code, rec.Body.String())
	}
	var view map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &view); err != nil {
		t.Fatal(err)
	}
	if view["name"] != "Open" || view["status"] != "todo" || view["groupBy"] != "status" || view["subGroupBy"] != "priority" || view["orderBy"] != "title" || view["direction"] != "desc" || view["completedIssues"] != "pastWeek" || view["showSubIssues"] != false || view["nestedSubIssues"] != "showAll" || view["showEmptyGroups"] != true {
		t.Fatalf("view %#v", view)
	}
	if got, ok := view["displayProperties"].([]any); !ok || len(got) != 2 || got[0] != "id" || got[1] != "cycle" {
		t.Fatalf("view display properties %#v", view["displayProperties"])
	}
	rec = doJSON(t, s, "GET", "/api/issues?status=todo", "")
	var issues []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &issues); err != nil {
		t.Fatal(err)
	}
	if len(issues) != 1 || issues[0]["title"] != "open" {
		t.Fatalf("filtered %#v", issues)
	}
	rec = doJSON(t, s, "PATCH", "/api/views/open", `{"name":"Todos","display":"board","groupBy":"cycle","subGroupBy":"none","orderBy":"updated","direction":"asc","completedIssues":"none","showSubIssues":true,"nestedSubIssues":"showMatching","showEmptyGroups":false,"displayProperties":["status","estimate"]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("patch view %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "GET", "/api/views", "")
	var views []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &views); err != nil {
		t.Fatal(err)
	}
	if len(views) != 1 || views[0]["name"] != "Todos" || views[0]["display"] != "board" || views[0]["groupBy"] != "cycle" || views[0]["orderBy"] != "updated" || views[0]["direction"] != "asc" || views[0]["completedIssues"] != "none" || views[0]["showSubIssues"] != true || views[0]["showEmptyGroups"] != false {
		t.Fatalf("list views %#v", views)
	}
	if got, ok := views[0]["displayProperties"].([]any); !ok || len(got) != 2 || got[0] != "status" || got[1] != "estimate" {
		t.Fatalf("patched display properties %#v", views[0]["displayProperties"])
	}
	rec = doJSON(t, s, "DELETE", "/api/views/open", "")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete view %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "GET", "/api/views/open", "")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("deleted view %d", rec.Code)
	}
}

func TestListIssuesPriorityQuery(t *testing.T) {
	s := testAPI(t)
	if rec := doJSON(t, s, "POST", "/api/issues", `{"title":"hot","priority":1}`); rec.Code != http.StatusCreated {
		t.Fatalf("hot %d %s", rec.Code, rec.Body.String())
	}
	if rec := doJSON(t, s, "POST", "/api/issues", `{"title":"cold","priority":4}`); rec.Code != http.StatusCreated {
		t.Fatalf("cold %d %s", rec.Code, rec.Body.String())
	}
	rec := doJSON(t, s, "GET", "/api/issues?priority=1", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("list %d %s", rec.Code, rec.Body.String())
	}
	var issues []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &issues); err != nil {
		t.Fatal(err)
	}
	if len(issues) != 1 || issues[0]["title"] != "hot" {
		t.Fatalf("got %#v", issues)
	}
}

func TestIssueMilestoneNameFilterAndSavedViewAPI(t *testing.T) {
	s := testAPI(t)
	projectResponse := doJSON(t, s, "POST", "/api/projects", `{"name":"Release","slug":"release"}`)
	if projectResponse.Code != http.StatusCreated {
		t.Fatalf("project %d %s", projectResponse.Code, projectResponse.Body.String())
	}
	var project store.Project
	if err := json.Unmarshal(projectResponse.Body.Bytes(), &project); err != nil {
		t.Fatal(err)
	}
	milestoneResponse := doJSON(t, s, "POST", "/api/projects/release/milestones", `{"name":"Beta rollout"}`)
	if milestoneResponse.Code != http.StatusCreated {
		t.Fatalf("milestone %d %s", milestoneResponse.Code, milestoneResponse.Body.String())
	}
	var milestone store.Milestone
	if err := json.Unmarshal(milestoneResponse.Body.Bytes(), &milestone); err != nil {
		t.Fatal(err)
	}
	issueResponse := doJSON(t, s, "POST", "/api/issues", `{"title":"Ship beta","projectId":`+strconv.FormatInt(project.ID, 10)+`}`)
	if issueResponse.Code != http.StatusCreated {
		t.Fatalf("issue %d %s", issueResponse.Code, issueResponse.Body.String())
	}
	var issue store.Issue
	if err := json.Unmarshal(issueResponse.Body.Bytes(), &issue); err != nil {
		t.Fatal(err)
	}
	assign := doJSON(t, s, "PATCH", "/api/issues/"+issue.Identifier, `{"milestoneId":`+strconv.FormatInt(milestone.ID, 10)+`}`)
	if assign.Code != http.StatusOK {
		t.Fatalf("assign milestone %d %s", assign.Code, assign.Body.String())
	}
	filtered := doJSON(t, s, "GET", "/api/issues?milestoneName=beta+roll", "")
	if filtered.Code != http.StatusOK {
		t.Fatalf("filter issues %d %s", filtered.Code, filtered.Body.String())
	}
	var issues []store.Issue
	if err := json.Unmarshal(filtered.Body.Bytes(), &issues); err != nil {
		t.Fatal(err)
	}
	if len(issues) != 1 || issues[0].Identifier != issue.Identifier {
		t.Fatalf("milestone-filtered issues %#v", issues)
	}
	createdView := doJSON(t, s, "POST", "/api/views", `{"name":"Beta rollout","slug":"beta-rollout","milestoneName":"Beta roll"}`)
	if createdView.Code != http.StatusCreated {
		t.Fatalf("create view %d %s", createdView.Code, createdView.Body.String())
	}
	var view store.View
	if err := json.Unmarshal(createdView.Body.Bytes(), &view); err != nil {
		t.Fatal(err)
	}
	if view.MilestoneName == nil || *view.MilestoneName != "Beta roll" {
		t.Fatalf("saved milestone filter %#v", view)
	}
}

func TestUnknownJSONRejected(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "POST", "/api/issues", `{"title":"x","assignee":"me"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("unknown field %d %s", rec.Code, rec.Body.String())
	}
}

func TestLivedInWorkspaceHTTP(t *testing.T) {
	s := testAPI(t)
	start := time.Now().UTC().Format(time.RFC3339)
	end := time.Now().UTC().Add(7 * 24 * time.Hour).Format(time.RFC3339)
	rec := doJSON(t, s, "POST", "/api/projects", `{"name":"Atlas","slug":"atlas"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("project %d %s", rec.Code, rec.Body.String())
	}
	var project map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &project); err != nil {
		t.Fatal(err)
	}
	rec = doJSON(t, s, "POST", "/api/cycles", `{"startsAt":"`+start+`","endsAt":"`+end+`","status":"active"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("cycle %d %s", rec.Code, rec.Body.String())
	}
	var cycle map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &cycle); err != nil {
		t.Fatal(err)
	}
	rec = doJSON(t, s, "GET", "/api/labels", "")
	var labels []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &labels); err != nil {
		t.Fatal(err)
	}
	labelID := int64(labels[0]["id"].(float64))
	body := `{"title":"Ship","status":"todo","priority":1,"projectId":` + strconv.FormatInt(int64(project["id"].(float64)), 10) + `,"cycleId":` + strconv.FormatInt(int64(cycle["id"].(float64)), 10) + `,"labelIds":[` + strconv.FormatInt(labelID, 10) + `]}`
	rec = doJSON(t, s, "POST", "/api/issues", body)
	if rec.Code != http.StatusCreated {
		t.Fatalf("epic %d %s", rec.Code, rec.Body.String())
	}
	var epic map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &epic); err != nil {
		t.Fatal(err)
	}
	childBody := `{"title":"Docs","parentId":` + strconv.FormatInt(int64(epic["id"].(float64)), 10) + `,"status":"todo","projectId":` + strconv.FormatInt(int64(project["id"].(float64)), 10) + `}`
	rec = doJSON(t, s, "POST", "/api/issues", childBody)
	if rec.Code != http.StatusCreated {
		t.Fatalf("child %d %s", rec.Code, rec.Body.String())
	}
	if rec := doJSON(t, s, "POST", "/api/issues", `{"title":"Old","status":"done"}`); rec.Code != http.StatusCreated {
		t.Fatalf("done %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "POST", "/api/views", `{"name":"Atlas todo","slug":"atlas-todo","display":"list","status":"todo","project":"atlas","dateField":"createdAt","dateRange":"weekAgo","projectStatus":"planned","projectPriority":0}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("view %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "GET", "/api/views/atlas-todo", "")
	var savedView struct {
		ProjectStatus   *string `json:"projectStatus"`
		ProjectPriority *int    `json:"projectPriority"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &savedView); err != nil {
		t.Fatal(err)
	}
	if savedView.ProjectStatus == nil || *savedView.ProjectStatus != "planned" || savedView.ProjectPriority == nil || *savedView.ProjectPriority != 0 {
		t.Fatalf("saved project filters %#v", savedView)
	}
	rec = doJSON(t, s, "GET", "/api/issues", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("list all %d %s", rec.Code, rec.Body.String())
	}
	var issues []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &issues); err != nil {
		t.Fatal(err)
	}
	if len(issues) != 3 {
		t.Fatalf("all issues %#v", issues)
	}
	rec = doJSON(t, s, "GET", "/api/issues?status=todo&project=atlas", "")
	if err := json.Unmarshal(rec.Body.Bytes(), &issues); err != nil {
		t.Fatal(err)
	}
	if len(issues) != 2 {
		t.Fatalf("atlas todo %#v", issues)
	}
	rec = doJSON(t, s, "GET", "/api/issues?projectStatus=planned&projectPriority=0", "")
	if err := json.Unmarshal(rec.Body.Bytes(), &issues); err != nil {
		t.Fatal(err)
	}
	if len(issues) != 2 {
		t.Fatalf("project property filters %#v", issues)
	}
	if issues[0]["identifier"] != "ISS-1" || issues[1]["depth"].(float64) != 1 {
		t.Fatalf("tree %#v", issues)
	}
	rec = doJSON(t, s, "GET", "/api/issues?content=Ship", "")
	if err := json.Unmarshal(rec.Body.Bytes(), &issues); err != nil {
		t.Fatal(err)
	}
	if len(issues) != 1 || issues[0]["title"] != "Ship" {
		t.Fatalf("content filter %#v", issues)
	}
	rec = doJSON(t, s, "GET", "/api/issues?dateField=createdAt&dateRange=weekAgo&dateAsOf=2026-09-25", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("date filter %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "GET", "/api/issues?labels="+labels[0]["name"].(string), "")
	if err := json.Unmarshal(rec.Body.Bytes(), &issues); err != nil {
		t.Fatal(err)
	}
	if len(issues) != 1 || issues[0]["title"] != "Ship" {
		t.Fatalf("label filter %#v", issues)
	}
	rec = doJSON(t, s, "GET", "/api/search?q=atlas", "")
	var hits []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &hits); err != nil {
		t.Fatal(err)
	}
	kinds := map[string]bool{}
	for _, h := range hits {
		kinds[h["kind"].(string)] = true
	}
	if !kinds["project"] || !kinds["view"] {
		t.Fatalf("search kinds %#v", hits)
	}
	rec = doJSON(t, s, "GET", "/api/views", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("views %d %s", rec.Code, rec.Body.String())
	}
}

func TestListViewsEmptyJSONArray(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "GET", "/api/views", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("code %d %s", rec.Code, rec.Body.String())
	}
	if rec.Body.String() != "[]\n" {
		t.Fatalf("empty views want [], got %s", rec.Body.String())
	}
}

func TestCreateCycle(t *testing.T) {
	s := testAPI(t)
	startTime := time.Now().UTC()
	start := startTime.Format(time.RFC3339)
	end := startTime.Add(7 * 24 * time.Hour).Format(time.RFC3339)
	body := `{"startsAt":"` + start + `","endsAt":"` + end + `"}`
	rec := doJSON(t, s, "POST", "/api/cycles", body)
	if rec.Code != http.StatusCreated {
		t.Fatalf("code %d %s", rec.Code, rec.Body.String())
	}
	var cycle struct {
		Number int    `json:"number"`
		Name   string `json:"name"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &cycle); err != nil {
		t.Fatal(err)
	}
	if cycle.Number != 1 || cycle.Name != "Cycle 1" {
		t.Fatalf("default cycle values %#v", cycle)
	}

	updated := doJSON(t, s, http.MethodPatch, "/api/cycles/1", `{"name":"Planning","description":"Release preparation","isFavorite":true}`)
	if updated.Code != http.StatusOK {
		t.Fatalf("update cycle %d %s", updated.Code, updated.Body.String())
	}
	var saved map[string]any
	if err := json.Unmarshal(updated.Body.Bytes(), &saved); err != nil {
		t.Fatal(err)
	}
	if saved["name"] != "Planning" || saved["description"] != "Release preparation" || saved["isFavorite"] != true {
		t.Fatalf("updated cycle %#v", saved)
	}
	invalid := doJSON(t, s, http.MethodPatch, "/api/cycles/1", `{"endsAt":"`+start+`"}`)
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("invalid cycle dates %d %s", invalid.Code, invalid.Body.String())
	}
}

func TestLabelTimezoneSortOrderAndDeletes(t *testing.T) {
	s := testAPI(t)

	rec := doJSON(t, s, "PATCH", "/api/workspace", `{"timezone":"Asia/Tokyo"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("timezone %d %s", rec.Code, rec.Body.String())
	}
	var ws map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &ws); err != nil {
		t.Fatal(err)
	}
	if ws["timezone"] != "Asia/Tokyo" {
		t.Fatalf("timezone %#v", ws["timezone"])
	}

	rec = doJSON(t, s, "POST", "/api/labels", `{"name":"Harbor","color":"#6b9bd1"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("label %d %s", rec.Code, rec.Body.String())
	}

	rec = doJSON(t, s, "POST", "/api/projects", `{"name":"Dock","slug":"dock"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("project %d %s", rec.Code, rec.Body.String())
	}

	rec = doJSON(t, s, "POST", "/api/issues", `{"title":"Move me","status":"todo"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("issue %d %s", rec.Code, rec.Body.String())
	}
	var issue map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &issue); err != nil {
		t.Fatal(err)
	}
	id := issue["identifier"].(string)
	rec = doJSON(t, s, "PATCH", "/api/issues/"+id, `{"status":"in_progress","sortOrder":4.5}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("sort %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &issue); err != nil {
		t.Fatal(err)
	}
	if issue["status"] != "in_progress" {
		t.Fatalf("status %#v", issue["status"])
	}
	if issue["sortOrder"] != 4.5 {
		t.Fatalf("sortOrder %#v", issue["sortOrder"])
	}
	rec = doJSON(t, s, "DELETE", "/api/issues/"+id, "")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete issue %d %s", rec.Code, rec.Body.String())
	}

	rec = doJSON(t, s, "POST", "/api/views", `{"name":"Todo","slug":"todo","display":"list","status":"todo"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("view %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "DELETE", "/api/views/todo", "")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete view %d %s", rec.Code, rec.Body.String())
	}

	rec = doJSON(t, s, "POST", "/api/pages", `{"title":"ADR","slug":"adr-1"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("page %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "DELETE", "/api/pages/adr-1", "")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete page %d %s", rec.Code, rec.Body.String())
	}

	rec = doJSON(t, s, "DELETE", "/api/projects/dock", "")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete project %d %s", rec.Code, rec.Body.String())
	}
}

func TestWorkspaceHasNoSyncMetadata(t *testing.T) {
	s := testAPI(t)
	rec := doJSON(t, s, "GET", "/api/workspace", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("code %d %s", rec.Code, rec.Body.String())
	}
	var ws map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &ws); err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{"dirty", "ghcrRef", "lastPushedAt", "lastPushedDigest"} {
		if _, ok := ws[key]; ok {
			t.Fatalf("unexpected sync field %s", key)
		}
	}
	rec = doJSON(t, s, "POST", "/api/issues", `{"title":"Work"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("issue %d %s", rec.Code, rec.Body.String())
	}
	rec = doJSON(t, s, "GET", "/api/workspace", "")
	if err := json.Unmarshal(rec.Body.Bytes(), &ws); err != nil {
		t.Fatal(err)
	}
	if _, ok := ws["dirty"]; ok {
		t.Fatalf("unexpected dirty field after creating issue")
	}
}

func TestOriginAllowedViaForwardedHost(t *testing.T) {
	s := testAPI(t)
	req := httptest.NewRequest("PATCH", "http://127.0.0.1:5108/api/workspace", strings.NewReader(`{"name":"dev"}`))
	req.Header.Set("Origin", "http://127.0.0.1:5182")
	req.Header.Set("X-Forwarded-Host", "127.0.0.1:5182")
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	s.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("code %d body %s", rec.Code, rec.Body.String())
	}
}

func TestOriginDeniedWithoutForwardedHost(t *testing.T) {
	s := testAPI(t)
	req := httptest.NewRequest("PATCH", "http://127.0.0.1:5108/api/workspace", strings.NewReader(`{"name":"dev"}`))
	req.Header.Set("Origin", "http://127.0.0.1:5182")
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	s.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("code %d body %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "origin denied") {
		t.Fatalf("body %s", rec.Body.String())
	}
}
