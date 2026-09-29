package httpapi

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
