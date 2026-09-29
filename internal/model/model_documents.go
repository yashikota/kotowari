package model

type Document struct {
	Body     string `json:"body"`
	Revision string `json:"revision"`
	SavedAt  string `json:"savedAt,omitempty"`
}
