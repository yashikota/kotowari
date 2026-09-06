package term_test

import (
	"bytes"
	"os"
	"strings"
	"testing"

	"github.com/yashikota/kotowari/internal/term"
)

func TestForDisabledWithNoColor(t *testing.T) {
	t.Setenv("NO_COLOR", "1")
	st := term.For(os.Stdout)
	if st.Green != "" {
		t.Fatalf("Green = %q, want empty with NO_COLOR", st.Green)
	}

	var buf bytes.Buffer
	st.Success(&buf, "ok\n")
	if buf.String() != "ok\n" {
		t.Fatalf("output = %q", buf.String())
	}
}

func TestStyleHelpersPlain(t *testing.T) {
	t.Setenv("NO_COLOR", "1")
	st := term.For(os.Stdout)
	var buf bytes.Buffer
	st.Listen(&buf, "http://127.0.0.1:7730")
	if !strings.Contains(buf.String(), "http://127.0.0.1:7730") {
		t.Fatalf("listen output = %q", buf.String())
	}
}
