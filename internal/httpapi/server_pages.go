package httpapi

import (
	"encoding/json"
	"net/http"
)

func (s *Server) listPages(w http.ResponseWriter, _ *http.Request) {
	out, err := s.store.ListPages()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) createPage(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Title     string   `json:"title"`
		Slug      string   `json:"slug"`
		Body      string   `json:"body"`
		Status    string   `json:"status"`
		ParentID  *int64   `json:"parentId"`
		ProjectID *int64   `json:"projectId"`
		Date      *string  `json:"date"`
		Tags      []string `json:"tags"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.CreatePage(in.Title, in.Slug, in.Body, in.Status, in.ParentID, in.ProjectID, in.Date, in.Tags)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) getPage(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.GetPage(r.PathValue("slug"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) patchPage(w http.ResponseWriter, r *http.Request) {
	raw := map[string]json.RawMessage{}
	if err := decodeJSON(r, &raw); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	var title, body, status *string
	var parentID, projectID **int64
	var date **string
	var tags *[]string
	if v, ok := raw["title"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid title"})
			return
		}
		title = &s
	}
	if v, ok := raw["body"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
			return
		}
		body = &s
	}
	if v, ok := raw["status"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid status"})
			return
		}
		status = &s
	}
	if v, ok := raw["parentId"]; ok {
		id, err := unmarshalOptInt64(v)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid parentId"})
			return
		}
		parentID = &id
	}
	if v, ok := raw["projectId"]; ok {
		id, err := unmarshalOptInt64(v)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid projectId"})
			return
		}
		projectID = &id
	}
	if v, ok := raw["date"]; ok {
		d, err := unmarshalOptString(v)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid date"})
			return
		}
		date = &d
	}
	if v, ok := raw["tags"]; ok {
		var t []string
		if err := json.Unmarshal(v, &t); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid tags"})
			return
		}
		tags = &t
	}
	out, err := s.store.UpdatePage(r.PathValue("slug"), title, body, status, parentID, projectID, date, tags)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) deletePage(w http.ResponseWriter, r *http.Request) {
	if err := s.store.DeletePage(r.PathValue("slug")); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
