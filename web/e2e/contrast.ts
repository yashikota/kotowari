import type { Page } from '@playwright/test';

export async function contrastFailures(page: Page, rootSelector = 'body') {
  // Measure settled paint, including opacity, rather than an opening transition frame.
  await page.locator(rootSelector).evaluate(async (scope) => {
    await Promise.all(
      scope
        .getAnimations({ subtree: true })
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
  return page.evaluate((rootSelector) => {
    const rgb = (value: string) => {
      if (!value.startsWith('rgb') && !value.startsWith('color(srgb'))
        throw new Error(`Unsupported computed color: ${value}`);
      const channels = (value.match(/[\d.]+/g) ?? []).map(Number);
      return value.startsWith('color(srgb')
        ? channels.map((channel, index) => (index < 3 ? channel * 255 : channel))
        : channels;
    };
    const blend = (front: number[], back: number[]) => {
      const alpha = front[3] ?? 1;
      return front.slice(0, 3).map((value, i) => value * alpha + back[i]! * (1 - alpha));
    };
    const luminance = (color: number[]) =>
      color
        .slice(0, 3)
        .map((v) => {
          const x = v / 255;
          return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i]!, 0);
    const failures: { text: string; color: string; background: number[]; ratio: number }[] = [];
    const scope = document.querySelector(rootSelector);
    if (!scope) throw new Error(`Contrast scope missing: ${rootSelector}`);
    for (const element of scope.querySelectorAll<HTMLElement>('*')) {
      const icon = element.getAttribute('data-contrast-icon');
      if (
        !icon &&
        !element.matches('input:not([type=checkbox]):not([type=radio]), textarea, select') &&
        !Array.from(element.childNodes).some(
          (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
        )
      )
        continue;
      if (
        element.closest('script, style, [disabled], [aria-disabled="true"]') ||
        (!icon && element.closest('svg'))
      )
        continue;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (
        !rect.width ||
        !rect.height ||
        rect.bottom < 0 ||
        rect.top >= innerHeight ||
        style.visibility === 'hidden'
      )
        continue;
      const ancestors: Element[] = [];
      let ancestor: Element | null = element;
      let hidden = false;
      while (ancestor) {
        const ancestorStyle = getComputedStyle(ancestor);
        if (Number(ancestorStyle.opacity) === 0) hidden = true;
        const bounds = ancestor.getBoundingClientRect();
        if (
          ancestorStyle.overflowY !== 'visible' &&
          (rect.bottom <= bounds.top || rect.top >= bounds.bottom)
        )
          hidden = true;
        if (
          ancestorStyle.overflowX !== 'visible' &&
          (rect.right <= bounds.left || rect.left >= bounds.right)
        )
          hidden = true;
        ancestors.unshift(ancestor);
        ancestor = ancestor.parentElement;
      }
      if (hidden) continue;
      let background = [255, 255, 255];
      const layers: { opacity: number; background: number[] }[] = [];
      for (const parent of ancestors) {
        const parentStyle = getComputedStyle(parent);
        if (Number(parentStyle.opacity) < 1)
          layers.push({ opacity: Number(parentStyle.opacity), background });
        background = blend(rgb(parentStyle.backgroundColor), background);
      }
      const applyOpacity = (paint: number[]) => {
        for (const layer of layers.toReversed())
          paint = blend([...paint, layer.opacity], layer.background);
        return paint;
      };
      const paintedBackground = applyOpacity(background);
      if (element.matches('input, textarea, select')) {
        const check = (color: string, minimum: number, label: string) => {
          const foreground = luminance(applyOpacity(blend(rgb(color), background)));
          const surface = luminance(paintedBackground);
          const ratio =
            (Math.max(foreground, surface) + 0.05) / (Math.min(foreground, surface) + 0.05);
          if (ratio < minimum) failures.push({ text: label, color, background, ratio });
        };
        if (element.matches(':focus-visible')) check(style.outlineColor, 3, 'Keyboard focus');
        if (element.getAttribute('placeholder'))
          check(getComputedStyle(element, '::placeholder').color, 4.5, 'Input placeholder');
        if (
          style.borderTopStyle !== 'none' &&
          Number.parseFloat(style.borderTopWidth) > 0 &&
          (rgb(style.borderTopColor)[3] ?? 1) > 0
        )
          check(style.borderTopColor, 3, 'Input boundary');
      }
      const a = luminance(applyOpacity(blend(rgb(style.color), background)));
      const b = luminance(paintedBackground);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const large =
        Number.parseFloat(style.fontSize) >= 24 ||
        (Number.parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700);
      if (ratio < (icon || large ? 3 : 4.5))
        failures.push({
          text: icon ?? element.textContent!.trim().slice(0, 70),
          color: style.color,
          background,
          ratio,
        });
    }
    return failures;
  }, rootSelector);
}
