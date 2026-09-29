package httpapi

import "net/http"

func (s *Server) listProjectActivities(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.ListProjectActivities(r.PathValue("slug"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) postProjectUpdate(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Health string `json:"health"`
		Body   string `json:"body"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.PostProjectUpdate(r.PathValue("slug"), in.Health, in.Body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}
