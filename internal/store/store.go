package store

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

var (
	ErrNotFound   = errors.New("not found")
	ErrValidation = errors.New("validation")
	ErrConflict   = errors.New("conflict")
)

type Store struct {
	state *workspaceState
	root  string
}

type workspaceState struct {
	mu                  sync.Mutex
	recurringMu         sync.Mutex
	issueAutomationMu   sync.Mutex
	lastIssueAutomation time.Time
}

var (
	workspaceStatesMu sync.Mutex
	// Keep each root's lock bundle for the process lifetime so reopening a
	// workspace cannot create a second lock while an older Store still exists.
	workspaceStates = make(map[string]*workspaceState)
)

func Open(root string) (*Store, error) {
	if err := os.MkdirAll(root, 0o755); err != nil {
		return nil, err
	}
	state, err := workspaceStateForRoot(root)
	if err != nil {
		return nil, err
	}
	state.mu.Lock()
	defer state.mu.Unlock()
	s := &Store{root: root, state: state}
	marker := filepath.Join(root, "workspace.toml")
	if _, err := os.Stat(marker); err != nil {
		if _, yamlErr := os.Stat(filepath.Join(root, "workspace.yaml")); yamlErr == nil {
			return nil, fmt.Errorf("found workspace.yaml in %s; this version uses workspace.toml (move the directory aside and run kotowari init)", root)
		}
		if err := seed(root); err != nil {
			return nil, err
		}
	}
	m, err := load(root)
	if err != nil {
		return nil, fmt.Errorf("open %s: %w", root, err)
	}
	if err := writeBundledTemplates(root); err != nil {
		return nil, err
	}
	if m.dirtyMeta {
		if err := save(root, m); err != nil {
			return nil, err
		}
	}
	return s, nil
}

func workspaceStateForRoot(root string) (*workspaceState, error) {
	absolute, err := filepath.Abs(root)
	if err != nil {
		return nil, err
	}
	canonical, err := filepath.EvalSymlinks(absolute)
	if err != nil {
		return nil, err
	}
	key := filepath.Clean(canonical)
	if runtime.GOOS == "windows" {
		key = strings.ToLower(key)
	}

	workspaceStatesMu.Lock()
	defer workspaceStatesMu.Unlock()
	state := workspaceStates[key]
	if state == nil {
		state = &workspaceState{}
		workspaceStates[key] = state
	}
	return state, nil
}

func (s *Store) Close() error { return nil }

func (s *Store) Path() string { return s.root }

func validationf(format string, args ...any) error {
	return errf(ErrValidation, format, args...)
}
