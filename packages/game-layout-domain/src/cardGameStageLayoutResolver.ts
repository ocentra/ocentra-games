import type {
  CardGameArenaStageBlock,
  CardGameLayoutDocument,
  CardGameShellMetrics,
  CardGameStageBlockBase,
  CardGameViewportSize,
  TableZone,
} from '@ocentra/game-ui-types/cardGameLayoutTypes';
import { DEFAULT_STAGE_LAYOUT, PLAIN_CARD_FRAME_DEFAULTS } from './cardGameLayoutRuntime';

export interface StageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResolvedCardGameStageBlock {
  kind: string;
  rect: StageRect;
  scale: number;
  innerScale: number;
  contentWidth: number;
  contentHeight: number;
  anchorX: CardGameStageBlockBase['anchorX'];
  anchorY: CardGameStageBlockBase['anchorY'];
}

export interface ResolvedCardGameStageZone {
  zone: TableZone;
  arenaRect: StageRect;
  stageRect: StageRect;
  scale: number;
  rotation: number;
}

export interface ResolvedCardGameStageAttachment {
  arenaRect: StageRect;
  stageRect: StageRect;
  scale: number;
  rotation: number;
}

export interface ResolvedCardGameStageLayout {
  viewportRect: StageRect;
  workRect: StageRect;
  hud: ResolvedCardGameStageBlock;
  arena: ResolvedCardGameStageBlock;
  tableScale: number;
  cardStrip: ResolvedCardGameStageBlock | null;
  scoreboard: ResolvedCardGameStageBlock | null;
  deckTray: ResolvedCardGameStageAttachment | null;
  zones: ResolvedCardGameStageZone[];
}

interface ResolveStageLayoutArgs {
  document: CardGameLayoutDocument;
  playerCount: number;
  viewport: CardGameViewportSize;
  shellMetrics?: Partial<CardGameShellMetrics> | null;
}

const DEFAULT_SHELL_METRICS: CardGameShellMetrics = {
  headerHeight: 0,
  toolbarHeight: 0,
  footerHeight: 0,
  workTop: 0,
  workBottom: 0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createRect(x: number, y: number, width: number, height: number): StageRect {
  return {
    x,
    y,
    width: Math.max(0, width),
    height: Math.max(0, height),
  };
}

function insetRect(rect: StageRect, block: CardGameStageBlockBase): StageRect {
  return createRect(
    rect.x + block.insetLeft,
    rect.y + block.insetTop,
    rect.width - block.insetLeft - block.insetRight,
    rect.height - block.insetTop - block.insetBottom,
  );
}

function resolveBlockRect(
  availableRect: StageRect,
  block: CardGameStageBlockBase,
  contentWidth: number,
  contentHeight: number,
): ResolvedCardGameStageBlock {
  const safeContentWidth = Math.max(1, contentWidth);
  const safeContentHeight = Math.max(1, contentHeight);
  const blockRect = insetRect(availableRect, block);
  const scaleFromWidth = blockRect.width / safeContentWidth;
  const scaleFromHeight = blockRect.height / safeContentHeight;
  const unclampedScale = block.fitMode === 'width'
    ? scaleFromWidth
    : Math.min(scaleFromWidth, scaleFromHeight);
  const scale = clamp(
    Number.isFinite(unclampedScale) ? unclampedScale : 1,
    block.minScale,
    block.maxScale,
  );
  const width = safeContentWidth * scale;
  const height = safeContentHeight * scale;

  let x = blockRect.x;
  if (block.anchorX === 'center') {
    x = blockRect.x + (blockRect.width - width) / 2;
  } else if (block.anchorX === 'end') {
    x = blockRect.x + blockRect.width - width;
  }

  let y = blockRect.y;
  if (block.anchorY === 'center') {
    y = blockRect.y + (blockRect.height - height) / 2;
  } else if (block.anchorY === 'end') {
    y = blockRect.y + blockRect.height - height;
  }

  return {
    kind: 'kind' in block ? String(block.kind) : 'block',
    rect: createRect(x + block.offsetX, y + block.offsetY, width, height),
    scale,
    innerScale: 1,
    contentWidth: safeContentWidth,
    contentHeight: safeContentHeight,
    anchorX: block.anchorX,
    anchorY: block.anchorY,
  };
}

function resolveZoneArenaRect(zone: TableZone, arenaBlock: ResolvedCardGameStageBlock): StageRect {
  const size = zone.size ?? { width: 0.18, height: 0.14 };
  const scale = Number.isFinite(zone.scale) ? Number(zone.scale) : 1;
  const width = arenaBlock.contentWidth * size.width * scale;
  const height = arenaBlock.contentHeight * size.height * scale;
  const centerX = arenaBlock.contentWidth * zone.position.x;
  const centerY = arenaBlock.contentHeight * zone.position.y;
  return createRect(centerX - width / 2, centerY - height / 2, width, height);
}

function resolveZoneStageRect(zoneRect: StageRect, arenaBlock: ResolvedCardGameStageBlock): StageRect {
  return createRect(
    arenaBlock.rect.x + zoneRect.x * arenaBlock.scale,
    arenaBlock.rect.y + zoneRect.y * arenaBlock.scale,
    zoneRect.width * arenaBlock.scale,
    zoneRect.height * arenaBlock.scale,
  );
}

function resolveAttachmentArenaRect(
  position: { x: number; y: number },
  size: { width: number; height: number },
  scale: number,
  arenaBlock: ResolvedCardGameStageBlock,
): StageRect {
  const width = arenaBlock.contentWidth * size.width * scale;
  const height = arenaBlock.contentHeight * size.height * scale;
  const centerX = arenaBlock.contentWidth * position.x;
  const centerY = arenaBlock.contentHeight * position.y;
  return createRect(centerX - width / 2, centerY - height / 2, width, height);
}

function resolveCardStripContentSize(document: CardGameLayoutDocument): StageRect | null {
  const slotCount = document.cardStrip.slots.length;
  if (slotCount <= 0) {
    return null;
  }

  const frame = {
    ...PLAIN_CARD_FRAME_DEFAULTS,
    ...(document.cardFrame ?? {}),
  };
  const scaleRatio = Math.min(
    document.cardStrip.cardWidth / Math.max(frame.width, 1),
    document.cardStrip.cardHeight / Math.max(frame.height, 1),
  );
  const glowMargin = frame.glowMargin * scaleRatio;
  const logicalWidth = document.cardStrip.cardWidth * slotCount
    + document.cardStrip.gap * Math.max(0, slotCount - 1);
  const totalWidth = logicalWidth + glowMargin * 2;
  const totalHeight = document.cardStrip.cardHeight + glowMargin * 2;
  return createRect(0, 0, totalWidth, totalHeight);
}

export function resolveCardGameStageLayout({
  document,
  playerCount,
  viewport,
  shellMetrics,
}: ResolveStageLayoutArgs): ResolvedCardGameStageLayout {
  void playerCount;
  const metrics = {
    ...DEFAULT_SHELL_METRICS,
    ...(shellMetrics ?? {}),
  };
  const layout = document.stageLayout ?? DEFAULT_STAGE_LAYOUT;
  const viewportRect = createRect(0, 0, viewport.width, viewport.height);
  const workRect = createRect(
    0,
    metrics.workTop,
    viewport.width,
    viewport.height - metrics.workTop - metrics.workBottom,
  );
  const hud = resolveBlockRect(workRect, layout.hud, document.hud.width, document.hud.height);

  const arenaRegionBottom = Math.max(workRect.y, hud.rect.y);
  const arenaAvailableRect = createRect(
    workRect.x,
    workRect.y,
    workRect.width,
    arenaRegionBottom - workRect.y,
  );
  const arena = resolveBlockRect(
    arenaAvailableRect,
    layout.arena as CardGameArenaStageBlock,
    layout.arena.contentWidth,
    layout.arena.contentHeight,
  );
  const tableScale = Number.isFinite(document.tablePresentation?.overallScale)
    ? Math.max(Number(document.tablePresentation.overallScale), 0.01)
    : 1;
  const cardStripBlock = (layout.extraBlocks ?? []).find((block) => block.kind === 'cardStrip');
  const cardStripContentRect = resolveCardStripContentSize(document);
  const cardStrip = cardStripBlock && cardStripContentRect
    ? {
        ...resolveBlockRect(
          workRect,
          cardStripBlock,
          cardStripContentRect.width,
          cardStripContentRect.height,
        ),
        innerScale: Number.isFinite(document.cardStrip.overallScale)
          ? Math.max(Number(document.cardStrip.overallScale), 0.01)
          : 1,
      }
    : null;
  const scoreboardBlock = (layout.extraBlocks ?? []).find((block) => block.kind === 'scoreboard');
  const scoreboardOverallScale = Number.isFinite(document.scoreboard.overallScale)
    ? Math.max(Number(document.scoreboard.overallScale), 0.01)
    : 1;
  const scoreboard = scoreboardBlock
    ? {
        ...resolveBlockRect(
          workRect,
          scoreboardBlock,
          document.scoreboard.width,
          document.scoreboard.height,
        ),
        innerScale: scoreboardOverallScale,
      }
    : null;

  const zones = (document.zones ?? []).map((zone) => {
    const arenaRect = resolveZoneArenaRect(zone, arena);
    return {
      zone,
      arenaRect,
      stageRect: resolveZoneStageRect(arenaRect, arena),
      scale: Number.isFinite(zone.scale) ? Number(zone.scale) : 1,
      rotation: Number.isFinite(zone.rotation) ? Number(zone.rotation) : 0,
    };
  });
  const deckTrayArenaRect = document.tableAttachments?.deckTray
    ? resolveAttachmentArenaRect(
        document.tableAttachments.deckTray.position,
        document.tableAttachments.deckTray.size,
        Number.isFinite(document.tableAttachments.deckTray.scale)
          ? Number(document.tableAttachments.deckTray.scale)
          : 1,
        arena,
      )
    : null;
  const deckTray = deckTrayArenaRect && document.tableAttachments?.deckTray
    ? {
        arenaRect: deckTrayArenaRect,
        stageRect: resolveZoneStageRect(deckTrayArenaRect, arena),
        scale: Number.isFinite(document.tableAttachments.deckTray.scale)
          ? Number(document.tableAttachments.deckTray.scale)
          : 1,
        rotation: Number.isFinite(document.tableAttachments.deckTray.rotation)
          ? Number(document.tableAttachments.deckTray.rotation)
          : 0,
      }
    : null;

  return {
    viewportRect,
    workRect,
    hud,
    arena,
    tableScale,
    cardStrip,
    scoreboard,
    deckTray,
    zones,
  };
}
