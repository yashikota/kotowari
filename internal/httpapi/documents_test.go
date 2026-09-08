package httpapi

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/yashikota/kotowari/internal/store"
)

func TestDocumentAPIConflictAndHistory(t *testing.T) {
	s := testAPI(t)
	_, err := s.store.CreateADR(store.CreateADRInput{Title: "doc", Body: "old"})
	if err != nil {
		t.Fatal(err)
	}
	path := "/api/documents/adrs/ADR-1/body"
	rec := doJSON(t, s, "GET", path, "")
	var d store.Document
	if err := json.Unmarshal(rec.Body.Bytes(), &d); err != nil {
		t.Fatal(err)
	}
	body, _ := json.Marshal(map[string]string{"body": "new", "revision": d.Revision})
	if r := doJSON(t, s, "PUT", path, string(body)); r.Code != 200 {
		t.Fatal(r.Body.String())
	}
	if r := doJSON(t, s, "PUT", path, string(body)); r.Code != 409 {
		t.Fatal("stale save accepted", r.Code)
	}
	if r := doJSON(t, s, "GET", path+"/history", ""); r.Code != 200 || !strings.Contains(r.Body.String(), "old") {
		t.Fatal(r.Body.String())
	}
}

func TestAssetsAndExportIsolation(t *testing.T) {
	s := testAPI(t)
	_, err := s.store.CreateADR(store.CreateADRInput{Title: "doc"})
	if err != nil {
		t.Fatal(err)
	}
	base := filepath.Join(s.store.Path(), "adr", "00001")
	if err := os.MkdirAll(filepath.Join(base, "assets"), 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(base, "assets", "diagram.html"), []byte("<h1>Diagram</h1><script>alert(1)</script>"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(base, "secret.txt"), []byte("secret"), 0600); err != nil {
		t.Fatal(err)
	}
	r := doJSON(t, s, "GET", "/api/adrs/ADR-1/assets/diagram.html", "")
	if r.Code != 200 || !strings.Contains(r.Header().Get("Content-Security-Policy"), "sandbox;") {
		t.Fatal("missing sandbox", r.Code, r.Header())
	}
	if err := os.Symlink(filepath.Join(base, "secret.txt"), filepath.Join(base, "assets", "escape.txt")); err == nil {
		r = doJSON(t, s, "GET", "/api/adrs/ADR-1/assets/escape.txt", "")
		if r.Code != 404 {
			t.Fatal("symlink escaped", r.Code)
		}
		if err := os.Remove(filepath.Join(base, "assets", "escape.txt")); err != nil {
			t.Fatal(err)
		}
	}
	r = doJSON(t, s, "GET", "/api/adrs/ADR-1/export", "")
	if r.Code != 200 {
		t.Fatal(r.Body.String())
	}
	z, err := zip.NewReader(bytes.NewReader(r.Body.Bytes()), int64(r.Body.Len()))
	if err != nil {
		t.Fatal(err)
	}
	names := map[string]bool{}
	for _, f := range z.File {
		names[f.Name] = true
	}
	if !names["README.md"] || !names["assets/diagram.html"] || names["secret.txt"] {
		t.Fatalf("%v", names)
	}
}

func TestCrossOriginAgentRequestDenied(t *testing.T) {
	s := testAPI(t)
	req := httptest.NewRequest("POST", "http://localhost/api/ai/adrs/ADR-1", strings.NewReader(`{"action":"prompt","prompt":"hello"}`))
	req.Header.Set("Origin", "https://other.example")
	rec := httptest.NewRecorder()
	s.ServeHTTP(rec, req)
	if rec.Code != 403 {
		t.Fatalf("%d", rec.Code)
	}
}
