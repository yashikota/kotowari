package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"
)

func (s *Server) createMilestone(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name       string  `json:"name"`
		TargetDate *string `json:"targetDate"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.CreateMilestone(r.PathValue("slug"), in.Name, in.TargetDate)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) patchMilestone(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("milestoneId"), 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid milestone id"})
		return
	}
	raw := map[string]json.RawMessage{}
	if err := decodeJSON(r, &raw); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	var name *string
	if value, ok := raw["name"]; ok {
		var decoded string
		if err := json.Unmarshal(value, &decoded); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid milestone name"})
			return
		}
		name = &decoded
	}
	var targetDate **string
	if value, ok := raw["targetDate"]; ok {
		decoded, err := unmarshalOptString(value)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid targetDate"})
			return
		}
		targetDate = &decoded
	}
	out, err := s.store.UpdateMilestone(r.PathValue("slug"), id, name, targetDate)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) deleteMilestone(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("milestoneId"), 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid milestone id"})
		return
	}
	if err := s.store.DeleteMilestone(r.PathValue("slug"), id); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
