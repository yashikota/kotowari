package httpapi

import "net/http"

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
