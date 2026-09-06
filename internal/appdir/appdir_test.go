package appdir

import (
	"os"
	"path/filepath"
	"testing"
)

func TestHomeDefaultIsDotKotowariInCwd(t *testing.T) {
	dir := t.TempDir()
	if err := os.Chdir(dir); err != nil {
		t.Fatal(err)
	}
	t.Setenv("KOTOWARI_HOME", "")
	got, err := Home()
	if err != nil {
		t.Fatal(err)
	}
	want := filepath.Join(dir, DefaultDir)
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestHomeRespectsKOTOWARI_HOME(t *testing.T) {
	custom := t.TempDir()
	t.Setenv("KOTOWARI_HOME", custom)
	got, err := Home()
	if err != nil {
		t.Fatal(err)
	}
	if got != custom {
		t.Fatalf("got %q want %q", got, custom)
	}
}

func TestHomeCleansKOTOWARI_HOME(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("KOTOWARI_HOME", dir+string(os.PathSeparator)+"."+string(os.PathSeparator))
	got, err := Home()
	if err != nil {
		t.Fatal(err)
	}
	if got != filepath.Clean(dir+"/.") {
		t.Fatalf("got %q", got)
	}
}

func TestInitializedAndMarker(t *testing.T) {
	dir := t.TempDir()
	if Initialized(dir) {
		t.Fatal("empty dir is not initialized")
	}
	if Marker(dir) != filepath.Join(dir, "workspace.toml") {
		t.Fatalf("marker %s", Marker(dir))
	}
	if err := os.WriteFile(Marker(dir), []byte("name = \"kotowari\"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if !Initialized(dir) {
		t.Fatal("workspace.toml should initialize")
	}
}

func TestInitializedAcceptsLegacyYAML(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "workspace.yaml"), []byte("name: kotowari\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if !Initialized(dir) {
		t.Fatal("legacy yaml still counts as initialized")
	}
}
