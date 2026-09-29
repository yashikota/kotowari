package httpapi

import (
	"net/http"

	"github.com/yashikota/kotowari/internal/model"
)

func (s *Server) createIssue(w http.ResponseWriter, r *http.Request) {
	var in model.CreateIssueRequest
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	issueInput := in.IssueInput()
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

func (s *Server) deleteIssue(w http.ResponseWriter, r *http.Request) {
	if err := s.store.DeleteIssue(r.PathValue("id")); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
