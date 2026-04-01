import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { useThreeBase } from '@/ui/components/Background/ThreeBaseContext';
import { createRubikCubeController } from './rubikCubeLogic';
import './RubikBannerCube.css';

export interface RubikBannerCubeProps {
  images: (HTMLCanvasElement | HTMLImageElement | string)[];
  targetIndex: number;
  splitMode?: boolean;
  onRevealComplete?: () => void;
  onIdleComplete?: () => void;
}

const log = MainAppLogger.instance;
log.register(import.meta.url);

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
  onRevealComplete,
  onIdleComplete,
}: RubikBannerCubeProps) {
  const threeBase = useThreeBase();
  const [useFallback, setUseFallback] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<ReturnType<typeof createRubikCubeController> | null>(null);
  const prevTargetRef = useRef<number | null>(null);
  const hasInitializedRef = useRef(false);
  const onIdleCompleteRef = useRef(onIdleComplete);
  const onRevealCompleteRef = useRef(onRevealComplete);
  onIdleCompleteRef.current = onIdleComplete;
  onRevealCompleteRef.current = onRevealComplete;
  const fallbackImage = useMemo(() => {
    const source = images[targetIndex] ?? images[0];
    return typeof source === 'string' ? source : null;
  }, [images, targetIndex]);

  useLayoutEffect(() => {
    if (!canUseWebGL()) {
      setUseFallback(true);
      log.logWarn(
        '[RubikBannerCube] WebGL unavailable in current browser, using static image fallback',
        getStackTrace()
      );
      return;
    }

    const useShared = false;
    const controller = createRubikCubeController({
      split: 3,
      steps: 8,
      totalDurationSeconds: 2.0,
      rotationXDeg: -18,
      rotationYDeg: 55,
      rotationZDeg: 5,
      maxTextureSize: 256,
      idleDriftSec: 3,
      useSharedContext: useShared,
    });
    controllerRef.current = controller;
    try {
      controller.setContainer(containerRef.current);
    } catch (error) {
      setUseFallback(true);
      log.logWarn(
        '[RubikBannerCube] WebGL renderer unavailable, falling back to static image',
        getStackTrace(),
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
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

    if (useShared && controller.tick && controller.getScene && controller.getCamera && threeBase) {
      const layerId = 'rubik-banner-cube';
      threeBase.registerLayer({
        id: layerId,
        order: 1,
        getViewport: () => {
          const el = containerRef.current;
          if (!el) return null;
          const r = el.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) return null;
          return {
            x: Math.round(r.left),
            y: Math.round(window.innerHeight - r.bottom),
            width: Math.round(r.width),
            height: Math.round(r.height),
          };
        },
        tick: (renderer, deltaMs) => {
          controller.tick?.(deltaMs);
          const scene = controller.getScene?.();
          const camera = controller.getCamera?.();
          if (scene && camera) {
            const prev = renderer.autoClear;
            renderer.autoClear = false;
            renderer.render(scene, camera);
            renderer.autoClear = prev;
          }
        },
      });
      return () => {
        threeBase.unregisterLayer(layerId);
        controller.setOnRevealComplete(null);
        controller.dispose();
        controllerRef.current = null;
      };
    }

    return () => {
      controller.setOnRevealComplete(null);
      controller.dispose();
      controllerRef.current = null;
    };
  }, [useFallback, threeBase]);

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

