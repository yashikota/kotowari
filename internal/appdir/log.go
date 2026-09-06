package appdir

import (
	"os"
	"path/filepath"
)

const LogFile = "kotowari.log"

func LogPath() (string, error) {
	root, err := Home()
	if err != nil {
		return "", err
	}
	return filepath.Join(root, LogFile), nil
}

func OpenLog() (*os.File, error) {
	root, err := Home()
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(root, 0o755); err != nil {
		return nil, err
	}
	return os.OpenFile(filepath.Join(root, LogFile), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
}
