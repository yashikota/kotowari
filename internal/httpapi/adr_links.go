package httpapi

import (
	"net/http"
	"strconv"
)

func (s *Server) linkIssueADR(w http.ResponseWriter, r *http.Request) {
	n, ok := readLinkNumber(w, r)
	if !ok {
		return
	}
	id := r.PathValue("id")
	if err := s.store.LinkIssueADR(id, n); err != nil {
		writeError(w, err)
		return
	}
	out, err := s.store.GetIssue(id)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) unlinkIssueADR(w http.ResponseWriter, r *http.Request) {
	n, err := strconv.Atoi(r.PathValue("number"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid number"})
		return
	}
	if err := s.store.UnlinkIssueADR(r.PathValue("id"), n); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) linkADRIssue(w http.ResponseWriter, r *http.Request) {
	n, ok := readLinkNumber(w, r)
	if !ok {
		return
	}
	adrID := r.PathValue("id")
	adr, err := s.store.GetADR(adrID)
	if err != nil {
		writeError(w, err)
		return
	}
	iss, err := s.store.GetIssue(strconv.Itoa(n))
	if err != nil {
		writeError(w, err)
		return
	}
	if err := s.store.LinkIssueADR(iss.Identifier, adr.Number); err != nil {
		writeError(w, err)
		return
	}
	out, err := s.store.GetADR(adrID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) unlinkADRIssue(w http.ResponseWriter, r *http.Request) {
	n, err := strconv.Atoi(r.PathValue("number"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid number"})
		return
	}
	adr, err := s.store.GetADR(r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	iss, err := s.store.GetIssue(strconv.Itoa(n))
	if err != nil {
		writeError(w, err)
		return
	}
	if err := s.store.UnlinkIssueADR(iss.Identifier, adr.Number); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func readLinkNumber(w http.ResponseWriter, r *http.Request) (int, bool) {
	var in struct {
		Number int `json:"number"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return 0, false
	}
	if in.Number < 1 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid number"})
		return 0, false
	}
	return in.Number, true
}
