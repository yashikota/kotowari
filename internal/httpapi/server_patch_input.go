package httpapi

import (
	"bytes"
	"encoding/json"
)

func patchOptionalString(clear bool, value *string) **string {
	if clear {
		var nilValue *string
		return &nilValue
	}
	if value == nil {
		return nil
	}
	return &value
}

type patchFieldError struct {
	field string
}

func (e *patchFieldError) Error() string {
	return "invalid " + e.field
}

func assignPatchField[T any](raw json.RawMessage, name string, target **T) error {
	value := new(T)
	if err := json.Unmarshal(raw, value); err != nil {
		return &patchFieldError{field: name}
	}
	*target = value
	return nil
}

func assignNullablePatchField[T any](raw json.RawMessage, name string, target ***T) error {
	var value *T
	if !bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
		decoded := new(T)
		if err := json.Unmarshal(raw, decoded); err != nil {
			return &patchFieldError{field: name}
		}
		value = decoded
	}
	*target = &value
	return nil
}
