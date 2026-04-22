import React, { useMemo, useState } from 'react';
import type { AssetData } from '@/types/assets';
import './CardGameMechanicsPreview.css';

interface CardGameMechanicsPreviewProps {
  assetData: AssetData;
}

interface MechanicsPhaseTransition {
  condition: string;
  nextPhase: string | null;
}

interface MechanicsPhaseView {
  id: string;
  label: string;
  actor: string;
  legalActions: string[];
  nextPhase: string | null;
  conditionalNext: MechanicsPhaseTransition[];
  notes: string;
  isMandatory: boolean;
  visibilityChanges: Record<string, string>;
}

interface MechanicsActionView {
  id: string;
  supported: boolean;
  description: string;
  constraints: string;
  effectType: string;
  cost: string;
  isTerminating: boolean;
  reason: string;
}

interface MechanicsZoneView {
  id: string;
  type: string;
  owner: string;
  visibility: string;
  capacity: string;
}

interface MechanicsEndConditionView {
  id: string;
  description: string;
  appliesToPhase: string | null;
}

interface MechanicsPreviewModel {
  title: string;
  familyKernel: string;
  kernelVersion: string;
  playerRange: string;
  playerMode: string;
  deckLabel: string;
  handSummary: string;
  turnSummary: string;
  determinismNotes: string;
  phases: MechanicsPhaseView[];
  phaseIdSet: Set<string>;
  actions: Map<string, MechanicsActionView>;
  zones: MechanicsZoneView[];
  endConditions: MechanicsEndConditionView[];
}

interface MechanicsGraphNode {
  id: string;
  label: string;
  kind: 'start' | 'phase' | 'end';
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MechanicsGraphEdge {
  id: string;
  fromId: string;
  toId: string;
  condition: string | null;
  isLoop: boolean;
  isConditional: boolean;
  path: string;
  labelX: number;
  labelY: number;
}

interface MechanicsGraphModel {
  width: number;
  height: number;
  nodes: MechanicsGraphNode[];
  edges: MechanicsGraphEdge[];
}

const GRAPH_NODE_WIDTH = 220;
const GRAPH_NODE_HEIGHT = 124;
const GRAPH_START_WIDTH = 140;
const GRAPH_GAP_X = 120;
const GRAPH_PADDING_X = 40;
const GRAPH_PADDING_Y = 48;
const GRAPH_BASELINE_Y = 84;
const GRAPH_CONDITIONAL_ARC = 70;
const GRAPH_LOOP_ARC = 110;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

function toLabel(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatRange(minPlayers: unknown, maxPlayers: unknown): string {
  const min = typeof minPlayers === 'number' ? minPlayers : null;
  const max = typeof maxPlayers === 'number' ? maxPlayers : null;

  if (min != null && max != null) {
    return min === max ? `${min}` : `${min}-${max}`;
  }

  if (min != null) {
    return `${min}+`;
  }

  if (max != null) {
    return `up to ${max}`;
  }

  return 'Unknown';
}

function formatTurnSummary(data: Record<string, unknown>): string {
  const turnPolicy = asRecord(data.turnPolicy);
  const direction = toLabel(asString(turnPolicy?.direction, 'clockwise'));
  const startsWith = toLabel(asString(turnPolicy?.startsWith, 'left_of_dealer'));
  const timerSeconds = turnPolicy?.timerSeconds;
  const timerLabel = typeof timerSeconds === 'number' && timerSeconds > 0 ? `${timerSeconds}s timer` : 'No timer';
  return `${direction} turns, starts ${startsWith}, ${timerLabel}`;
}

function formatCost(value: unknown): string {
  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value == null) {
    return '0';
  }

  return JSON.stringify(value);
}

function buildPhases(data: Record<string, unknown>): MechanicsPhaseView[] {
  const phases = Array.isArray(data.phases) ? data.phases : [];

  return phases.map((phase, index) => {
    const phaseRecord = asRecord(phase);
    const conditionalNextRaw = Array.isArray(phaseRecord?.conditionalNext) ? phaseRecord.conditionalNext : [];
    const visibilityChanges = asRecord(phaseRecord?.cardVisibilityChanges);

    return {
      id: asString(phaseRecord?.id, `phase-${index + 1}`),
      label: asString(phaseRecord?.label, `Phase ${index + 1}`),
      actor: asString(phaseRecord?.actor, 'current_player'),
      legalActions: asStringArray(phaseRecord?.legalActions),
      nextPhase: asNullableString(phaseRecord?.nextPhase),
      conditionalNext: conditionalNextRaw
        .map((entry) => {
          const record = asRecord(entry);
          return {
            condition: asString(record?.condition, 'Condition'),
            nextPhase: asNullableString(record?.nextPhase),
          };
        })
        .filter((entry) => entry.nextPhase || entry.condition),
      notes: asString(phaseRecord?.notes),
      isMandatory: asBoolean(phaseRecord?.isMandatory, true),
      visibilityChanges: Object.fromEntries(
        Object.entries(visibilityChanges ?? {}).flatMap(([key, value]) =>
          typeof value === 'string' ? [[key, value]] : [],
        ),
      ),
    };
  });
}

function buildActions(data: Record<string, unknown>): Map<string, MechanicsActionView> {
  const actionMap = new Map<string, MechanicsActionView>();
  const standardActions = asRecord(data.actions);

  for (const [actionId, actionValue] of Object.entries(standardActions ?? {})) {
    const action = asRecord(actionValue);
    actionMap.set(actionId, {
      id: actionId,
      supported: asBoolean(action?.supported, true),
      description: asString(action?.description, 'No description'),
      constraints: asString(action?.constraints, ''),
      effectType: asString(action?.effectType, 'custom'),
      cost: formatCost(action?.cost),
      isTerminating: asBoolean(action?.isTerminating, false),
      reason: asString(action?.reason, ''),
    });
  }

  const customActions = Array.isArray(data.customActions) ? data.customActions : [];
  for (const customAction of customActions) {
    const record = asRecord(customAction);
    const id = asString(record?.id);

    if (!id) {
      continue;
    }

    actionMap.set(id, {
      id,
      supported: asBoolean(record?.supported, true),
      description: asString(record?.description, 'No description'),
      constraints: asString(record?.constraints, ''),
      effectType: asString(record?.effectType, 'custom'),
      cost: formatCost(record?.cost),
      isTerminating: asBoolean(record?.isTerminating, false),
      reason: asString(record?.reason, ''),
    });
  }

  return actionMap;
}

function buildZones(data: Record<string, unknown>): MechanicsZoneView[] {
  const zones = Array.isArray(data.zones) ? data.zones : [];

  return zones.map((zone, index) => {
    const record = asRecord(zone);
    return {
      id: asString(record?.id, `zone-${index + 1}`),
      type: asString(record?.type, 'stack'),
      owner: asString(record?.owner, 'table'),
      visibility: asString(record?.visibility, 'hidden'),
      capacity: record?.capacity == null ? 'Open' : String(record.capacity),
    };
  });
}

function buildEndConditions(data: Record<string, unknown>): MechanicsEndConditionView[] {
  const endConditions = Array.isArray(data.endConditions) ? data.endConditions : [];

  return endConditions.map((entry, index) => {
    const record = asRecord(entry);
    return {
      id: asString(record?.id, `end-${index + 1}`),
      description: asString(record?.description, 'No end condition description'),
      appliesToPhase: asNullableString(record?.appliesToPhase),
    };
  });
}

function buildPreviewModel(assetData: AssetData): MechanicsPreviewModel {
  const system = asRecord(assetData.system);
  const data = asRecord(assetData.data) ?? {};
  const playerConfig = asRecord(data.playerConfig);
  const phases = buildPhases(data);
  const playerRange = formatRange(playerConfig?.minPlayers, playerConfig?.maxPlayers);
  const deckLabel = `${typeof data.deckCount === 'number' ? data.deckCount : 1} x ${toLabel(asString(data.deckType, 'deck'))}`;
  const handSummary = `${typeof data.initialHandSize === 'number' ? data.initialHandSize : 0} card start, ${typeof data.finalHandSize === 'number' ? data.finalHandSize : 0} final hand`;

  return {
    title: asString(system?.displayName, asString(data.familyKernel, 'Mechanics')),
    familyKernel: asString(data.familyKernel, 'custom'),
    kernelVersion: asString(data.kernelVersion, '1.0'),
    playerRange,
    playerMode: toLabel(asString(playerConfig?.playerMode, 'multiplayer')),
    deckLabel,
    handSummary,
    turnSummary: formatTurnSummary(data),
    determinismNotes: asString(data.determinismNotes, 'No determinism notes yet.'),
    phases,
    phaseIdSet: new Set(phases.map((phase) => phase.id)),
    actions: buildActions(data),
    zones: buildZones(data),
    endConditions: buildEndConditions(data),
  };
}

function buildStorySteps(model: MechanicsPreviewModel): Array<{ title: string; body: string }> {
  const openingPhase = model.phases[0];
  const firstActionList = openingPhase?.legalActions.length ? openingPhase.legalActions.map(toLabel).join(', ') : 'No opening actions defined';
  const phaseSequence = model.phases.map((phase) => toLabel(phase.label)).join(' -> ');
  const endSummary = model.endConditions.length
    ? model.endConditions.map((condition) => condition.description).join(' ')
    : 'No explicit end condition is documented yet.';

  return [
    {
      title: 'Setup',
      body: `${model.playerMode} game for ${model.playerRange} players using ${model.deckLabel}. Hands open at ${model.handSummary}.`,
    },
    {
      title: 'Opening beat',
      body: openingPhase
        ? `${toLabel(openingPhase.label)} kicks things off. The phase currently exposes ${firstActionList}.`
        : 'No opening phase is authored yet.',
    },
    {
      title: 'Round flow',
      body: phaseSequence ? `The authored spine is ${phaseSequence}. Conditional jumps are drawn in the graph below.` : 'No phase order is authored yet.',
    },
    {
      title: 'Finish',
      body: endSummary,
    },
  ];
}

function buildPhaseEditPaths(phaseIndex: number): string[] {
  return [
    `phases[${phaseIndex}].label`,
    `phases[${phaseIndex}].actor`,
    `phases[${phaseIndex}].legalActions`,
    `phases[${phaseIndex}].nextPhase`,
    `phases[${phaseIndex}].conditionalNext`,
    `phases[${phaseIndex}].cardVisibilityChanges`,
    `phases[${phaseIndex}].notes`,
  ];
}

function buildGraphModel(phases: MechanicsPhaseView[]): MechanicsGraphModel {
  const startNode: MechanicsGraphNode = {
    id: 'graph-start',
    label: 'Start',
    kind: 'start',
    x: GRAPH_PADDING_X,
    y: GRAPH_BASELINE_Y + 8,
    width: GRAPH_START_WIDTH,
    height: 88,
  };

  const phaseNodes = phases.map((phase, index) => ({
    id: phase.id,
    label: toLabel(phase.label),
    kind: 'phase' as const,
    x: GRAPH_PADDING_X + GRAPH_START_WIDTH + GRAPH_GAP_X + index * (GRAPH_NODE_WIDTH + GRAPH_GAP_X),
    y: GRAPH_BASELINE_Y,
    width: GRAPH_NODE_WIDTH,
    height: GRAPH_NODE_HEIGHT,
  }));

  const endNode: MechanicsGraphNode = {
    id: 'graph-end',
    label: 'End',
    kind: 'end',
    x: phaseNodes.length > 0
      ? phaseNodes[phaseNodes.length - 1].x + GRAPH_NODE_WIDTH + GRAPH_GAP_X
      : GRAPH_PADDING_X + GRAPH_START_WIDTH + GRAPH_GAP_X,
    y: GRAPH_BASELINE_Y + 8,
    width: GRAPH_START_WIDTH,
    height: 88,
  };

  const allNodes = [startNode, ...phaseNodes, endNode];
  const nodeMap = new Map(allNodes.map((node) => [node.id, node]));
  const edges: MechanicsGraphEdge[] = [];

  function addEdge(fromId: string, toId: string | null, condition: string | null, isConditional: boolean): void {
    const fromNode = nodeMap.get(fromId);
    const targetNode = nodeMap.get(toId ?? 'graph-end');

    if (!fromNode || !targetNode) {
      return;
    }

    const fromX = fromNode.x + fromNode.width;
    const fromY = fromNode.y + fromNode.height / 2;
    const toX = targetNode.x;
    const toY = targetNode.y + targetNode.height / 2;
    const isLoop = targetNode.x <= fromNode.x;

    let path = '';
    let labelX = (fromX + toX) / 2;
    let labelY = fromY - 12;

    if (isLoop) {
      const controlTop = Math.max(32, Math.min(fromNode.y, targetNode.y) - GRAPH_LOOP_ARC);
      const midX = (fromX + toX) / 2;
      path = `M ${fromX} ${fromY} C ${fromX + 60} ${controlTop}, ${midX} ${controlTop}, ${midX} ${controlTop} S ${toX - 60} ${controlTop}, ${toX} ${toY}`;
      labelX = midX;
      labelY = controlTop - 10;
    } else if (isConditional) {
      const controlY = Math.max(36, Math.min(fromY, toY) - GRAPH_CONDITIONAL_ARC);
      const midX = (fromX + toX) / 2;
      path = `M ${fromX} ${fromY} C ${fromX + 48} ${controlY}, ${toX - 48} ${controlY}, ${toX} ${toY}`;
      labelX = midX;
      labelY = controlY - 8;
    } else {
      path = `M ${fromX} ${fromY} C ${fromX + 48} ${fromY}, ${toX - 48} ${toY}, ${toX} ${toY}`;
    }

    edges.push({
      id: `${fromId}-${toId ?? 'graph-end'}-${condition ?? 'default'}`,
      fromId,
      toId: toId ?? 'graph-end',
      condition,
      isLoop,
      isConditional,
      path,
      labelX,
      labelY,
    });
  }

  if (phaseNodes.length > 0) {
    addEdge(startNode.id, phaseNodes[0].id, null, false);
  } else {
    addEdge(startNode.id, endNode.id, null, false);
  }

  for (const phase of phases) {
    addEdge(phase.id, phase.nextPhase, null, false);
    for (const transition of phase.conditionalNext) {
      addEdge(phase.id, transition.nextPhase, transition.condition, true);
    }
  }

  const width = endNode.x + endNode.width + GRAPH_PADDING_X;
  const height = GRAPH_BASELINE_Y + GRAPH_NODE_HEIGHT + GRAPH_PADDING_Y;

  return {
    width,
    height,
    nodes: allNodes,
    edges,
  };
}

export const CardGameMechanicsPreview: React.FC<CardGameMechanicsPreviewProps> = ({ assetData }) => {
  const model = useMemo(() => buildPreviewModel(assetData), [assetData]);
  const graph = useMemo(() => buildGraphModel(model.phases), [model.phases]);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>(model.phases[0]?.id ?? '');

  // Synchronize selectedPhaseId during render phase
  if (selectedPhaseId && !model.phaseIdSet.has(selectedPhaseId)) {
    setSelectedPhaseId(model.phases[0]?.id ?? '');
  }


  const selectedPhaseIndex = model.phases.findIndex((phase) => phase.id === selectedPhaseId);
  const selectedPhase = selectedPhaseIndex >= 0 ? model.phases[selectedPhaseIndex] : null;
  const selectedActions = selectedPhase
    ? selectedPhase.legalActions
      .map((actionId) => model.actions.get(actionId))
      .filter((action): action is MechanicsActionView => Boolean(action))
    : [];
  const storySteps = useMemo(() => buildStorySteps(model), [model]);

  return (
    <div className="card-game-mechanics-preview">
      <header className="card-game-mechanics-preview__hero">
        <div className="card-game-mechanics-preview__hero-copy">
          <span className="card-game-mechanics-preview__eyebrow">Mechanics Story</span>
          <h2>{model.title}</h2>
          <p>
            Read the round like a board. The graph shows what starts the game, where players make choices, where branches
            happen, and what ends the round.
          </p>
        </div>
        <div className="card-game-mechanics-preview__chips">
          <span>{model.playerMode}</span>
          <span>{model.playerRange} players</span>
          <span>{model.deckLabel}</span>
          <span>{model.handSummary}</span>
          <span>{model.turnSummary}</span>
        </div>
      </header>

      <section className="card-game-mechanics-preview__story-grid">
        {storySteps.map((step, index) => (
          <article key={step.title} className="card-game-mechanics-preview__story-card">
            <span className="card-game-mechanics-preview__story-index">0{index + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </article>
        ))}
      </section>

      <section className="card-game-mechanics-preview__panel">
        <div className="card-game-mechanics-preview__section-header">
          <h3>Round Flow</h3>
          <p>Click a phase node to focus it. Solid lines are default flow. Labeled arcs are authored branches.</p>
        </div>

        <div className="card-game-mechanics-preview__graph-shell">
          <div className="card-game-mechanics-preview__graph" style={{ width: `${graph.width}px`, height: `${graph.height}px` }}>
            <svg
              className="card-game-mechanics-preview__graph-svg"
              width={graph.width}
              height={graph.height}
              viewBox={`0 0 ${graph.width} ${graph.height}`}
              preserveAspectRatio="xMinYMin meet"
            >
              <defs>
                <marker
                  id="card-game-mechanics-preview__arrow"
                  markerWidth="14"
                  markerHeight="14"
                  refX="9"
                  refY="5"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" className="card-game-mechanics-preview__arrow-head" />
                </marker>
              </defs>
              {graph.edges.map((edge) => (
                <g key={edge.id}>
                  <path
                    d={edge.path}
                    className={`card-game-mechanics-preview__edge${edge.isConditional ? ' card-game-mechanics-preview__edge--conditional' : ''}${edge.isLoop ? ' card-game-mechanics-preview__edge--loop' : ''}`}
                    markerEnd="url(#card-game-mechanics-preview__arrow)"
                  />
                  {edge.condition && (
                    <text x={edge.labelX} y={edge.labelY} className="card-game-mechanics-preview__edge-label" textAnchor="middle">
                      {toLabel(edge.condition)}
                    </text>
                  )}
                </g>
              ))}
            </svg>

            {graph.nodes.map((node) => (
              node.kind === 'phase' ? (
                <button
                  key={node.id}
                  type="button"
                  className={`card-game-mechanics-preview__graph-node card-game-mechanics-preview__graph-node--phase${selectedPhaseId === node.id ? ' card-game-mechanics-preview__graph-node--active' : ''}`}
                  style={{ left: `${node.x}px`, top: `${node.y}px`, width: `${node.width}px`, height: `${node.height}px` }}
                  onClick={() => setSelectedPhaseId(node.id)}
                >
                  <span className="card-game-mechanics-preview__graph-node-kind">Phase</span>
                  <strong>{node.label}</strong>
                  <span className="card-game-mechanics-preview__graph-node-meta">
                    {model.phases.find((phase) => phase.id === node.id)?.legalActions.length ?? 0} actions
                  </span>
                </button>
              ) : (
                <div
                  key={node.id}
                  className={`card-game-mechanics-preview__graph-node card-game-mechanics-preview__graph-node--terminal card-game-mechanics-preview__graph-node--${node.kind}`}
                  style={{ left: `${node.x}px`, top: `${node.y}px`, width: `${node.width}px`, height: `${node.height}px` }}
                >
                  <span className="card-game-mechanics-preview__graph-node-kind">{node.kind === 'start' ? 'Entry' : 'Exit'}</span>
                  <strong>{node.label}</strong>
                </div>
              )
            ))}
          </div>
        </div>
      </section>

      <section className="card-game-mechanics-preview__workspace">
        <div className="card-game-mechanics-preview__phase-list">
          <div className="card-game-mechanics-preview__section-header">
            <h3>Phase Rail</h3>
            <p>Use this as the quick scan list for the round order.</p>
          </div>
          {model.phases.map((phase, index) => (
            <button
              key={phase.id}
              type="button"
              className={`card-game-mechanics-preview__phase-card${selectedPhaseId === phase.id ? ' card-game-mechanics-preview__phase-card--active' : ''}`}
              onClick={() => setSelectedPhaseId(phase.id)}
            >
              <div className="card-game-mechanics-preview__phase-card-top">
                <span className="card-game-mechanics-preview__phase-step">{index + 1}</span>
                <span className="card-game-mechanics-preview__phase-actor">{toLabel(phase.actor)}</span>
                {!phase.isMandatory && <span className="card-game-mechanics-preview__phase-optional">Optional</span>}
              </div>
              <h4>{toLabel(phase.label)}</h4>
              <div className="card-game-mechanics-preview__token-row">
                {phase.legalActions.length > 0 ? phase.legalActions.map((action) => (
                  <span key={action} className="card-game-mechanics-preview__token">{toLabel(action)}</span>
                )) : (
                  <span className="card-game-mechanics-preview__token card-game-mechanics-preview__token--muted">No actions</span>
                )}
              </div>
              <div className="card-game-mechanics-preview__transition-list">
                {phase.nextPhase && (
                  <span className="card-game-mechanics-preview__transition-pill">
                    Default {'->'} {toLabel(phase.nextPhase)}
                  </span>
                )}
                {phase.conditionalNext.map((transition) => (
                  <span key={`${phase.id}-${transition.condition}-${transition.nextPhase ?? 'end'}`} className="card-game-mechanics-preview__transition-pill">
                    {toLabel(transition.condition)} {'->'} {transition.nextPhase ? toLabel(transition.nextPhase) : 'End'}
                  </span>
                ))}
                {!phase.nextPhase && phase.conditionalNext.length === 0 && (
                  <span className="card-game-mechanics-preview__transition-pill card-game-mechanics-preview__transition-pill--muted">
                    No outgoing transition
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        <aside className="card-game-mechanics-preview__detail-pane">
          <div className="card-game-mechanics-preview__section-header">
            <h3>{selectedPhase ? `${toLabel(selectedPhase.label)} Details` : 'Select a Phase'}</h3>
            <p>{selectedPhase ? `Phase id: ${selectedPhase.id}` : 'Choose a node to inspect the editing surface.'}</p>
          </div>

          {selectedPhase ? (
            <>
              <div className="card-game-mechanics-preview__detail-grid">
                <div>
                  <span className="card-game-mechanics-preview__detail-label">Actor</span>
                  <strong>{toLabel(selectedPhase.actor)}</strong>
                </div>
                <div>
                  <span className="card-game-mechanics-preview__detail-label">Default next</span>
                  <strong>{selectedPhase.nextPhase ? toLabel(selectedPhase.nextPhase) : 'No direct next phase'}</strong>
                </div>
              </div>

              <section className="card-game-mechanics-preview__subsection">
                <h4>What happens here</h4>
                <p className="card-game-mechanics-preview__notes">
                  {selectedPhase.notes || 'No notes are authored yet for this phase.'}
                </p>
              </section>

              <section className="card-game-mechanics-preview__subsection">
                <h4>Action Detail</h4>
                <div className="card-game-mechanics-preview__action-list">
                  {selectedActions.length > 0 ? selectedActions.map((action) => (
                    <article key={action.id} className="card-game-mechanics-preview__action-card">
                      <div className="card-game-mechanics-preview__action-card-top">
                        <h5>{toLabel(action.id)}</h5>
                        <span>{toLabel(action.effectType)}</span>
                      </div>
                      <p>{action.description}</p>
                      <div className="card-game-mechanics-preview__action-meta">
                        <span>Cost: {action.cost}</span>
                        <span>{action.supported ? 'Supported' : 'Unsupported'}</span>
                        <span>{action.isTerminating ? 'Terminates turn' : 'Keeps turn alive'}</span>
                      </div>
                      {action.constraints && (
                        <div className="card-game-mechanics-preview__callout">
                          <span>Constraints</span>
                          <p>{action.constraints}</p>
                        </div>
                      )}
                      {action.reason && (
                        <div className="card-game-mechanics-preview__callout card-game-mechanics-preview__callout--muted">
                          <span>Reason</span>
                          <p>{action.reason}</p>
                        </div>
                      )}
                    </article>
                  )) : (
                    <div className="card-game-mechanics-preview__empty">This phase does not expose any legal actions.</div>
                  )}
                </div>
              </section>

              <section className="card-game-mechanics-preview__subsection">
                <h4>Branching</h4>
                <div className="card-game-mechanics-preview__branch-list">
                  {selectedPhase.nextPhase && (
                    <div className="card-game-mechanics-preview__branch-row">
                      <span className="card-game-mechanics-preview__branch-label">Default</span>
                      <span>{toLabel(selectedPhase.nextPhase)}</span>
                    </div>
                  )}
                  {selectedPhase.conditionalNext.map((transition) => (
                    <div key={`${selectedPhase.id}-${transition.condition}-${transition.nextPhase ?? 'end'}`} className="card-game-mechanics-preview__branch-row">
                      <span className="card-game-mechanics-preview__branch-label">{toLabel(transition.condition)}</span>
                      <span>{transition.nextPhase ? toLabel(transition.nextPhase) : 'End'}</span>
                    </div>
                  ))}
                  {!selectedPhase.nextPhase && selectedPhase.conditionalNext.length === 0 && (
                    <div className="card-game-mechanics-preview__empty">No branching has been authored for this phase.</div>
                  )}
                </div>
              </section>

              {Object.keys(selectedPhase.visibilityChanges).length > 0 && (
                <section className="card-game-mechanics-preview__subsection">
                  <h4>Visibility Changes</h4>
                  <div className="card-game-mechanics-preview__key-value-list">
                    {Object.entries(selectedPhase.visibilityChanges).map(([key, value]) => (
                      <div key={key} className="card-game-mechanics-preview__key-value-row">
                        <span>{toLabel(key)}</span>
                        <strong>{toLabel(value)}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="card-game-mechanics-preview__subsection">
                <h4>Edit Paths</h4>
                <div className="card-game-mechanics-preview__path-list">
                  {buildPhaseEditPaths(selectedPhaseIndex).map((path) => (
                    <code key={path}>{path}</code>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <div className="card-game-mechanics-preview__empty">No phases are authored yet.</div>
          )}
        </aside>
      </section>

      <section className="card-game-mechanics-preview__footer-grid">
        <section className="card-game-mechanics-preview__panel">
          <div className="card-game-mechanics-preview__section-header">
            <h3>Zones</h3>
            <p>Cards move through these spaces while the round unfolds.</p>
          </div>
          <div className="card-game-mechanics-preview__zone-grid">
            {model.zones.length > 0 ? model.zones.map((zone) => (
              <article key={zone.id} className="card-game-mechanics-preview__zone-card">
                <h4>{toLabel(zone.id)}</h4>
                <span>{toLabel(zone.type)}</span>
                <span>{toLabel(zone.owner)}</span>
                <span>{toLabel(zone.visibility)}</span>
                <span>{zone.capacity}</span>
              </article>
            )) : (
              <div className="card-game-mechanics-preview__empty">No zones authored yet.</div>
            )}
          </div>
        </section>

        <section className="card-game-mechanics-preview__panel">
          <div className="card-game-mechanics-preview__section-header">
            <h3>End Conditions</h3>
            <p>These are the authored ways the round or game can close.</p>
          </div>
          <div className="card-game-mechanics-preview__end-list">
            {model.endConditions.length > 0 ? model.endConditions.map((condition) => (
              <article key={condition.id} className="card-game-mechanics-preview__end-card">
                <h4>{toLabel(condition.id)}</h4>
                <p>{condition.description}</p>
                <span>{condition.appliesToPhase ? `Phase: ${toLabel(condition.appliesToPhase)}` : 'Global condition'}</span>
              </article>
            )) : (
              <div className="card-game-mechanics-preview__empty">No end conditions authored yet.</div>
            )}
          </div>
        </section>
      </section>

      <section className="card-game-mechanics-preview__panel card-game-mechanics-preview__panel--determinism">
        <div className="card-game-mechanics-preview__section-header">
          <h3>Determinism</h3>
          <p>What must stay stable for replay, AI simulation, and multiplayer sync.</p>
        </div>
        <p className="card-game-mechanics-preview__notes">{model.determinismNotes}</p>
      </section>
    </div>
  );
};
