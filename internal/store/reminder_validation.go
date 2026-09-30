package store

import "time"

func normalizeReminderAt(value *string) (*string, error) {
	if value == nil {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, *value)
	if err != nil {
		return nil, validationf("invalid reminder date")
	}
	normalized := parsed.UTC().Format(time.RFC3339)
	return &normalized, nil
}
