package term

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
)

// Style holds ANSI sequences from tput (empty when color is disabled).
type Style struct {
	Reset, Bold, Green, Yellow, Red, Cyan, Dim string
}

// For returns color styles for w, or plain styles when not a color terminal.
func For(w io.Writer) Style {
	if !colorEnabled(w) {
		return Style{}
	}
	return Style{
		Reset:  tp("sgr0"),
		Bold:   tp("bold"),
		Green:  tp("setaf", "2"),
		Yellow: tp("setaf", "3"),
		Red:    tp("setaf", "1"),
		Cyan:   tp("setaf", "6"),
		Dim:    tp("dim"),
	}
}

func tp(args ...string) string {
	out, err := exec.Command("tput", args...).Output()
	if err != nil {
		return ""
	}
	return strings.TrimSuffix(string(out), "\n")
}

func isTTY(f *os.File) bool {
	stat, err := f.Stat()
	if err != nil {
		return false
	}
	return stat.Mode()&os.ModeCharDevice != 0
}

func colorEnabled(w io.Writer) bool {
	if os.Getenv("NO_COLOR") != "" {
		return false
	}
	if term := os.Getenv("TERM"); term == "" || term == "dumb" {
		return false
	}
	f, ok := w.(*os.File)
	if !ok || !isTTY(f) {
		return false
	}
	return true
}

func (s Style) Success(w io.Writer, format string, args ...any) {
	fmt.Fprintf(w, s.Green+format+s.Reset, args...)
}

func (s Style) Info(w io.Writer, format string, args ...any) {
	fmt.Fprintf(w, s.Cyan+s.Bold+format+s.Reset, args...)
}

func (s Style) Warn(w io.Writer, format string, args ...any) {
	fmt.Fprintf(w, s.Yellow+format+s.Reset, args...)
}

func (s Style) Error(w io.Writer, format string, args ...any) {
	fmt.Fprintf(w, s.Red+format+s.Reset, args...)
}

func (s Style) Label(w io.Writer, label, value string) {
	fmt.Fprintf(w, "%s%s%s\t%s%s\n", s.Dim, label, s.Reset, s.Bold, value)
}

func (s Style) Bool(w io.Writer, label string, v bool) {
	val := fmt.Sprintf("%t", v)
	if v {
		fmt.Fprintf(w, "%s%s%s\t%s%s\n", s.Dim, label, s.Reset, s.Yellow, val)
		return
	}
	fmt.Fprintf(w, "%s%s%s\t%s%s\n", s.Dim, label, s.Reset, s.Green, val)
}

func (s Style) Listen(w io.Writer, url string) {
	fmt.Fprintf(w, "%skotowari listening on %s%s%s\n", s.Bold, s.Cyan, url, s.Reset)
}
