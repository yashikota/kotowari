package httpapi

type pagePatchRequest struct {
	Title     patchField[string]   `json:"title"`
	Body      patchField[string]   `json:"body"`
	Status    patchField[string]   `json:"status"`
	ParentID  patchField[int64]    `json:"parentId"`
	ProjectID patchField[int64]    `json:"projectId"`
	Date      patchField[string]   `json:"date"`
	Tags      patchField[[]string] `json:"tags"`
}

func (p pagePatchRequest) values() (
	title, body, status *string,
	parentID, projectID **int64,
	date **string,
	tags *[]string,
) {
	assignPatchField(p.Title, &title)
	assignPatchField(p.Body, &body)
	assignPatchField(p.Status, &status)
	assignNullablePatchField(p.ParentID, &parentID)
	assignNullablePatchField(p.ProjectID, &projectID)
	assignNullablePatchField(p.Date, &date)
	assignPatchField(p.Tags, &tags)
	return title, body, status, parentID, projectID, date, tags
}
