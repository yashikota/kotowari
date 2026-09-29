package store

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/pelletier/go-toml/v2"
)

func readTOMLDir(dir string, fn func(name string, b []byte) error) error {
	ents, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	for _, ent := range ents {
		if ent.IsDir() || !strings.HasSuffix(ent.Name(), ".toml") {
			continue
		}
		b, err := os.ReadFile(filepath.Join(dir, ent.Name()))
		if err != nil {
			return err
		}
		if err := fn(ent.Name(), b); err != nil {
			return fmt.Errorf("%s: %w", ent.Name(), err)
		}
	}
	return nil
}

func writeTOML(path string, v any) error {
	b, err := toml.Marshal(v)
	if err != nil {
		return err
	}
	return atomicWrite(path, b)
}

func atomicWrite(path string, data []byte) error {
	tmp, err := stageFile(path, data)
	if err != nil {
		return err
	}
	defer func() { _ = os.Remove(tmp) }()
	return os.Rename(tmp, path)
}

func pruneDir(dir, ext string, keep map[string]struct{}) error {
	ents, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	for _, ent := range ents {
		if ent.IsDir() || !strings.HasSuffix(ent.Name(), ext) {
			continue
		}
		if _, ok := keep[ent.Name()]; ok {
			continue
		}
		if err := os.Remove(filepath.Join(dir, ent.Name())); err != nil {
			return err
		}
	}
	return nil
}
