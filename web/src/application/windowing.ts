import { useLayoutEffect, useRef, useState } from 'react';

export function visibleRange(
  count: number,
  top: number,
  height: number,
  rowHeight: number,
  overscan = 8,
) {
  const start = Math.min(
    Math.max(0, count - 1),
    Math.max(0, Math.floor(top / rowHeight) - overscan),
  );
  const end = Math.min(count, Math.ceil((top + height) / rowHeight) + overscan);
  return {
    start,
    end: Math.max(start, end),
    before: start * rowHeight,
    after: Math.max(0, count - end) * rowHeight,
  };
}

export function useWindowedRows(count: number, rowHeight: number, selected = -1) {
  const ref = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ top: 0, height: 700 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      setViewport({ top: element.scrollTop, height: element.clientHeight });
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    element.addEventListener('scroll', scroll, { passive: true });
    measure();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      element.removeEventListener('scroll', scroll);
    };
  }, [count > 0]);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || selected < 0) return;
    const top = selected * rowHeight;
    if (top < element.scrollTop) element.scrollTop = top;
    else if (top + rowHeight > element.scrollTop + element.clientHeight)
      element.scrollTop = top + rowHeight - element.clientHeight;
    setViewport({ top: element.scrollTop, height: element.clientHeight });
  }, [selected, rowHeight]);
  return { ref, ...visibleRange(count, viewport.top, viewport.height, rowHeight) };
}
