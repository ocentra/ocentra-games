import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createRubikCubeController } from './rubikCubeLogic';
import './RubikBannerCube.css';

export interface RubikBannerCubeProps {
  images: (HTMLCanvasElement | HTMLImageElement | string)[];
  targetIndex: number;
  splitMode?: boolean;
  renderScale?: number;
  onRevealComplete?: () => void;
  onIdleComplete?: () => void;
  onReadyChange?: (ready: boolean) => void;
}

const FALLBACK_COLUMNS = 5;
const FALLBACK_ROWS = 3;
const FALLBACK_REVEAL_MS = 820;
const FALLBACK_IDLE_MS = 3000;

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

type FallbackState = {
  activeIndex: number;
  previousIndex: number | null;
  generation: number;
  animating: boolean;
};

function backgroundImageUrl(src: string): string {
  return `url(${JSON.stringify(src)})`;
}

function SlicedRubikFallback({
  images,
  targetIndex,
  onIdleComplete,
  onReadyChange,
  onRevealComplete,
}: {
  images: (HTMLCanvasElement | HTMLImageElement | string)[];
  targetIndex: number;
  onIdleComplete?: () => void;
  onReadyChange?: (ready: boolean) => void;
  onRevealComplete?: () => void;
}) {
  const imageUrls = useMemo(
    () => images.filter((source): source is string => typeof source === 'string'),
    [images],
  );
  const safeTargetIndex = clamp(targetIndex, 0, Math.max(0, imageUrls.length - 1));
  const [state, setState] = useState<FallbackState>({
    activeIndex: safeTargetIndex,
    previousIndex: null,
    generation: 0,
    animating: false,
  });
  const onIdleCompleteRef = useRef(onIdleComplete);
  const onRevealCompleteRef = useRef(onRevealComplete);
  const onReadyChangeRef = useRef(onReadyChange);
  const imageKey = imageUrls.join('|');
  const previousImageKeyRef = useRef(imageKey);

  useEffect(() => {
    onIdleCompleteRef.current = onIdleComplete;
    onRevealCompleteRef.current = onRevealComplete;
    onReadyChangeRef.current = onReadyChange;
  }, [onIdleComplete, onReadyChange, onRevealComplete]);

  useEffect(() => {
    onReadyChangeRef.current?.(false);
    const frameId = requestAnimationFrame(() => {
      onReadyChangeRef.current?.(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, [imageKey]);

  useEffect(() => {
    if (previousImageKeyRef.current !== imageKey) {
      previousImageKeyRef.current = imageKey;
      setState((prev) => ({
        activeIndex: safeTargetIndex,
        previousIndex: null,
        generation: prev.generation + 1,
        animating: false,
      }));
      return;
    }

    setState((prev) => {
      if (prev.activeIndex === safeTargetIndex) {
        return prev;
      }
      return {
        activeIndex: safeTargetIndex,
        previousIndex: prev.activeIndex,
        generation: prev.generation + 1,
        animating: true,
      };
    });
  }, [imageKey, safeTargetIndex]);

  useEffect(() => {
    if (!state.animating) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setState((prev) => {
        if (prev.generation !== state.generation) {
          return prev;
        }
        return {
          ...prev,
          previousIndex: null,
          animating: false,
        };
      });
      onRevealCompleteRef.current?.();
    }, FALLBACK_REVEAL_MS + 360);

    return () => window.clearTimeout(timeoutId);
  }, [state.animating, state.generation]);

  useEffect(() => {
    if (state.animating || imageUrls.length <= 1) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onIdleCompleteRef.current?.();
    }, FALLBACK_IDLE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [imageUrls.length, state.activeIndex, state.animating, state.generation]);

  const activeImage = imageUrls[state.activeIndex] ?? imageUrls[0];
  const previousImage = state.previousIndex == null ? null : imageUrls[state.previousIndex];
  const tiles = useMemo(
    () => Array.from({ length: FALLBACK_COLUMNS * FALLBACK_ROWS }, (_, index) => {
      const col = index % FALLBACK_COLUMNS;
      const row = Math.floor(index / FALLBACK_COLUMNS);
      const seed = (col * 17 + row * 29 + state.generation * 11) % 13;
      const delay = (col * 38 + row * 64 + seed * 12) % 330;
      const x = ((seed % 3) - 1) * 1.1;
      const y = (((seed + col) % 3) - 1) * 0.8;
      const rotation = ((seed % 5) - 2) * 4.5;
      return { col, delay, index, rotation, row, x, y };
    }),
    [state.generation],
  );

  if (!activeImage) {
    return <div className="rubik-banner-cube rubik-banner-cube--fallback rubik-banner-cube--ready" aria-hidden="true" />;
  }

  return (
    <div
      className="rubik-banner-cube rubik-banner-cube--fallback rubik-banner-cube--sliced rubik-banner-cube--ready"
      aria-hidden="true"
    >
      <div
        className="rubik-banner-fallback-base"
        style={{ backgroundImage: backgroundImageUrl(activeImage) }}
      />
      {previousImage ? (
        <div
          key={`previous-${state.generation}`}
          className="rubik-banner-fallback-previous"
          style={{ backgroundImage: backgroundImageUrl(previousImage) }}
        />
      ) : null}
      {state.animating ? (
        <div
          key={`tiles-${state.generation}`}
          className="rubik-banner-fallback-slices"
          style={{
            '--fallback-cols': FALLBACK_COLUMNS,
            '--fallback-rows': FALLBACK_ROWS,
          } as CSSProperties}
        >
          {tiles.map(({ col, delay, index, rotation, row, x, y }) => (
            <div
              key={index}
              className="rubik-banner-fallback-tile"
              style={{
                '--fallback-delay': `${delay}ms`,
                '--fallback-x': `${x}rem`,
                '--fallback-y': `${y}rem`,
                '--fallback-rot': `${rotation}deg`,
                backgroundImage: backgroundImageUrl(activeImage),
                backgroundPosition: `${(col / (FALLBACK_COLUMNS - 1)) * 100}% ${(row / (FALLBACK_ROWS - 1)) * 100}%`,
              } as CSSProperties}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function RubikBannerCube({
  images,
  targetIndex,
  splitMode = true,
  renderScale = 1,
  onRevealComplete,
  onIdleComplete,
  onReadyChange,
}: RubikBannerCubeProps) {
  const [useFallback, setUseFallback] = useState(() => !canUseWebGL());
  const [isReady, setIsReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<ReturnType<typeof createRubikCubeController> | null>(null);
  const prevTargetRef = useRef<number | null>(null);
  const hasInitializedRef = useRef(false);
  const loadedSourceKeyRef = useRef('');
  const readyGenerationRef = useRef(0);
  const initialRenderScaleRef = useRef(renderScale);
  const onIdleCompleteRef = useRef(onIdleComplete);
  const onRevealCompleteRef = useRef(onRevealComplete);
  const onReadyChangeRef = useRef(onReadyChange);
  const sourceKey = useMemo(
    () => images.map((source, index) => (typeof source === 'string' ? source : `object-source-${index}`)).join('|'),
    [images],
  );
  useEffect(() => {
    onIdleCompleteRef.current = onIdleComplete;
    onRevealCompleteRef.current = onRevealComplete;
    onReadyChangeRef.current = onReadyChange;
  }, [onIdleComplete, onReadyChange, onRevealComplete]);

  const setReadyState = useCallback((ready: boolean) => {
    setIsReady(ready);
    onReadyChangeRef.current?.(ready);
  }, []);

  const scheduleReady = useCallback((generation: number) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (readyGenerationRef.current === generation) {
          setReadyState(true);
        }
      });
    });
  }, [setReadyState]);

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
      sideTextureBlurPx: 1.5,
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
    const loadKey = `${splitMode ? 'split' : 'faces'}:${sourceKey}`;
    if (loadedSourceKeyRef.current === loadKey) return;

    const generation = readyGenerationRef.current + 1;
    readyGenerationRef.current = generation;
    setReadyState(false);

    const promise = splitMode
      ? controllerRef.current.setItemsForSplit(images)
      : controllerRef.current.setImages(images);
    promise.then(() => {
      if (readyGenerationRef.current !== generation) return;
      loadedSourceKeyRef.current = loadKey;
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
      scheduleReady(generation);
    }).catch(() => {
      if (readyGenerationRef.current === generation) {
        setReadyState(false);
        setUseFallback(true);
      }
    });
  }, [images, scheduleReady, setReadyState, sourceKey, splitMode, targetIndex, useFallback]);

  useEffect(() => {
    if (useFallback) return;
    if (!controllerRef.current || !hasInitializedRef.current) return;
    if (prevTargetRef.current === targetIndex) return;

    const ok = controllerRef.current.revealToIndex(targetIndex);
    if (ok) prevTargetRef.current = targetIndex;
  }, [targetIndex, useFallback]);

  if (useFallback) {
    return (
      <SlicedRubikFallback
        images={images}
        targetIndex={targetIndex}
        onIdleComplete={onIdleComplete}
        onReadyChange={onReadyChange}
        onRevealComplete={onRevealComplete}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`rubik-banner-cube ${isReady ? 'rubik-banner-cube--ready' : ''}`}
      aria-hidden="true"
    />
  );
}

