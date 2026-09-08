package httpapi

import (
	"archive/zip"
	"bytes"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/yashikota/kotowari/internal/domain"
)

func (s *Server) getDocument(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.Document(r.PathValue("kind"), r.PathValue("id"), r.PathValue("field"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, 200, out)
}
func (s *Server) saveDocument(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Body     string `json:"body"`
		Revision string `json:"revision"`
	}
	r.Body = http.MaxBytesReader(w, r.Body, 4<<20)
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid document"})
		return
	}
	out, err := s.store.SaveDocument(r.PathValue("kind"), r.PathValue("id"), r.PathValue("field"), in.Body, in.Revision)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, 200, out)
}
func (s *Server) documentHistory(w http.ResponseWriter, r *http.Request) {
	out, err := s.store.DocumentHistory(r.PathValue("kind"), r.PathValue("id"), r.PathValue("field"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, 200, out)
}

func assetCSP(w http.ResponseWriter) {
	w.Header().Set("Content-Security-Policy", "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; font-src 'none'; base-uri 'none'; form-action 'none'")
	w.Header().Set("X-Content-Type-Options", "nosniff")
}

func (s *Server) adrAsset(w http.ResponseWriter, r *http.Request) {
	a, err := s.store.GetADR(r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	name := r.PathValue("path")
	if !fs.ValidPath(name) || strings.Contains(name, "\\") {
		http.NotFound(w, r)
		return
	}
	root, err := os.OpenRoot(filepath.Join(s.store.Path(), "adr", domain.DirName(a.Number), "assets"))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer func() { _ = root.Close() }()
	f, err := root.Open(name)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer func() { _ = f.Close() }()
	info, err := f.Stat()
	if err != nil || !info.Mode().IsRegular() {
		http.NotFound(w, r)
		return
	}
	assetCSP(w)
	http.ServeContent(w, r, name, info.ModTime(), f)
}

func (s *Server) exportADR(w http.ResponseWriter, r *http.Request) {
	a, err := s.store.GetADR(r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	root, err := os.OpenRoot(filepath.Join(s.store.Path(), "adr", domain.DirName(a.Number)))
	if err != nil {
		writeError(w, err)
		return
	}
	defer func() { _ = root.Close() }()
	var buf bytes.Buffer
	z := zip.NewWriter(&buf)
	err = fs.WalkDir(root.FS(), ".", func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() {
			if path != "." && path != "assets" && !strings.HasPrefix(path, "assets/") {
				return fs.SkipDir
			}
			return nil
		}
		if path != "README.md" && path != "PUBLISH.md" && !strings.HasPrefix(path, "assets/") {
			return nil
		}
		if !d.Type().IsRegular() {
			return fs.ErrPermission
		}
		f, err := root.Open(path)
		if err != nil {
			return err
		}
		defer func() { _ = f.Close() }()
		dst, err := z.Create(path)
		if err != nil {
			return err
		}
		_, err = io.Copy(dst, f)
		return err
	})
	if err != nil {
		_ = z.Close()
		writeError(w, err)
		return
	}
	if err := z.Close(); err != nil {
		writeError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", "attachment; filename=adr-"+domain.DirName(a.Number)+".zip")
	_, _ = w.Write(buf.Bytes())
}
