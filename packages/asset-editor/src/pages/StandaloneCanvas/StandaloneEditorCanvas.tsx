import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  readStoredLayoutEditorCameraState,
  writeStoredLayoutEditorCameraState,
  type LayoutEditorCanvasCameraState,
} from '@/utils/layoutEditorPreferences';

export interface ResolutionOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface StandaloneEditorCanvasProps {
  assetPath: string;
  playerCount: number;
  minPlayerCount: number;
  maxPlayerCount: number;
  showHandles: boolean;
  onPlayerCountChange: (count: number) => void;
  onShowHandlesChange: (value: boolean) => void;
  onCopyPreset: (sourceCount: number) => void;
  showArenaGuide: boolean;
  onShowArenaGuideChange: (value: boolean) => void;
  resolution: string;
  onResolutionChange: (value: string) => void;
  showStudio: boolean;
  onShowStudioChange: (value: boolean) => void;
  isPortrait: boolean;
  onIsPortraitChange: (value: boolean) => void;
  customWidth: number;
  onCustomWidthChange: (value: number) => void;
  customHeight: number;
  onCustomHeightChange: (value: number) => void;
  resolutions: ResolutionOption[];
  onAddCustomDevice: (name: string, width: number, height: number) => void;
  onShowEditorView: () => void;
  viewport: CanvasViewportSize;
  resolutionLabel: string;
  hideTools?: boolean;
  children: React.ReactNode;
}

interface StandaloneCanvasMenuBarProps {
  playerCount: number;
  minPlayerCount: number;
  maxPlayerCount: number;
  showHandles: boolean;
  onPlayerCountChange: (count: number) => void;
  onShowHandlesChange: (value: boolean) => void;
  onCopyPreset: (sourceCount: number) => void;
  showArenaGuide: boolean;
  onShowArenaGuideChange: (value: boolean) => void;
  resolution: string;
  onResolutionChange: (value: string) => void;
  showStudio: boolean;
  onShowStudioChange: (value: boolean) => void;
  isPortrait: boolean;
  onIsPortraitChange: (value: boolean) => void;
  customWidth: number;
  onCustomWidthChange: (value: number) => void;
  customHeight: number;
  onCustomHeightChange: (value: number) => void;
  resolutions: ResolutionOption[];
  onAddCustomDevice: (name: string, width: number, height: number) => void;
  onShowEditorView: () => void;
  zoomPercent: number;
  onFitCamera: () => void;
  onActualSizeCamera: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
}

interface CanvasViewportSize {
  w: number;
  h: number;
}

const MIN_CAMERA_ZOOM = 0.25;
const MAX_CAMERA_ZOOM = 8;
const CAMERA_STEP_FACTOR = 1.15;
const CANVAS_VIEWPORT_PADDING = 40;
const CANVAS_LABEL_RESERVE = 40;

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createDefaultCameraState(): LayoutEditorCanvasCameraState {
  return {
    zoom: 1,
    panX: 0,
    panY: 0,
  };
}

function getViewportSignature(viewport: CanvasViewportSize): string {
  return `${Math.round(viewport.w)}x${Math.round(viewport.h)}`;
}

function clampCameraState(
  state: LayoutEditorCanvasCameraState,
  viewport: CanvasViewportSize,
  fitScale: number,
  container: { width: number; height: number },
): LayoutEditorCanvasCameraState {
  const zoom = clampNumber(state.zoom, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM);
  const effectiveScale = fitScale * zoom;
  const contentWidth = viewport.w * effectiveScale;
  const contentHeight = viewport.h * effectiveScale;
  const clampAxis = (pan: number, containerSize: number, contentSize: number): number => {
    if (!Number.isFinite(containerSize) || containerSize <= 0) {
      return 0;
    }
    const baseOffset = (containerSize - contentSize) * 0.5;
    const minVisible = Math.min(
      Math.max(Math.min(containerSize * 0.12, 160), 64),
      Math.max(contentSize * 0.25, 24),
    );
    const overscroll = Math.min(
      Math.max(containerSize * 0.1, 48),
      Math.max(contentSize * 0.5, 48),
    );
    const minPan = minVisible - (baseOffset + contentSize) - overscroll;
    const maxPan = containerSize - minVisible - baseOffset + overscroll;
    return clampNumber(pan, minPan, maxPan);
  };
  return {
    zoom,
    panX: clampAxis(state.panX, container.width, contentWidth),
    panY: clampAxis(state.panY, container.height, contentHeight),
  };
}

function resolveCopySourceCount(
  requestedCount: number,
  playerCount: number,
  minPlayerCount: number,
  maxPlayerCount: number,
): number {
  const clampedRequested = Math.max(minPlayerCount, Math.min(maxPlayerCount, requestedCount));
  const fallback = Math.max(minPlayerCount, Math.min(maxPlayerCount, playerCount - 1));
  if (clampedRequested !== playerCount) {
    return clampedRequested;
  }
  return fallback === playerCount ? minPlayerCount : fallback;
}

const StandaloneCanvasMenuBar: React.FC<StandaloneCanvasMenuBarProps> = ({
  playerCount,
  minPlayerCount,
  maxPlayerCount,
  showHandles,
  onPlayerCountChange,
  onShowHandlesChange,
  onCopyPreset,
  showArenaGuide,
  onShowArenaGuideChange,
  resolution,
  onResolutionChange,
  showStudio,
  onShowStudioChange,
  isPortrait,
  onIsPortraitChange,
  customWidth,
  onCustomWidthChange,
  customHeight,
  onCustomHeightChange,
  resolutions,
  onAddCustomDevice,
  onShowEditorView,
  zoomPercent,
  onFitCamera,
  onActualSizeCamera,
  onZoomOut,
  onZoomIn,
}) => {
  const counts = useMemo(
    () => Array.from({ length: maxPlayerCount - minPlayerCount + 1 }, (_, index) => minPlayerCount + index),
    [maxPlayerCount, minPlayerCount],
  );
  const sourceCounts = useMemo(
    () => counts.filter((count) => count !== playerCount),
    [counts, playerCount],
  );
  const [copySourceCount, setCopySourceCount] = useState<number>(
    Math.max(minPlayerCount, Math.min(maxPlayerCount, playerCount - 1)),
  );
  const resolvedCopySourceCount = useMemo(
    () => resolveCopySourceCount(copySourceCount, playerCount, minPlayerCount, maxPlayerCount),
    [copySourceCount, maxPlayerCount, minPlayerCount, playerCount],
  );

  const handleCopy = useCallback(() => {
    if (resolvedCopySourceCount !== playerCount) {
      onCopyPreset(resolvedCopySourceCount);
    }
  }, [onCopyPreset, playerCount, resolvedCopySourceCount]);

  return (
    <div className="standalone-canvas-menu-bar">
      <div className="standalone-canvas-menu-bar__group">
        <div className="standalone-canvas-menu-bar__logo">Layout Studio</div>

        <div className="standalone-canvas-menu-bar__menu">
          <span className="standalone-canvas-menu-bar__menu-label">View</span>
          <div className="standalone-canvas-menu-bar__menu-dropdown">
            <button
              className={`standalone-canvas-menu-bar__menu-item ${showArenaGuide ? 'is-active' : ''}`}
              onClick={() => onShowArenaGuideChange(!showArenaGuide)}
            >
              Show Arena Guide
            </button>
            <button
              className={`standalone-canvas-menu-bar__menu-item ${showHandles ? 'is-active' : ''}`}
              onClick={() => onShowHandlesChange(!showHandles)}
            >
              Show Interaction Handles
            </button>
          </div>
        </div>

        <div className="standalone-canvas-menu-bar__menu">
          <span className="standalone-canvas-menu-bar__menu-label">Window</span>
          <div className="standalone-canvas-menu-bar__menu-dropdown">
            <button
              className={`standalone-canvas-menu-bar__menu-item ${showStudio ? 'is-active' : ''}`}
              onClick={() => onShowStudioChange(!showStudio)}
            >
              Design Studio (Inspector)
            </button>
            <button
              className="standalone-canvas-menu-bar__menu-item"
              onClick={onShowEditorView}
            >
              Editor View...
            </button>
          </div>
        </div>
      </div>

      <div className="standalone-canvas-menu-bar__group">
        <label className="standalone-canvas-menu-bar__field">
          <span className="standalone-canvas-menu-bar__label">Players</span>
          <select
            className="standalone-canvas-menu-bar__select"
            value={playerCount}
            onChange={(event) => onPlayerCountChange(Number(event.target.value))}
          >
            {counts.map((count) => (
              <option key={count} value={count}>
                {count} Players
              </option>
            ))}
          </select>
        </label>

        <div className="standalone-canvas-menu-bar__separator" />

        <label className="standalone-canvas-menu-bar__field">
          <span className="standalone-canvas-menu-bar__label">Viewport</span>
          <select
            className="standalone-canvas-menu-bar__select"
            value={resolution}
            onChange={(event) => onResolutionChange(event.target.value)}
          >
            {resolutions.map((option, index) => (
              <option key={`${option.value}-${index}`} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={`standalone-canvas-menu-bar__orientation-btn ${isPortrait ? 'is-active' : ''}`}
          onClick={() => onIsPortraitChange(!isPortrait)}
          title={isPortrait ? 'Switch to Landscape' : 'Switch to Portrait'}
        >
          {isPortrait ? 'Portrait' : 'Landscape'}
        </button>

        {resolution === 'custom' ? (
          <div className="standalone-canvas-menu-bar__custom-group">
            <input
              type="number"
              className="standalone-canvas-menu-bar__input"
              value={customWidth}
              onChange={(event) => onCustomWidthChange(Number(event.target.value))}
              placeholder="W"
            />
            <span className="standalone-canvas-menu-bar__x">x</span>
            <input
              type="number"
              className="standalone-canvas-menu-bar__input"
              value={customHeight}
              onChange={(event) => onCustomHeightChange(Number(event.target.value))}
              placeholder="H"
            />
            <button
              className="standalone-canvas-menu-bar__save"
              onClick={() => {
                const name = prompt('Device Name:', 'Custom Mobile');
                if (name) {
                  onAddCustomDevice(name, customWidth, customHeight);
                }
              }}
            >
              Save
            </button>
          </div>
        ) : null}
      </div>

      <div className="standalone-canvas-menu-bar__group" style={{ marginLeft: 'auto' }}>
        <div className="standalone-canvas-menu-bar__camera-group">
          <button type="button" className="standalone-canvas-menu-bar__btn" onClick={onFitCamera}>
            Fit
          </button>
          <button type="button" className="standalone-canvas-menu-bar__btn" onClick={onActualSizeCamera}>
            100%
          </button>
          <button
            type="button"
            className="standalone-canvas-menu-bar__btn standalone-canvas-menu-bar__btn--icon"
            onClick={onZoomOut}
          >
            -
          </button>
          <div className="standalone-canvas-menu-bar__zoom-readout">{zoomPercent}%</div>
          <button
            type="button"
            className="standalone-canvas-menu-bar__btn standalone-canvas-menu-bar__btn--icon"
            onClick={onZoomIn}
          >
            +
          </button>
        </div>
        {sourceCounts.length > 0 ? (
          <div className="standalone-canvas-menu-bar__copy-group">
            <select
              className="standalone-canvas-menu-bar__select"
              value={copySourceCount}
              onChange={(event) => setCopySourceCount(Number(event.target.value))}
            >
              {sourceCounts.map((count) => (
                <option key={count} value={count}>
                  From {count}P
                </option>
              ))}
            </select>
            <button
              className="standalone-canvas-menu-bar__btn"
              onClick={handleCopy}
            >
              Copy Layout
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const StandaloneEditorCanvas: React.FC<StandaloneEditorCanvasProps> = ({
  assetPath,
  playerCount,
  minPlayerCount,
  maxPlayerCount,
  showHandles,
  onPlayerCountChange,
  onShowHandlesChange,
  onCopyPreset,
  showArenaGuide,
  onShowArenaGuideChange,
  resolution,
  onResolutionChange,
  showStudio,
  onShowStudioChange,
  isPortrait,
  onIsPortraitChange,
  customWidth,
  onCustomWidthChange,
  customHeight,
  onCustomHeightChange,
  resolutions,
  onAddCustomDevice,
  onShowEditorView,
  viewport,
  resolutionLabel,
  hideTools = false,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panGestureRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [cameraEntry, setCameraEntry] = useState<{ key: string; state: LayoutEditorCanvasCameraState }>(() => ({
    key: '',
    state: createDefaultCameraState(),
  }));
  const orientationKey = isPortrait ? 'portrait' : 'landscape';
  const viewportSignature = useMemo(
    () => getViewportSignature(viewport),
    [viewport],
  );
  const cameraViewKey = `${assetPath}:${viewportSignature}:${orientationKey}`;
  const canvasAreaWidth = Math.max(100, containerDimensions.width - CANVAS_VIEWPORT_PADDING * 2);
  const canvasAreaHeight = Math.max(100, containerDimensions.height - CANVAS_VIEWPORT_PADDING * 2 - CANVAS_LABEL_RESERVE);
  const fitScale = useMemo(() => {
    const nextScale = Math.min(
      canvasAreaWidth / Math.max(viewport.w, 1),
      canvasAreaHeight / Math.max(viewport.h, 1),
    );
    return Number.isFinite(nextScale) ? Math.max(nextScale, 0.01) : 1;
  }, [canvasAreaHeight, canvasAreaWidth, viewport.h, viewport.w]);
  const storedCameraState = useMemo(
    () => readStoredLayoutEditorCameraState(assetPath, viewportSignature, orientationKey) ?? createDefaultCameraState(),
    [assetPath, orientationKey, viewportSignature],
  );
  const rawCameraState = cameraEntry.key === cameraViewKey ? cameraEntry.state : storedCameraState;
  const clampedCameraState = useMemo(
    () => clampCameraState(rawCameraState, viewport, fitScale, {
      width: canvasAreaWidth,
      height: canvasAreaHeight,
    }),
    [canvasAreaHeight, canvasAreaWidth, fitScale, rawCameraState, viewport],
  );
  const effectiveScale = fitScale * clampedCameraState.zoom;
  const canvasDisplayWidth = viewport.w * effectiveScale;
  const canvasDisplayHeight = viewport.h * effectiveScale;
  const centeredOffsetX = CANVAS_VIEWPORT_PADDING + (canvasAreaWidth - canvasDisplayWidth) * 0.5;
  const centeredOffsetY = CANVAS_VIEWPORT_PADDING + (canvasAreaHeight - canvasDisplayHeight) * 0.5;
  const simulationShellVars = useMemo<React.CSSProperties>(() => {
    const simulatedRootFontPx = clampNumber(13 + viewport.w * 0.0028, 14, 18);
    const mobileShellBreakpointPx = simulatedRootFontPx * 48;
    const useMobileFooterProfile = viewport.w <= mobileShellBreakpointPx;
    const footerMinHeightPx = useMobileFooterProfile
      ? clampNumber(viewport.h * 0.0275, simulatedRootFontPx * 1.5, simulatedRootFontPx * 2.1)
      : clampNumber(viewport.h * 0.0325, simulatedRootFontPx * 1.75, simulatedRootFontPx * 2.5);
    const footerTextSizePx = useMobileFooterProfile
      ? clampNumber(
          simulatedRootFontPx * 0.62 + viewport.w * 0.0012,
          simulatedRootFontPx * 0.64,
          simulatedRootFontPx * 0.74,
        )
      : clampNumber(
          simulatedRootFontPx * 0.64 + viewport.w * 0.0016,
          simulatedRootFontPx * 0.68,
          simulatedRootFontPx * 0.8,
        );
    const footerTextGapPx = useMobileFooterProfile ? simulatedRootFontPx * 0.22 : simulatedRootFontPx * 0.3;

    return {
      '--oc-sim-footer-min-height': `${footerMinHeightPx}px`,
      '--oc-sim-footer-text-size': `${footerTextSizePx}px`,
      '--oc-sim-footer-text-gap': `${footerTextGapPx}px`,
    } as React.CSSProperties;
  }, [viewport]);

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) {
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      setContainerDimensions({
        width: rect.width,
        height: rect.height,
      });
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    writeStoredLayoutEditorCameraState(assetPath, viewportSignature, orientationKey, clampedCameraState);
  }, [assetPath, clampedCameraState, orientationKey, viewportSignature]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setSpacePressed(true);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setSpacePressed(false);
      }
    };
    const handleBlur = () => {
      setSpacePressed(false);
      setIsPanning(false);
      panGestureRef.current = null;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const updateCameraState = useCallback((updater: (current: LayoutEditorCanvasCameraState) => LayoutEditorCanvasCameraState) => {
    setCameraEntry({
      key: cameraViewKey,
      state: clampCameraState(updater(clampedCameraState), viewport, fitScale, {
        width: canvasAreaWidth,
        height: canvasAreaHeight,
      }),
    });
  }, [cameraViewKey, canvasAreaHeight, canvasAreaWidth, clampedCameraState, fitScale, viewport]);

  const applyZoomAtPoint = useCallback((nextZoom: number, pointerX?: number, pointerY?: number) => {
    const targetZoom = clampNumber(nextZoom, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM);
    updateCameraState((current) => {
      if (Math.abs(current.zoom - targetZoom) < 0.0001) {
        return current;
      }
      const resolvedPointerX = pointerX ?? (CANVAS_VIEWPORT_PADDING + canvasAreaWidth * 0.5);
      const resolvedPointerY = pointerY ?? (CANVAS_VIEWPORT_PADDING + canvasAreaHeight * 0.5);
      const oldScale = fitScale * current.zoom;
      const newScale = fitScale * targetZoom;
      const oldBaseX = CANVAS_VIEWPORT_PADDING + (canvasAreaWidth - viewport.w * oldScale) * 0.5;
      const oldBaseY = CANVAS_VIEWPORT_PADDING + (canvasAreaHeight - viewport.h * oldScale) * 0.5;
      const newBaseX = CANVAS_VIEWPORT_PADDING + (canvasAreaWidth - viewport.w * newScale) * 0.5;
      const newBaseY = CANVAS_VIEWPORT_PADDING + (canvasAreaHeight - viewport.h * newScale) * 0.5;
      const worldX = (resolvedPointerX - oldBaseX - current.panX) / Math.max(oldScale, 0.0001);
      const worldY = (resolvedPointerY - oldBaseY - current.panY) / Math.max(oldScale, 0.0001);
      return {
        zoom: targetZoom,
        panX: resolvedPointerX - newBaseX - worldX * newScale,
        panY: resolvedPointerY - newBaseY - worldY * newScale,
      };
    });
  }, [canvasAreaHeight, canvasAreaWidth, fitScale, updateCameraState, viewport.h, viewport.w]);

  const handleFitCamera = useCallback(() => {
    setCameraEntry({
      key: cameraViewKey,
      state: createDefaultCameraState(),
    });
  }, [cameraViewKey]);

  const handleActualSizeCamera = useCallback(() => {
    setCameraEntry({
      key: cameraViewKey,
      state: clampCameraState({
        zoom: clampNumber(1 / Math.max(fitScale, 0.0001), MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM),
        panX: 0,
        panY: 0,
      }, viewport, fitScale, {
        width: canvasAreaWidth,
        height: canvasAreaHeight,
      }),
    });
  }, [cameraViewKey, canvasAreaHeight, canvasAreaWidth, fitScale, viewport]);

  const handleZoomStep = useCallback((direction: 1 | -1) => {
    const factor = direction > 0 ? CAMERA_STEP_FACTOR : 1 / CAMERA_STEP_FACTOR;
    applyZoomAtPoint(clampedCameraState.zoom * factor);
  }, [applyZoomAtPoint, clampedCameraState.zoom]);

  const handleCanvasWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    const pointerX = rect ? event.clientX - rect.left : undefined;
    const pointerY = rect ? event.clientY - rect.top : undefined;
    const zoomFactor = Math.exp(-event.deltaY * 0.0015);
    applyZoomAtPoint(clampedCameraState.zoom * zoomFactor, pointerX, pointerY);
  }, [applyZoomAtPoint, clampedCameraState.zoom]);

  const handleCanvasPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const wantsPan = event.button === 1 || (event.button === 0 && spacePressed);
    if (!wantsPan) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPanning(true);
    panGestureRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: clampedCameraState.panX,
      startPanY: clampedCameraState.panY,
    };
  }, [clampedCameraState.panX, clampedCameraState.panY, spacePressed]);

  const handleCanvasPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!panGestureRef.current || panGestureRef.current.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    const deltaX = event.clientX - panGestureRef.current.startClientX;
    const deltaY = event.clientY - panGestureRef.current.startClientY;
    updateCameraState((current) => ({
      zoom: current.zoom,
      panX: (panGestureRef.current?.startPanX ?? 0) + deltaX,
      panY: (panGestureRef.current?.startPanY ?? 0) + deltaY,
    }));
  }, [updateCameraState]);

  const handleCanvasPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (panGestureRef.current?.pointerId === event.pointerId) {
      panGestureRef.current = null;
      setIsPanning(false);
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  return (
    <>
      {!hideTools ? (
        <StandaloneCanvasMenuBar
          playerCount={playerCount}
          minPlayerCount={minPlayerCount}
          maxPlayerCount={maxPlayerCount}
          showHandles={showHandles}
          onPlayerCountChange={onPlayerCountChange}
          onShowHandlesChange={onShowHandlesChange}
          onCopyPreset={onCopyPreset}
          showArenaGuide={showArenaGuide}
          onShowArenaGuideChange={onShowArenaGuideChange}
          resolution={resolution}
          onResolutionChange={onResolutionChange}
          showStudio={showStudio}
          onShowStudioChange={onShowStudioChange}
          isPortrait={isPortrait}
          onIsPortraitChange={onIsPortraitChange}
          customWidth={customWidth}
          onCustomWidthChange={onCustomWidthChange}
          customHeight={customHeight}
          onCustomHeightChange={onCustomHeightChange}
          resolutions={resolutions}
          onAddCustomDevice={onAddCustomDevice}
          onShowEditorView={onShowEditorView}
          zoomPercent={Math.max(1, Math.round(effectiveScale * 100))}
          onFitCamera={handleFitCamera}
          onActualSizeCamera={handleActualSizeCamera}
          onZoomOut={() => handleZoomStep(-1)}
          onZoomIn={() => handleZoomStep(1)}
        />
      ) : null}

      <div
        className="standalone-canvas-viewport"
        onWheel={handleCanvasWheel}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          position: 'relative',
          padding: `${CANVAS_VIEWPORT_PADDING}px`,
          justifyContent: 'center',
          alignItems: 'center',
          background: '#02040a',
          overflow: 'hidden',
          cursor: isPanning ? 'grabbing' : spacePressed ? 'grab' : 'default',
        }}
        ref={containerRef}
      >
        <div
          style={{
            position: 'absolute',
            top: `${Math.max(centeredOffsetY + clampedCameraState.panY - 22, 8)}px`,
            left: `${centeredOffsetX + clampedCameraState.panX}px`,
            transform: 'translateY(-100%)',
            paddingBottom: '0.375rem',
            fontSize: '11px',
            fontWeight: '600',
            color: '#4ade80',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            opacity: 0.8,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {resolutionLabel}
          <span style={{ opacity: 0.6, marginLeft: '8px' }}>
            {isPortrait ? 'Portrait' : 'Landscape'}
          </span>
        </div>
        <div
          style={{
            width: `${viewport.w}px`,
            height: `${viewport.h}px`,
            transform: `translate(${centeredOffsetX + clampedCameraState.panX}px, ${centeredOffsetY + clampedCameraState.panY}px) scale(${effectiveScale})`,
            transformOrigin: 'top left',
            border: '2px solid #4ade80',
            boxShadow: '0 0 40px rgba(74, 222, 128, 0.15)',
            borderRadius: '4px',
            background: '#050814',
            position: 'absolute',
            left: 0,
            top: 0,
            boxSizing: 'border-box',
            overflow: 'hidden',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              ...simulationShellVars,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
};
