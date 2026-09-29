package httpapi

import (
	"errors"
	"net/http"
)

func (s *Server) patchIssue(w http.ResponseWriter, r *http.Request) {
	in, err := decodeIssuePatch(r)
	if err != nil {
		var fieldErr *issuePatchFieldError
		message := "invalid json"
		if errors.As(err, &fieldErr) {
			message = fieldErr.Error()
		}
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": message})
		return
	}
	out, err := s.store.UpdateIssue(r.PathValue("id"), in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

type issuePatchFieldError struct {
	field string
}

func (e *issuePatchFieldError) Error() string {
	return "invalid " + e.field
}
