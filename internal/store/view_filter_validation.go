package store

import (
	"strings"
	"unicode/utf8"

	"github.com/yashikota/kotowari/internal/domain"
)

func validateViewProjectLabels(labels []string) error {
	if err := validateViewProjectLabelCount(labels); err != nil {
		return err
	}
	return validateViewProjectLabelNames(labels)
}

func validateViewProjectLabelCount(labels []string) error {
	if len(labels) > 32 {
		return validationf("too many project labels in filter")
	}
	return nil
}

func validateViewProjectLabelNames(labels []string) error {
	for _, name := range labels {
		if utf8.RuneCountInString(name) > 100 {
			return validationf("project label filter is too long")
		}
	}
	return nil
}

func validateViewLinkSources(sources []string) error {
	if len(sources) > 32 {
		return validationf("too many issue link sources in filter")
	}
	for _, source := range sources {
		if !domain.ValidIssueLinkSource(source) {
			return validationf("invalid issue link source filter")
		}
	}
	return nil
}

func normalizeViewTextFilter(value *string, field string) (*string, error) {
	if value == nil {
		return nil, nil
	}
	if utf8.RuneCountInString(*value) > 512 {
		return nil, validationf("%s filter is too long", field)
	}
	if strings.TrimSpace(*value) == "" {
		return nil, nil
	}
	normalized := *value
	return &normalized, nil
}
