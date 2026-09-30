package httpapi

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestPatchFieldDistinguishesOmissionFromNull(t *testing.T) {
	var request struct {
		Title    patchField[string] `json:"title"`
		DueDate  patchField[string] `json:"dueDate"`
		Priority patchField[int]    `json:"priority"`
	}
	if err := json.Unmarshal([]byte(`{"title":"Keep moving","dueDate":null,"priority":2}`), &request); err != nil {
		t.Fatalf("decode patch fields: %v", err)
	}

	var title *string
	var dueDate **string
	var priority *int
	assignPatchField(request.Title, &title)
	assignNullablePatchField(request.DueDate, &dueDate)
	assignPatchField(request.Priority, &priority)

	if title == nil || *title != "Keep moving" {
		t.Fatalf("title = %v, want Keep moving", title)
	}
	if dueDate == nil || *dueDate != nil {
		t.Fatalf("dueDate = %v, want an explicit clear", dueDate)
	}
	if priority == nil || *priority != 2 {
		t.Fatalf("priority = %v, want 2", priority)
	}

	var omitted struct {
		DueDate patchField[string] `json:"dueDate"`
	}
	if err := json.Unmarshal([]byte(`{}`), &omitted); err != nil {
		t.Fatalf("decode omitted field: %v", err)
	}
	var unchanged **string
	assignNullablePatchField(omitted.DueDate, &unchanged)
	if unchanged != nil {
		t.Fatalf("omitted dueDate changed the value: %v", unchanged)
	}
}

func TestDecodeJSONRejectsTrailingValues(t *testing.T) {
	for _, body := range []string{
		`{"title":"first"} {"title":"second"}`,
		`{"title":"first"} trailing`,
	} {
		t.Run(body, func(t *testing.T) {
			r := httptest.NewRequest("PATCH", "/api/issues/EN-1", strings.NewReader(body))
			var request struct {
				Title string `json:"title"`
			}
			if err := decodeJSON(r, &request); err == nil {
				t.Fatalf("decodeJSON accepted trailing content %q", body)
			}
		})
	}
}
