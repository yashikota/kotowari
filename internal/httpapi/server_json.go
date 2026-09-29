package httpapi

import "encoding/json"

func unmarshalOptInt64(raw json.RawMessage) (*int64, error) {
	if string(raw) == "null" {
		return nil, nil
	}
	var n int64
	if err := json.Unmarshal(raw, &n); err != nil {
		return nil, err
	}
	return &n, nil
}

func unmarshalOptString(raw json.RawMessage) (*string, error) {
	if string(raw) == "null" {
		return nil, nil
	}
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return nil, err
	}
	return &s, nil
}
