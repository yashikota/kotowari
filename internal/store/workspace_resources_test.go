package store

import (
	"errors"
	"testing"
)

func TestWorkspaceResourcesPersistAndValidate(t *testing.T) {
	s := openTest(t)
	resource, err := s.AddWorkspaceResource(CreateWorkspaceResourceInput{
		URL:   " https://example.test/guide ",
		Title: "  Guide  ",
	})
	if err != nil {
		t.Fatal(err)
	}
	if resource.ID != 1 || resource.URL != "https://example.test/guide" || resource.Title != "Guide" || resource.CreatedAt == "" {
		t.Fatalf("created resource %#v", resource)
	}
	if _, err := s.AddWorkspaceResource(CreateWorkspaceResourceInput{URL: resource.URL}); !errors.Is(err, ErrConflict) {
		t.Fatalf("duplicate resource error = %v", err)
	}
	if _, err := s.AddWorkspaceResource(CreateWorkspaceResourceInput{URL: "javascript:alert(1)"}); !errors.Is(err, ErrValidation) {
		t.Fatalf("invalid URL error = %v", err)
	}

	reopened, err := Open(s.root)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = reopened.Close() })
	workspace, err := reopened.Workspace()
	if err != nil {
		t.Fatal(err)
	}
	if len(workspace.Resources) != 1 || workspace.Resources[0] != resource {
		t.Fatalf("persisted resources %#v, want %#v", workspace.Resources, []WorkspaceResource{resource})
	}
	if err := reopened.RemoveWorkspaceResource(resource.ID); err != nil {
		t.Fatal(err)
	}
	workspace, err = reopened.Workspace()
	if err != nil {
		t.Fatal(err)
	}
	if len(workspace.Resources) != 0 {
		t.Fatalf("resources after removal %#v", workspace.Resources)
	}
	if err := reopened.RemoveWorkspaceResource(resource.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("remove missing resource error = %v", err)
	}
}
