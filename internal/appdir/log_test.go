package appdir_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/yashikota/kotowari/internal/appdir"
)

func TestOpenLog(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("KOTOWARI_HOME", dir)

	f, err := appdir.OpenLog()
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()

	if _, err := f.WriteString("test\n"); err != nil {
		t.Fatal(err)
	}

	data, err := os.ReadFile(filepath.Join(dir, appdir.LogFile))
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != "test\n" {
		t.Fatalf("log = %q", data)
	}
}
