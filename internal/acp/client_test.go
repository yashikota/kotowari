package acp

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// A real subprocess exercises framing, unsolicited notifications and requests.
func TestACPAgentProcess(t *testing.T) {
	if len(os.Args) < 2 || os.Args[len(os.Args)-1] != "acp-test-agent" {
		return
	}
	encoder := json.NewEncoder(os.Stdout)
	send := func(v any) {
		if encoder.Encode(v) != nil {
			os.Exit(2)
		}
	}
	var promptID json.RawMessage
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		var m message
		if json.Unmarshal(scanner.Bytes(), &m) != nil {
			os.Exit(3)
		}
		if m.Method == "" && string(m.ID) == `"permission"` {
			if !strings.Contains(string(m.Result), "allow") {
				os.Exit(4)
			}
			send(map[string]any{"jsonrpc": "2.0", "method": "session/update", "params": map[string]any{"sessionId": "test-session", "update": map[string]any{"sessionUpdate": "agent_message_chunk", "content": map[string]string{"type": "text", "text": "Approved result"}}}})
			send(map[string]any{"jsonrpc": "2.0", "id": promptID, "result": map[string]string{"stopReason": "end_turn"}})
			continue
		}
		var result any = map[string]any{}
		switch m.Method {
		case "initialize":
			result = map[string]any{"protocolVersion": 1, "agentCapabilities": map[string]bool{"loadSession": true}}
		case "session/new":
			result = map[string]string{"sessionId": "test-session"}
		case "session/load":
			send(map[string]any{"jsonrpc": "2.0", "method": "session/update", "params": map[string]any{"sessionId": "test-session", "update": map[string]any{"sessionUpdate": "agent_message_chunk", "content": map[string]string{"type": "text", "text": "Previous conversation"}}}})
		case "session/prompt":
			promptID = m.ID
			if strings.Contains(string(m.Params), "hang") {
				continue
			}
			send(map[string]any{"jsonrpc": "2.0", "id": "permission", "method": "session/request_permission", "params": map[string]any{"sessionId": "test-session", "toolCall": map[string]string{"title": "Write draft"}, "options": []any{map[string]string{"optionId": "allow", "name": "Allow once", "kind": "allow_once"}}}})
			continue
		case "session/cancel":
			continue
		}
		send(map[string]any{"jsonrpc": "2.0", "id": m.ID, "result": result})
	}
	os.Exit(0)
}

func waitState(t *testing.T, s *Session, fn func(State) bool) State {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		state := s.State()
		if fn(state) {
			return state
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("timed out: %+v", s.State())
	return State{}
}
func TestSessionPermissionResumeAndCancel(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "session.json")
	command := []string{os.Args[0], "-test.run=TestACPAgentProcess", "--", "acp-test-agent"}
	s := NewSession(dir, path, command)
	defer s.Close()
	if err := s.Run("write", "context", ""); err != nil {
		t.Fatal(err)
	}
	state := waitState(t, s, func(st State) bool { return len(st.Permissions) > 0 })
	if err := s.Approve(state.Permissions[0].ID, "not-offered"); err == nil {
		t.Fatal("invalid permission accepted")
	}
	if err := s.Approve(state.Permissions[0].ID, "allow"); err != nil {
		t.Fatal(err)
	}
	state = waitState(t, s, func(st State) bool { return !st.Busy })
	if state.Error != "" {
		t.Fatal(state.Error)
	}
	if len(state.Events) != 2 {
		t.Fatalf("events %+v", state.Events)
	}
	s.Close()
	resumed := NewSession(dir, path, command)
	defer resumed.Close()
	if err := resumed.Run("hang", "", ""); err != nil {
		t.Fatal(err)
	}
	waitState(t, resumed, func(st State) bool { return len(st.Events) > 1 && st.Events[0].Kind == "update" })
	resumed.Cancel()
	state = waitState(t, resumed, func(st State) bool { return !st.Busy })
	if state.SessionID != "test-session" || len(state.Permissions) != 0 {
		t.Fatalf("bad cancelled state %+v", state)
	}
}

func TestClientExitAndContext(t *testing.T) {
	c, err := Start([]string{os.Args[0], "-test.run=TestACPAgentProcess", "--", "acp-test-agent"}, t.TempDir(), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Millisecond)
	defer cancel()
	err = c.Call(ctx, "session/prompt", map[string]string{"text": "hang"}, nil)
	if err == nil || !strings.Contains(fmt.Sprint(err), "deadline") {
		t.Fatalf("%v", err)
	}
	c.Close()
	if err := c.Call(context.Background(), "initialize", nil, nil); err == nil {
		t.Fatal("closed client accepted call")
	}
}

func TestRealACP(t *testing.T) {
	raw := os.Getenv("KOTOWARI_TEST_ACP_COMMAND")
	if raw == "" {
		t.Skip("set KOTOWARI_TEST_ACP_COMMAND to opt into a real agent request")
	}
	var command []string
	if err := json.Unmarshal([]byte(raw), &command); err != nil {
		t.Fatal(err)
	}
	dir := t.TempDir()
	s := NewSession(dir, filepath.Join(dir, "session.json"), command)
	defer s.Close()
	if err := s.Run("Reply with exactly KOTOWARI_ACP_OK. Do not run tools or modify files.", "This is a connectivity test.", ""); err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(90 * time.Second)
	for time.Now().Before(deadline) {
		st := s.State()
		if !st.Busy {
			if st.Error != "" {
				t.Fatal(st.Error)
			}
			for _, e := range st.Events {
				if e.Kind == "update" && strings.Contains(string(e.Data), "KOTOWARI_ACP_OK") {
					return
				}
			}
			t.Fatalf("no expected reply (%d events)", len(st.Events))
		}
		time.Sleep(100 * time.Millisecond)
	}
	t.Fatal("real ACP request timed out")
}
