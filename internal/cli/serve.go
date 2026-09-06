package cli

import (
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"

	"github.com/yashikota/kotowari/internal/appdir"
	"github.com/yashikota/kotowari/internal/term"
)

const (
	defaultServeHost = "127.0.0.1"
	defaultServePort = 7730
	maxPortAttempts  = 20
	serveChildEnv    = "KOTOWARI_SERVE_FOREGROUND"
)

func parseServeAddr(addr string) (host string, port int, err error) {
	if addr == "" {
		return defaultServeHost, defaultServePort, nil
	}
	h, p, err := net.SplitHostPort(addr)
	if err != nil {
		if n, convErr := strconv.Atoi(addr); convErr == nil {
			return defaultServeHost, n, nil
		}
		return "", 0, fmt.Errorf("invalid listen address %q: %w", addr, err)
	}
	if h == "" {
		h = defaultServeHost
	}
	n, err := strconv.Atoi(p)
	if err != nil || n <= 0 || n > 65535 {
		return "", 0, fmt.Errorf("invalid port in %q", addr)
	}
	return h, n, nil
}

func isAddrInUse(err error) bool {
	var opErr *net.OpError
	if !errors.As(err, &opErr) {
		return false
	}
	return errors.Is(opErr.Err, syscall.EADDRINUSE)
}

func listenTCP(addr string, strictPort bool, warn func(string)) (net.Listener, string, error) {
	host, port, err := parseServeAddr(addr)
	if err != nil {
		return nil, "", err
	}

	for i := range maxPortAttempts {
		tryPort := port + i
		tryAddr := net.JoinHostPort(host, strconv.Itoa(tryPort))
		ln, err := net.Listen("tcp", tryAddr)
		if err == nil {
			if i > 0 && warn != nil {
				warn(fmt.Sprintf("port %d in use, using %d instead", port, tryPort))
			}
			return ln, ln.Addr().String(), nil
		}
		if strictPort || !isAddrInUse(err) {
			return nil, "", err
		}
	}
	return nil, "", fmt.Errorf("no available port in range %d-%d", port, port+maxPortAttempts-1)
}

func servePIDPath() (string, error) {
	root, err := appdir.Home()
	if err != nil {
		return "", err
	}
	return filepath.Join(root, "serve.pid"), nil
}

func writeServePID(pid int) error {
	pidPath, err := servePIDPath()
	if err != nil {
		return err
	}
	return os.WriteFile(pidPath, []byte(strconv.Itoa(pid)+"\n"), 0o644)
}

func cmdStop(stdout io.Writer) error {
	pidPath, err := servePIDPath()
	if err != nil {
		return err
	}
	data, err := os.ReadFile(pidPath)
	if errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("server not running")
	}
	if err != nil {
		return err
	}
	pid, err := strconv.Atoi(strings.TrimSpace(string(data)))
	if err != nil {
		return fmt.Errorf("invalid pid file: %w", err)
	}
	proc, err := os.FindProcess(pid)
	if err != nil {
		return err
	}
	if err := proc.Signal(syscall.SIGTERM); err != nil {
		if errors.Is(err, syscall.ESRCH) {
			_ = os.Remove(pidPath)
			return fmt.Errorf("server not running (stale pid %d)", pid)
		}
		return err
	}
	_ = os.Remove(pidPath)
	term.For(stdout).Success(stdout, "stopped kotowari (pid %d)\n", pid)
	return nil
}

func spawnServeBackground() error {
	root, err := appdir.Home()
	if err != nil {
		return err
	}
	if !appdir.Initialized(root) {
		return fmt.Errorf("workspace not found at %s (run kotowari init)", root)
	}
	cmd := exec.Command(os.Args[0], os.Args[1:]...)
	cmd.Env = append(os.Environ(), serveChildEnv+"=1")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Start(); err != nil {
		return err
	}
	return writeServePID(cmd.Process.Pid)
}
