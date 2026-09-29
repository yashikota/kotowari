package store

import "github.com/yashikota/kotowari/internal/domain"

func indexADR(m *mem, ident string) int {
	if n, ok := m.parseADRIdent(ident); ok {
		for i, a := range m.ADRs {
			if a.Number == n {
				return i
			}
		}
		return -1
	}
	for i, a := range m.ADRs {
		if a.Identifier == ident {
			return i
		}
	}
	return -1
}

func (m *mem) parseADRIdent(id string) (int, bool) {
	if n, ok := domain.ParseIdent(m.adrPrefix(), id); ok {
		return n, true
	}
	if n, ok := domain.ParseIdent(domain.DefaultADRPrefix, id); ok {
		return n, true
	}
	return parsePlainNumber(id)
}
