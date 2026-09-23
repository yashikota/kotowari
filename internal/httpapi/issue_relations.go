package httpapi

import (
	"net/http"
	"strconv"

	"github.com/yashikota/kotowari/internal/store"
)

func (s *Server) addIssueRelation(w http.ResponseWriter, r *http.Request) {
	var in struct {
		TargetIdentifier string `json:"targetIdentifier"`
		Kind             string `json:"kind"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	relation, err := s.store.AddIssueRelation(r.PathValue("id"), store.CreateIssueRelationInput{
		TargetIdentifier: in.TargetIdentifier, Kind: in.Kind,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, relation)
}

func (s *Server) removeIssueRelation(w http.ResponseWriter, r *http.Request) {
	relationID, err := strconv.ParseInt(r.PathValue("relationId"), 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid relation id"})
		return
	}
	if err := s.store.RemoveIssueRelation(r.PathValue("id"), relationID); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
