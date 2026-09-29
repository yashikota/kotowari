package httpapi

import (
	"net/http"
	"strconv"
)

func (s *Server) createMilestone(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name        string  `json:"name"`
		Description string  `json:"description"`
		TargetDate  *string `json:"targetDate"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.CreateMilestoneWithDescription(r.PathValue("slug"), in.Name, in.Description, in.TargetDate)
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
	var request milestonePatchRequest
	if err := decodeJSON(r, &request); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	name, description, targetDate, err := request.values()
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	out, err := s.store.UpdateMilestoneDetails(r.PathValue("slug"), id, name, description, targetDate)
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
