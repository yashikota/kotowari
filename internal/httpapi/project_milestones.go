package httpapi

import (
	"net/http"
	"strconv"

	"github.com/yashikota/kotowari/internal/model"
)

func (s *Server) createMilestone(w http.ResponseWriter, r *http.Request) {
	var in model.CreateMilestoneInput
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	in.ProjectSlug = r.PathValue("slug")
	out, err := s.store.CreateMilestone(in)
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
	name, description, targetDate := request.values()
	out, err := s.store.UpdateMilestone(model.UpdateMilestoneInput{
		ProjectSlug: r.PathValue("slug"), ID: id,
		Name: name, Description: description, TargetDate: targetDate,
	})
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
