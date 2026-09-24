import { describe, expect, it } from 'vite-plus/test';
import { reactionEmojiFromPickerDetail } from './emoji-reactions.ts';

describe('reactionEmojiFromPickerDetail', () => {
  it('keeps the selected skin-tone variant', () => {
    expect(reactionEmojiFromPickerDetail({ emoji: { unicode: '👍' }, unicode: '👍🏽' })).toBe('👍🏽');
  });

  it('falls back to the selected emoji data when no variant is supplied', () => {
    expect(reactionEmojiFromPickerDetail({ emoji: { unicode: '🫠' } })).toBe('🫠');
  });

  it('ignores malformed selection events', () => {
    expect(reactionEmojiFromPickerDetail(null)).toBeNull();
    expect(reactionEmojiFromPickerDetail({ unicode: '' })).toBeNull();
    expect(reactionEmojiFromPickerDetail({ unicode: 12 })).toBeNull();
  });
});
