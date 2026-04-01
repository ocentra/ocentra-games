import { useEffect, useRef, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const NO_DRAG = 'button, a, input, select, [role="button"]';

export const TitleBarDragHandler: React.FC<{ containerRef: React.RefObject<HTMLElement | null> }> = ({ containerRef }) => {
  const [mounted, setMounted] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    if (!isTauri || !mounted) return;
    const el = containerRef.current;
    if (!el) return;
    const handleMouseDown = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(NO_DRAG)) return;
      if (e.button !== 0) return;
      try {
        await getCurrentWindow().startDragging();
      } catch {
        /* ignore */
      }
    };
    el.addEventListener('mousedown', handleMouseDown, { capture: true });
    return () => el.removeEventListener('mousedown', handleMouseDown, { capture: true });
  }, [containerRef, mounted]);

  return null;
};
