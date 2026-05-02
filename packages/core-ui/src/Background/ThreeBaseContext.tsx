/* eslint-disable react-refresh/only-export-components -- useThreeBase is a hook, tightly coupled to this provider */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './DynamicBackground3D.css';

export interface ThreeBaseLayer {
  id: string;
  order: number;
  getViewport?: () => { x: number; y: number; width: number; height: number } | null;
  tick: (renderer: THREE.WebGLRenderer, deltaMs: number) => void;
}

interface ThreeBaseContextValue {
  renderer: THREE.WebGLRenderer | null;
  registerLayer: (layer: ThreeBaseLayer) => void;
  unregisterLayer: (id: string) => void;
  isReady: boolean;
}

const ThreeBaseContext = createContext<ThreeBaseContextValue | null>(null);

export function useThreeBase(): ThreeBaseContextValue | null {
  return useContext(ThreeBaseContext);
}

export function ThreeBaseProvider({ children }: { children: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);
  const layersRef = useRef<Map<string, ThreeBaseLayer>>(new Map());
  const rafRef = useRef<number | null>(null);
  const clockRef = useRef(new THREE.Clock());

  const registerLayer = useCallback((layer: ThreeBaseLayer) => {
    layersRef.current.set(layer.id, layer);
  }, []);

  const unregisterLayer = useCallback((id: string) => {
    layersRef.current.delete(id);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    let isDisposed = false;
    let rendererInstance: THREE.WebGLRenderer;

    try {
      rendererInstance = new THREE.WebGLRenderer({
        canvas: canvasRef.current!,
        antialias: true,
        alpha: true,
        powerPreference: 'low-power',
      });
    } catch {
      return;
    }

    rendererInstance.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    rendererInstance.setSize(window.innerWidth, window.innerHeight);
    rendererInstance.setClearColor(0x000000, 0);
    rendererInstance.autoClear = true;
    rendererInstance.domElement.style.pointerEvents = 'none';
    rendererInstance.domElement.style.position = 'fixed';
    rendererInstance.domElement.style.inset = '0';
    rendererInstance.domElement.style.zIndex = '-1';
    rendererInstance.domElement.style.width = '100%';
    rendererInstance.domElement.style.height = '100%';

    rendererRef.current = rendererInstance;
    queueMicrotask(() => {
      if (!isDisposed) {
        setRenderer(rendererInstance);
      }
    });

    const handleResize = () => {
      rendererInstance.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const deltaMs = clockRef.current.getDelta() * 1000;
      const layers = Array.from(layersRef.current.values()).sort((a, b) => a.order - b.order);

      for (const layer of layers) {
        const viewport = layer.getViewport?.();
        if (viewport && viewport.width > 0 && viewport.height > 0) {
          rendererInstance.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);
          rendererInstance.setScissor(viewport.x, viewport.y, viewport.width, viewport.height);
          rendererInstance.setScissorTest(true);
        } else if (layer.getViewport) {
          rendererInstance.setViewport(0, 0, window.innerWidth, window.innerHeight);
          rendererInstance.setScissorTest(false);
        } else {
          rendererInstance.setViewport(0, 0, window.innerWidth, window.innerHeight);
          rendererInstance.setScissorTest(false);
        }
        layer.tick(rendererInstance, deltaMs);
      }
    };
    animate();

    return () => {
      isDisposed = true;
      window.removeEventListener('resize', handleResize);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rendererInstance.dispose();
      rendererRef.current = null;
    };
  }, []);

  const value: ThreeBaseContextValue = {
    renderer,
    registerLayer,
    unregisterLayer,
    isReady: renderer !== null,
  };

  return (
    <ThreeBaseContext.Provider value={value}>
      <div ref={mountRef} className="dynamic-background-container">
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>
      {children}
    </ThreeBaseContext.Provider>
  );
}
