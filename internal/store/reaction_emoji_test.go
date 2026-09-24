package store

import "testing"

func TestValidReactionEmojiSupportsEmojiSequencesAndRejectsText(t *testing.T) {
	tests := []struct {
		emoji string
		valid bool
	}{
		{emoji: "👍", valid: true},
		{emoji: "🫠", valid: true},
		{emoji: "❤️", valid: true},
		{emoji: "👩🏽‍💻", valid: true},
		{emoji: "🇯🇵", valid: true},
		{emoji: "1️⃣", valid: true},
		{emoji: "🏴", valid: true},
		{emoji: "", valid: false},
		{emoji: "script", valid: false},
		{emoji: "😀😀", valid: false},
		{emoji: "😀 😃", valid: false},
		{emoji: "😀‍", valid: false},
		{emoji: "🏻", valid: false},
		{emoji: "👍⃣", valid: false},
		{emoji: "🏴\U000e007f", valid: false},
		{emoji: "<script>", valid: false},
	}
	for _, test := range tests {
		t.Run(test.emoji, func(t *testing.T) {
			if got := validReactionEmoji(test.emoji); got != test.valid {
				t.Fatalf("validReactionEmoji(%q) = %t, want %t", test.emoji, got, test.valid)
			}
		})
	}
}
