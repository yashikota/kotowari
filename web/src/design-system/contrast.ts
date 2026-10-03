/** WCAG relative luminance for opaque sRGB colors. */
export function contrastRatio(first: string, second: string): number {
  const luminance = (hex: string) => {
    const channels = hex
      .replace('#', '')
      .match(/.{2}/g)!
      .map((channel) => {
        const value = Number.parseInt(channel, 16) / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
    return channels.reduce(
      (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index]!,
      0,
    );
  };
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Preserve hue while moving toward black/white until the required contrast is met. */
export function accessibleColor(color: string, background: string, minimum = 4.8): string {
  if (contrastRatio(color, background) >= minimum) return color;
  const target =
    contrastRatio('#000000', background) > contrastRatio('#ffffff', background) ? 0 : 255;
  const channels = color
    .replace('#', '')
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16));
  for (let step = 1; step <= 100; step++) {
    const next =
      '#' +
      channels
        .map((channel) =>
          Math.round(channel + ((target - channel) * step) / 100)
            .toString(16)
            .padStart(2, '0'),
        )
        .join('');
    if (contrastRatio(next, background) >= minimum) return next;
  }
  return target === 0 ? '#000000' : '#ffffff';
}
