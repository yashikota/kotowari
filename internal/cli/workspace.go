package cli

import (
	"fmt"
	"io"

	"github.com/yashikota/kotowari/internal/appdir"
	"github.com/yashikota/kotowari/internal/store"
	"github.com/yashikota/kotowari/internal/term"
)

func openStore() (*store.Store, error) {
	root, err := appdir.Home()
	if err != nil {
		return nil, err
	}
	if !appdir.Initialized(root) {
		return nil, fmt.Errorf("workspace not found at %s (run kotowari init)", root)
	}
	st, err := store.Open(root)
	if err != nil {
		return nil, fmt.Errorf("open %s: %w", root, err)
	}
	return st, nil
}

func cmdStatus(stdout io.Writer) error {
	st, err := openStore()
	if err != nil {
		return err
	}
	defer func() { _ = st.Close() }()
	ws, err := st.Workspace()
	if err != nil {
		return err
	}
	styl := term.For(stdout)
	styl.Label(stdout, "path", st.Path())
	styl.Label(stdout, "name", ws.Name)
	return nil
}

func cmdCheck(stdout io.Writer) error {
	st, err := openStore()
	if err != nil {
		return err
	}
	defer func() { _ = st.Close() }()
	diags, err := st.Diagnostics()
	if err != nil {
		return err
	}
	if len(diags) == 0 {
		term.For(stdout).Success(stdout, "ok\n")
		return nil
	}
	styl := term.For(stdout)
	for _, d := range diags {
		styl.Error(stdout, "%s: %s\n", d.Path, d.Message)
	}
	return fmt.Errorf("check failed: %d issue(s)", len(diags))
}
