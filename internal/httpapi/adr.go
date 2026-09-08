package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/yashikota/kotowari/internal/store"
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
	var in struct {
		ProjectSlug  *string `json:"projectSlug"`
		Title        string  `json:"title"`
		Body         string  `json:"body"`
		Status       string  `json:"status"`
		Evaluation   string  `json:"evaluation"`
		Replay       string  `json:"replay"`
		Workload     string  `json:"workload"`
		IssueNumbers []int   `json:"issueNumbers"`
		Supersedes   *int    `json:"supersedes"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	out, err := s.store.CreateADR(store.CreateADRInput{
		ProjectSlug: in.ProjectSlug, Title: in.Title, Body: in.Body, Status: in.Status, Evaluation: in.Evaluation,
		Replay: in.Replay, Workload: in.Workload, IssueNumbers: in.IssueNumbers, Supersedes: in.Supersedes,
	})
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
	raw := map[string]json.RawMessage{}
	if err := decodeJSON(r, &raw); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	in := store.PatchADRInput{}
	if v, ok := raw["projectSlug"]; ok {
		slug, err := unmarshalOptString(v)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid projectSlug"})
			return
		}
		in.ProjectSlug = &slug
	}
	if v, ok := raw["title"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid title"})
			return
		}
		in.Title = &s
	}
	if v, ok := raw["body"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
			return
		}
		in.Body = &s
	}
	if v, ok := raw["publishBody"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid publishBody"})
			return
		}
		in.PublishBody = &s
	}
	if v, ok := raw["status"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid status"})
			return
		}
		in.Status = &s
	}
	if v, ok := raw["evaluation"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid evaluation"})
			return
		}
		in.Evaluation = &s
	}
	if v, ok := raw["replay"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid replay"})
			return
		}
		in.Replay = &s
	}
	if v, ok := raw["workload"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid workload"})
			return
		}
		in.Workload = &s
	}
	if v, ok := raw["supersedes"]; ok {
		n, err := unmarshalOptInt(v)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid supersedes"})
			return
		}
		in.Supersedes = &n
	}
	if v, ok := raw["issueNumbers"]; ok {
		var nums []int
		if err := json.Unmarshal(v, &nums); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid issueNumbers"})
			return
		}
		in.IssueNumbers = &nums
	}
	out, err := s.store.UpdateADR(r.PathValue("id"), in)
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

func unmarshalOptInt(raw json.RawMessage) (*int, error) {
	if string(raw) == "null" {
		return nil, nil
	}
	var n int
	if err := json.Unmarshal(raw, &n); err != nil {
		return nil, err
	}
	return &n, nil
}
