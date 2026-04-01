import { useState, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_LEFT_WIDTH, DEFAULT_RIGHT_WIDTH, MIN_PANEL_WIDTH } from './constants';

export function useAssetEditorLayout() {
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem('asset-editor-left-width');
    return saved ? parseInt(saved, 10) : DEFAULT_LEFT_WIDTH;
  });
  const [rightWidth, setRightWidth] = useState(() => {
    const saved = localStorage.getItem('asset-editor-right-width');
    return saved ? parseInt(saved, 10) : DEFAULT_RIGHT_WIDTH;
  });
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('asset-editor-left-width', leftWidth.toString());
  }, [leftWidth]);

  useEffect(() => {
    localStorage.setItem('asset-editor-right-width', rightWidth.toString());
  }, [rightWidth]);

  useEffect(() => {
    if (containerRef.current) {
      const hasSavedLeft = localStorage.getItem('asset-editor-left-width');
      const hasSavedRight = localStorage.getItem('asset-editor-right-width');
      
      if (!hasSavedLeft || !hasSavedRight) {
        const containerWidth = containerRef.current.offsetWidth || window.innerWidth;
        const defaultLeftPercent = (DEFAULT_LEFT_WIDTH / containerWidth) * 100;
        const defaultRightPercent = (DEFAULT_RIGHT_WIDTH / containerWidth) * 100;
        if (!hasSavedLeft) {
          containerRef.current.style.setProperty('--left-panel-width', `${defaultLeftPercent}%`);
        }
        if (!hasSavedRight) {
          containerRef.current.style.setProperty('--right-panel-width', `${defaultRightPercent}%`);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.setProperty('--left-panel-width', `${leftWidth}px`);
      containerRef.current.style.setProperty('--right-panel-width', `${rightWidth}px`);
    }
  }, [leftWidth, rightWidth]);

  const handleMouseDownLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
  }, []);

  const handleMouseDownRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
  }, []);

  useEffect(() => {
    if (!isResizingLeft && !isResizingRight) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;

      if (isResizingLeft) {
        const newLeftWidth = e.clientX - containerRect.left;
        const clampedWidth = Math.max(MIN_PANEL_WIDTH, Math.min(newLeftWidth, containerWidth - rightWidth - MIN_PANEL_WIDTH));
        setLeftWidth(clampedWidth);
      }

      if (isResizingRight) {
        const newRightWidth = containerRect.right - e.clientX;
        const clampedWidth = Math.max(MIN_PANEL_WIDTH, Math.min(newRightWidth, containerWidth - leftWidth - MIN_PANEL_WIDTH));
        setRightWidth(clampedWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight, leftWidth, rightWidth]);

  return {
    leftWidth,
    rightWidth,
    isResizingLeft,
    isResizingRight,
    containerRef,
    handleMouseDownLeft,
    handleMouseDownRight,
  };
}

