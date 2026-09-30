package httpapi

import (
	"net/http"
)

func (s *Server) patchIssue(w http.ResponseWriter, r *http.Request) {
	in, err := decodeIssuePatch(r)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.UpdateIssue(r.PathValue("id"), in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}
