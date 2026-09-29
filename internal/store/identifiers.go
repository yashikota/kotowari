package store

func parsePlainNumber(id string) (int, bool) {
	n := 0
	if id == "" {
		return 0, false
	}
	for _, r := range id {
		if r < '0' || r > '9' {
			return 0, false
		}
		n = n*10 + int(r-'0')
	}
	if n < 1 {
		return 0, false
	}
	return n, true
}
