import * as THREE from 'three';

function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  const maybeTauri = window as Window & { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown };
  return Boolean(maybeTauri.__TAURI__ || maybeTauri.__TAURI_INTERNALS__ || navigator.userAgent.includes('Tauri'));
}

const FACE_TO_INDEX: Record<string, number> = { px: 0, nx: 1, py: 2, ny: 3, pz: 4, nz: 5 };
const FACE_VECTORS: Record<string, THREE.Vector3> = {
  px: new THREE.Vector3(1, 0, 0),
  nx: new THREE.Vector3(-1, 0, 0),
  py: new THREE.Vector3(0, 1, 0),
  ny: new THREE.Vector3(0, -1, 0),
  pz: new THREE.Vector3(0, 0, 1),
  nz: new THREE.Vector3(0, 0, -1),
};

const MOVE_DEFS: Record<
  string,
  { axis: 'x' | 'y' | 'z'; layerType: 'max' | 'min' | 'mid'; turns: number }
> = {
  U: { axis: 'y', layerType: 'max', turns: -1 },
  "U'": { axis: 'y', layerType: 'max', turns: 1 },
  D: { axis: 'y', layerType: 'min', turns: 1 },
  "D'": { axis: 'y', layerType: 'min', turns: -1 },
  R: { axis: 'x', layerType: 'max', turns: -1 },
  "R'": { axis: 'x', layerType: 'max', turns: 1 },
  L: { axis: 'x', layerType: 'min', turns: 1 },
  "L'": { axis: 'x', layerType: 'min', turns: -1 },
  F: { axis: 'z', layerType: 'max', turns: -1 },
  "F'": { axis: 'z', layerType: 'max', turns: 1 },
  B: { axis: 'z', layerType: 'min', turns: 1 },
  "B'": { axis: 'z', layerType: 'min', turns: -1 },
  M: { axis: 'x', layerType: 'mid', turns: 1 },
  "M'": { axis: 'x', layerType: 'mid', turns: -1 },
  E: { axis: 'y', layerType: 'mid', turns: 1 },
  "E'": { axis: 'y', layerType: 'mid', turns: -1 },
  S: { axis: 'z', layerType: 'mid', turns: -1 },
  "S'": { axis: 'z', layerType: 'mid', turns: 1 },
};

export interface RubikConfig {
  split?: number;
  steps?: number;
  totalDurationSeconds?: number;
  rotationXDeg?: number;
  rotationYDeg?: number;
  rotationZDeg?: number;
  maxTextureSize?: number;
  idleDriftSec?: number;
  useSharedContext?: boolean;
  renderPixelScale?: number;
  sideTextureBlurPx?: number;
}

export interface RubikCubeController {
  setContainer: (el: HTMLDivElement | null) => void;
  setImages: (sources: (HTMLCanvasElement | HTMLImageElement | string)[]) => Promise<void>;
  setItemsForSplit: (sources: (HTMLCanvasElement | HTMLImageElement | string)[]) => Promise<void>;
  revealToIndex: (index: number) => boolean;
  setConfig: (config: Partial<RubikConfig>) => void;
  setOnRevealComplete: (cb: (() => void) | null) => void;
  startIdleSequence: (onComplete?: () => void) => void;
  dispose: () => void;
  tick?: (deltaMs: number) => void;
  getScene?: () => THREE.Scene | null;
  getCamera?: () => THREE.PerspectiveCamera | null;
}

function makeEnvFace(topColor: string, bottomColor: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 16);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 16, 16);
  return canvas;
}

function getTextureCacheKey(
  imageIndex: number,
  gridSize: number,
  col: number,
  row: number,
  variant: string
): string {
  return `${variant}|${imageIndex}|${gridSize}|${col}|${row}`;
}

function createFaceTexture(
  sourceCanvas: HTMLCanvasElement,
  col: number,
  row: number,
  gridSize: number,
  colorSpace: THREE.ColorSpace
): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(sourceCanvas);
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(1 / gridSize, 1 / gridSize);
  texture.offset.set(col / gridSize, (gridSize - 1 - row) / gridSize);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 1;
  texture.needsUpdate = true;
  return texture;
}

function getHomeFaceKeys(x: number, y: number, z: number, n: number): string[] {
  const keys: string[] = [];
  if (x === n - 1) keys.push('px');
  if (x === 0) keys.push('nx');
  if (y === n - 1) keys.push('py');
  if (y === 0) keys.push('ny');
  if (z === n - 1) keys.push('pz');
  if (z === 0) keys.push('nz');
  return keys;
}

function getFaceTileFromLogical(
  faceKey: string,
  logical: { x: number; y: number; z: number },
  n: number
): { col: number; row: number } {
  switch (faceKey) {
    case 'pz':
      return { col: logical.x, row: n - 1 - logical.y };
    case 'nz':
      return { col: n - 1 - logical.x, row: n - 1 - logical.y };
    case 'px':
      return { col: n - 1 - logical.z, row: n - 1 - logical.y };
    case 'nx':
      return { col: logical.z, row: n - 1 - logical.y };
    case 'py':
      return { col: logical.x, row: logical.z };
    case 'ny':
      return { col: logical.x, row: n - 1 - logical.z };
    default:
      return { col: 0, row: 0 };
  }
}

function rotateFaceKey(faceKey: string, axis: string, turns: number): string {
  const rotated = FACE_VECTORS[faceKey].clone();
  const q = new THREE.Quaternion();
  const angle = turns * Math.PI / 2;
  if (axis === 'x') q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle);
  if (axis === 'y') q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
  if (axis === 'z') q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
  rotated.applyQuaternion(q).set(
    Math.round(rotated.x),
    Math.round(rotated.y),
    Math.round(rotated.z)
  );
  for (const [key, vec] of Object.entries(FACE_VECTORS)) {
    if (vec.equals(rotated)) return key;
  }
  return faceKey;
}

function rotateLogicalPosition(
  pos: { x: number; y: number; z: number },
  axis: string,
  turns: number,
  n: number
): { x: number; y: number; z: number } {
  const center = (n - 1) / 2;
  const vec = new THREE.Vector3(pos.x - center, pos.y - center, pos.z - center);
  const q = new THREE.Quaternion();
  const angle = turns * Math.PI / 2;
  if (axis === 'x') q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle);
  if (axis === 'y') q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
  if (axis === 'z') q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
  vec.applyQuaternion(q);
  return {
    x: Math.round(vec.x + center),
    y: Math.round(vec.y + center),
    z: Math.round(vec.z + center),
  };
}

function getLayerValue(
  moveDef: { layerType: string },
  n: number
): number {
  if (moveDef.layerType === 'max') return n - 1;
  if (moveDef.layerType === 'min') return 0;
  return Math.floor(n / 2);
}

function invertMoveName(moveName: string): string {
  return moveName.endsWith("'") ? moveName.slice(0, -1) : `${moveName}'`;
}

function sourceToSquareCanvas(
  source: HTMLCanvasElement | HTMLImageElement,
  size: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const sw = source.width;
  const sh = source.height;
  const scale = Math.max(size / sw, size / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const x = (size - dw) / 2;
  const y = (size - dh) / 2;
  ctx.drawImage(source, x, y, dw, dh);
  return canvas;
}

export function splitSourceToSixFaces(
  source: HTMLCanvasElement | HTMLImageElement,
  cellSize = 128
): HTMLCanvasElement[] {
  return [sourceToSquareCanvas(source, cellSize)];
}

export function createIconCanvas(icon: string, size = 256): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#2563eb');
  gradient.addColorStop(1, '#0f172a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#93c5fd';
  ctx.beginPath();
  ctx.arc(size * 0.78, size * 0.2, size * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.arc(size * 0.18, size * 0.82, size * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${Math.round(size * 0.28)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, size * 0.5, size * 0.5);
  return canvas;
}

export function createRubikCubeController(config: RubikConfig = {}): RubikCubeController {
  const useSharedContext = config.useSharedContext ?? false;
  const state = {
    split: config.split ?? 3,
    overallCubeSize: 2.9,
    cubieFill: 0.96,
    maxTextureSize: config.maxTextureSize ?? (isTauriRuntime() ? 256 : 128),
    renderPixelScale: config.renderPixelScale ?? 1,
    steps: config.steps ?? 8,
    totalDurationSeconds: config.totalDurationSeconds ?? 2.0,
    targetFaceSlot: 'pz',
    displayRotationX: THREE.MathUtils.degToRad(config.rotationXDeg ?? -20),
    displayRotationY: THREE.MathUtils.degToRad(config.rotationYDeg ?? 45),
    displayRotationZ: THREE.MathUtils.degToRad(config.rotationZDeg ?? 0),
    bannerImages: [] as HTMLCanvasElement[],
    splitMode: false,
    itemCount: 0,
    currentFaceImages: { pz: 0, px: 1, nx: 2, py: 3, ny: 4, nz: 5 },
    textureCache: new Map<string, THREE.CanvasTexture>(),
    softenedSourceCache: new Map<string, HTMLCanvasElement>(),
    sideTextureBlurPx: config.sideTextureBlurPx ?? 1.5,
    sideBlurFacingThreshold: 0.72,
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    cube: null as ReturnType<typeof buildCube> | null,
    transitionBusy: false,
    activePlan: null as {
      stage: string;
      stepIndex: number;
      sequence: string[];
      inverseSequence: string[];
      nextFaceImages: Record<string, number>;
      targetImageIndex: number;
    } | null,
    animationFrameId: null as number | null,
    containerEl: null as HTMLDivElement | null,
    clock: new THREE.Clock(),
    onRevealComplete: null as (() => void) | null,
    idleDurationSec: config.idleDriftSec ?? 3,
    idlePlan: null as {
      elapsed: number;
      startY: number;
      amplitude: number;
      onComplete?: () => void;
    } | null,
  };

  const envFaces = [
    makeEnvFace('#f8fbff', '#cbd5e1'),
    makeEnvFace('#f8fbff', '#cbd5e1'),
    makeEnvFace('#ffffff', '#e2e8f0'),
    makeEnvFace('#94a3b8', '#1e293b'),
    makeEnvFace('#dbeafe', '#94a3b8'),
    makeEnvFace('#dbeafe', '#94a3b8'),
  ] as unknown as HTMLImageElement[];
  const envMap = new THREE.CubeTexture(envFaces);
  envMap.colorSpace = THREE.SRGBColorSpace;
  envMap.needsUpdate = true;

  function cubieSpacingForSplit(n: number): number {
    return state.overallCubeSize / Math.max(n - 1, 1);
  }

  function cubieSizeForSplit(n: number): number {
    return cubieSpacingForSplit(n) * state.cubieFill;
  }

  function logicalToWorld(
    logical: { x: number; y: number; z: number },
    n: number
  ): THREE.Vector3 {
    const center = (n - 1) / 2;
    const centerSpacing = n <= 1 ? 0 : cubieSpacingForSplit(n);
    return new THREE.Vector3(
      (logical.x - center) * centerSpacing,
      (logical.y - center) * centerSpacing,
      (logical.z - center) * centerSpacing
    );
  }

  function createStickerMaterial(): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 22,
      specular: 0x475569,
      envMap,
      reflectivity: 0.035,
    });
  }

  function getSoftenedSourceCanvas(imageIndex: number): HTMLCanvasElement | null {
    if (imageIndex < 0 || imageIndex >= state.bannerImages.length) return null;
    const sourceCanvas = state.bannerImages[imageIndex];
    const blurPx = Math.max(0, state.sideTextureBlurPx);
    if (blurPx <= 0) return sourceCanvas;

    const key = `${imageIndex}|${sourceCanvas.width}x${sourceCanvas.height}|${blurPx.toFixed(2)}`;
    let softenedCanvas = state.softenedSourceCache.get(key);
    if (!softenedCanvas) {
      softenedCanvas = document.createElement('canvas');
      softenedCanvas.width = sourceCanvas.width;
      softenedCanvas.height = sourceCanvas.height;
      const ctx = softenedCanvas.getContext('2d')!;
      ctx.drawImage(sourceCanvas, 0, 0);
      ctx.filter = `blur(${blurPx}px)`;
      ctx.globalAlpha = 0.86;
      ctx.drawImage(sourceCanvas, 0, 0);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      state.softenedSourceCache.set(key, softenedCanvas);
    }
    return softenedCanvas;
  }

  function getCachedFaceTexture(
    imageIndex: number,
    col: number,
    row: number,
    gridSize: number,
    softened = false
  ): THREE.CanvasTexture | null {
    if (imageIndex < 0 || imageIndex >= state.bannerImages.length) return null;
    const sourceCanvas = softened
      ? getSoftenedSourceCanvas(imageIndex)
      : state.bannerImages[imageIndex];
    if (!sourceCanvas) return null;

    const key = getTextureCacheKey(imageIndex, gridSize, col, row, softened ? 'soft' : 'sharp');
    let texture = state.textureCache.get(key);
    if (!texture) {
      texture = createFaceTexture(
        sourceCanvas,
        col,
        row,
        gridSize,
        THREE.SRGBColorSpace
      );
      state.textureCache.set(key, texture);
    }
    return texture;
  }

  function disposeTextureCache(): void {
    state.textureCache.forEach((t) => t.dispose());
    state.textureCache.clear();
    state.softenedSourceCache.clear();
  }

  function buildCube(n: number) {
    const displayGroup = new THREE.Group();
    displayGroup.rotation.x = state.displayRotationX;
    displayGroup.rotation.y = state.displayRotationY;
    displayGroup.rotation.z = state.displayRotationZ;
    state.scene!.add(displayGroup);

    const orientationGroup = new THREE.Group();
    displayGroup.add(orientationGroup);

    const turnGroup = new THREE.Group();
    orientationGroup.add(turnGroup);

    const cubeCoreMaterial = new THREE.MeshPhongMaterial({
      color: 0x243244,
      shininess: 34,
      specular: 0x94a3b8,
      envMap,
      reflectivity: 0.05,
    });

    const cubieSize = cubieSizeForSplit(n);
    const cubieGeometry = new THREE.BoxGeometry(cubieSize, cubieSize, cubieSize);
    const cubies: Array<{
      mesh: THREE.Mesh;
      logical: { x: number; y: number; z: number };
      home: { x: number; y: number; z: number };
      homeMaterials: Record<string, THREE.MeshPhongMaterial>;
      stickers: Record<string, THREE.MeshPhongMaterial>;
    }> = [];

    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        for (let z = 0; z < n; z++) {
          const homeFaceKeys = getHomeFaceKeys(x, y, z, n);
          const homeMaterials: Record<string, THREE.MeshPhongMaterial> = {};
          const materials: THREE.Material[] = [
            cubeCoreMaterial,
            cubeCoreMaterial,
            cubeCoreMaterial,
            cubeCoreMaterial,
            cubeCoreMaterial,
            cubeCoreMaterial,
          ];

          for (const faceKey of homeFaceKeys) {
            const mat = createStickerMaterial();
            homeMaterials[faceKey] = mat;
            materials[FACE_TO_INDEX[faceKey]] = mat;
          }

          const mesh = new THREE.Mesh(cubieGeometry, materials);
          mesh.position.copy(logicalToWorld({ x, y, z }, n));
          orientationGroup.add(mesh);

          cubies.push({
            mesh,
            logical: { x, y, z },
            home: { x, y, z },
            homeMaterials,
            stickers: { ...homeMaterials },
          });
        }
      }
    }

    return {
      displayGroup,
      orientationGroup,
      turnGroup,
      cubeCoreMaterial,
      cubieGeometry,
      cubies,
      n,
      activeTurn: null as {
        axis: string;
        turns: number;
        members: typeof cubies;
        elapsed: number;
        duration: number;
        onComplete?: () => void;
      } | null,
    };
  }

  function remapMeshMaterials(
    cubie: { mesh: THREE.Mesh; stickers: Record<string, THREE.MeshPhongMaterial> },
    cubeCoreMaterial: THREE.Material
  ): void {
    const mats = [
      cubeCoreMaterial,
      cubeCoreMaterial,
      cubeCoreMaterial,
      cubeCoreMaterial,
      cubeCoreMaterial,
      cubeCoreMaterial,
    ];
    for (const [faceKey, material] of Object.entries(cubie.stickers)) {
      mats[FACE_TO_INDEX[faceKey]] = material;
    }
    cubie.mesh.material = mats;
  }

  function assignFaceImagesToCube(
    cube: ReturnType<typeof buildCube>,
    faceImages: Record<string, number>
  ): void {
    for (const cubie of cube.cubies) {
      cubie.stickers = { ...cubie.homeMaterials };
      cubie.logical = { ...cubie.home };
      cubie.mesh.position.copy(logicalToWorld(cubie.logical, cube.n));
      cubie.mesh.quaternion.identity();
      cubie.mesh.rotation.set(0, 0, 0);

      for (const [faceKey, material] of Object.entries(cubie.stickers)) {
        const tile = getFaceTileFromLogical(faceKey, cubie.logical, cube.n);
        const imageIndex = faceImages[faceKey];
        const gridSize = cube.n;
        const col = tile.col;
        const row = tile.row;
        const map = getCachedFaceTexture(imageIndex, col, row, gridSize);
        if (map) {
          const softMap = state.sideTextureBlurPx > 0
            ? getCachedFaceTexture(imageIndex, col, row, gridSize, true)
            : null;
          material.userData.ocentraTextureMaps = {
            sharp: map,
            soft: softMap,
          };
          material.map = map;
          material.needsUpdate = true;
        }
      }
      remapMeshMaterials(cubie, cube.cubeCoreMaterial);
    }
    cube.turnGroup.rotation.set(0, 0, 0);
  }

  function getLayerCubies(
    cube: ReturnType<typeof buildCube>,
    axis: string,
    layerValue: number
  ) {
    return cube.cubies.filter((c) => c.logical[axis as 'x' | 'y' | 'z'] === layerValue);
  }

  function updateStickerOrientation(
    cubie: { stickers: Record<string, THREE.MeshPhongMaterial> },
    axis: string,
    turns: number
  ): void {
    const updated: Record<string, THREE.MeshPhongMaterial> = {};
    for (const [faceKey, material] of Object.entries(cubie.stickers)) {
      updated[rotateFaceKey(faceKey, axis, turns)] = material;
    }
    cubie.stickers = updated;
  }

  function generateSequence(count: number): string[] {
    const moves: string[] = [];
    let lastAxis = '';
    let lastMove = '';
    const keys = Object.keys(MOVE_DEFS).filter((moveName) => {
      if (state.split < 3) return MOVE_DEFS[moveName].layerType !== 'mid';
      return true;
    });

    for (let i = 0; i < count; i++) {
      let move = keys[Math.floor(Math.random() * keys.length)];
      let safety = 0;
      while (
        safety < 20 &&
        (move.replace("'", '') === lastMove.replace("'", '') ||
          MOVE_DEFS[move].axis === lastAxis)
      ) {
        move = keys[Math.floor(Math.random() * keys.length)];
        safety++;
      }
      moves.push(move);
      lastAxis = MOVE_DEFS[move].axis;
      lastMove = move;
    }
    return moves;
  }

  function getTiming(): { turnMs: number } {
    const totalMs = state.totalDurationSeconds * 1000;
    const turnCount = Math.max(state.steps * 2, 1);
    const turnMs = Math.max(90, totalMs / turnCount);
    return { turnMs };
  }

  function beginTurn(
    cube: ReturnType<typeof buildCube>,
    moveName: string,
    onComplete?: () => void
  ): boolean {
    if (cube.activeTurn) return false;
    const moveDef = MOVE_DEFS[moveName];
    if (!moveDef) return false;

    const layerValue = getLayerValue(moveDef, cube.n);
    const members = getLayerCubies(cube, moveDef.axis, layerValue);
    const timing = getTiming();

    for (const cubie of members) {
      cube.turnGroup.attach(cubie.mesh);
    }

    cube.activeTurn = {
      axis: moveDef.axis,
      turns: moveDef.turns,
      members,
      elapsed: 0,
      duration: timing.turnMs,
      onComplete,
    };
    return true;
  }

  function finalizeTurn(cube: ReturnType<typeof buildCube>): void {
    if (!cube.activeTurn) return;
    const { axis, turns, members, onComplete } = cube.activeTurn;

    cube.turnGroup.rotation.set(0, 0, 0);
    cube.turnGroup.rotation[axis as 'x' | 'y' | 'z'] = turns * (Math.PI / 2);
    cube.turnGroup.updateMatrixWorld(true);

    for (const cubie of members) {
      cube.orientationGroup.attach(cubie.mesh);
      cubie.logical = rotateLogicalPosition(cubie.logical, axis, turns, cube.n);
      cubie.mesh.position.copy(logicalToWorld(cubie.logical, cube.n));
      cubie.mesh.quaternion.identity();
      cubie.mesh.rotation.set(0, 0, 0);
      updateStickerOrientation(cubie, axis, turns);
      remapMeshMaterials(cubie, cube.cubeCoreMaterial);
    }

    cube.turnGroup.rotation.set(0, 0, 0);
    cube.turnGroup.updateMatrixWorld(true);
    cube.activeTurn = null;
    onComplete?.();
  }

  function animateTurn(cube: ReturnType<typeof buildCube>, deltaMs: number): void {
    if (!cube?.activeTurn) return;
    cube.activeTurn.elapsed += deltaMs;
    const t = Math.min(cube.activeTurn.elapsed / cube.activeTurn.duration, 1);
    const eased = -(Math.cos(Math.PI * t) - 1) / 2;
    const angle = cube.activeTurn.turns * eased * (Math.PI / 2);

    cube.turnGroup.rotation.set(0, 0, 0);
    const axis = cube.activeTurn.axis as 'x' | 'y' | 'z';
    cube.turnGroup.rotation[axis] = angle;
    cube.turnGroup.updateMatrixWorld(true);

    if (t >= 1) finalizeTurn(cube);
  }

  function getHiddenFaceForReplacement(): string {
    return 'nz';
  }

  function buildNextFaceSet(
    targetItemIndex: number,
    targetFaceSlot: string
  ): Record<string, number> {
    const next = { ...state.currentFaceImages };
    const replacementFace = getHiddenFaceForReplacement();
    next[replacementFace as keyof typeof next] = targetItemIndex;
    next[targetFaceSlot as keyof typeof next] = targetItemIndex;
    return next;
  }

  function playRevealToImage(targetItemIndex: number): boolean {
    if (!state.cube || state.transitionBusy) return false;
    state.idlePlan = null;
    const maxIndex = state.splitMode
      ? state.itemCount - 1
      : state.bannerImages.length - 1;
    if (maxIndex < 0) return false;

    const safeIndex = Math.max(0, Math.min(targetItemIndex, maxIndex));
    const nextFaceImages = buildNextFaceSet(safeIndex, state.targetFaceSlot);
    const sequence = generateSequence(state.steps);
    const inverseSequence = [...sequence].reverse().map(invertMoveName);

    state.transitionBusy = true;
    state.activePlan = {
      stage: 'prepare',
      stepIndex: 0,
      sequence,
      inverseSequence,
      nextFaceImages,
      targetImageIndex: safeIndex,
    };
    return true;
  }

  function advancePlan(): void {
    if (!state.activePlan || !state.cube) return;
    const plan = state.activePlan;

    if (plan.stage === 'prepare') {
      assignFaceImagesToCube(state.cube, plan.nextFaceImages);
      plan.stage = 'decompose';
      plan.stepIndex = 0;
      return;
    }

    if (plan.stage === 'decompose') {
      if (plan.stepIndex >= plan.sequence.length) {
        plan.stage = 'compose';
        plan.stepIndex = 0;
        return;
      }
      const move = plan.sequence[plan.stepIndex];
      beginTurn(state.cube, move, () => {
        plan.stepIndex++;
        advancePlan();
      });
      return;
    }

    if (plan.stage === 'compose') {
      if (plan.stepIndex >= plan.inverseSequence.length) {
        state.currentFaceImages = {
          pz: plan.nextFaceImages.pz,
          px: plan.nextFaceImages.px,
          nx: plan.nextFaceImages.nx,
          py: plan.nextFaceImages.py,
          ny: plan.nextFaceImages.ny,
          nz: plan.nextFaceImages.nz,
        };
        state.activePlan = null;
        state.transitionBusy = false;
        state.onRevealComplete?.();
        return;
      }
      const move = plan.inverseSequence[plan.stepIndex];
      beginTurn(state.cube, move, () => {
        plan.stepIndex++;
        advancePlan();
      });
    }
  }

  function rebuildCube(): void {
    if (!state.scene) return;
    if (state.cube) {
      state.scene!.remove(state.cube.displayGroup);
      state.cube.cubies.forEach((cubie) => {
        const mats = Array.isArray(cubie.mesh.material)
          ? cubie.mesh.material
          : [cubie.mesh.material];
        mats.forEach((m) => {
          if (m !== state.cube!.cubeCoreMaterial) m.dispose();
        });
      });
      state.cube.cubieGeometry.dispose();
      state.cube.cubeCoreMaterial.dispose();
    }
    disposeTextureCache();
    state.cube = buildCube(state.split);
    assignFaceImagesToCube(state.cube, state.currentFaceImages);
  }

  function resize(): void {
    if (!state.containerEl || !state.camera) return;
    const w = state.containerEl.clientWidth;
    const h = state.containerEl.clientHeight;
    state.camera.aspect = w / h;
    state.camera.updateProjectionMatrix();
    if (state.renderer) {
      state.renderer.setPixelRatio(getRendererPixelRatio());
      state.renderer.setSize(w, h);
    }
  }

  function getRendererPixelRatio(): number {
    const devicePixelRatio = Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : 1;
    const basePixelRatio = Math.min(Math.max(1, devicePixelRatio), 2);
    return Math.max(1, Math.min(4, basePixelRatio * state.renderPixelScale));
  }

  function animateIdle(deltaMs: number): void {
    const plan = state.idlePlan;
    if (!plan || !state.cube) return;

    plan.elapsed += deltaMs;
    const totalMs = state.idleDurationSec * 1000;
    const t = Math.min(plan.elapsed / totalMs, 1);
    const dg = state.cube.displayGroup.rotation;
    dg.y = plan.startY + plan.amplitude * Math.sin(t * Math.PI);

    if (t >= 1) {
      dg.y = plan.startY;
      state.idlePlan = null;
      plan.onComplete?.();
    }
  }

  function runAnimationStep(deltaMs: number): void {
    if (state.cube) {
      if (state.idlePlan) {
        animateIdle(deltaMs);
      } else {
        animateTurn(state.cube, deltaMs);
        if (!state.cube.activeTurn && state.activePlan) {
          advancePlan();
        }
      }
      updateSideTextureSoftness(state.cube);
    }
  }

  function updateSideTextureSoftness(cube: ReturnType<typeof buildCube>): void {
    if (!state.camera || state.sideTextureBlurPx <= 0) return;

    state.scene?.updateMatrixWorld(true);
    const cameraPosition = new THREE.Vector3();
    const cubiePosition = new THREE.Vector3();
    const cubieQuaternion = new THREE.Quaternion();
    const faceNormal = new THREE.Vector3();
    const toCamera = new THREE.Vector3();
    state.camera.getWorldPosition(cameraPosition);

    for (const cubie of cube.cubies) {
      cubie.mesh.getWorldPosition(cubiePosition);
      cubie.mesh.getWorldQuaternion(cubieQuaternion);
      toCamera.copy(cameraPosition).sub(cubiePosition).normalize();

      for (const [faceKey, material] of Object.entries(cubie.stickers)) {
        const maps = material.userData.ocentraTextureMaps as
          | { sharp?: THREE.Texture; soft?: THREE.Texture | null }
          | undefined;
        if (!maps?.sharp || !maps.soft) continue;

        faceNormal.copy(FACE_VECTORS[faceKey]).applyQuaternion(cubieQuaternion).normalize();
        const facing = faceNormal.dot(toCamera);
        const nextMap = facing < state.sideBlurFacingThreshold ? maps.soft : maps.sharp;
        if (material.map !== nextMap) {
          material.map = nextMap;
          material.needsUpdate = true;
        }
      }
    }
  }

  function animate(): void {
    state.animationFrameId = requestAnimationFrame(animate);
    const deltaMs = state.clock.getDelta() * 1000;
    runAnimationStep(deltaMs);
    if (state.renderer && state.scene) {
      state.renderer.render(state.scene, state.camera!);
    }
  }

  return {
    setContainer(el: HTMLDivElement | null) {
      if (state.containerEl && state.renderer) {
        state.containerEl.removeChild(state.renderer.domElement);
      }
      state.containerEl = el;

      if (!el) {
        if (state.animationFrameId != null) {
          cancelAnimationFrame(state.animationFrameId);
          state.animationFrameId = null;
        }
        return;
      }

      state.scene = new THREE.Scene();
      state.scene.background = null;

      state.camera = new THREE.PerspectiveCamera(42, el.clientWidth / el.clientHeight, 0.1, 100);
      state.camera.position.set(5.4, 4.8, 6.8);
      state.camera.lookAt(0, 0, 0);

      if (useSharedContext) {
        state.scene.add(new THREE.AmbientLight(0xffffff, 1.75));
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.9);
        keyLight.position.set(6, 8, 7);
        state.scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(0xbfd7ff, 0.9);
        fillLight.position.set(-6, -2, -4);
        state.scene.add(fillLight);

        if (state.bannerImages.length >= 6) {
          state.cube = buildCube(state.split);
          assignFaceImagesToCube(state.cube, state.currentFaceImages);
        }

        const ro = new ResizeObserver(resize);
        ro.observe(el);
        return;
      }

      const rendererOptions: THREE.WebGLRendererParameters[] = isTauriRuntime()
        ? [{
            antialias: true,
            alpha: true,
            powerPreference: 'low-power',
            stencil: false,
            depth: true,
          }]
        : [
            {
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance',
              stencil: false,
              depth: true,
            },
            {
              antialias: false,
              alpha: true,
              powerPreference: 'low-power',
              stencil: false,
              depth: false,
              precision: 'mediump',
            },
          ];

      let renderer: THREE.WebGLRenderer | null = null;
      let lastRendererError: unknown = null;
      for (const options of rendererOptions) {
        try {
          renderer = new THREE.WebGLRenderer(options);
          break;
        } catch (error) {
          lastRendererError = error;
        }
      }

      if (!renderer) {
        throw lastRendererError instanceof Error ? lastRendererError : new Error(String(lastRendererError));
      }

      state.renderer = renderer;
      state.renderer.setPixelRatio(getRendererPixelRatio());
      state.renderer.setSize(el.clientWidth, el.clientHeight);
      state.renderer.outputColorSpace = THREE.SRGBColorSpace;
      state.renderer.setClearColor(0x000000, 0);
      el.appendChild(state.renderer.domElement);

      state.scene.add(new THREE.AmbientLight(0xffffff, 1.75));
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.9);
      keyLight.position.set(6, 8, 7);
      state.scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xbfd7ff, 0.9);
      fillLight.position.set(-6, -2, -4);
      state.scene.add(fillLight);

      if (state.bannerImages.length >= 6) {
        state.cube = buildCube(state.split);
        assignFaceImagesToCube(state.cube, state.currentFaceImages);
      }

      const ro = new ResizeObserver(resize);
      ro.observe(el);

      animate();
    },

    async setImages(sources: (HTMLCanvasElement | HTMLImageElement | string)[]) {
      const images: HTMLCanvasElement[] = [];
      const size = state.maxTextureSize;

      for (const source of sources) {
        if (source instanceof HTMLCanvasElement || source instanceof HTMLImageElement) {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          canvas.getContext('2d')!.drawImage(source, 0, 0, size, size);
          images.push(canvas);
          continue;
        }
        if (typeof source === 'string') {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = source;
          });
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          canvas.getContext('2d')!.drawImage(img, 0, 0, size, size);
          images.push(canvas);
        }
      }

      if (images.length < 6) return;

      state.splitMode = false;
      state.itemCount = 0;
      state.bannerImages = images;
      state.currentFaceImages = { pz: 0, px: 1, nx: 2, py: 3, ny: 4, nz: 5 };
      rebuildCube();
      resize();
    },

    async setItemsForSplit(sources: (HTMLCanvasElement | HTMLImageElement | string)[]) {
      const cellSize = Math.floor(state.maxTextureSize / 2);
      const images: HTMLCanvasElement[] = [];

      for (const source of sources) {
        let canvas: HTMLCanvasElement | HTMLImageElement;
        if (source instanceof HTMLCanvasElement || source instanceof HTMLImageElement) {
          canvas = source;
        } else {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = source;
          });
          canvas = img;
        }
        const faces = splitSourceToSixFaces(canvas, cellSize);
        images.push(...faces);
      }

      if (images.length < 1) return;

      state.splitMode = true;
      state.itemCount = sources.length;
      state.bannerImages = images;
      const maxIdx = Math.max(0, images.length - 1);
      state.currentFaceImages = {
        pz: Math.min(0, maxIdx),
        px: Math.min(1, maxIdx),
        nx: Math.min(2, maxIdx),
        py: Math.min(3, maxIdx),
        ny: Math.min(4, maxIdx),
        nz: Math.min(5, maxIdx),
      };
      rebuildCube();
      resize();
    },

    revealToIndex(index: number) {
      return playRevealToImage(index);
    },

    setOnRevealComplete(cb: (() => void) | null) {
      state.onRevealComplete = cb;
    },

      startIdleSequence(onComplete?: () => void) {
        if (!state.cube || state.idlePlan) return;
        const dg = state.cube.displayGroup.rotation;
        state.idlePlan = {
          elapsed: 0,
        startY: dg.y,
        amplitude: 0.04,
        onComplete,
      };
      },

      setConfig(partial: Partial<RubikConfig>) {
        let shouldRebuildCube = false;
        let shouldResizeRenderer = false;
        if (partial.split != null) {
          const nextSplit = Math.max(2, Math.min(6, partial.split));
          shouldRebuildCube = nextSplit !== state.split;
          state.split = nextSplit;
        }
        if (partial.steps != null) state.steps = Math.max(1, Math.min(20, partial.steps));
        if (partial.totalDurationSeconds != null) {
          state.totalDurationSeconds = Math.max(0.5, Math.min(12, partial.totalDurationSeconds));
        }
      if (partial.rotationXDeg != null) {
        state.displayRotationX = THREE.MathUtils.degToRad(partial.rotationXDeg);
      }
      if (partial.rotationYDeg != null) {
        state.displayRotationY = THREE.MathUtils.degToRad(partial.rotationYDeg);
      }
      if (partial.rotationZDeg != null) {
        state.displayRotationZ = THREE.MathUtils.degToRad(partial.rotationZDeg);
      }
        if (partial.maxTextureSize != null) {
          state.maxTextureSize = Math.max(128, Math.min(768, partial.maxTextureSize));
        }
        if (partial.renderPixelScale != null) {
          const nextRenderPixelScale = Math.max(1, Math.min(4, partial.renderPixelScale));
          shouldResizeRenderer = nextRenderPixelScale !== state.renderPixelScale;
          state.renderPixelScale = nextRenderPixelScale;
        }
        if (partial.sideTextureBlurPx != null) {
          const nextSideTextureBlurPx = Math.max(0, Math.min(4, partial.sideTextureBlurPx));
          if (nextSideTextureBlurPx !== state.sideTextureBlurPx) {
            state.sideTextureBlurPx = nextSideTextureBlurPx;
            shouldRebuildCube = true;
          }
        }
        if (partial.idleDriftSec != null) state.idleDurationSec = Math.max(1, partial.idleDriftSec);
        if (state.cube) {
          state.cube.displayGroup.rotation.x = state.displayRotationX;
          state.cube.displayGroup.rotation.y = state.displayRotationY;
          state.cube.displayGroup.rotation.z = state.displayRotationZ;
        }
        if (shouldRebuildCube) rebuildCube();
        if (shouldResizeRenderer) resize();
      },

    dispose() {
      if (state.animationFrameId != null) {
        cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = null;
      }
      if (state.containerEl && state.renderer) {
        try {
          state.containerEl.removeChild(state.renderer.domElement);
        } catch {
          // already removed
        }
      }
      disposeTextureCache();
      state.scene = null;
      state.camera = null;
      state.renderer = null;
      state.cube = null;
      state.containerEl = null;
    },

    ...(useSharedContext && {
      tick: (deltaMs: number) => runAnimationStep(deltaMs),
      getScene: () => state.scene,
      getCamera: () => state.camera,
    }),
  };
}
