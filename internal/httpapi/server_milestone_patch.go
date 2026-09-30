package httpapi

type milestonePatchRequest struct {
	Name        patchField[string] `json:"name"`
	Description patchField[string] `json:"description"`
	TargetDate  patchField[string] `json:"targetDate"`
}

func (p milestonePatchRequest) values() (name, description *string, targetDate **string) {
	assignPatchField(p.Name, &name)
	assignPatchField(p.Description, &description)
	assignNullablePatchField(p.TargetDate, &targetDate)
	return name, description, targetDate
}
