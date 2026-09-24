package httpapi

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"unicode"

	"github.com/yashikota/kotowari/internal/store"
)

const (
	maxAttachmentSize       = 20 << 20
	maxAttachmentUploadSize = 50 << 20
	maxAttachments          = 10
)

func (s *Server) addCommentWithFiles(w http.ResponseWriter, r *http.Request) {
	body, attachments, ok := s.readAttachments(w, r)
	if !ok {
		return
	}
	if strings.TrimSpace(body) == "" && len(attachments) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "body or attachment required"})
		return
	}
	out, err := s.store.AddCommentWithAttachments(r.PathValue("id"), body, attachments)
	if err != nil {
		deleteSavedAttachments(s, attachments)
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) addIssueAttachments(w http.ResponseWriter, r *http.Request) {
	_, attachments, ok := s.readAttachments(w, r)
	if !ok {
		return
	}
	if len(attachments) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "at least one attachment is required"})
		return
	}
	out, err := s.store.AddIssueAttachments(r.PathValue("id"), attachments)
	if err != nil {
		deleteSavedAttachments(s, attachments)
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) readAttachments(w http.ResponseWriter, r *http.Request) (string, []store.CommentAttachment, bool) {
	r.Body = http.MaxBytesReader(w, r.Body, maxAttachmentUploadSize)
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			writeJSON(w, http.StatusRequestEntityTooLarge, map[string]string{"error": "attachments are too large"})
			return "", nil, false
		}
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid multipart form"})
		return "", nil, false
	}
	if r.MultipartForm != nil {
		defer func() { _ = r.MultipartForm.RemoveAll() }()
	}
	files := r.MultipartForm.File["files"]
	if len(files) > maxAttachments {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "too many attachments"})
		return "", nil, false
	}

	attachments := make([]store.CommentAttachment, 0, len(files))
	for _, header := range files {
		if header.Size > maxAttachmentSize {
			deleteSavedAttachments(s, attachments)
			writeJSON(w, http.StatusRequestEntityTooLarge, map[string]string{"error": "attachment is too large"})
			return "", nil, false
		}
		file, err := header.Open()
		if err != nil {
			deleteSavedAttachments(s, attachments)
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "could not read attachment"})
			return "", nil, false
		}
		data, readErr := io.ReadAll(io.LimitReader(file, maxAttachmentSize+1))
		closeErr := file.Close()
		if readErr != nil || closeErr != nil {
			deleteSavedAttachments(s, attachments)
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "could not read attachment"})
			return "", nil, false
		}
		if len(data) == 0 || len(data) > maxAttachmentSize {
			deleteSavedAttachments(s, attachments)
			writeJSON(w, http.StatusRequestEntityTooLarge, map[string]string{"error": "attachment is empty or too large"})
			return "", nil, false
		}
		id, err := newAttachmentID()
		if err != nil {
			deleteSavedAttachments(s, attachments)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not save attachment"})
			return "", nil, false
		}
		attachment := store.CommentAttachment{
			ID: id, Name: safeAttachmentName(header.Filename),
			MediaType: http.DetectContentType(data), Size: int64(len(data)),
		}
		if err := s.store.SaveCommentAttachment(id, data); err != nil {
			deleteSavedAttachments(s, attachments)
			writeError(w, err)
			return "", nil, false
		}
		attachments = append(attachments, attachment)
	}
	return r.FormValue("body"), attachments, true
}

func (s *Server) getIssueCommentAttachment(w http.ResponseWriter, r *http.Request) {
	attachment, err := s.store.GetCommentAttachment(r.PathValue("id"), r.PathValue("attachmentId"))
	if err != nil {
		writeError(w, err)
		return
	}
	root, err := os.OpenRoot(filepath.Join(s.store.Path(), "attachments", "issues"))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer func() { _ = root.Close() }()
	file, err := root.Open(attachment.ID)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer func() { _ = file.Close() }()
	info, err := file.Stat()
	if err != nil || !info.Mode().IsRegular() {
		http.NotFound(w, r)
		return
	}

	mediaType, _, err := mime.ParseMediaType(attachment.MediaType)
	if err != nil {
		mediaType = "application/octet-stream"
	}
	disposition := "attachment"
	if mediaType == "image/jpeg" || mediaType == "image/png" || mediaType == "image/gif" || mediaType == "image/webp" ||
		mediaType == "video/mp4" || mediaType == "video/webm" {
		disposition = "inline"
	} else {
		mediaType = "application/octet-stream"
	}
	w.Header().Set("Content-Type", mediaType)
	w.Header().Set("Content-Disposition", mime.FormatMediaType(disposition, map[string]string{"filename": attachment.Name}))
	w.Header().Set("Content-Security-Policy", "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'; base-uri 'none'; form-action 'none'")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "private, no-store")
	http.ServeContent(w, r, attachment.Name, info.ModTime(), file)
}

func (s *Server) deleteIssueAttachment(w http.ResponseWriter, r *http.Request) {
	if err := s.store.DeleteIssueAttachment(r.PathValue("id"), r.PathValue("attachmentId")); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func newAttachmentID() (string, error) {
	var bytes [16]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes[:]), nil
}

func safeAttachmentName(name string) string {
	name = strings.ReplaceAll(name, "\\", "/")
	if index := strings.LastIndexByte(name, '/'); index >= 0 {
		name = name[index+1:]
	}
	name = strings.Map(func(char rune) rune {
		if unicode.IsControl(char) {
			return -1
		}
		return char
	}, strings.TrimSpace(name))
	if name == "" || name == "." || name == ".." {
		return "attachment"
	}
	runes := []rune(name)
	if len(runes) > 255 {
		name = string(runes[:255])
	}
	return name
}

func deleteSavedAttachments(s *Server, attachments []store.CommentAttachment) {
	for _, attachment := range attachments {
		_ = s.store.DeleteCommentAttachment(attachment.ID)
	}
}
