import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import * as THREE from 'three';
import type { SocialWorldPresence, SocialWorldQuickGame } from './SocialWorldTypes';
import './SocialWorldSurface.css';

const WORLD_LIMIT = 36;
const CAMERA_SIZE = 22;
const CAMERA_HEIGHT = 52;
const CAMERA_MIN_SIZE = 8;
const CAMERA_MAX_SIZE = 36;
const PLAYER_SPEED = 10;
const PLAYER_REACH = 0.45;
const CAMERA_PAN_SPEED = 18;
const CAMERA_ZOOM_SPEED = 12;
const CAMERA_WHEEL_ZOOM_STEP = 1.8;
const PAN_DRAG_THRESHOLD = 4;

type SocialWorldSurfaceProps = {
  loading?: boolean;
  error?: string | null;
  presence: SocialWorldPresence;
  quickGames?: SocialWorldQuickGame[];
  favoriteGameIds?: string[];
  onToggleFavorite?: (gameId: string) => void;
  onCreateParty?: () => void;
  onOpenLobby?: (gameId?: string) => void;
  onOpenGame?: (gameId: string) => void;
  onOpenCategory?: (categoryId: string) => void;
  onOpenShop?: () => void;
  onOpenCompetition?: () => void;
  onOpenPlayerHub?: () => void;
  onOpenMatchmaking?: () => void;
};

type SocialWorldPosition = {
  x: number;
  z: number;
};

type SocialWorldPanDirection = 'up' | 'down' | 'left' | 'right';
type SocialWorldZoomDirection = 'in' | 'out';

type SocialWorldDragState = {
  mode: 'move' | 'pan';
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startCameraX: number;
  startCameraZ: number;
  moved: boolean;
};

type SocialWorldViewState = {
  player: SocialWorldPosition;
  camera: SocialWorldPosition;
  target: SocialWorldPosition | null;
  viewportWidth: number;
  viewportHeight: number;
};

const PAN_BUTTONS: { direction: SocialWorldPanDirection; className: string; label: string }[] = [
  { direction: 'up', className: 'social-world__pan-button--up', label: 'Pan up' },
  { direction: 'left', className: 'social-world__pan-button--left', label: 'Pan left' },
  { direction: 'right', className: 'social-world__pan-button--right', label: 'Pan right' },
  { direction: 'down', className: 'social-world__pan-button--down', label: 'Pan down' },
];

const ZOOM_BUTTONS: { direction: SocialWorldZoomDirection; label: string; symbol: string }[] = [
  { direction: 'in', label: 'Zoom in', symbol: '+' },
  { direction: 'out', label: 'Zoom out', symbol: '-' },
];

function getGameInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mapKeyToPanDirection(key: string): SocialWorldPanDirection | null {
  switch (key) {
    case 'arrowup':
    case 'w':
      return 'up';
    case 'arrowdown':
    case 's':
      return 'down';
    case 'arrowleft':
    case 'a':
      return 'left';
    case 'arrowright':
    case 'd':
      return 'right';
    default:
      return null;
  }
}

function createMapPointStyle(position: SocialWorldPosition): CSSProperties {
  return {
    left: `${clamp(((position.x + WORLD_LIMIT) / (WORLD_LIMIT * 2)) * 100, 0, 100)}%`,
    top: `${clamp(((position.z + WORLD_LIMIT) / (WORLD_LIMIT * 2)) * 100, 0, 100)}%`,
  };
}

function createMapViewportStyle(viewState: SocialWorldViewState): CSSProperties {
  const left = clamp(((viewState.camera.x - viewState.viewportWidth * 0.5 + WORLD_LIMIT) / (WORLD_LIMIT * 2)) * 100, 0, 100);
  const top = clamp(((viewState.camera.z - viewState.viewportHeight * 0.5 + WORLD_LIMIT) / (WORLD_LIMIT * 2)) * 100, 0, 100);
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${clamp((viewState.viewportWidth / (WORLD_LIMIT * 2)) * 100, 5, 100)}%`,
    height: `${clamp((viewState.viewportHeight / (WORLD_LIMIT * 2)) * 100, 5, 100)}%`,
  };
}

function createMaterial(color: string, roughness = 0.78): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness: 0.04,
    flatShading: true,
  });
}

function disposeMaterial(material: THREE.Material): void {
  material.dispose();
}

function disposeScene(scene: THREE.Scene): void {
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      if (Array.isArray(object.material)) object.material.forEach(disposeMaterial);
      else disposeMaterial(object.material);
    }
  });
}

function buildPlayerMarker(): THREE.Group {
  const group = new THREE.Group();
  const shadow = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.04, 24), createMaterial('#050806', 0.95));
  shadow.position.y = 0.03;

  const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 24), createMaterial('#4ade80', 0.6));
  marker.position.y = 0.1;
  marker.castShadow = true;

  const center = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 18), createMaterial('#d9f99d', 0.66));
  center.position.y = 0.18;
  center.castShadow = true;

  group.add(shadow, marker, center);
  return group;
}

function usePlainSocialWorld() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const panDirectionsRef = useRef(new Set<SocialWorldPanDirection>());
  const zoomDirectionsRef = useRef(new Set<SocialWorldZoomDirection>());
  const playerPositionRef = useRef<SocialWorldPosition>({ x: 0, z: 0 });
  const targetPositionRef = useRef<SocialWorldPosition | null>(null);
  const cameraPositionRef = useRef<SocialWorldPosition>({ x: 0, z: 0 });
  const cameraSizeRef = useRef(CAMERA_SIZE);
  const dragStateRef = useRef<SocialWorldDragState | null>(null);
  const [viewState, setViewState] = useState<SocialWorldViewState>({
    player: { x: 0, z: 0 },
    camera: { x: 0, z: 0 },
    target: null,
    viewportWidth: CAMERA_SIZE * 2,
    viewportHeight: CAMERA_SIZE * 2,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07120f);
    scene.fog = new THREE.Fog(0x07120f, 38, 78);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const camera = new THREE.OrthographicCamera(-CAMERA_SIZE, CAMERA_SIZE, CAMERA_SIZE, -CAMERA_SIZE, 0.1, 120);
    camera.up.set(0, 0, -1);

    const ambient = new THREE.HemisphereLight(0xe8fff0, 0x111815, 1.2);
    const light = new THREE.DirectionalLight(0xfff0c4, 1.75);
    light.position.set(0, CAMERA_HEIGHT, 0);
    light.castShadow = true;
    scene.add(ambient, light);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_LIMIT * 2.4, WORLD_LIMIT * 2.4), createMaterial('#10281f', 0.96));
    ground.rotation.x = -Math.PI * 0.5;
    ground.receiveShadow = true;
    scene.add(ground);

    const playerGroup = buildPlayerMarker();
    scene.add(playerGroup);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let cameraWorldWidth = CAMERA_SIZE * 2;
    let cameraWorldHeight = CAMERA_SIZE * 2;
    let lastViewStatePublish = 0;
    let didSetInitialCameraSize = false;

    const syncCamera = (): void => {
      const center = cameraPositionRef.current;
      camera.position.set(center.x, CAMERA_HEIGHT, center.z);
      camera.lookAt(center.x, 0, center.z);
    };

    const publishViewState = (time: number, force = false): void => {
      if (!force && time - lastViewStatePublish < 80) return;
      lastViewStatePublish = time;
      setViewState({
        player: { ...playerPositionRef.current },
        camera: { ...cameraPositionRef.current },
        target: targetPositionRef.current ? { ...targetPositionRef.current } : null,
        viewportWidth: cameraWorldWidth,
        viewportHeight: cameraWorldHeight,
      });
    };

    const updateCameraProjection = (): void => {
      const rect = wrapper.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      const aspect = width / height;
      const cameraSize = cameraSizeRef.current;
      renderer.setSize(width, height, false);
      camera.left = -cameraSize * aspect;
      camera.right = cameraSize * aspect;
      camera.top = cameraSize;
      camera.bottom = -cameraSize;
      cameraWorldWidth = cameraSize * aspect * 2;
      cameraWorldHeight = cameraSize * 2;
      camera.updateProjectionMatrix();
      syncCamera();
      publishViewState(performance.now(), true);
    };

    const resize = (): void => {
      if (!didSetInitialCameraSize) {
        const rect = wrapper.getBoundingClientRect();
        cameraSizeRef.current = rect.width < 720 ? 14 : CAMERA_SIZE;
        didSetInitialCameraSize = true;
      }
      updateCameraProjection();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    resize();
    wrapper.focus({ preventScroll: true });

    const moveTo = (position: SocialWorldPosition): void => {
      targetPositionRef.current = {
        x: clamp(position.x, -WORLD_LIMIT, WORLD_LIMIT),
        z: clamp(position.z, -WORLD_LIMIT, WORLD_LIMIT),
      };
      publishViewState(performance.now(), true);
    };

    const moveCameraTo = (position: SocialWorldPosition): void => {
      cameraPositionRef.current = {
        x: clamp(position.x, -WORLD_LIMIT, WORLD_LIMIT),
        z: clamp(position.z, -WORLD_LIMIT, WORLD_LIMIT),
      };
      syncCamera();
      publishViewState(performance.now(), true);
    };

    const zoomCamera = (delta: number): void => {
      cameraSizeRef.current = clamp(cameraSizeRef.current + delta, CAMERA_MIN_SIZE, CAMERA_MAX_SIZE);
      updateCameraProjection();
    };

    const moveTargetFromPointer = (event: PointerEvent): void => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const [groundHit] = raycaster.intersectObject(ground);
      if (groundHit) moveTo({ x: groundHit.point.x, z: groundHit.point.z });
    };

    const handlePointerDown = (event: PointerEvent): void => {
      const mode = event.button === 0 ? 'move' : event.button === 1 || event.button === 2 ? 'pan' : null;
      if (!mode) return;
      event.preventDefault();
      dragStateRef.current = {
        mode,
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startCameraX: cameraPositionRef.current.x,
        startCameraZ: cameraPositionRef.current.z,
        moved: false,
      };
      canvas.setPointerCapture(event.pointerId);
      wrapper.focus();
    };

    const handlePointerMove = (event: PointerEvent): void => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const dx = event.clientX - dragState.startClientX;
      const dy = event.clientY - dragState.startClientY;
      const distance = Math.hypot(dx, dy);
      if (distance > PAN_DRAG_THRESHOLD) dragState.moved = true;
      if (!dragState.moved || dragState.mode !== 'pan') return;
      const worldX = (dx / Math.max(rect.width, 1)) * cameraWorldWidth;
      const worldZ = (dy / Math.max(rect.height, 1)) * cameraWorldHeight;
      moveCameraTo({
        x: dragState.startCameraX - worldX,
        z: dragState.startCameraZ - worldZ,
      });
    };

    const handlePointerUp = (event: PointerEvent): void => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      event.preventDefault();
      dragStateRef.current = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (dragState.mode === 'move' && !dragState.moved) moveTargetFromPointer(event);
    };

    const handlePointerCancel = (event: PointerEvent): void => {
      dragStateRef.current = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };

    const handleContextMenu = (event: MouseEvent): void => {
      event.preventDefault();
    };

    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault();
      zoomCamera(event.deltaY > 0 ? CAMERA_WHEEL_ZOOM_STEP : -CAMERA_WHEEL_ZOOM_STEP);
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerCancel);
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    let frameId = 0;
    let previousTime = performance.now();

    const animate = (time: number): void => {
      const dt = Math.min(0.04, Math.max(0.001, (time - previousTime) / 1000));
      previousTime = time;
      const panDirection = { x: 0, z: 0 };
      const panDirections = panDirectionsRef.current;
      if (panDirections.has('up')) panDirection.z -= 1;
      if (panDirections.has('down')) panDirection.z += 1;
      if (panDirections.has('left')) panDirection.x -= 1;
      if (panDirections.has('right')) panDirection.x += 1;
      if (panDirection.x !== 0 || panDirection.z !== 0) {
        const length = Math.hypot(panDirection.x, panDirection.z);
        const cameraCenter = cameraPositionRef.current;
        moveCameraTo({
          x: cameraCenter.x + (panDirection.x / length) * CAMERA_PAN_SPEED * dt,
          z: cameraCenter.z + (panDirection.z / length) * CAMERA_PAN_SPEED * dt,
        });
      }
      const zoomDirections = zoomDirectionsRef.current;
      if (zoomDirections.has('in') || zoomDirections.has('out')) {
        const zoomDelta = (zoomDirections.has('out') ? CAMERA_ZOOM_SPEED * dt : 0) - (zoomDirections.has('in') ? CAMERA_ZOOM_SPEED * dt : 0);
        zoomCamera(zoomDelta);
      }

      const player = playerPositionRef.current;
      if (targetPositionRef.current) {
        const target = targetPositionRef.current;
        const dx = target.x - player.x;
        const dz = target.z - player.z;
        const remaining = Math.hypot(dx, dz);
        if (remaining <= PLAYER_REACH) {
          targetPositionRef.current = null;
        } else {
          const step = Math.min(remaining, PLAYER_SPEED * dt);
          player.x = clamp(player.x + (dx / remaining) * step, -WORLD_LIMIT, WORLD_LIMIT);
          player.z = clamp(player.z + (dz / remaining) * step, -WORLD_LIMIT, WORLD_LIMIT);
        }
      }

      playerGroup.position.x = player.x;
      playerGroup.position.z = player.z;
      publishViewState(time);
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerCancel);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('wheel', handleWheel);
      observer.disconnect();
      disposeScene(scene);
      renderer.dispose();
    };
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>): void => {
    const direction = mapKeyToPanDirection(event.key.toLowerCase());
    if (direction) {
      event.preventDefault();
      panDirectionsRef.current.add(direction);
    }
  }, []);

  const handleKeyUp = useCallback((event: KeyboardEvent<HTMLDivElement>): void => {
    const direction = mapKeyToPanDirection(event.key.toLowerCase());
    if (direction) panDirectionsRef.current.delete(direction);
  }, []);

  const handlePanButtonDown = useCallback((direction: SocialWorldPanDirection, event: ReactPointerEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    panDirectionsRef.current.add(direction);
    wrapperRef.current?.focus();
  }, []);

  const handlePanButtonUp = useCallback((direction: SocialWorldPanDirection, event: ReactPointerEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    panDirectionsRef.current.delete(direction);
  }, []);

  const handleZoomButtonDown = useCallback((direction: SocialWorldZoomDirection, event: ReactPointerEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    zoomDirectionsRef.current.add(direction);
    wrapperRef.current?.focus();
  }, []);

  const handleZoomButtonUp = useCallback((direction: SocialWorldZoomDirection, event: ReactPointerEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    zoomDirectionsRef.current.delete(direction);
  }, []);

  return {
    canvasRef,
    wrapperRef,
    viewState,
    handleKeyDown,
    handleKeyUp,
    handlePanButtonDown,
    handlePanButtonUp,
    handleZoomButtonDown,
    handleZoomButtonUp,
  };
}

export function SocialWorldSurface({
  loading = false,
  error = null,
  presence,
  quickGames = [],
  favoriteGameIds = [],
  onToggleFavorite,
  onOpenGame,
}: SocialWorldSurfaceProps) {
  const {
    canvasRef,
    wrapperRef,
    viewState,
    handleKeyDown,
    handleKeyUp,
    handlePanButtonDown,
    handlePanButtonUp,
    handleZoomButtonDown,
    handleZoomButtonUp,
  } = usePlainSocialWorld();
  const minimapViewportStyle = createMapViewportStyle(viewState);
  const minimapPlayerStyle = createMapPointStyle(viewState.player);
  const minimapTargetStyle = viewState.target ? createMapPointStyle(viewState.target) : undefined;
  const favoriteIdSet = new Set(favoriteGameIds);
  const visibleQuickGames = quickGames.slice(0, 8);

  return (
    <main
      ref={wrapperRef}
      className="social-world"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onContextMenu={(event) => event.preventDefault()}
      aria-label="Ocentra social world base scene"
    >
      <canvas ref={canvasRef} className="social-world__canvas" aria-hidden="true" />
      <section className="social-world__quick-access" aria-label="Favorite game quick access">
        <header className="social-world__quick-access-header">
          <span>Favorite Games</span>
          <small>{favoriteGameIds.length > 0 ? `${favoriteGameIds.length} pinned` : 'Add games from this line'}</small>
        </header>
        <div className="social-world__quick-access-row">
          {visibleQuickGames.length > 0 ? visibleQuickGames.map((game) => {
            const isFavorite = favoriteIdSet.has(game.gameId);
            return (
              <article key={game.gameId} className={`social-world__quick-card ${isFavorite ? 'is-favorite' : ''}`}>
                <button
                  type="button"
                  className="social-world__quick-open"
                  onClick={() => onOpenGame?.(game.gameId)}
                  aria-label={`Open ${game.name}`}
                >
                  <span className="social-world__quick-image">
                    {game.imageUrl ? <img src={game.imageUrl} alt="" loading="lazy" /> : <span>{getGameInitials(game.name)}</span>}
                  </span>
                  <span className="social-world__quick-copy">
                    <strong>{game.name}</strong>
                    <small>{game.category ?? game.difficulty ?? 'Game'}</small>
                  </span>
                </button>
                <button
                  type="button"
                  className="social-world__favorite-button"
                  onClick={() => onToggleFavorite?.(game.gameId)}
                  aria-pressed={isFavorite}
                  aria-label={isFavorite ? `Remove ${game.name} from favorites` : `Add ${game.name} to favorites`}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                    <path
                      d="M12 3.2 14.7 8.7 20.8 9.6 16.4 13.9 17.4 20 12 17.1 6.6 20 7.6 13.9 3.2 9.6 9.3 8.7 12 3.2Z"
                      fill={isFavorite ? 'currentColor' : 'none'}
                    />
                  </svg>
                </button>
              </article>
            );
          }) : (
            <div className="social-world__quick-empty">
              <strong>{loading ? 'Loading games' : 'No quick games yet'}</strong>
              <small>{error ?? 'Favorites will appear here from the game catalog.'}</small>
            </div>
          )}
        </div>
        <div className="social-world__presence-strip" aria-label="Presence summary">
          <span>{presence.userName}</span>
          <span>{presence.status}</span>
          <span>{presence.friends} friends</span>
          <span>{presence.partyMembers} party</span>
          <span>{presence.unread} unread</span>
        </div>
      </section>
      <div className="social-world__minimap" aria-hidden="true">
        <div className="social-world__minimap-world">
          <span className="social-world__minimap-viewport" style={minimapViewportStyle} />
          {minimapTargetStyle ? <span className="social-world__minimap-target" style={minimapTargetStyle} /> : null}
          <span className="social-world__minimap-player" style={minimapPlayerStyle} />
        </div>
      </div>
      <div className="social-world__control-cluster">
        <div className="social-world__zoom-pad" aria-label="Zoom map">
          {ZOOM_BUTTONS.map((button) => (
            <button
              key={button.direction}
              type="button"
              className="social-world__zoom-button"
              aria-label={button.label}
              onPointerDown={(event) => handleZoomButtonDown(button.direction, event)}
              onPointerUp={(event) => handleZoomButtonUp(button.direction, event)}
              onPointerCancel={(event) => handleZoomButtonUp(button.direction, event)}
            >
              <span aria-hidden="true">{button.symbol}</span>
            </button>
          ))}
        </div>
        <div className="social-world__pan-pad" aria-label="Pan map">
          {PAN_BUTTONS.map((button) => (
            <button
              key={button.direction}
              type="button"
              className={`social-world__pan-button ${button.className}`}
              aria-label={button.label}
              onPointerDown={(event) => handlePanButtonDown(button.direction, event)}
              onPointerUp={(event) => handlePanButtonUp(button.direction, event)}
              onPointerCancel={(event) => handlePanButtonUp(button.direction, event)}
            >
              <span className="social-world__pan-arrow" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

export type { SocialWorldSurfaceProps };
