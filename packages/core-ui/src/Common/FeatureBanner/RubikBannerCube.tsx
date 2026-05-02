import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRubikCubeController } from './rubikCubeLogic';
import './RubikBannerCube.css';

export interface RubikBannerCubeProps {
  images: (HTMLCanvasElement | HTMLImageElement | string)[];
  targetIndex: number;
  splitMode?: boolean;
  renderScale?: number;
  onRevealComplete?: () => void;
  onIdleComplete?: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function canUseWebGL(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const canvas = document.createElement('canvas');
    const context =
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return Boolean(context);
  } catch {
    return false;
  }
}

export function RubikBannerCube({
  images,
  targetIndex,
  splitMode = true,
  renderScale = 1,
  onRevealComplete,
  onIdleComplete,
}: RubikBannerCubeProps) {
  const [useFallback, setUseFallback] = useState(() => !canUseWebGL());
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<ReturnType<typeof createRubikCubeController> | null>(null);
  const prevTargetRef = useRef<number | null>(null);
  const hasInitializedRef = useRef(false);
  const initialRenderScaleRef = useRef(renderScale);
  const onIdleCompleteRef = useRef(onIdleComplete);
  const onRevealCompleteRef = useRef(onRevealComplete);
  const fallbackImage = useMemo(() => {
    const source = images[targetIndex] ?? images[0];
    return typeof source === 'string' ? source : null;
  }, [images, targetIndex]);

  useEffect(() => {
    onIdleCompleteRef.current = onIdleComplete;
    onRevealCompleteRef.current = onRevealComplete;
  }, [onIdleComplete, onRevealComplete]);

  useLayoutEffect(() => {
    if (useFallback) {
      return;
    }

    const safeRenderScale = clamp(initialRenderScaleRef.current, 1, 4);
    const controller = createRubikCubeController({
      split: 3,
      steps: 8,
      totalDurationSeconds: 2.0,
      rotationXDeg: -18,
      rotationYDeg: 55,
      rotationZDeg: 5,
      maxTextureSize: Math.round(256 * safeRenderScale),
      idleDriftSec: 3,
      renderPixelScale: safeRenderScale,
    });
    controllerRef.current = controller;
    try {
      controller.setContainer(containerRef.current);
    } catch {
      queueMicrotask(() => setUseFallback(true));
      controller.dispose();
      controllerRef.current = null;
      return () => {
        controller.dispose();
      };
    }
    controller.setOnRevealComplete(() => {
      controller.startIdleSequence(() => onIdleCompleteRef.current?.());
      onRevealCompleteRef.current?.();
    });

    return () => {
      controller.setOnRevealComplete(null);
      controller.dispose();
      controllerRef.current = null;
    };
  }, [useFallback]);

  useEffect(() => {
    if (!controllerRef.current) return;
    const safeRenderScale = clamp(renderScale, 1, 4);
    controllerRef.current.setConfig({
      maxTextureSize: Math.round(256 * safeRenderScale),
      renderPixelScale: safeRenderScale,
    });
  }, [renderScale]);

  useEffect(() => {
    if (useFallback) return;
    if (!controllerRef.current) return;
    if (splitMode && images.length < 1) return;
    if (!splitMode && images.length < 6) return;

    const promise = splitMode
      ? controllerRef.current.setItemsForSplit(images)
      : controllerRef.current.setImages(images);
    promise.then(() => {
      hasInitializedRef.current = true;
      if (prevTargetRef.current == null && targetIndex > 0) {
        prevTargetRef.current = 0;
        controllerRef.current?.revealToIndex(targetIndex);
      } else if (prevTargetRef.current == null && targetIndex === 0) {
        prevTargetRef.current = 0;
        setTimeout(() => {
          controllerRef.current?.startIdleSequence(() => onIdleCompleteRef.current?.());
        }, 400);
      }
    });
  }, [images, splitMode, targetIndex, useFallback]);

  useEffect(() => {
    if (useFallback) return;
    if (!controllerRef.current || !hasInitializedRef.current) return;
    if (prevTargetRef.current === targetIndex) return;

    const ok = controllerRef.current.revealToIndex(targetIndex);
    if (ok) prevTargetRef.current = targetIndex;
  }, [targetIndex, useFallback]);

  if (useFallback && fallbackImage) {
    return (
      <div className="rubik-banner-cube rubik-banner-cube--fallback" aria-hidden="true">
        <img src={fallbackImage} alt="" className="rubik-banner-cube-fallback-image" />
      </div>
    );
  }

  return <div ref={containerRef} className="rubik-banner-cube" aria-hidden="true" />;
}

