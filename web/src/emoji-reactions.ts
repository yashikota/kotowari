export function reactionEmojiFromPickerDetail(detail: unknown): string | null {
  if (typeof detail !== 'object' || detail === null) return null;
  const data = detail as { unicode?: unknown; emoji?: { unicode?: unknown } };
  const unicode = data.unicode ?? data.emoji?.unicode;
  return typeof unicode === 'string' && unicode.length > 0 ? unicode : null;
}
