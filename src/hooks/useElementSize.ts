import { useCallback, useState } from 'react';

export interface Size {
  width: number;
  height: number;
}

/**
 * Observe an element's content box. Returns a ref callback to attach and the
 * latest size; used to pick a cell size that fits the available canvas area.
 */
export function useElementSize(): [(node: HTMLElement | null) => void, Size] {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect;
      setSize({ width: box.width, height: box.height });
    });
    observer.observe(node);
    setSize({ width: node.clientWidth, height: node.clientHeight });
    // The observer is torn down when React calls the ref with null on unmount.
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
