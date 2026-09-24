package store

import (
	"os"
	"path/filepath"
)

func validCommentAttachmentID(id string) bool {
	if len(id) != 32 {
		return false
	}
	for _, char := range id {
		if !((char >= '0' && char <= '9') || (char >= 'a' && char <= 'f')) {
			return false
		}
	}
	return true
}

func (s *Store) SaveCommentAttachment(id string, data []byte) error {
	if !validCommentAttachmentID(id) {
		return validationf("invalid comment attachment id")
	}
	return atomicWrite(filepath.Join(s.root, "attachments", "issues", id), data)
}

func (s *Store) DeleteCommentAttachment(id string) error {
	if !validCommentAttachmentID(id) {
		return validationf("invalid comment attachment id")
	}
	err := os.Remove(filepath.Join(s.root, "attachments", "issues", id))
	if os.IsNotExist(err) {
		return nil
	}
	return err
}
