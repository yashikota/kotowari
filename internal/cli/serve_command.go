package cli

import (
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"os"
	"time"

	"github.com/yashikota/kotowari/internal/httpapi"
	"github.com/yashikota/kotowari/internal/term"
	"github.com/yashikota/kotowari/internal/webembed"
)

func cmdServe(ctx context.Context, addr string, foreground, strictPort bool, stderr io.Writer) error {
	foreground = foreground || os.Getenv(serveChildEnv) == "1"
	if !foreground {
		return spawnServeBackground()
	}

	st, err := openStore()
	if err != nil {
		return err
	}
	defer func() { _ = st.Close() }()
	h := httpapi.New(st, webembed.Dist())
	defer h.Close()
	styl := term.For(stderr)
	warn := func(msg string) { styl.Warn(stderr, "kotowari: %s\n", msg) }
	ln, listenAddr, err := listenTCP(addr, strictPort, warn)
	if err != nil {
		return err
	}
	srv := &http.Server{
		Handler:           h,
		ReadHeaderTimeout: 5 * time.Second,
		BaseContext:       func(net.Listener) context.Context { return ctx },
	}
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()
	styl.Listen(stderr, "http://"+listenAddr)
	err = srv.Serve(ln)
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}
