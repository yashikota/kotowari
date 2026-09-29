package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/yashikota/kotowari/internal/model"
)

func (s *Server) patchIssue(w http.ResponseWriter, r *http.Request) {
	raw := map[string]json.RawMessage{}
	if err := decodeJSON(r, &raw); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	in := model.PatchIssueInput{}
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
