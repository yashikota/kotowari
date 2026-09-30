package httpapi

import (
	"bytes"
	"encoding/json"
)

// patchField distinguishes an omitted field from a field explicitly set to
// null. That distinction is needed by PATCH handlers where null clears a
// nullable value while omission leaves it unchanged.
type patchField[T any] struct {
	present bool
	value   *T
}

func (field *patchField[T]) UnmarshalJSON(raw []byte) error {
	field.present = true
	if bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
		field.value = nil
		return nil
	}

	value := new(T)
	if err := json.Unmarshal(raw, value); err != nil {
		return err
	}
	field.value = value
	return nil
}

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

func assignPatchField[T any](field patchField[T], target **T) {
	if !field.present {
		return
	}
	if field.value == nil {
		var zero T
		*target = &zero
		return
	}
	*target = field.value
}

func assignNullablePatchField[T any](field patchField[T], target ***T) {
	if !field.present {
		return
	}
	value := field.value
	*target = &value
}
