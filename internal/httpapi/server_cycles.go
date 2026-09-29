package httpapi

import (
	"net/http"
	"strconv"

	"github.com/yashikota/kotowari/internal/model"
)

func (s *Server) listCycles(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.ListCyclesByArchived(r.URL.Query().Get("archived") == "true")
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) ensureCycleSchedule(w http.ResponseWriter, _ *http.Request) {
	out, err := s.store.EnsureCycleSchedule()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) createCycle(w http.ResponseWriter, r *http.Request) {
	var in struct {
		StartsAt string `json:"startsAt"`
		EndsAt   string `json:"endsAt"`
		Status   string `json:"status"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.CreateCycle(model.CreateCycleInput{
		StartsAt: in.StartsAt, EndsAt: in.EndsAt, Status: in.Status,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) getCycle(w http.ResponseWriter, r *http.Request) {
	n, err := strconv.Atoi(r.PathValue("number"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid cycle number"})
		return
	}
	out, err := s.store.GetCycle(n)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) listCycleActivities(w http.ResponseWriter, r *http.Request) {
	n, err := strconv.Atoi(r.PathValue("number"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid cycle number"})
		return
	}
	out, err := s.store.ListCycleActivities(n)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) patchCycle(w http.ResponseWriter, r *http.Request) {
	n, err := strconv.Atoi(r.PathValue("number"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid cycle number"})
		return
	}
	var in struct {
		Name                   *string `json:"name"`
		Description            *string `json:"description"`
		StartsAt               *string `json:"startsAt"`
		EndsAt                 *string `json:"endsAt"`
		Status                 *string `json:"status"`
		IsFavorite             *bool   `json:"isFavorite"`
		NotifyOnIssueAdded     *bool   `json:"notifyOnIssueAdded"`
		NotifyOnIssueCompleted *bool   `json:"notifyOnIssueCompleted"`
		Archived               *bool   `json:"archived"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.UpdateCycle(n, model.UpdateCycleInput{
		Name: in.Name, Description: in.Description, StartsAt: in.StartsAt, EndsAt: in.EndsAt,
		Status: in.Status, IsFavorite: in.IsFavorite,
		NotifyOnIssueAdded: in.NotifyOnIssueAdded, NotifyOnIssueCompleted: in.NotifyOnIssueCompleted, Archived: in.Archived,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}
