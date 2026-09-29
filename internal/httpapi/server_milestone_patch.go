package httpapi

import "encoding/json"

type milestonePatchRequest struct {
	Name        json.RawMessage `json:"name"`
	Description json.RawMessage `json:"description"`
	TargetDate  json.RawMessage `json:"targetDate"`
}

func (p milestonePatchRequest) values() (name, description *string, targetDate **string, err error) {
	if p.Name != nil {
		if err = assignPatchField(p.Name, "milestone name", &name); err != nil {
			return nil, nil, nil, err
		}
	}
	if p.Description != nil {
		if err = assignPatchField(p.Description, "description", &description); err != nil {
			return nil, nil, nil, err
		}
	}
	if p.TargetDate != nil {
		if err = assignNullablePatchField(p.TargetDate, "targetDate", &targetDate); err != nil {
			return nil, nil, nil, err
		}
	}
	return name, description, targetDate, nil
}
