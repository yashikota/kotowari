package architecture

import (
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"testing"
)

const modulePath = "github.com/yashikota/kotowari"

type importBoundary struct {
	packageName     string
	forbiddenPrefix string
}

func TestPackageImportBoundaries(t *testing.T) {
	t.Parallel()

	_, testFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("could not locate architecture test")
	}
	root := filepath.Clean(filepath.Join(filepath.Dir(testFile), "..", ".."))
	boundaries := []importBoundary{
		{packageName: "domain", forbiddenPrefix: modulePath + "/internal/"},
		{packageName: "model", forbiddenPrefix: modulePath + "/internal/httpapi"},
		{packageName: "model", forbiddenPrefix: modulePath + "/internal/store"},
		{packageName: "model", forbiddenPrefix: modulePath + "/internal/cli"},
		{packageName: "store", forbiddenPrefix: modulePath + "/internal/httpapi"},
		{packageName: "store", forbiddenPrefix: modulePath + "/internal/cli"},
		{packageName: "httpapi", forbiddenPrefix: modulePath + "/internal/cli"},
	}

	for _, boundary := range boundaries {
		boundary := boundary
		t.Run(boundary.packageName+"_without_"+filepath.Base(boundary.forbiddenPrefix), func(t *testing.T) {
			checkBoundary(t, root, boundary)
		})
	}
}

func checkBoundary(t *testing.T, root string, boundary importBoundary) {
	t.Helper()
	packageDir := filepath.Join(root, "internal", boundary.packageName)
	set := token.NewFileSet()
	files := 0

	err := filepath.WalkDir(packageDir, func(path string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return nil
		}
		files++
		file, err := parser.ParseFile(set, path, nil, parser.ImportsOnly)
		if err != nil {
			return err
		}
		for _, spec := range file.Imports {
			importPath, err := strconv.Unquote(spec.Path.Value)
			if err != nil {
				return err
			}
			if strings.HasPrefix(importPath, boundary.forbiddenPrefix) {
				return &boundaryViolation{
					file:       path,
					importPath: importPath,
				}
			}
		}
		return nil
	})
	if err != nil {
		t.Fatalf("%s: %v", boundary.packageName, err)
	}
	if files == 0 {
		t.Fatalf("no Go source files found in %s", packageDir)
	}
}

type boundaryViolation struct {
	file       string
	importPath string
}

func (err *boundaryViolation) Error() string {
	return err.file + " imports forbidden package " + err.importPath
}
