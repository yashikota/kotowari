// Package acp connects to an external Agent Client Protocol process over stdio.
package acp

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os/exec"
	"sync"
	"sync/atomic"
)

type message struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id,omitempty"`
	Method  string          `json:"method,omitempty"`
	Params  json.RawMessage `json:"params,omitempty"`
	Result  json.RawMessage `json:"result,omitempty"`
	Error   *rpcError       `json:"error,omitempty"`
}
type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}
type Client struct {
	stdout    io.ReadCloser
	closeOnce sync.Once
	cmd       *exec.Cmd
	stdin     io.WriteCloser
	writeMu   sync.Mutex
	mu        sync.Mutex
	pending   map[string]chan message
	done      chan struct{}
	err       error
	next      atomic.Int64
	onMessage func(string, json.RawMessage, json.RawMessage)
}

func Start(command []string, cwd string, onMessage func(string, json.RawMessage, json.RawMessage)) (*Client, error) {
	if len(command) == 0 || command[0] == "" {
		return nil, errors.New("ACP command is empty")
	}
	cmd := exec.Command(command[0], command[1:]...)
	cmd.Dir = cwd
	prepareProcess(cmd)
	in, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}
	out, err := cmd.StdoutPipe()
	if err != nil {
		_ = in.Close()
		return nil, err
	}
	// stderr is intentionally not part of the protocol or conversation history.
	cmd.Stderr = io.Discard
	if err := cmd.Start(); err != nil {
		_ = in.Close()
		_ = out.Close()
		return nil, fmt.Errorf("start ACP agent: %w (install codex-acp or set KOTOWARI_ACP_COMMAND to a JSON argv array)", err)
	}
	c := &Client{cmd: cmd, stdin: in, stdout: out, pending: map[string]chan message{}, done: make(chan struct{}), onMessage: onMessage}
	go func() {
		scanner := bufio.NewScanner(out)
		scanner.Buffer(make([]byte, 4096), 8<<20)
		for scanner.Scan() {
			var m message
			if err := json.Unmarshal(scanner.Bytes(), &m); err != nil {
				c.mu.Lock()
				c.err = fmt.Errorf("invalid ACP JSON: %w", err)
				c.mu.Unlock()
				killProcess(cmd)
				break
			}
			if m.Method != "" {
				if c.onMessage != nil {
					c.onMessage(m.Method, m.ID, m.Params)
				}
				continue
			}
			c.mu.Lock()
			ch := c.pending[string(m.ID)]
			c.mu.Unlock()
			if ch != nil {
				select {
				case ch <- m:
				default:
				}
			}
		}
		if scanner.Err() != nil {
			killProcess(cmd)
		}
		waitErr := cmd.Wait()
		c.mu.Lock()
		if c.err == nil {
			c.err = scanner.Err()
		}
		if c.err == nil {
			c.err = waitErr
		}
		if c.err == nil {
			c.err = io.EOF
		}
		c.mu.Unlock()
		close(c.done)
	}()
	return c, nil
}
func (c *Client) send(v any) error {
	c.writeMu.Lock()
	defer c.writeMu.Unlock()
	return json.NewEncoder(c.stdin).Encode(v)
}
func (c *Client) Notify(method string, params any) error {
	return c.send(map[string]any{"jsonrpc": "2.0", "method": method, "params": params})
}
func (c *Client) Reply(id json.RawMessage, result any) error {
	return c.send(map[string]any{"jsonrpc": "2.0", "id": id, "result": result})
}
func (c *Client) Unsupported(id json.RawMessage) error {
	return c.send(map[string]any{"jsonrpc": "2.0", "id": id, "error": rpcError{Code: -32601, Message: "Client capability not supported"}})
}
func (c *Client) Call(ctx context.Context, method string, params any, out any) error {
	id := fmt.Sprint(c.next.Add(1))
	ch := make(chan message, 1)
	c.mu.Lock()
	c.pending[id] = ch
	c.mu.Unlock()
	defer func() { c.mu.Lock(); delete(c.pending, id); c.mu.Unlock() }()
	if err := c.send(map[string]any{"jsonrpc": "2.0", "id": json.RawMessage(id), "method": method, "params": params}); err != nil {
		return err
	}
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-c.done:
		c.mu.Lock()
		defer c.mu.Unlock()
		return fmt.Errorf("ACP process stopped: %w", c.err)
	case m := <-ch:
		if m.Error != nil {
			return fmt.Errorf("ACP %s: %s (%d)", method, m.Error.Message, m.Error.Code)
		}
		if out == nil {
			return nil
		}
		return json.Unmarshal(m.Result, out)
	}
}
func (c *Client) Close() {
	c.closeOnce.Do(func() {
		_ = c.stdin.Close()
		killProcess(c.cmd)
		_ = c.stdout.Close()
	})
	<-c.done
}
