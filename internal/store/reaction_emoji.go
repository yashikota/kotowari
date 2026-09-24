package store

import (
	"unicode/utf8"

	"github.com/rivo/uniseg"
)

func validReactionEmoji(emoji string) bool {
	if emoji == "" || len(emoji) > 64 || !utf8.ValidString(emoji) || uniseg.GraphemeClusterCount(emoji) != 1 {
		return false
	}
	runes := []rune(emoji)
	if isKeycapEmoji(runes) || isRegionalFlagEmoji(runes) {
		return true
	}
	if !validEmojiModifiers(runes) || !validEmojiJoiners(runes) || !validEmojiVariationSelectors(runes) || !validEmojiTags(runes) {
		return false
	}
	for _, r := range runes {
		if isEmojiBase(r) {
			continue
		}
		if r == '\u200d' || r == '\ufe0f' || isEmojiModifier(r) || isEmojiTag(r) {
			continue
		}
		return false
	}
	for _, r := range runes {
		if isEmojiBase(r) {
			return true
		}
	}
	return false
}

func isKeycapEmoji(runes []rune) bool {
	if len(runes) != 2 && len(runes) != 3 {
		return false
	}
	key := runes[0]
	if (key < '0' || key > '9') && key != '#' && key != '*' {
		return false
	}
	if len(runes) == 2 {
		return runes[1] == '\u20e3'
	}
	return runes[1] == '\ufe0f' && runes[2] == '\u20e3'
}

func isRegionalFlagEmoji(runes []rune) bool {
	return len(runes) == 2 && isRegionalIndicator(runes[0]) && isRegionalIndicator(runes[1])
}

func isRegionalIndicator(r rune) bool {
	return r >= 0x1f1e6 && r <= 0x1f1ff
}

func isEmojiModifier(r rune) bool {
	return r >= 0x1f3fb && r <= 0x1f3ff
}

func isEmojiTag(r rune) bool {
	return r >= 0xe0020 && r <= 0xe007f
}

func isEmojiBase(r rune) bool {
	if isRegionalIndicator(r) {
		return false
	}
	if r == 0x00a9 || r == 0x00ae || r == 0x203c || r == 0x2049 || r == 0x2122 || r == 0x2139 ||
		r == 0x24c2 || r == 0x3030 || r == 0x303d || r == 0x3297 || r == 0x3299 {
		return true
	}
	return r >= 0x2190 && r <= 0x21ff || r >= 0x2300 && r <= 0x23ff ||
		r >= 0x25a0 && r <= 0x27ff || r >= 0x2934 && r <= 0x2935 ||
		r >= 0x2b00 && r <= 0x2bff || r >= 0x1f000 && r <= 0x1faff
}

func validEmojiModifiers(runes []rune) bool {
	for i, r := range runes {
		if !isEmojiModifier(r) {
			continue
		}
		if i == 0 || !isEmojiBase(runes[i-1]) {
			return false
		}
	}
	return true
}

func validEmojiJoiners(runes []rune) bool {
	for i, r := range runes {
		if r != '\u200d' {
			continue
		}
		if i == 0 || i == len(runes)-1 {
			return false
		}
		previous := i - 1
		for previous >= 0 && (runes[previous] == '\ufe0f' || isEmojiModifier(runes[previous])) {
			previous--
		}
		if previous < 0 || !isEmojiBase(runes[previous]) || !isEmojiBase(runes[i+1]) {
			return false
		}
	}
	return true
}

func validEmojiVariationSelectors(runes []rune) bool {
	for i, r := range runes {
		if r != '\ufe0f' {
			continue
		}
		if i == 0 || !isEmojiBase(runes[i-1]) {
			return false
		}
	}
	return true
}

func validEmojiTags(runes []rune) bool {
	firstTag := -1
	hasTag := false
	hasCancel := false
	for i, r := range runes {
		if isEmojiTag(r) {
			hasTag = true
			if firstTag < 0 {
				firstTag = i
			}
		}
		if r == 0xe007f {
			hasCancel = true
			if i != len(runes)-1 {
				return false
			}
		}
	}
	if !hasTag && !hasCancel {
		return true
	}
	if !hasTag || !hasCancel || firstTag == 0 || firstTag >= len(runes)-1 ||
		runes[0] != 0x1f3f4 || runes[len(runes)-1] != 0xe007f {
		return false
	}
	for i := firstTag; i < len(runes)-1; i++ {
		if runes[i] < 0xe0020 || runes[i] > 0xe007e {
			return false
		}
	}
	return true
}
