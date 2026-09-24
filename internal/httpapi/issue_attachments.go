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
	maxCommentAttachmentSize = 20 << 20
	maxCommentUploadSize     = 50 << 20
	maxCommentAttachments    = 10
)

func (s *Server) addCommentWithFiles(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxCommentUploadSize)
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			writeJSON(w, http.StatusRequestEntityTooLarge, map[string]string{"error": "comment attachments are too large"})
			return
		}
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid multipart form"})
		return
	}
	if r.MultipartForm != nil {
		defer func() { _ = r.MultipartForm.RemoveAll() }()
	}
	files := r.MultipartForm.File["files"]
	if len(files) > maxCommentAttachments {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "too many comment attachments"})
		return
	}
	body := r.FormValue("body")
	if strings.TrimSpace(body) == "" && len(files) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "body or attachment required"})
		return
	}

	attachments := make([]store.CommentAttachment, 0, len(files))
	for _, header := range files {
		if header.Size > maxCommentAttachmentSize {
			deleteSavedAttachments(s, attachments)
			writeJSON(w, http.StatusRequestEntityTooLarge, map[string]string{"error": "comment attachment is too large"})
			return
		}
		file, err := header.Open()
		if err != nil {
			deleteSavedAttachments(s, attachments)
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "could not read comment attachment"})
			return
		}
		data, readErr := io.ReadAll(io.LimitReader(file, maxCommentAttachmentSize+1))
		closeErr := file.Close()
		if readErr != nil || closeErr != nil {
			deleteSavedAttachments(s, attachments)
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "could not read comment attachment"})
			return
		}
		if len(data) == 0 || len(data) > maxCommentAttachmentSize {
			deleteSavedAttachments(s, attachments)
			writeJSON(w, http.StatusRequestEntityTooLarge, map[string]string{"error": "comment attachment is empty or too large"})
			return
		}
		id, err := newCommentAttachmentID()
		if err != nil {
			deleteSavedAttachments(s, attachments)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not save comment attachment"})
			return
		}
		attachment := store.CommentAttachment{
			ID: id, Name: safeAttachmentName(header.Filename),
			MediaType: http.DetectContentType(data), Size: int64(len(data)),
		}
		if err := s.store.SaveCommentAttachment(id, data); err != nil {
			deleteSavedAttachments(s, attachments)
			writeError(w, err)
			return
		}
		attachments = append(attachments, attachment)
	}

	out, err := s.store.AddCommentWithAttachments(r.PathValue("id"), body, attachments)
	if err != nil {
		deleteSavedAttachments(s, attachments)
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
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

func newCommentAttachmentID() (string, error) {
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
