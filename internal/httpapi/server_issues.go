package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/yashikota/kotowari/internal/domain"
	"github.com/yashikota/kotowari/internal/store"
)

func (s *Server) listIssues(w http.ResponseWriter, r *http.Request) {
	if err := s.store.ProcessDueRecurringIssues(); err != nil {
		writeError(w, err)
		return
	}
	q := r.URL.Query()
	linkSources := []string(nil)
	if value := q.Get("linkSources"); value != "" {
		linkSources = strings.Split(value, ",")
	}
	templateSlugs := []string(nil)
	if value := q.Get("templateSlugs"); value != "" {
		templateSlugs = strings.Split(value, ",")
	}
	statuses := []string(nil)
	if value := q.Get("statuses"); value != "" {
		statuses = strings.Split(value, ",")
	}
	priorities := []int(nil)
	if value := q.Get("priorities"); value != "" {
		for _, raw := range strings.Split(value, ",") {
			priority, err := strconv.Atoi(raw)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid priorities filter"})
				return
			}
			priorities = append(priorities, priority)
		}
	}
	estimates := []int(nil)
	if value := q.Get("estimates"); value != "" {
		for _, raw := range strings.Split(value, ",") {
			estimate, err := strconv.Atoi(raw)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid estimates filter"})
				return
			}
			estimates = append(estimates, estimate)
		}
	}
	f := store.IssueFilter{Status: q.Get("status"), Statuses: statuses, Assignee: q.Get("assignee"), ProjectSlug: q.Get("project"), Type: q.Get("type"), DueDate: q.Get("dueDate"), DueDateAsOf: q.Get("asOf"), Relation: q.Get("relation"), LinkSources: linkSources, TemplateSlugs: templateSlugs, Content: q.Get("content"), MilestoneName: q.Get("milestoneName"), DateField: q.Get("dateField"), DateRange: q.Get("dateRange"), DateAsOf: q.Get("dateAsOf"), ProjectStatus: q.Get("projectStatus"), Priorities: priorities, Estimates: estimates, LabelOperator: q.Get("labelOperator")}
	if f.Assignee != "" && f.Assignee != "none" && !domain.ValidIssueAssignee(f.Assignee) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid assignee filter"})
		return
	}
	if archived := q.Get("archived"); archived != "" {
		value, err := strconv.ParseBool(archived)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid archived filter"})
			return
		}
		f.Archived = &value
	}
	if raw := q.Get("projectLabels"); raw != "" {
		for _, label := range strings.Split(raw, ",") {
			if label = strings.TrimSpace(label); label != "" {
				f.ProjectLabels = append(f.ProjectLabels, label)
			}
		}
	}
	if raw := q.Get("addedToCycle"); raw != "" {
		for _, phase := range strings.Split(raw, ",") {
			if phase = strings.TrimSpace(phase); phase != "" {
				f.AddedToCycle = append(f.AddedToCycle, phase)
			}
		}
	}
	if !domain.ValidDueDateFilter(f.DueDate) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid due date filter"})
		return
	}
	if !domain.ValidIssueRelationFilter(f.Relation) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid issue relation filter"})
		return
	}
	if f.DueDateAsOf != "" && !domain.ValidDate(f.DueDateAsOf) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid date filter anchor"})
		return
	}
	if f.Type != "" && !domain.ValidIssueType(f.Type) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid type"})
		return
	}
	if c := q.Get("cycle"); c != "" {
		n, err := strconv.Atoi(c)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid cycle"})
			return
		}
		f.CycleNumber = n
	}
	if priority := q.Get("projectPriority"); priority != "" {
		n, err := strconv.Atoi(priority)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid project priority"})
			return
		}
		f.ProjectPriority = &n
	}
	if p := q.Get("priority"); p != "" {
		n, err := strconv.Atoi(p)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid priority"})
			return
		}
		f.Priority = &n
	}
	if estimate := q.Get("estimate"); estimate != "" {
		n, err := strconv.Atoi(estimate)
		if err != nil || !domain.ValidEstimate(&n) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid estimate"})
			return
		}
		f.Estimate = &n
	}
	if raw := q.Get("noEstimate"); raw != "" {
		value, err := strconv.ParseBool(raw)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid no-estimate filter"})
			return
		}
		f.NoEstimate = value
	}
	if favorite := q.Get("favorite"); favorite != "" {
		value, err := strconv.ParseBool(favorite)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid favorite"})
			return
		}
		f.IsFavorite = &value
	}
	if labels := q.Get("labels"); labels != "" {
		for _, name := range strings.Split(labels, ",") {
			name = strings.TrimSpace(name)
			if name != "" {
				f.Labels = append(f.Labels, name)
			}
		}
	}
	out, err := s.store.ListIssues(f)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) createIssue(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Title          string                           `json:"title"`
		Body           string                           `json:"body"`
		Status         string                           `json:"status"`
		WorkflowStatus string                           `json:"workflowStatus"`
		Assignee       string                           `json:"assignee"`
		Type           string                           `json:"type"`
		Priority       int                              `json:"priority"`
		Estimate       *int                             `json:"estimate"`
		ProjectID      *int64                           `json:"projectId"`
		MilestoneID    *int64                           `json:"milestoneId"`
		CycleID        *int64                           `json:"cycleId"`
		ParentID       *int64                           `json:"parentId"`
		DueDate        *string                          `json:"dueDate"`
		LabelIDs       []int64                          `json:"labelIds"`
		Links          []store.CreateIssueLinkInput     `json:"links"`
		TemplateSlug   string                           `json:"templateSlug"`
		Recurring      *store.CreateRecurringIssueInput `json:"recurring"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	issueInput := store.CreateIssueInput{
		Title: in.Title, Body: in.Body, Status: in.Status, WorkflowStatus: in.WorkflowStatus, Assignee: in.Assignee, Type: in.Type, Priority: in.Priority, Estimate: in.Estimate,
		ProjectID: in.ProjectID, MilestoneID: in.MilestoneID, CycleID: in.CycleID, ParentID: in.ParentID, DueDate: in.DueDate, LabelIDs: in.LabelIDs, ExternalLinks: in.Links, TemplateSlug: in.TemplateSlug,
	}
	if in.Recurring != nil {
		schedule, err := s.store.CreateRecurringIssueFromInput(issueInput, *in.Recurring)
		if err != nil {
			writeError(w, err)
			return
		}
		out, err := s.store.GetIssue(schedule.LastIssueIdentifier)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, out)
		return
	}
	out, err := s.store.CreateIssue(issueInput)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) getIssue(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.GetIssue(r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) patchIssue(w http.ResponseWriter, r *http.Request) {
	raw := map[string]json.RawMessage{}
	if err := decodeJSON(r, &raw); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	in := store.PatchIssueInput{}
	if v, ok := raw["title"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid title"})
			return
		}
		in.Title = &s
	}
	if v, ok := raw["body"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
			return
		}
		in.Body = &s
	}
	if v, ok := raw["status"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid status"})
			return
		}
		in.Status = &s
	}
	if v, ok := raw["workflowStatus"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid workflow status"})
			return
		}
		in.WorkflowStatus = &s
	}
	if v, ok := raw["assignee"]; ok {
		assignee := ""
		if string(v) != "null" {
			if err := json.Unmarshal(v, &assignee); err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid assignee"})
				return
			}
		}
		in.Assignee = &assignee
	}
	if v, ok := raw["type"]; ok {
		var issueType string
		if string(v) != "null" {
			if err := json.Unmarshal(v, &issueType); err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid type"})
				return
			}
		}
		in.Type = &issueType
	}
	if v, ok := raw["priority"]; ok {
		var n int
		if err := json.Unmarshal(v, &n); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid priority"})
			return
		}
		in.Priority = &n
	}
	if v, ok := raw["estimate"]; ok {
		estimate, err := unmarshalOptInt(v)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid estimate"})
			return
		}
		in.Estimate = &estimate
	}
	if v, ok := raw["projectId"]; ok {
		id, err := unmarshalOptInt64(v)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid projectId"})
			return
		}
		in.ProjectID = &id
	}
	if v, ok := raw["milestoneId"]; ok {
		id, err := unmarshalOptInt64(v)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid milestoneId"})
			return
		}
		in.MilestoneID = &id
	}
	if v, ok := raw["cycleId"]; ok {
		id, err := unmarshalOptInt64(v)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid cycleId"})
			return
		}
		in.CycleID = &id
	}
	if v, ok := raw["parentId"]; ok {
		id, err := unmarshalOptInt64(v)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid parentId"})
			return
		}
		in.ParentID = &id
	}
	if v, ok := raw["dueDate"]; ok {
		d, err := unmarshalOptString(v)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid dueDate"})
			return
		}
		in.DueDate = &d
	}
	if v, ok := raw["reminderAt"]; ok {
		reminder, err := unmarshalOptString(v)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid reminderAt"})
			return
		}
		in.ReminderAt = &reminder
	}
	if v, ok := raw["labelIds"]; ok {
		var ids []int64
		if err := json.Unmarshal(v, &ids); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid labelIds"})
			return
		}
		in.LabelIDs = &ids
	}
	if v, ok := raw["sortOrder"]; ok {
		var n float64
		if err := json.Unmarshal(v, &n); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid sortOrder"})
			return
		}
		in.SortOrder = &n
	}
	if v, ok := raw["isFavorite"]; ok {
		var favorite bool
		if err := json.Unmarshal(v, &favorite); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid favorite"})
			return
		}
		in.IsFavorite = &favorite
	}
	if v, ok := raw["archived"]; ok {
		var archived bool
		if err := json.Unmarshal(v, &archived); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid archived"})
			return
		}
		in.Archived = &archived
	}
	out, err := s.store.UpdateIssue(r.PathValue("id"), in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) deleteIssue(w http.ResponseWriter, r *http.Request) {
	if err := s.store.DeleteIssue(r.PathValue("id")); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) listComments(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.ListComments(r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) addComment(w http.ResponseWriter, r *http.Request) {
	if strings.HasPrefix(strings.ToLower(r.Header.Get("Content-Type")), "multipart/form-data") {
		s.addCommentWithFiles(w, r)
		return
	}
	var in struct {
		Body string `json:"body"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.AddComment(r.PathValue("id"), in.Body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) patchComment(w http.ResponseWriter, r *http.Request) {
	commentID, err := strconv.ParseInt(r.PathValue("commentId"), 10, 64)
	if err != nil || commentID < 1 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid comment id"})
		return
	}
	var in struct {
		Body string `json:"body"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.UpdateComment(r.PathValue("id"), commentID, in.Body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) deleteComment(w http.ResponseWriter, r *http.Request) {
	commentID, err := strconv.ParseInt(r.PathValue("commentId"), 10, 64)
	if err != nil || commentID < 1 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid comment id"})
		return
	}
	if err := s.store.DeleteComment(r.PathValue("id"), commentID); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) toggleIssueReaction(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Emoji string `json:"emoji"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.ToggleIssueReaction(r.PathValue("id"), in.Emoji)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) toggleCommentReaction(w http.ResponseWriter, r *http.Request) {
	commentID, err := strconv.ParseInt(r.PathValue("commentId"), 10, 64)
	if err != nil || commentID < 1 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid comment id"})
		return
	}
	var in struct {
		Emoji string `json:"emoji"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.ToggleCommentReaction(r.PathValue("id"), commentID, in.Emoji)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) listActivities(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.ListActivities(r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) listInboxActivities(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.ListRecentIssueActivities(200)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}
