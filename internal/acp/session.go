package acp

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type Event struct {
	Kind string          `json:"kind"`
	Text string          `json:"text,omitempty"`
	Data json.RawMessage `json:"data,omitempty"`
}
type Permission struct {
	ID     json.RawMessage `json:"id"`
	Params json.RawMessage `json:"params"`
}
type AuthMethod struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}
type State struct {
	SessionID   string       `json:"sessionId"`
	Events      []Event      `json:"events"`
	Busy        bool         `json:"busy"`
	Error       string       `json:"error,omitempty"`
	Permissions []Permission `json:"permissions"`
	AuthMethods []AuthMethod `json:"authMethods"`
}
type Session struct {
	closed    bool
	runDone   chan struct{}
	loaded    bool
	mu        sync.Mutex
	state     State
	client    *Client
	cwd, path string
	command   []string
	load      bool
	cancel    context.CancelFunc
}

func NewSession(cwd, path string, command []string) *Session {
	s := &Session{cwd: cwd, path: path, command: command, state: State{Events: []Event{}, Permissions: []Permission{}}}
	if b, err := os.ReadFile(path); err == nil {
		if json.Unmarshal(b, &s.state) != nil {
			s.state = State{}
		}
	}
	s.state.Busy = false
	s.state.Permissions = []Permission{}
	return s
}
func (s *Session) State() State {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := s.state
	out.Events = append([]Event{}, out.Events...)
	out.Permissions = append([]Permission{}, out.Permissions...)
	return out
}
func (s *Session) persistLocked() {
	b, err := json.Marshal(s.state)
	if err != nil {
		s.state.Error = err.Error()
		return
	}
	if err := os.MkdirAll(filepath.Dir(s.path), 0700); err != nil {
		s.state.Error = err.Error()
		return
	}
	if err := os.WriteFile(s.path+".tmp", b, 0600); err != nil {
		s.state.Error = err.Error()
		return
	}
	if err := os.Rename(s.path+".tmp", s.path); err != nil {
		s.state.Error = err.Error()
	}
}
func (s *Session) receive(method string, id, params json.RawMessage) {
	s.mu.Lock()
	c := s.client
	if method == "session/update" {
		s.state.Events = append(s.state.Events, Event{Kind: "update", Data: params})
		s.mu.Unlock()
		return
	}
	if method == "session/request_permission" && len(id) > 0 {
		s.state.Permissions = append(s.state.Permissions, Permission{ID: id, Params: params})
		s.mu.Unlock()
		return
	}
	s.mu.Unlock()
	if len(id) > 0 && c != nil {
		_ = c.Unsupported(id)
	}
}
func (s *Session) connect(ctx context.Context) error {
	s.mu.Lock()
	c := s.client
	s.mu.Unlock()
	if c != nil {
		return nil
	}
	var err error
	c, err = Start(s.command, s.cwd, s.receive)
	if err != nil {
		return err
	}
	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		c.Close()
		return fmt.Errorf("session closed")
	}
	s.client = c
	s.loaded = false
	s.mu.Unlock()
	var init struct {
		ProtocolVersion   int `json:"protocolVersion"`
		AgentCapabilities struct {
			LoadSession bool `json:"loadSession"`
		} `json:"agentCapabilities"`
		AuthMethods []AuthMethod `json:"authMethods"`
	}
	if err := c.Call(ctx, "initialize", map[string]any{"protocolVersion": 1, "clientInfo": map[string]string{"name": "kotowari", "version": "1"}, "clientCapabilities": map[string]any{}}, &init); err != nil {
		s.disconnect()
		return err
	}
	if init.ProtocolVersion != 1 {
		s.disconnect()
		return fmt.Errorf("unsupported ACP protocol version %d", init.ProtocolVersion)
	}
	s.mu.Lock()
	s.load = init.AgentCapabilities.LoadSession
	s.state.AuthMethods = init.AuthMethods
	s.mu.Unlock()
	return nil
}
func (s *Session) disconnect() {
	s.mu.Lock()
	c := s.client
	s.client = nil
	s.mu.Unlock()
	if c != nil {
		c.Close()
	}
}

func (s *Session) Run(prompt, contextText, auth string) error {
	s.mu.Lock()
	if s.closed || s.state.Busy {
		s.mu.Unlock()
		return fmt.Errorf("agent is already working")
	}
	s.state.Busy = true
	s.state.Error = ""
	ctx, cancel := context.WithCancel(context.Background())
	s.cancel = cancel
	done := make(chan struct{})
	s.runDone = done
	s.mu.Unlock()
	go func() {
		defer close(done)
		defer cancel()
		err := s.run(ctx, prompt, contextText, auth)
		if err != nil {
			s.disconnect()
		}
		s.mu.Lock()
		s.state.Busy = false
		s.state.Permissions = []Permission{}
		s.cancel = nil
		if err != nil {
			s.state.Error = err.Error()
		}
		s.persistLocked()
		s.mu.Unlock()
	}()
	return nil
}
func (s *Session) run(ctx context.Context, prompt, contextText, auth string) error {
	setup, cancel := context.WithTimeout(ctx, 90*time.Second)
	defer cancel()
	if err := s.connect(setup); err != nil {
		return err
	}
	s.mu.Lock()
	c := s.client
	sessionID := s.state.SessionID
	canLoad := s.load
	loaded := s.loaded
	methods := s.state.AuthMethods
	s.mu.Unlock()
	if c == nil {
		return fmt.Errorf("agent disconnected")
	}
	if auth != "" {
		valid := false
		for _, m := range methods {
			if m.ID == auth {
				valid = true
			}
		}
		if !valid {
			return fmt.Errorf("unknown authentication method")
		}
		return c.Call(setup, "authenticate", map[string]string{"methodId": auth}, nil)
	}
	if sessionID == "" {
		var result struct {
			SessionID string `json:"sessionId"`
		}
		if err := c.Call(setup, "session/new", map[string]any{"cwd": s.cwd, "mcpServers": []any{}}, &result); err != nil {
			return err
		}
		if result.SessionID == "" {
			return fmt.Errorf("agent returned an empty session ID")
		}
		sessionID = result.SessionID
		s.mu.Lock()
		s.state.SessionID = sessionID
		s.persistLocked()
		s.mu.Unlock()
	} else if !loaded {
		if !canLoad {
			return fmt.Errorf("agent cannot reload this session; start a new conversation")
		}
		s.mu.Lock()
		previous := s.state.Events
		s.state.Events = []Event{}
		s.mu.Unlock()
		if err := c.Call(setup, "session/load", map[string]any{"sessionId": sessionID, "cwd": s.cwd, "mcpServers": []any{}}, nil); err != nil {
			s.mu.Lock()
			s.state.Events = previous
			s.mu.Unlock()
			return err
		}
	}
	s.mu.Lock()
	s.loaded = true
	s.state.Events = append(s.state.Events, Event{Kind: "user", Text: prompt})
	s.mu.Unlock()
	return c.Call(ctx, "session/prompt", map[string]any{"sessionId": sessionID, "prompt": []any{map[string]string{"type": "text", "text": contextText + "\n\nUser request:\n" + prompt}}}, nil)
}
func (s *Session) Cancel() {
	s.mu.Lock()
	c := s.client
	id := s.state.SessionID
	cancel := s.cancel
	s.state.Permissions = []Permission{}
	s.mu.Unlock()
	if cancel == nil {
		return
	}
	// Notify before cancelling the call, with a bound for an agent that stopped
	// reading stdin. Closing its pipes unblocks a pending JSON-RPC write.
	if c != nil {
		sent := make(chan struct{})
		go func() { _ = c.Notify("session/cancel", map[string]string{"sessionId": id}); close(sent) }()
		select {
		case <-sent:
		case <-time.After(250 * time.Millisecond):
			c.Close()
		}
	}
	cancel()
	if c != nil {
		c.Close()
	}
}
func (s *Session) Approve(id json.RawMessage, option string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, p := range s.state.Permissions {
		if string(p.ID) != string(id) {
			continue
		}
		var params struct {
			Options []struct {
				OptionID string `json:"optionId"`
			} `json:"options"`
		}
		if err := json.Unmarshal(p.Params, &params); err != nil {
			return err
		}
		valid := false
		for _, o := range params.Options {
			if o.OptionID == option {
				valid = true
			}
		}
		if !valid {
			return fmt.Errorf("invalid permission option")
		}
		if s.client == nil {
			return fmt.Errorf("agent disconnected")
		}
		if err := s.client.Reply(id, map[string]any{"outcome": map[string]string{"outcome": "selected", "optionId": option}}); err != nil {
			return err
		}
		s.state.Permissions = append(s.state.Permissions[:i], s.state.Permissions[i+1:]...)
		return nil
	}
	return fmt.Errorf("permission request expired")
}
func (s *Session) Close() {
	s.mu.Lock()
	s.closed = true
	done := s.runDone
	s.mu.Unlock()
	s.Cancel()
	s.disconnect()
	if done != nil {
		<-done
	}
}
func (s *Session) Reset() error {
	s.mu.Lock()
	if s.closed || s.state.Busy {
		s.mu.Unlock()
		return fmt.Errorf("stop the current turn first")
	}
	s.state.Busy = true
	s.mu.Unlock()
	s.disconnect()
	s.mu.Lock()
	defer s.mu.Unlock()
	s.state = State{Events: []Event{}, Permissions: []Permission{}}
	s.loaded = false
	s.persistLocked()
	return nil
}
