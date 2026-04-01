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
  const [isReady, setIsReady] = useState(false);
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
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current!,
        antialias: true,
        alpha: true,
        powerPreference: 'low-power',
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = true;
    renderer.domElement.style.pointerEvents = 'none';
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.zIndex = '-1';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    rendererRef.current = renderer;
    setIsReady(true);

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const deltaMs = clockRef.current.getDelta() * 1000;
      const layers = Array.from(layersRef.current.values()).sort((a, b) => a.order - b.order);

      for (const layer of layers) {
        const viewport = layer.getViewport?.();
        if (viewport && viewport.width > 0 && viewport.height > 0) {
          renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);
          renderer.setScissor(viewport.x, viewport.y, viewport.width, viewport.height);
          renderer.setScissorTest(true);
        } else if (layer.getViewport) {
          renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
          renderer.setScissorTest(false);
        } else {
          renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
          renderer.setScissorTest(false);
        }
        layer.tick(renderer, deltaMs);
      }
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      rendererRef.current = null;
      setIsReady(false);
    };
  }, []);

  const value: ThreeBaseContextValue = {
    renderer: rendererRef.current,
    registerLayer,
    unregisterLayer,
    isReady,
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
