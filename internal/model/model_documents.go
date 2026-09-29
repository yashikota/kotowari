package model

type Document struct {
	Body     string `json:"body"`
	Revision string `json:"revision"`
	SavedAt  string `json:"savedAt,omitempty"`
}

type SaveDocumentInput struct {
	Kind     string `json:"-"`
	ID       string `json:"-"`
	Field    string `json:"-"`
	Body     string `json:"body"`
	Revision string `json:"revision"`
}
