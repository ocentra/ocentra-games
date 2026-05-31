import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import JSON5 from 'json5';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const resourcesRoot = path.resolve(repoRoot, 'packages/asset-editor/Resources');
const gamesRoot = path.resolve(resourcesRoot, 'GameMode/CardGames/Games');
const SETUP_ROUND_ACTION_ID = 'setup_round';

interface AssetEnvelope {
  system?: {
    assetType?: string;
    displayName?: string;
    treePath?: string;
    guid?: string;
  };
  data?: Record<string, unknown>;
}

interface AssetWriteStats {
  checksum: string;
  fileSize: number;
}

function findAssetFiles(dir: string, fileList: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findAssetFiles(fullPath, fileList);
      continue;
    }
    if (entry.name.endsWith('.asset')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function readAsset(filePath: string): AssetEnvelope {
  return JSON5.parse(fs.readFileSync(filePath, 'utf8')) as AssetEnvelope;
}

function serializeAsset(asset: AssetEnvelope): string {
  return JSON5.stringify({ system: asset.system, data: asset.data }, null, 2);
}

function writeAsset(filePath: string, asset: AssetEnvelope): AssetWriteStats {
  const content = `${serializeAsset(asset)}\n`;
  fs.writeFileSync(filePath, content, 'utf8');
  return {
    checksum: crypto.createHash('sha256').update(content).digest('hex'),
    fileSize: content.length,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeResourcePath(value: string): string {
  return value
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^Resources\//i, '');
}

function filePathFromRef(ref: unknown): string | null {
  const refPath = asText(asRecord(ref).path);
  if (!refPath) {
    return null;
  }
  return path.resolve(resourcesRoot, normalizeResourcePath(refPath).replace(/\//g, path.sep));
}

function loadAssetFromRef(ref: unknown): { filePath: string; asset: AssetEnvelope } | null {
  const filePath = filePathFromRef(ref);
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  return { filePath, asset: readAsset(filePath) };
}

function loadSiblingAsset(gameDir: string, fileName: unknown): { filePath: string; asset: AssetEnvelope } | null {
  const normalizedFileName = asText(fileName);
  if (!normalizedFileName) {
    return null;
  }
  const filePath = path.resolve(gameDir, normalizedFileName);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return { filePath, asset: readAsset(filePath) };
}

function setRefStats(ref: unknown, stats: AssetWriteStats): void {
  const record = asRecord(ref);
  if (Object.keys(record).length === 0) {
    return;
  }
  record.checksum = stats.checksum;
  record.fileSize = stats.fileSize;
  record.mimeType = 'application/json';
}

function normalizeSourceList(value: unknown): Record<string, unknown>[] {
  return asArray(value).flatMap((source) => {
    const record = asRecord(source);
    const name = asText(record.name);
    const url = asText(record.url);
    if (!name || !url) {
      return [];
    }
    return [{
      id: asText(record.id),
      name,
      url,
      retrievedAt: asText(record.retrievedAt),
    }];
  });
}

function buildSourcesContent(source: Record<string, unknown>): Record<string, unknown> {
  const sources = asRecord(source.sources);
  return {
    primary: normalizeSourceList(sources.primary),
    additional: normalizeSourceList(sources.additional),
  };
}

function normalizePhase(value: unknown): Record<string, unknown> | null {
  const phase = asRecord(value);
  if (!asText(phase.id)) {
    return null;
  }
  const next = { ...phase };
  if (!asText(next.notes)) {
    delete next.notes;
  }
  if (!Array.isArray(next.conditionalNext)) {
    next.conditionalNext = [];
  }
  if (!next.cardVisibilityChanges || typeof next.cardVisibilityChanges !== 'object' || Array.isArray(next.cardVisibilityChanges)) {
    next.cardVisibilityChanges = {};
  }
  return next;
}

function buildSetupRoundAction(source: Record<string, unknown>): Record<string, unknown> {
  const engine = asRecord(source.engine);
  const cardVisibility = asRecord(engine.cardVisibility);
  const initialHandSize = asNumber(engine.initialHandSize, 0);
  const deckCount = asNumber(engine.deckCount, 1);
  return {
    supported: true,
    system: true,
    description: `Deal ${initialHandSize} card(s) to each active player and initialize the table before player actions begin.`,
    cost: 'none',
    constraints: 'System-only setup action before the first player phase.',
    isTerminating: true,
    effectType: SETUP_ROUND_ACTION_ID,
    effectHints: {
      initialHandSize,
      deckCount,
      visibility: asText(cardVisibility.initialDeal),
    },
  };
}

function sourcePlayablePhases(source: Record<string, unknown>, fallbackPhases: unknown): Record<string, unknown>[] {
  const sourcePhases = asArray(asRecord(source.engine).phases)
    .map(normalizePhase)
    .filter((phase): phase is Record<string, unknown> => Boolean(phase));
  const fallback = asArray(fallbackPhases)
    .map(normalizePhase)
    .filter((phase): phase is Record<string, unknown> => Boolean(phase))
    .filter((phase) => asText(phase.id) !== SETUP_ROUND_ACTION_ID);
  return sourcePhases.length > 0 ? sourcePhases : fallback;
}

function buildRuntimePhases(source: Record<string, unknown>, fallbackPhases: unknown): Record<string, unknown>[] {
  const playablePhases = sourcePlayablePhases(source, fallbackPhases);
  if (playablePhases[0]?.id === SETUP_ROUND_ACTION_ID) {
    return playablePhases;
  }
  const engine = asRecord(source.engine);
  const initialHandSize = asNumber(engine.initialHandSize, 0);
  return [
    {
      id: SETUP_ROUND_ACTION_ID,
      label: 'Setup Round',
      actor: 'system',
      legalActions: [SETUP_ROUND_ACTION_ID],
      nextPhase: asText(playablePhases[0]?.id) || null,
      isMandatory: true,
      loopIndex: null,
      totalLoops: null,
      conditionalNext: [],
      cardVisibilityChanges: {},
      notes: `Deal ${initialHandSize} card(s) to each active player before player action begins.`,
    },
    ...playablePhases,
  ];
}

function buildProgression(source: Record<string, unknown>, runtimePhases: Record<string, unknown>[]): string[] {
  const sourceProgression = asArray(asRecord(source.engine).progression).map(asText).filter(Boolean);
  const phaseIds = runtimePhases.map((phase) => asText(phase.id)).filter(Boolean);
  return Array.from(new Set([SETUP_ROUND_ACTION_ID, ...(sourceProgression.length > 0 ? sourceProgression : phaseIds.filter((id) => id !== SETUP_ROUND_ACTION_ID))]));
}

function actionIdsFromActions(actions: Record<string, unknown>, customActions: unknown): string[] {
  const supported = Object.entries(actions)
    .filter(([, action]) => asRecord(action).supported === true)
    .map(([id]) => id);
  const custom = asArray(customActions)
    .map(asRecord)
    .filter((action) => action.supported === true)
    .map((action) => asText(action.id))
    .filter(Boolean);
  return Array.from(new Set([SETUP_ROUND_ACTION_ID, ...supported, ...custom]));
}

function legalActionIdsFromPhases(runtimePhases: Record<string, unknown>[]): string[] {
  return Array.from(new Set(runtimePhases.flatMap((phase) => asArray(phase.legalActions).map(asText).filter(Boolean))));
}

function buildLegalActionStub(actionId: string, existing: Record<string, unknown>): Record<string, unknown> {
  return {
    ...existing,
    supported: true,
    generatedFromPhase: true,
    implementationStatus: asText(existing.implementationStatus) || 'needs_executor_review',
    description: asText(existing.description) && asText(existing.description) !== 'NA'
      ? existing.description
      : `Legal phase action ${actionId} is authored in the phase flow and needs executor-specific handling before public release.`,
    cost: asText(existing.cost) && asText(existing.cost) !== 'NA' ? existing.cost : 'none',
    constraints: asText(existing.constraints) && asText(existing.constraints) !== 'NA' ? existing.constraints : 'See phase flow and rules asset.',
    isTerminating: typeof existing.isTerminating === 'boolean' ? existing.isTerminating : true,
    effectType: asText(existing.effectType) && asText(existing.effectType) !== 'NA' ? existing.effectType : actionId,
    effectHints: {
      ...asRecord(existing.effectHints),
      requiresExecutorReview: true,
    },
  };
}

function addSetupAction(asset: AssetEnvelope, source: Record<string, unknown>, runtimePhases: Record<string, unknown>[]): string[] {
  const data = asRecord(asset.data);
  const existingActions = asRecord(data.actions);
  const { [SETUP_ROUND_ACTION_ID]: _oldSetup, ...restActions } = existingActions;
  const actions: Record<string, unknown> = {
    [SETUP_ROUND_ACTION_ID]: buildSetupRoundAction(source),
    ...restActions,
  };
  for (const actionId of legalActionIdsFromPhases(runtimePhases)) {
    if (actionId === SETUP_ROUND_ACTION_ID) {
      continue;
    }
    const action = asRecord(actions[actionId]);
    if (action.supported !== true) {
      actions[actionId] = buildLegalActionStub(actionId, action);
    }
  }
  data.actions = actions;

  const actionModel = asRecord(data.actionModel);
  const existingIds = asArray(actionModel.actionIds).map(asText).filter(Boolean);
  actionModel.actionIds = Array.from(new Set([
    SETUP_ROUND_ACTION_ID,
    ...existingIds,
    ...legalActionIdsFromPhases(runtimePhases),
    ...actionIdsFromActions(actions, data.customActions),
  ]));
  actionModel.actionEndsTurn = {
    ...asRecord(actionModel.actionEndsTurn),
    [SETUP_ROUND_ACTION_ID]: true,
  };
  data.actionModel = actionModel;
  asset.data = data;
  return actionModel.actionIds as string[];
}

function updateValidationFixtures(asset: AssetEnvelope, source: Record<string, unknown>, runtimePhases: Record<string, unknown>[], supportedActionIds: string[]): void {
  const data = asRecord(asset.data);
  const firstPlayablePhase = runtimePhases.find((phase) => asText(phase.id) !== SETUP_ROUND_ACTION_ID);
  for (const suite of asArray(data.validationSuites).map(asRecord)) {
    for (const fixture of asArray(suite.fixtures).map(asRecord)) {
      if (asText(fixture.purpose) !== 'flow') {
        continue;
      }
      fixture.expectedFirstPhase = SETUP_ROUND_ACTION_ID;
      fixture.expectedActor = 'system';
      fixture.expectedLegalActions = [SETUP_ROUND_ACTION_ID];
      fixture.expectedNextPhase = asText(firstPlayablePhase?.id) || null;
      fixture.supportedActionIds = supportedActionIds;
      fixture.firstPlayablePhase = asText(firstPlayablePhase?.id) || null;
      fixture.firstPlayableLegalActions = Array.isArray(firstPlayablePhase?.legalActions) ? firstPlayablePhase.legalActions : [];
      fixture.explanation = `${asText(source.name) || 'Game'} must run setup_round first, then enter ${asText(firstPlayablePhase?.id) || 'the authored first phase'} with the processed legal actions.`;
      fixture.linkedRuleIds = [
        `${asText(source.filename).replace(/\.json$/i, '') || asText(source.name)}.setup.initial-deal`,
        `${asText(source.filename).replace(/\.json$/i, '') || asText(source.name)}.flow.${asText(firstPlayablePhase?.id) || 'first-playable'}`,
      ];
      fixture.sourceFields = ['setup.dealing', 'engine.phases.0', 'engine.playerActions', 'engine.customActions'];
    }
  }
  asset.data = data;
}

function updateStateEventModel(asset: AssetEnvelope, runtimePhases: Record<string, unknown>[], actionIds: string[]): void {
  const data = asRecord(asset.data);
  const eventModel = asRecord(data.eventModel);
  eventModel.phases = runtimePhases.map((phase) => asText(phase.id)).filter(Boolean);
  eventModel.actions = actionIds;
  data.eventModel = eventModel;
  asset.data = data;
}

function repairGameMode(gameModePath: string): boolean {
  const gameMode = readAsset(gameModePath);
  if (gameMode.system?.assetType !== 'CardGameMode') {
    return false;
  }
  const gameModeData = asRecord(gameMode.data);
  const infoEntry = loadAssetFromRef(gameModeData.gameInfoAsset);
  if (!infoEntry) {
    return false;
  }
  const infoData = asRecord(infoEntry.asset.data);
  const source = asRecord(asRecord(infoData.editorOnly).processedSource);
  if (Object.keys(source).length === 0) {
    return false;
  }

  const gameDir = path.dirname(gameModePath);
  const linkedKeys = asRecord(asRecord(infoData.mechanicsContract).linkedAssetKeys);
  const mechanicsEntry = loadAssetFromRef(gameModeData.mechanicsAsset);
  const actionEntry = loadSiblingAsset(gameDir, linkedKeys.actionSet);
  const phaseFlowEntry = loadSiblingAsset(gameDir, linkedKeys.phaseFlowModel);
  const stateEventEntry = loadSiblingAsset(gameDir, linkedKeys.stateEventModel);
  const validationEntry = loadSiblingAsset(gameDir, linkedKeys.validationFixtures);
  if (!mechanicsEntry || !actionEntry || !validationEntry) {
    throw new Error(`Missing linked mechanics assets for ${gameModePath}`);
  }

  infoData.sourcesContent = buildSourcesContent(source);
  infoEntry.asset.data = infoData;

  const runtimePhases = buildRuntimePhases(source, asRecord(mechanicsEntry.asset.data).phases);
  const actionIds = addSetupAction(actionEntry.asset, source, runtimePhases);
  updateValidationFixtures(validationEntry.asset, source, runtimePhases, actionIds);

  if (phaseFlowEntry) {
    const phaseFlowData = asRecord(phaseFlowEntry.asset.data);
    phaseFlowData.phases = runtimePhases;
    phaseFlowData.progression = buildProgression(source, runtimePhases);
    phaseFlowEntry.asset.data = phaseFlowData;
  }

  if (stateEventEntry) {
    updateStateEventModel(stateEventEntry.asset, runtimePhases, actionIds);
  }

  const actionStats = writeAsset(actionEntry.filePath, actionEntry.asset);
  const phaseFlowStats = phaseFlowEntry ? writeAsset(phaseFlowEntry.filePath, phaseFlowEntry.asset) : null;
  const stateEventStats = stateEventEntry ? writeAsset(stateEventEntry.filePath, stateEventEntry.asset) : null;
  const validationStats = writeAsset(validationEntry.filePath, validationEntry.asset);

  const mechanicsData = asRecord(mechanicsEntry.asset.data);
  mechanicsData.phases = runtimePhases;
  mechanicsData.progression = buildProgression(source, runtimePhases);
  mechanicsEntry.asset.data = mechanicsData;
  addSetupAction(mechanicsEntry.asset, source, runtimePhases);
  const updatedMechanicsData = asRecord(mechanicsEntry.asset.data);
  const modelRefs = asRecord(mechanicsData.modelRefs);
  setRefStats(modelRefs.actions, actionStats);
  if (phaseFlowStats) {
    setRefStats(modelRefs.phaseFlow, phaseFlowStats);
  }
  if (stateEventStats) {
    setRefStats(modelRefs.stateEvents, stateEventStats);
  }
  setRefStats(modelRefs.validation, validationStats);
  updatedMechanicsData.modelRefs = modelRefs;
  mechanicsEntry.asset.data = updatedMechanicsData;

  const infoStats = writeAsset(infoEntry.filePath, infoEntry.asset);
  const mechanicsStats = writeAsset(mechanicsEntry.filePath, mechanicsEntry.asset);
  setRefStats(gameModeData.gameInfoAsset, infoStats);
  setRefStats(gameModeData.mechanicsAsset, mechanicsStats);
  gameMode.data = gameModeData;
  writeAsset(gameModePath, gameMode);
  return true;
}

let repaired = 0;
for (const filePath of findAssetFiles(gamesRoot)) {
  if (repairGameMode(filePath)) {
    repaired += 1;
  }
}

process.stdout.write(`Repaired ${repaired} processed CardGameMode asset contract(s).\n`);
