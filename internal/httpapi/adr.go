package httpapi

import (
	"net/http"

	"github.com/yashikota/kotowari/internal/model"
)

func (s *Server) listADRs(w http.ResponseWriter, _ *http.Request) {
	out, err := s.store.ListADRs()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) createADR(w http.ResponseWriter, r *http.Request) {
	var in model.CreateADRInput
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.CreateADR(in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) getADR(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.GetADR(r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) patchADR(w http.ResponseWriter, r *http.Request) {
	var request adrPatchRequest
	if err := decodeJSON(r, &request); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.UpdateADR(r.PathValue("id"), request.input())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) deleteADR(w http.ResponseWriter, r *http.Request) {
	if _, err := s.store.GetADR(r.PathValue("id")); err != nil {
		writeError(w, err)
		return
	}
	w.Header().Set("Allow", "GET, PATCH")
	writeJSON(w, http.StatusMethodNotAllowed, map[string]string{
		"error": "ADRs are append-only; mark superseded instead of deleting",
	})
}

func (s *Server) publishADR(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.PublishADR(r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}
