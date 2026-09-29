package store

import "strings"

func validProjectLead(lead string) bool {
	return lead == "" || lead == "self"
}

func validProjectIcon(icon string) bool {
	if icon == "" {
		return true
	}
	_, ok := projectIcons[icon]
	return ok
}

func validProjectIconColor(color string) bool {
	if color == "" {
		return true
	}
	if _, ok := projectIconColors[color]; ok {
		return true
	}
	if len(color) != 7 || color[0] != '#' {
		return false
	}
	for _, c := range color[1:] {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
			return false
		}
	}
	return true
}

var projectIcons = map[string]struct{}{
	"folder": {}, "cube": {}, "rocket": {}, "bolt": {}, "book": {}, "bug": {}, "briefcase": {}, "building": {},
	"calendar": {}, "chart-bar": {}, "code": {}, "coffee": {}, "compass": {}, "cpu": {}, "database": {},
	"desktop": {}, "diamond": {}, "flame": {}, "flask": {}, "heart": {}, "home": {}, "leaf": {}, "lock": {},
	"map": {}, "message": {}, "moon": {}, "palette": {}, "puzzle": {}, "shield": {}, "sparkles": {},
	"star": {}, "sun": {}, "target": {}, "terminal": {}, "tools": {}, "trophy": {}, "world": {},
	"emoji:rocket": {}, "emoji:star": {}, "emoji:sparkles": {}, "emoji:fire": {}, "emoji:lightning": {},
	"emoji:bug": {}, "emoji:books": {}, "emoji:bulb": {}, "emoji:heart": {}, "emoji:leaf": {}, "emoji:globe": {},
	"emoji:moon": {}, "emoji:sun": {}, "emoji:rainbow": {}, "emoji:gem": {}, "emoji:coffee": {}, "emoji:computer": {},
	"emoji:paint": {}, "emoji:target": {}, "emoji:construction": {}, "emoji:package": {}, "emoji:seedling": {},
	"emoji:wave": {}, "emoji:mountain": {}, "emoji:music": {}, "emoji:camera": {}, "emoji:airplane": {},
}

var projectIconColors = map[string]struct{}{
	"grey": {}, "blue": {}, "purple": {}, "pink": {}, "red": {}, "orange": {}, "yellow": {}, "green": {},
}

func canonicalProjectLabels(m *mem, labels []string) ([]string, error) {
	available := make(map[string]string, len(m.Labels))
	for _, label := range m.Labels {
		available[strings.ToLower(label.Name)] = label.Name
	}
	seen := make(map[string]struct{}, len(labels))
	nextLabels := make([]string, 0, len(labels))
	for _, label := range labels {
		name := strings.TrimSpace(label)
		if name == "" {
			return nil, validationf("project labels must not be empty")
		}
		canonical, ok := available[strings.ToLower(name)]
		if !ok {
			return nil, validationf("unknown project label %q", name)
		}
		key := strings.ToLower(canonical)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		nextLabels = append(nextLabels, canonical)
	}
	return nextLabels, nil
}
