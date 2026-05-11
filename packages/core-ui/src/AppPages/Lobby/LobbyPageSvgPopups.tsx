import { useEffect, useRef, useState } from 'react';
import { ProviderDefaultModels } from '@ocentra/ai-domain/constants/models';
import { ProviderCatalog } from '@ocentra/ai-domain/constants/provider-catalog';
import { ProviderType, type ProviderId } from '@ocentra/ai-domain/types/provider';
import { DEFAULT_FEATURED_CARDS, REWARD_SPINNER } from './LobbyPageSvgData';
import { centeredPopupRect, roundedRectPath } from './LobbyPageSvgGeometry';
import {
  Avatar,
  Btn,
  CenterTxt,
  PopupBackdrop,
  PopupFrame,
  SideHandle,
  Txt,
} from './LobbyPageSvgPrimitives';
import { CardBadge, ImageCardArt, LobbyCarouselShell } from './LobbyPageSvgPrefabs';
import type {
  FeaturedCardData,
  LobbyCanvasRect,
  LobbyCreateRoomDraft,
  LobbyJoinCodeDraft,
  LobbyQuickJoinDraft,
  LobbyRoomListFilterDraft,
  LobbyTableRow,
  LobbyUserSummary,
} from './LobbyPageSvgTypes';
import type { LobbyPageSvgControls } from './LobbyPageSvgSurfaceControls';

export function FilterPopup({
  open,
  onClose,
  canvas,
  filters,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  canvas: LobbyCanvasRect;
  filters?: LobbyRoomListFilterDraft;
  onApply: (filters: LobbyRoomListFilterDraft) => void;
}) {
  if (!open) return null;
  return <FilterPopupContent key={JSON.stringify(filters ?? {})} onClose={onClose} canvas={canvas} filters={filters} onApply={onApply} />;
}

function FilterPopupContent({
  onClose,
  canvas,
  filters,
  onApply,
}: {
  onClose: () => void;
  canvas: LobbyCanvasRect;
  filters?: LobbyRoomListFilterDraft;
  onApply: (filters: LobbyRoomListFilterDraft) => void;
}) {
  const [draft, setDraft] = useState<LobbyRoomListFilterDraft>({ status: 'waiting', sort: 'newest', ...filters });
  const { x, y, w, h } = centeredPopupRect(canvas, 1012, 610);
  const optionGroups = [
    ['Mode', [
      ['All', { mode: undefined }],
      ['Casual', { mode: 'casual' }],
      ['Ranked', { mode: 'ranked' }],
      ['Training', { mode: 'training', allowAI: true }],
      ['Benchmark', { mode: 'benchmark', allowAI: true }],
      ['Stakes', { mode: 'stakes' }],
    ]],
    ['Status', [
      ['All', { status: undefined }],
      ['Waiting', { status: 'waiting' }],
      ['Starting', { status: 'starting' }],
      ['Active', { status: 'active' }],
    ]],
    ['Visibility', [
      ['All', { visibility: undefined }],
      ['Public', { visibility: 'public' }],
      ['Private', { visibility: 'private' }],
      ['Friends', { visibility: 'friends' }],
    ]],
    ['Stakes', [
      ['All', { stakeType: undefined }],
      ['Free', { stakeType: 'free' }],
      ['Game Coin', { stakeType: 'game-coin' }],
      ['Real Money', { stakeType: 'real-money' }],
    ]],
    ['AI Allowed', [
      ['All', { allowAI: undefined }],
      ['Allowed', { allowAI: true }],
      ['No AI', { allowAI: false }],
    ]],
    ['Sort By', [
      ['Newest', { sort: 'newest' }],
      ['Oldest', { sort: 'oldest' }],
      ['Fullest', { sort: 'fullest' }],
      ['Emptiest', { sort: 'emptiest' }],
    ]],
  ] satisfies Array<[string, Array<[string, Partial<LobbyRoomListFilterDraft>]>]>;
  const colGap = 18;
  const colW = (w - 60 - colGap * 2) / 3;
  const cleanAndApply = (next: LobbyRoomListFilterDraft) => {
    const search = next.search?.trim();
    onApply({
      ...next,
      search: search || undefined,
    });
    onClose();
  };
  const resetFilters = () => cleanAndApply({ status: 'waiting', sort: 'newest' });
  const isSelected = (patch: Partial<LobbyRoomListFilterDraft>) => (
    Object.entries(patch).every(([key, value]) => draft[key as keyof LobbyRoomListFilterDraft] === value)
  );
  return (
    <g>
      <PopupBackdrop canvas={canvas} onClose={onClose} />
      <SideHandle x={x - 24} y={y + 212} side="left" />
      <SideHandle x={x + w} y={y + 212} side="right" />
      <PopupFrame x={x} y={y} w={w} h={h} title="Search & Filters" subtitle="Search tables, then narrow results by players, status, visibility, AI rules, stakes, and sort order." onClose={onClose} />
      <PopupTextInput x={x + 30} y={y + 92} w={w - 230} label="Search" value={draft.search ?? ''} placeholder="Table name, code, player, rule, AI model, or stake" onChange={(value) => setDraft(previous => ({ ...previous, search: value }))} />
      <Btn x={x + w - 170} y={y + 101} w={118} h={30} label="SEARCH" active tone="cyan" size={11} onClick={() => cleanAndApply(draft)} />
      {optionGroups.map(([title, options], index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const gx = x + 30 + col * (colW + colGap);
        const gy = y + 160 + row * 180;
        return (
          <g key={title}>
            <rect x={gx} y={gy} width={colW} height="158" rx="8" fill="#06111f" stroke="#203a55" />
            <Txt x={gx + 16} y={gy + 24} text={title.toUpperCase()} maxWidth={colW - 32} size={12} weight="950" fill="#9ff6ff" />
            {options.map(([option, patch], i) => {
              const selected = isSelected(patch);
              const ox = gx + 14 + (i % 2) * ((colW - 38) / 2 + 10);
              const oy = gy + 44 + Math.floor(i / 2) * 42;
              const ow = (colW - 38) / 2;
              return (
                <g key={option} className="lobby-ui-hit" onClick={() => setDraft(previous => ({ ...previous, ...patch }))}>
                  <rect x={ox} y={oy} width={ow} height="30" rx="5" fill={selected ? 'url(#lobbyPurpleSoft)' : '#071426'} stroke={selected ? '#6d35ff' : '#263d58'} />
                  <CenterTxt x={ox} y={oy} w={ow} h={30} text={option} size={10} weight={selected ? '900' : '650'} />
                </g>
              );
            })}
          </g>
        );
      })}
      <Btn x={x + w - 294} y={y + h - 68} w={112} h={30} label="RESET" size={10.5} onClick={resetFilters} />
      <Btn x={x + w - 168} y={y + h - 68} w={116} h={30} label="APPLY" active tone="purple" size={11} onClick={() => cleanAndApply(draft)} />
    </g>
  );
}

const QUICK_JOIN_PRESET_KEYS = ['master', 'ai-vs-human', 'high-stake', 'ranked', 'casual'];
const CREATE_TABLE_PRESET_KEYS = ['master', 'ai-showdown', 'ai-vs-human', 'ai-coach', 'high-stake', 'ranked', 'casual'];
const NO_AI_PRESET_KEYS = ['master', 'high-stake', 'ranked', 'casual'];
const STAKE_OPTIONS = ['Any', 'Free', 'Game Coin', 'Real Money'];
const ENTRY_OPTIONS = ['Free', 'Game Coin', 'Real Money'];
const VISIBILITY_OPTIONS = ['Public', 'Private', 'Friends'];
const AI_POLICY_OPTIONS = ['Allowed', 'Banned'];

function modeForPreset(presetKey: string | undefined): LobbyCreateRoomDraft['mode'] {
  if (presetKey === 'ranked' || presetKey === 'master') return 'ranked';
  if (presetKey === 'ai-showdown') return 'benchmark';
  if (presetKey === 'ai-coach') return 'training';
  if (presetKey === 'high-stake') return 'stakes';
  return 'casual';
}

function stakeTypeForLabel(label: string): LobbyCreateRoomDraft['stakeType'] | undefined {
  if (label === 'Any') return undefined;
  if (label === 'Game Coin') return 'game-coin';
  if (label === 'Real Money') return 'real-money';
  return 'free';
}

function stakeAmountForType(stakeType: LobbyCreateRoomDraft['stakeType'] | undefined): number {
  if (stakeType === 'game-coin') return 100;
  if (stakeType === 'real-money') return 5;
  return 0;
}

function visibilityForLabel(label: string): LobbyCreateRoomDraft['visibility'] {
  if (label === 'Private') return 'private';
  if (label === 'Friends') return 'friends';
  return 'public';
}

function parsedPlayerCount(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function createRoomDraftFromCard(card: FeaturedCardData, options: {
  visibility?: string;
  players?: string;
  aiPolicy?: string;
  entry?: string;
  roomName?: string;
  aiCount?: number;
} = {}): LobbyCreateRoomDraft {
  const maxPlayers = parsedPlayerCount(options.players ?? card.players, 4);
  const stakeType = stakeTypeForLabel(options.entry ?? card.entry ?? 'Free') ?? 'free';
  const allowAI = options.aiPolicy !== 'Banned';
  return {
    presetKey: card.presetKey,
    roomName: options.roomName ?? card.title,
    mode: modeForPreset(card.presetKey),
    visibility: visibilityForLabel(options.visibility ?? 'Public'),
    maxPlayers,
    allowAI,
    aiCount: allowAI ? Math.max(0, Math.min(maxPlayers - 1, options.aiCount ?? (card.ai ? 1 : 0))) : 0,
    allowSpectators: true,
    stakeType,
    stakeAmount: stakeAmountForType(stakeType),
    turnTimerSeconds: 60,
    region: 'global',
  };
}

function quickJoinDraftFromCard(card: FeaturedCardData, options: {
  aiPolicy?: string;
  stake?: string;
} = {}): LobbyQuickJoinDraft {
  return {
    presetKey: card.presetKey,
    mode: modeForPreset(card.presetKey),
    allowAI: options.aiPolicy !== 'Banned',
    stakeType: stakeTypeForLabel(options.stake ?? 'Any'),
    maxPlayers: parsedPlayerCount(card.players, 4),
  };
}

function aiProviderModelLabel(providerId: ProviderId): string {
  const provider = ProviderCatalog[providerId];
  const model = ProviderDefaultModels[providerId]?.[0];
  if (!provider) return 'Auto best available';
  return model ? `${provider.name}: ${model.name}` : provider.name;
}

const AI_MODEL_OPTIONS = [
  'Auto best available',
  aiProviderModelLabel(ProviderType.OpenAI),
  aiProviderModelLabel(ProviderType.Gemini),
  aiProviderModelLabel(ProviderType.Anthropic),
  aiProviderModelLabel(ProviderType.Mistral),
  aiProviderModelLabel(ProviderType.OpenRouter),
  aiProviderModelLabel(ProviderType.Ollama),
  aiProviderModelLabel(ProviderType.LMStudio),
  aiProviderModelLabel(ProviderType.LocalAI),
  aiProviderModelLabel(ProviderType.VLLM),
  aiProviderModelLabel(ProviderType.LocalTransformers),
  aiProviderModelLabel(ProviderType.Native),
];

function starterCardForKey(presetKey: string): FeaturedCardData {
  const match = DEFAULT_FEATURED_CARDS.find(card => card.presetKey === presetKey);
  if (match) return match;
  const fallback = DEFAULT_FEATURED_CARDS.find(card => card.presetKey === 'master') ?? DEFAULT_FEATURED_CARDS[0];
  if (!fallback) {
    throw new Error('Lobby starter cards are missing');
  }
  return fallback;
}

function starterCardsForKeys(keys: string[]): FeaturedCardData[] {
  return keys.map(key => starterCardForKey(key));
}

function playerCountOptions(minPlayers: number | undefined, maxPlayers: number | undefined): string[] {
  const min = Math.max(1, Math.floor(minPlayers ?? 2));
  const max = Math.max(min, Math.floor(maxPlayers ?? 4));
  return Array.from({ length: max - min + 1 }, (_, index) => String(min + index));
}

function InfoCell({ x, y, w, h = 46, label, value }: { x: number; y: number; w: number; h?: number; label: string; value: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="6" fill="#07111e" stroke="#203a55" />
      <rect x={x + 1} y={y + 1} width={w - 2} height={Math.max(10, h * 0.28)} rx="5" fill="#ffffff" opacity="0.035" />
      <Txt x={x + 14} y={y + h / 2 + 4} text={label} maxWidth={w * 0.42} size={11} opacity={0.72} />
      <Txt x={x + w - 14} y={y + h / 2 + 4} text={value} maxWidth={w * 0.52} size={13} weight="950" anchor="end" />
    </g>
  );
}

function PopupTextInput({
  x,
  y,
  w,
  label,
  value,
  placeholder,
  onChange,
}: {
  x: number;
  y: number;
  w: number;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <g>
      <Txt x={x} y={y - 10} text={label.toUpperCase()} maxWidth={w} size={10.5} weight="900" fill="#9ff6ff" opacity={0.86} />
      <rect x={x} y={y} width={w} height="48" rx="7" fill="#071321" stroke="#24425d" />
      <rect x={x + 1} y={y + 1} width={w - 2} height="15" rx="6" fill="#ffffff" opacity="0.035" />
      <foreignObject x={x + 12} y={y + 10} width={w - 24} height="30">
        <input
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.currentTarget.value)}
          onClick={(event) => event.stopPropagation()}
          style={{
            width: '100%',
            height: '30px',
            border: 0,
            outline: 'none',
            background: 'transparent',
            color: '#edf7ff',
            fontFamily: 'inherit',
            fontSize: '13px',
            fontWeight: 800,
          }}
        />
      </foreignObject>
    </g>
  );
}

function PopupSelect({
  x,
  y,
  w,
  label,
  value,
  options,
  open,
  menuDirection = 'down',
  onToggle,
  onSelect,
}: {
  x: number;
  y: number;
  w: number;
  label: string;
  value: string;
  options: string[];
  open: boolean;
  menuDirection?: 'down' | 'up';
  onToggle: () => void;
  onSelect: (value: string) => void;
}) {
  const menuH = options.length * 28 + 8;
  const menuY = menuDirection === 'up' ? y - menuH - 4 : y + 50;
  const optionStartY = menuY + 6;
  return (
    <g>
      <g className={`lobby-ui-hit ${open ? 'is-active' : ''}`} onClick={(event) => { event.stopPropagation(); onToggle(); }} filter={open ? 'url(#lobbyPurpleGlow)' : undefined}>
        <rect x={x} y={y} width={w} height="46" rx="6" fill={open ? '#0b1028' : '#07111e'} stroke={open ? '#7d49ff' : '#203a55'} />
        <rect x={x + 1} y={y + 1} width={w - 2} height="14" rx="5" fill="#ffffff" opacity="0.035" />
        <Txt x={x + 14} y={y + 28} text={label} maxWidth={w * 0.42} size={10.8} opacity={0.72} />
        <Txt x={x + w - 30} y={y + 28} text={value} maxWidth={w * 0.48} size={12.5} weight="950" anchor="end" />
        <path d={`M${x + w - 20},${y + 21} L${x + w - 12},${y + 21} L${x + w - 16},${y + 28} Z`} fill="#9fb5ca" opacity="0.9" />
      </g>
      {open ? (
        <g filter="url(#lobbyFrameGlow)">
          <rect x={x} y={menuY} width={w} height={menuH} rx="7" fill="#050d19" stroke="#3c79a3" />
          {options.map((option, index) => (
            <g key={option} className="lobby-ui-hit" onClick={(event) => { event.stopPropagation(); onSelect(option); }}>
              <rect x={x + 6} y={optionStartY + index * 28} width={w - 12} height="24" rx="4" fill={option === value ? 'url(#lobbyPurpleSoft)' : '#071426'} stroke={option === value ? '#6d35ff' : '#1d3550'} />
              <CenterTxt x={x + 6} y={optionStartY + index * 28} w={w - 12} h={24} text={option} size={10.2} weight={option === value ? '900' : '650'} />
            </g>
          ))}
        </g>
      ) : null}
    </g>
  );
}

function PresetTile({ card, x, y, w, h, selected, onClick }: { card: FeaturedCardData; x: number; y: number; w: number; h: number; selected: boolean; onClick: () => void }) {
  const stroke = selected ? '#ffca4b' : card.tone === 'red' ? '#bb2838' : card.tone === 'cyan' ? '#13d9ef' : card.tone === 'gold' ? '#f0a13a' : '#7d49ff';
  const imageH = h - 34;
  return (
    <g className={`lobby-ui-hit ${selected ? 'is-active' : ''}`} onClick={(event) => { event.stopPropagation(); onClick(); }} filter={selected ? 'url(#lobbyGoldGlow)' : undefined}>
      <rect x={x} y={y} width={w} height={h} rx="8" fill={selected ? '#0b1028' : '#06111f'} stroke={stroke} strokeWidth={selected ? '1.6' : '1'} />
      <ImageCardArt x={x + 4} y={y + 4} w={w - 8} h={imageH - 8} ai={card.ai} tone={card.tone} variant={card.variant} imageUrl={card.imageUrl} />
      <CardBadge x={x + 8} y={y + 8} label={card.tag} stroke={stroke} h={18} size={7.4} />
      <rect x={x + 6} y={y + imageH} width={w - 12} height={h - imageH - 6} rx="4" fill="#020711" stroke="#2c4a63" />
      <CenterTxt x={x + 6} y={y + imageH} w={w - 12} h={h - imageH - 6} text={card.title} size={10.6} weight="950" />
    </g>
  );
}

function PresetTileStrip({ cards, selectedPresetKey, x, y, w, h, gap, onSelectCard }: { cards: FeaturedCardData[]; selectedPresetKey?: string; x: number; y: number; w: number; h: number; gap: number; onSelectCard: (card: FeaturedCardData) => void }) {
  const tileW = cards.length > 0 ? (w - gap * (cards.length - 1)) / cards.length : w;
  return (
    <g>
      {cards.map((card, index) => (
        <PresetTile
          key={card.presetKey ?? card.title}
          card={card}
          x={x + index * (tileW + gap)}
          y={y}
          w={tileW}
          h={h}
          selected={card.presetKey === selectedPresetKey}
          onClick={() => onSelectCard(card)}
        />
      ))}
    </g>
  );
}

function selectAdjacentPreset(cards: FeaturedCardData[], selectedPresetKey: string | undefined, direction: -1 | 1, onSelectCard: (card: FeaturedCardData) => void) {
  if (cards.length === 0) return;
  const selectedIndex = Math.max(0, cards.findIndex(card => card.presetKey === selectedPresetKey));
  const nextIndex = (selectedIndex + direction + cards.length) % cards.length;
  const nextCard = cards[nextIndex];
  if (nextCard) onSelectCard(nextCard);
}

function PopupSelectedSummary({ x, y, w, h, card, title }: { x: number; y: number; w: number; h: number; card: FeaturedCardData; title: string }) {
  const footerH = 28;
  const footerY = y + h - footerH - 14;
  const imageY = y + 42;
  const imageH = Math.max(72, footerY - imageY - 10);
  return (
    <g filter="url(#lobbySoftShadow)">
      <rect x={x} y={y} width={w} height={h} rx="8" fill="#06111f" stroke="#203a55" />
      <Txt x={x + 16} y={y + 27} text={title.toUpperCase()} maxWidth={w - 32} size={11} weight="950" fill="#9ff6ff" />
      <ImageCardArt x={x + 14} y={imageY} w={w - 28} h={imageH} ai={card.ai} tone={card.tone} variant={card.variant} imageUrl={card.imageUrl} />
      <rect x={x + 16} y={footerY} width={w - 32} height={footerH} rx="4" fill="#020711" stroke="#2c4a63" />
      <CenterTxt x={x + 16} y={footerY} w={w - 32} h={footerH} text={card.title} size={11.5} weight="950" />
    </g>
  );
}

export function ActionPopup({
  type,
  onClose,
  onCreateRoom,
  onQuickJoin,
  onJoinRoomCode,
  onMatchmaking,
  canvas,
  viewer,
  useSampleData,
  minPlayers,
  maxPlayers,
}: {
  type: string | null;
  onClose: () => void;
  onCreateRoom: (draft?: LobbyCreateRoomDraft) => void;
  onQuickJoin: (draft?: LobbyQuickJoinDraft) => void;
  onJoinRoomCode: (draft: LobbyJoinCodeDraft) => void;
  onMatchmaking: () => void;
  canvas: LobbyCanvasRect;
  viewer: LobbyUserSummary | null;
  useSampleData: boolean;
  minPlayers?: number;
  maxPlayers?: number;
}) {
  const [quickPreset, setQuickPreset] = useState('master');
  const [quickAiPolicy, setQuickAiPolicy] = useState('Allowed');
  const [quickStake, setQuickStake] = useState('Any');
  const [createPreset, setCreatePreset] = useState('master');
  const [createVisibility, setCreateVisibility] = useState('Public');
  const [createPlayers, setCreatePlayers] = useState(String(Math.max(1, Math.floor(maxPlayers ?? 4))));
  const [createAiPolicy, setCreateAiPolicy] = useState('Allowed');
  const [createEntry, setCreateEntry] = useState('Free');
  const [playAiPreset, setPlayAiPreset] = useState('ai-coach');
  const [playAiPlayers, setPlayAiPlayers] = useState(String(Math.max(1, Math.floor(maxPlayers ?? 4))));
  const [playAiCount, setPlayAiCount] = useState(String(Math.max(1, Math.min(3, Math.floor(maxPlayers ?? 4)))));
  const [playAiDifficulty, setPlayAiDifficulty] = useState('Intermediate');
  const [playAiModels, setPlayAiModels] = useState<Record<string, string>>({
    '1': AI_MODEL_OPTIONS[1] ?? AI_MODEL_OPTIONS[0],
    '2': AI_MODEL_OPTIONS[2] ?? AI_MODEL_OPTIONS[0],
    '3': AI_MODEL_OPTIONS[3] ?? AI_MODEL_OPTIONS[0],
    '4': AI_MODEL_OPTIONS[6] ?? AI_MODEL_OPTIONS[0],
  });
  const [joinDisplayName, setJoinDisplayName] = useState(viewer?.name ?? '');
  const [joinRoomCode, setJoinRoomCode] = useState(useSampleData ? 'A7K-CLAIM' : '');
  const [openSelect, setOpenSelect] = useState<string | null>(null);
  if (!type) return null;
  const actor = viewer?.name ?? 'Signed out';
  const playerOptions = playerCountOptions(minPlayers, maxPlayers);
  const closeAfter = (action?: () => void) => {
    action?.();
    onClose();
  };

  if (type === 'quickJoin') {
    const quickKeys = quickAiPolicy === 'Banned' ? NO_AI_PRESET_KEYS : QUICK_JOIN_PRESET_KEYS;
    const quickCards = starterCardsForKeys(quickKeys);
    const selectedCard = quickCards.find(card => card.presetKey === quickPreset) ?? quickCards[0] ?? starterCardForKey('master');
    const quickModeOptions = quickCards.map(card => card.title);
    const { x, y, w, h } = centeredPopupRect(canvas, 1120, 540);
    const tileGap = 10;
    const tileY = y + 88;
    const tileH = 112;
    const bodyY = tileY + tileH + 18;
    const summaryW = 330;
    const controlX = x + 30 + summaryW + 18;
    const controlW = w - 60 - summaryW - 18;
    const colW = (controlW - 14) / 2;
    const selectQuickCard = (card: FeaturedCardData) => {
      setQuickPreset(card.presetKey ?? 'master');
      if (card.presetKey === 'high-stake') setQuickStake('Game Coin');
    };
    return (
      <g>
        <PopupBackdrop canvas={canvas} onClose={onClose} />
        <LobbyCarouselShell
          x={x}
          y={y}
          w={w}
          h={h}
          handleY={y + 182}
          onPrevious={() => selectAdjacentPreset(quickCards, selectedCard.presetKey, -1, selectQuickCard)}
          onNext={() => selectAdjacentPreset(quickCards, selectedCard.presetKey, 1, selectQuickCard)}
        >
        <PopupFrame x={x} y={y} w={w} h={h} title="Quick Join" subtitle="Choose a starter lane or use the dropdowns before finding the best open table." onClose={onClose} />
        <PresetTileStrip cards={quickCards} selectedPresetKey={selectedCard.presetKey} x={x + 30} y={tileY} w={w - 60} h={tileH} gap={tileGap} onSelectCard={selectQuickCard} />
        <PopupSelectedSummary x={x + 30} y={bodyY} w={summaryW} h={178} card={selectedCard} title="Selected Quick Match" />
        <InfoCell x={controlX} y={bodyY} w={colW} label="Name" value={actor} />
        <PopupSelect
          x={controlX + colW + 14}
          y={bodyY}
          w={colW}
          label="Table Type"
          value={selectedCard.title}
          options={quickModeOptions}
          open={openSelect === 'quickMode'}
          onToggle={() => setOpenSelect(openSelect === 'quickMode' ? null : 'quickMode')}
          onSelect={(value) => {
            const card = quickCards.find(item => item.title === value);
            setQuickPreset(card?.presetKey ?? 'master');
            setOpenSelect(null);
          }}
        />
        <PopupSelect
          x={controlX}
          y={bodyY + 62}
          w={colW}
          label="AI"
          value={quickAiPolicy}
          options={AI_POLICY_OPTIONS}
          open={openSelect === 'quickAi'}
          onToggle={() => setOpenSelect(openSelect === 'quickAi' ? null : 'quickAi')}
          onSelect={(value) => {
            setQuickAiPolicy(value);
            setOpenSelect(null);
          }}
        />
        <PopupSelect
          x={controlX + colW + 14}
          y={bodyY + 62}
          w={colW}
          label="Stake"
          value={quickStake}
          options={STAKE_OPTIONS}
          open={openSelect === 'quickStake'}
          menuDirection="up"
          onToggle={() => setOpenSelect(openSelect === 'quickStake' ? null : 'quickStake')}
          onSelect={(value) => {
            setQuickStake(value);
            setOpenSelect(null);
          }}
        />
        <rect x={controlX} y={bodyY + 126} width={controlW} height="44" rx="6" fill="#06111f" stroke="#203a55" />
        <Txt x={controlX + 16} y={bodyY + 153} text={`Match target: ${selectedCard.title} - AI ${quickAiPolicy.toLowerCase()} - ${quickStake} stake`} maxWidth={controlW - 32} size={11.5} opacity={0.8} />
        <Btn x={controlX} y={y + h - 58} w={controlW} h={38} label="JOIN BEST TABLE" active tone="cyan" size={12} onClick={() => closeAfter(() => {
          if (useSampleData) {
            onMatchmaking();
            return;
          }
          onQuickJoin(quickJoinDraftFromCard(selectedCard, { aiPolicy: quickAiPolicy, stake: quickStake }));
        })} />
        </LobbyCarouselShell>
      </g>
    );
  }

  if (type === 'createTable') {
    const createKeys = createAiPolicy === 'Banned' ? NO_AI_PRESET_KEYS : CREATE_TABLE_PRESET_KEYS;
    const createCards = starterCardsForKeys(createKeys);
    const selectedCard = createCards.find(card => card.presetKey === createPreset) ?? createCards[0] ?? starterCardForKey('master');
    const createModeOptions = createCards.map(card => card.title);
    const { x, y, w, h } = centeredPopupRect(canvas, 1240, 604);
    const tileGap = 9;
    const tileY = y + 88;
    const tileH = 112;
    const bodyY = tileY + tileH + 18;
    const summaryW = 330;
    const controlX = x + 30 + summaryW + 18;
    const controlW = w - 60 - summaryW - 18;
    const colW = (controlW - 24) / 3;
    const selectCreateCard = (card: FeaturedCardData) => {
      setCreatePreset(card.presetKey ?? 'master');
      if (card.ai) setCreateAiPolicy('Allowed');
      if (card.presetKey === 'high-stake') setCreateEntry('Game Coin');
    };
    return (
      <g>
        <PopupBackdrop canvas={canvas} onClose={onClose} />
        <LobbyCarouselShell
          x={x}
          y={y}
          w={w}
          h={h}
          handleY={y + 210}
          onPrevious={() => selectAdjacentPreset(createCards, selectedCard.presetKey, -1, selectCreateCard)}
          onNext={() => selectAdjacentPreset(createCards, selectedCard.presetKey, 1, selectCreateCard)}
        >
        <PopupFrame x={x} y={y} w={w} h={h} title="Create Table" subtitle="Pick a starter kit, then set visibility, seats, AI rules, and entry type." onClose={onClose} />
        <PresetTileStrip cards={createCards} selectedPresetKey={selectedCard.presetKey} x={x + 30} y={tileY} w={w - 60} h={tileH} gap={tileGap} onSelectCard={selectCreateCard} />
        <PopupSelectedSummary x={x + 30} y={bodyY} w={summaryW} h={202} card={selectedCard} title="Room Starter" />
        <InfoCell x={controlX} y={bodyY} w={colW} label="Host" value={actor} />
        <PopupSelect
          x={controlX + colW + 12}
          y={bodyY}
          w={colW}
          label="Starter"
          value={selectedCard.title}
          options={createModeOptions}
          open={openSelect === 'createMode'}
          onToggle={() => setOpenSelect(openSelect === 'createMode' ? null : 'createMode')}
          onSelect={(value) => {
            const card = createCards.find(item => item.title === value);
            setCreatePreset(card?.presetKey ?? 'master');
            setOpenSelect(null);
          }}
        />
        <PopupSelect
          x={controlX + (colW + 12) * 2}
          y={bodyY}
          w={colW}
          label="Visibility"
          value={createVisibility}
          options={VISIBILITY_OPTIONS}
          open={openSelect === 'createVisibility'}
          onToggle={() => setOpenSelect(openSelect === 'createVisibility' ? null : 'createVisibility')}
          onSelect={(value) => {
            setCreateVisibility(value);
            setOpenSelect(null);
          }}
        />
        <PopupSelect
          x={controlX}
          y={bodyY + 70}
          w={colW}
          label="Players"
          value={createPlayers}
          options={playerOptions}
          open={openSelect === 'createPlayers'}
          menuDirection="up"
          onToggle={() => setOpenSelect(openSelect === 'createPlayers' ? null : 'createPlayers')}
          onSelect={(value) => {
            setCreatePlayers(value);
            setOpenSelect(null);
          }}
        />
        <PopupSelect
          x={controlX + colW + 12}
          y={bodyY + 70}
          w={colW}
          label="AI"
          value={createAiPolicy}
          options={AI_POLICY_OPTIONS}
          open={openSelect === 'createAi'}
          menuDirection="up"
          onToggle={() => setOpenSelect(openSelect === 'createAi' ? null : 'createAi')}
          onSelect={(value) => {
            setCreateAiPolicy(value);
            setOpenSelect(null);
          }}
        />
        <PopupSelect
          x={controlX + (colW + 12) * 2}
          y={bodyY + 70}
          w={colW}
          label="Entry"
          value={createEntry}
          options={ENTRY_OPTIONS}
          open={openSelect === 'createEntry'}
          menuDirection="up"
          onToggle={() => setOpenSelect(openSelect === 'createEntry' ? null : 'createEntry')}
          onSelect={(value) => {
            setCreateEntry(value);
            setOpenSelect(null);
          }}
        />
        <rect x={controlX} y={bodyY + 140} width={controlW} height="46" rx="6" fill="#06111f" stroke="#203a55" />
        <Txt x={controlX + 16} y={bodyY + 168} text={`${selectedCard.title}: ${createVisibility}, ${createPlayers} players, AI ${createAiPolicy.toLowerCase()}, ${createEntry} entry`} maxWidth={controlW - 32} size={11.5} opacity={0.82} />
        <Btn x={controlX} y={y + h - 58} w={controlW} h={38} label="CREATE TABLE" active tone="purple" size={12} onClick={() => closeAfter(() => onCreateRoom(createRoomDraftFromCard(selectedCard, {
          visibility: createVisibility,
          players: createPlayers,
          aiPolicy: createAiPolicy,
          entry: createEntry,
          roomName: `${selectedCard.title} Table`,
          aiCount: createAiPolicy === 'Banned' ? 0 : selectedCard.ai ? Math.max(1, parsedPlayerCount(createPlayers, 4) - 1) : 0,
        })))} />
        </LobbyCarouselShell>
      </g>
    );
  }

  if (type === 'joinCode') {
    const { x, y, w, h } = centeredPopupRect(canvas, 720, 420);
    return (
      <g>
        <PopupBackdrop canvas={canvas} onClose={onClose} />
        <SideHandle x={x - 24} y={y + 122} side="left" />
        <SideHandle x={x + w} y={y + 122} side="right" />
        <PopupFrame x={x} y={y} w={w} h={h} title="Join With Code" subtitle="Enter your display name and the private room code." onClose={onClose} />
        <g filter="url(#lobbyCyanGlow)">
          <rect x={x + 34} y={y + 112} width={w - 68} height="186" rx="8" fill="#06111f" stroke="#13d9ef" />
          <PopupTextInput x={x + 62} y={y + 154} w={w - 124} label="Name" value={joinDisplayName} placeholder={actor} onChange={setJoinDisplayName} />
          <PopupTextInput x={x + 62} y={y + 238} w={w - 124} label="Room Code" value={joinRoomCode} placeholder="Paste private room code" onChange={setJoinRoomCode} />
        </g>
        <rect x={x + 34} y={y + h - 108} width={w - 68} height="42" rx="6" fill="#06111f" stroke="#203a55" />
        <Txt x={x + 50} y={y + h - 82} text="Private room lookup will validate the code before seating the player." maxWidth={w - 100} size={11} opacity={0.76} />
        <Btn
          x={x + 34}
          y={y + h - 56}
          w={w - 68}
          h={38}
          label="JOIN ROOM"
          active
          tone="cyan"
          size={12}
          disabled={joinRoomCode.trim().length === 0}
          onClick={() => closeAfter(() => onJoinRoomCode({
            code: joinRoomCode.trim(),
            displayName: joinDisplayName.trim() || undefined,
          }))}
        />
      </g>
    );
  }

  if (type === 'playAi') {
    const playCards = starterCardsForKeys(['ai-showdown', 'ai-vs-human', 'ai-coach']);
    const selectedCard = playCards.find(card => card.presetKey === playAiPreset) ?? playCards[0] ?? starterCardForKey('ai-coach');
    const playModeOptions = playCards.map(card => card.title);
    const difficultyOptions = ['Beginner', 'Intermediate', 'Advanced', 'Benchmark'];
    const aiCountOptions = playerCountOptions(1, maxPlayers);
    const visibleAiSlots = Array.from({ length: Math.max(1, Number(playAiCount) || 1) }, (_, index) => String(index + 1));
    const slotModels = visibleAiSlots.map(slot => playAiModels[slot] ?? 'Auto');
    const { x, y, w, h } = centeredPopupRect(canvas, 1080, 684);
    const tileGap = 12;
    const tileY = y + 88;
    const tileH = 118;
    const bodyY = tileY + tileH + 18;
    const summaryW = 300;
    const controlX = x + 30 + summaryW + 18;
    const controlW = w - 60 - summaryW - 18;
    const colW = (controlW - 14) / 2;
    const slotW = (controlW - 12) / 2;
    const selectPlayAiCard = (card: FeaturedCardData) => {
      setPlayAiPreset(card.presetKey ?? 'ai-coach');
      if (card.presetKey === 'ai-showdown') {
        setPlayAiDifficulty('Benchmark');
        setPlayAiCount(String(Math.max(1, Math.floor(maxPlayers ?? 4))));
      }
      if (card.presetKey === 'ai-coach') setPlayAiCount('1');
    };
    return (
      <g>
        <PopupBackdrop canvas={canvas} onClose={onClose} />
        <LobbyCarouselShell
          x={x}
          y={y}
          w={w}
          h={h}
          handleY={y + 222}
          onPrevious={() => selectAdjacentPreset(playCards, selectedCard.presetKey, -1, selectPlayAiCard)}
          onNext={() => selectAdjacentPreset(playCards, selectedCard.presetKey, 1, selectPlayAiCard)}
        >
        <PopupFrame x={x} y={y} w={w} h={h} title="Play vs AI" subtitle="Choose the AI lane, AI count, and model assigned to each AI seat." onClose={onClose} />
        <PresetTileStrip cards={playCards} selectedPresetKey={selectedCard.presetKey} x={x + 30} y={tileY} w={w - 60} h={tileH} gap={tileGap} onSelectCard={selectPlayAiCard} />
        <PopupSelectedSummary x={x + 30} y={bodyY} w={summaryW} h={304} card={selectedCard} title="AI Starter" />
        <InfoCell x={controlX} y={bodyY} w={colW} label="Player" value={actor} />
        <PopupSelect
          x={controlX + colW + 14}
          y={bodyY}
          w={colW}
          label="AI Lane"
          value={selectedCard.title}
          options={playModeOptions}
          open={openSelect === 'playAiMode'}
          onToggle={() => setOpenSelect(openSelect === 'playAiMode' ? null : 'playAiMode')}
          onSelect={(value) => {
            const card = playCards.find(item => item.title === value);
            setPlayAiPreset(card?.presetKey ?? 'ai-coach');
            setOpenSelect(null);
          }}
        />
        <PopupSelect
          x={controlX}
          y={bodyY + 62}
          w={colW}
          label="Seats"
          value={playAiPlayers}
          options={playerOptions}
          open={openSelect === 'playAiPlayers'}
          menuDirection="up"
          onToggle={() => setOpenSelect(openSelect === 'playAiPlayers' ? null : 'playAiPlayers')}
          onSelect={(value) => {
            setPlayAiPlayers(value);
            setOpenSelect(null);
          }}
        />
        <PopupSelect
          x={controlX + colW + 14}
          y={bodyY + 62}
          w={colW}
          label="AI Count"
          value={playAiCount}
          options={aiCountOptions}
          open={openSelect === 'playAiCount'}
          menuDirection="up"
          onToggle={() => setOpenSelect(openSelect === 'playAiCount' ? null : 'playAiCount')}
          onSelect={(value) => {
            setPlayAiCount(value);
            setOpenSelect(null);
          }}
        />
        <PopupSelect
          x={controlX}
          y={bodyY + 124}
          w={colW}
          label="Difficulty"
          value={playAiDifficulty}
          options={difficultyOptions}
          open={openSelect === 'playAiDifficulty'}
          menuDirection="up"
          onToggle={() => setOpenSelect(openSelect === 'playAiDifficulty' ? null : 'playAiDifficulty')}
          onSelect={(value) => {
            setPlayAiDifficulty(value);
            setOpenSelect(null);
          }}
        />
        <InfoCell x={controlX + colW + 14} y={bodyY + 124} w={colW} label="Model Slots" value={`${visibleAiSlots.length} AI`} />
        <rect x={controlX} y={bodyY + 190} width={controlW} height="134" rx="7" fill="#06111f" stroke="#203a55" />
        <Txt x={controlX + 14} y={bodyY + 213} text="AI MODEL PER SLOT" maxWidth={180} size={10.5} weight="950" fill="#9ff6ff" />
        {visibleAiSlots.map((slot, index) => (
          <PopupSelect
            key={slot}
            x={controlX + 12 + (index % 2) * (slotW + 12)}
            y={bodyY + 226 + Math.floor(index / 2) * 52}
            w={slotW}
            label={`AI ${slot}`}
            value={playAiModels[slot] ?? 'Auto'}
            options={AI_MODEL_OPTIONS}
            open={openSelect === `playAiModel-${slot}`}
            menuDirection="up"
            onToggle={() => setOpenSelect(openSelect === `playAiModel-${slot}` ? null : `playAiModel-${slot}`)}
            onSelect={(value) => {
              setPlayAiModels(previous => ({ ...previous, [slot]: value }));
              setOpenSelect(null);
            }}
          />
        ))}
        <rect x={controlX} y={bodyY + 336} width={controlW} height="38" rx="6" fill="#06111f" stroke="#203a55" />
        <Txt x={controlX + 16} y={bodyY + 360} text={`${selectedCard.title}: ${playAiPlayers} seats, ${visibleAiSlots.length} AI, ${slotModels.join(', ')}`} maxWidth={controlW - 32} size={10.8} opacity={0.82} />
        <Btn x={controlX} y={y + h - 62} w={controlW} h={40} label="START AI TABLE" active tone="purple" size={12} onClick={() => closeAfter(() => onCreateRoom(createRoomDraftFromCard(selectedCard, {
          visibility: 'Public',
          players: playAiPlayers,
          aiPolicy: 'Allowed',
          entry: 'Free',
          roomName: `${selectedCard.title} AI Table`,
          aiCount: parsedPlayerCount(playAiCount, 1),
        })))} />
        </LobbyCarouselShell>
      </g>
    );
  }

  return null;
}

export function FeaturedCardPopup({ card, onClose, canvas, onPrimaryAction, onSecondaryAction }: { card: FeaturedCardData | null; onClose: () => void; canvas: LobbyCanvasRect; onPrimaryAction?: (card: FeaturedCardData) => void; onSecondaryAction?: (card: FeaturedCardData) => void }) {
  if (!card) return null;
  const { x, y, w, h } = centeredPopupRect(canvas, 1160, 664);
  const imageX = x + 28;
  const imageY = y + 84;
  const imageW = 654;
  const imageH = 430;
  const infoX = imageX + imageW + 28;
  const infoW = x + w - infoX - 28;
  const stroke = card.tone === 'red' ? '#bb2838' : card.tone === 'cyan' ? '#13d9ef' : card.tone === 'gold' ? '#f0a13a' : '#7d49ff';
  const action = card.cta || 'JOIN';
  const countLabel = card.countLabel ?? 'Players';
  return (
    <g>
      <PopupBackdrop canvas={canvas} onClose={onClose} />
      <SideHandle x={x - 24} y={y + 230} side="left" />
      <SideHandle x={x + w} y={y + 230} side="right" />
      <PopupFrame x={x} y={y} w={w} h={h} title={`${card.code} - ${card.title}`} subtitle={card.subtitle || 'Featured table preview'} onClose={onClose} />
      <rect x={imageX} y={imageY} width={imageW} height={imageH} rx="8" fill="#06111f" stroke={stroke} strokeWidth="1.2" />
      <ImageCardArt x={imageX + 4} y={imageY + 4} w={imageW - 8} h={imageH - 8} ai={card.ai} tone={card.tone} variant={card.variant} imageUrl={card.imageUrl} />
      <CardBadge x={imageX + 16} y={imageY + 16} label={card.code} stroke="#426b91" />
      <CardBadge x={imageX + imageW - 110} y={imageY + 16} w={92} label={card.tag} stroke={stroke} />
      <rect x={infoX} y={imageY} width={infoW} height={imageH} rx="8" fill="#06111f" stroke="#203a55" />
      <Txt x={infoX + 22} y={imageY + 40} text={card.cardType === 'starter' ? 'STARTER KIT DETAILS' : 'TABLE DETAILS'} maxWidth={infoW - 44} size={15} weight="950" />
      {card.description ? <Txt x={infoX + 22} y={imageY + 64} text={card.description} maxWidth={infoW - 44} size={11} opacity={0.78} /> : null}
      {[
        [card.cardType === 'starter' ? 'Starter' : 'Table', card.code],
        ['Mode', card.tag],
        [countLabel, card.players],
        ['Status', card.cardType === 'starter' ? 'Ready' : card.live ? 'Live' : action === 'FULL' ? 'Full' : 'Waiting'],
        ['Entry', card.entry || 'Free'],
      ].map(([label, value], i) => (
        <g key={label}>
          <rect x={infoX + 20} y={imageY + 92 + i * 52} width={infoW - 40} height="40" rx="5" fill="#07111e" stroke="#203a55" />
          <Txt x={infoX + 34} y={imageY + 117 + i * 52} text={label} maxWidth={100} size={11} opacity={0.76} />
          <Txt x={infoX + infoW - 34} y={imageY + 117 + i * 52} text={value} maxWidth={130} size={13} weight="950" anchor="end" />
        </g>
      ))}
      <Btn
        x={infoX + 20}
        y={imageY + imageH - 88}
        w={infoW - 40}
        h={36}
        label={action === 'JOIN' ? 'JOIN TABLE' : action}
        active
        tone={action === 'FULL' ? 'red' : action === 'JOIN' || action === 'START' ? 'cyan' : 'purple'}
        size={12}
        onClick={() => {
          onPrimaryAction?.(card);
          onClose();
        }}
      />
      <Btn
        x={infoX + 20}
        y={imageY + imageH - 44}
        w={infoW - 40}
        h={30}
        label={card.cardType === 'starter' ? 'CUSTOMIZE' : 'SPECTATE'}
        size={10}
        onClick={() => {
          onSecondaryAction?.(card);
          onClose();
        }}
      />
    </g>
  );
}

export function PlayersPopup({ row, onClose, onTakeSeat, canvas, viewer, useSampleData }: { row: LobbyTableRow | null; onClose: () => void; onTakeSeat: (code: string, seatIndex: number) => void; canvas: LobbyCanvasRect; viewer: LobbyUserSummary | null; useSampleData: boolean }) {
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number | null>(null);
  if (!row) return null;
  const hasDetail = selectedPlayerIndex !== null;
  const group = centeredPopupRect(canvas, hasDetail ? 1460 : 1420, 398, 18);
  const detailGap = 18;
  const detailW = 294;
  const x = group.x;
  const y = group.y;
  const w = hasDetail ? Math.max(760, group.w - detailGap - detailW) : group.w;
  const h = 398;
  const detail = { x: x + w + detailGap, y, w: detailW, h };
  const names = row.names;
  const cardGap = 12;
  const cardW = (w - 44 - cardGap * Math.max(0, names.length - 1)) / Math.max(1, names.length);
  const selectedIndex = selectedPlayerIndex ?? -1;
  const selectedName = selectedIndex >= 0 ? names[selectedIndex] ?? '' : '';
  const selectedIsOpen = /open/i.test(selectedName);
  const selectedIsBot = row.ai || /AI|GPT|Claude|Gemini|Llama|Grok|DeepSeek|Mistral/i.test(selectedName);
  const showSampleStats = useSampleData && !selectedIsOpen && selectedName !== 'Occupied';
  return (
    <g>
      <PopupBackdrop canvas={canvas} onClose={onClose} />
      <LobbyCarouselShell
        x={x}
        y={y}
        w={w}
        h={h}
        handleY={y + 112}
        onPrevious={() => setSelectedPlayerIndex(selectedPlayerIndex === null ? 0 : Math.max(0, selectedPlayerIndex - 1))}
        onNext={() => setSelectedPlayerIndex(selectedPlayerIndex === null ? names.length - 1 : Math.min(names.length - 1, selectedPlayerIndex + 1))}
      >
        <PopupFrame x={x} y={y} w={w} h={h} title={`${row.code} - ${row.title}`} subtitle={selectedPlayerIndex === null ? 'Click a player to open details' : 'Selected player details open'} onClose={onClose} />
        {names.map((name, i) => {
          const cardX = x + 22 + i * (cardW + cardGap);
          const cardY = y + 78;
          const cardH = h - 112;
          const open = /open/i.test(name);
          const bot = row.ai || /AI|GPT|Claude|Gemini|Llama|Grok|DeepSeek|Mistral/i.test(name);
          const selected = i === selectedPlayerIndex;
          return (
            <g key={`${row.code}-popup-${name}-${i}`} className="lobby-ui-hit" onClick={(event) => { event.stopPropagation(); setSelectedPlayerIndex(i); }} filter={selected ? 'url(#lobbyPurpleGlow)' : undefined}>
              <rect x={cardX} y={cardY} width={cardW} height={cardH} rx="3" fill={selected ? '#0b1028' : '#06111f'} stroke={selected ? '#7d49ff' : bot ? '#13d9ef' : open ? '#728096' : '#f0a13a'} strokeWidth={selected ? '1.6' : '1'} />
              <circle cx={cardX + cardW / 2} cy={cardY + cardH * 0.44} r={Math.min(cardW * 0.32, 72)} fill="#071321" stroke={bot ? '#9beeff' : open ? '#728096' : '#f0a13a'} strokeWidth="1.6" />
              <Avatar cx={cardX + cardW / 2} cy={cardY + cardH * 0.44} r={Math.min(cardW * 0.3, 64)} bot={bot} open={open} ring={bot ? '#9beeff' : '#f0a13a'} imageUrl={row.avatarUrls?.[i]} />
              <rect x={cardX + 10} y={cardY + cardH - 64} width={cardW - 20} height="38" rx="2" fill="#020711" stroke="#2c4a63" />
              <CenterTxt x={cardX + 10} y={cardY + cardH - 64} w={cardW - 20} h={38} text={open ? 'OPEN SEAT' : name} size={12.2} weight="950" />
            </g>
          );
        })}
        {hasDetail ? (
          <g filter="url(#lobbyFrameGlow)">
          <path d={roundedRectPath(detail.x, detail.y, detail.w, detail.h, 12)} fill="url(#lobbyFrameBlue)" stroke="#58bfff" strokeWidth="1.15" />
          <path d={roundedRectPath(detail.x + 5, detail.y + 5, detail.w - 10, detail.h - 10, 9)} fill="#050d19" stroke="#173653" strokeWidth="1" opacity="0.96" />
          <Txt x={detail.x + 20} y={detail.y + 32} text="PLAYER DETAIL" maxWidth={detail.w - 40} size={15} weight="950" />
          <Txt x={detail.x + 20} y={detail.y + 52} text={row.title} maxWidth={detail.w - 40} size={10.5} opacity={0.7} />
          <line x1={detail.x + 16} y1={detail.y + 66} x2={detail.x + detail.w - 16} y2={detail.y + 66} stroke="#4fb9e8" opacity="0.42" />
          <circle cx={detail.x + detail.w / 2} cy={detail.y + 128} r="46" fill="#071321" stroke={selectedIsBot ? '#9beeff' : selectedIsOpen ? '#728096' : '#f0a13a'} strokeWidth="1.5" />
          <Avatar cx={detail.x + detail.w / 2} cy={detail.y + 128} r={38} bot={selectedIsBot} open={selectedIsOpen} ring={selectedIsBot ? '#9beeff' : '#f0a13a'} imageUrl={row.avatarUrls?.[selectedIndex]} />
          <rect x={detail.x + 18} y={detail.y + 186} width={detail.w - 36} height="34" rx="4" fill="#020711" stroke="#2c4a63" />
          <CenterTxt x={detail.x + 18} y={detail.y + 186} w={detail.w - 36} h={34} text={selectedIsOpen ? viewer?.name ?? 'Open Seat' : selectedName} size={13} weight="950" />
          {[
            ['Games', showSampleStats ? '384' : '-'],
            ['Wins', showSampleStats ? '211' : '-'],
            ['Win Rate', showSampleStats ? '54.9%' : '-'],
            ['Table', row.code],
          ].map(([label, value], i) => (
            <g key={label}>
              <rect x={detail.x + 18} y={detail.y + 232 + i * 40} width={detail.w - 36} height="32" rx="5" fill="#07111e" stroke="#203a55" />
              <Txt x={detail.x + 32} y={detail.y + 253 + i * 40} text={label} maxWidth={92} size={10} opacity={0.72} />
              <Txt x={detail.x + detail.w - 32} y={detail.y + 253 + i * 40} text={value} maxWidth={110} size={13} weight="950" anchor="end" fill={label === 'Win Rate' ? '#54eca0' : '#edf7ff'} />
            </g>
          ))}
          {(selectedIsOpen || selectedIsBot) ? (
            <Btn
              x={detail.x + 18}
              y={detail.y + detail.h - 48}
              w={detail.w - 36}
              h={36}
              label={selectedIsOpen ? 'TAKE SEAT' : 'VIEW MODEL'}
              active
              tone={selectedIsOpen ? 'cyan' : 'purple'}
              size={11}
              onClick={() => {
                if (selectedIsOpen) onTakeSeat(row.code, selectedIndex);
              }}
            />
          ) : null}
        </g>
        ) : null}
      </LobbyCarouselShell>
    </g>
  );
}

export function SpinnerPopup({ open, onClose, controls, canvas }: { open: boolean; onClose: () => void; controls: LobbyPageSvgControls; canvas: LobbyCanvasRect }) {
  if (!open) return null;
  return <SpinnerPopupContent onClose={onClose} controls={controls} canvas={canvas} />;
}

function SpinnerPopupContent({ onClose, controls, canvas }: { onClose: () => void; controls: LobbyPageSvgControls; canvas: LobbyCanvasRect }) {
  const [spinRotation, setSpinRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<string | null>(null);
  const [collectingValue, setCollectingValue] = useState<string | null>(null);
  const spinTimerRef = useRef<number | null>(null);
  const collectTimerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (spinTimerRef.current) {
        window.clearTimeout(spinTimerRef.current);
        spinTimerRef.current = null;
      }
      if (collectTimerRef.current) {
        window.clearInterval(collectTimerRef.current);
        collectTimerRef.current = null;
      }
    };
  }, []);
  const cx = canvas.x + canvas.w / 2;
  const cy = canvas.y + canvas.h / 2 - 8;
  const r = controls.spinner.radius;
  const innerR = controls.spinner.innerRadius;
  const wedgeCount = REWARD_SPINNER.labels.length;
  const toPt = (ang: number, rad: number) => {
    const a = (ang - 90) * Math.PI / 180;
    return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
  };
  const wedgePath = (i: number) => {
    const a0 = i * 360 / wedgeCount;
    const a1 = (i + 1) * 360 / wedgeCount;
    const [x0, y0] = toPt(a0, innerR);
    const [x1, y1] = toPt(a0, r - 18);
    const [x2, y2] = toPt(a1, r - 18);
    const [x3, y3] = toPt(a1, innerR);
    return `M${x0} ${y0} L${x1} ${y1} A${r - 18} ${r - 18} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${innerR} ${innerR} 0 0 0 ${x0} ${y0} Z`;
  };
  const coinCountFor = (value: string) => {
    const numericValue = Number(value);
    if (!numericValue) return 0;
    if (numericValue < 10) return 1;
    if (numericValue < 25) return 2;
    if (numericValue < 50) return 3;
    if (numericValue < 100) return 4;
    if (numericValue < 250) return 5;
    if (numericValue < 500) return 6;
    return 8;
  };
  const renderCoin = (x: number, y: number, size = 13, rotate = 0, key?: string) => (
    <g key={key} transform={`translate(${x} ${y}) rotate(${rotate})`} filter="url(#lobbyGoldGlow)">
      <circle cx="1.2" cy="2" r={size / 2} fill="#000" opacity="0.26" />
      <circle cx="0" cy="0" r={size / 2} fill="url(#lobbyGold)" stroke="#fff2a6" strokeWidth="1.2" />
      <circle cx="0" cy="0" r={size / 2 - 3} fill="none" stroke="#7a4b10" strokeWidth="0.9" opacity="0.72" />
      <path d={`M${-size * 0.18},${-size * 0.18} Q0,${-size * 0.34} ${size * 0.2},${-size * 0.18}`} stroke="#fff7c8" strokeWidth="1" opacity="0.65" fill="none" strokeLinecap="round" />
    </g>
  );
  const renderRewardCoins = (value: string, mid: number, baseRad: number, size = 12) => {
    const count = coinCountFor(value);
    if (!count) return null;
    const spread = Math.min(46, count * 6.4);
    return (
      <g>
        {Array.from({ length: count }, (_, index) => {
          const offset = count === 1 ? 0 : -spread / 2 + spread * index / (count - 1);
          const [coinX, coinY] = toPt(mid + offset * 0.18, baseRad + Math.abs(offset) * 0.06);
          return renderCoin(coinX, coinY, size, mid + index * 8, `${value}-${index}`);
        })}
      </g>
    );
  };
  const selectionGlowPath = () => {
    const a0 = -15;
    const a1 = 15;
    const outer = r - 17;
    const inner = innerR + 36;
    const [x0, y0] = toPt(a0, inner);
    const [x1, y1] = toPt(a0, outer);
    const [x2, y2] = toPt(a1, outer);
    const [x3, y3] = toPt(a1, inner);
    return `M${x0} ${y0} L${x1} ${y1} A${outer} ${outer} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${inner} ${inner} 0 0 0 ${x0} ${y0} Z`;
  };
  const renderArcText = (text: string, radius: number, startAngle: number, endAngle: number, size: number, id: string, spacing = 2.1) => {
    const [sx, sy] = toPt(startAngle, radius);
    const [ex, ey] = toPt(endAngle, radius);
    return (
      <g pointerEvents="none" filter="url(#lobbyCyanGlow)">
        <path id={id} d={`M${sx} ${sy} A${radius} ${radius} 0 0 1 ${ex} ${ey}`} fill="none" stroke="none" />
        <text fontSize={size} fontWeight="950" fill="#ffffff" letterSpacing={spacing} stroke="#06111f" strokeWidth="3" paintOrder="stroke fill">
          <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
            {text}
          </textPath>
        </text>
      </g>
    );
  };
  const spinWheel = () => {
    if (isSpinning) return;
    const resultIndex = Math.floor(Math.random() * REWARD_SPINNER.labels.length);
    const wedgeAngle = 360 / wedgeCount;
    const resultCenterAngle = resultIndex * wedgeAngle + wedgeAngle / 2;
    const currentNorm = ((spinRotation % 360) + 360) % 360;
    const targetNorm = ((-resultCenterAngle % 360) + 360) % 360;
    const deltaToTarget = (targetNorm - currentNorm + 360) % 360;
    const jitter = (Math.random() - 0.5) * wedgeAngle * 0.34;
    const nextRotation = spinRotation + (controls.spinner.extraTurnsMin + Math.floor(Math.random() * Math.max(1, controls.spinner.extraTurnsRandom))) * 360 + deltaToTarget + jitter;
    setSpinResult(null);
    setCollectingValue(REWARD_SPINNER.labels[0]);
    setIsSpinning(true);
    setSpinRotation(nextRotation);
    if (spinTimerRef.current) window.clearTimeout(spinTimerRef.current);
    if (collectTimerRef.current) window.clearInterval(collectTimerRef.current);
    let tick = 0;
    collectTimerRef.current = window.setInterval(() => {
      tick += 1;
      setCollectingValue(REWARD_SPINNER.labels[tick % REWARD_SPINNER.labels.length]);
    }, controls.spinner.collectTickMs);
    spinTimerRef.current = window.setTimeout(() => {
      if (collectTimerRef.current) {
        window.clearInterval(collectTimerRef.current);
        collectTimerRef.current = null;
      }
      setIsSpinning(false);
      setSpinResult(REWARD_SPINNER.labels[resultIndex]);
      setCollectingValue(REWARD_SPINNER.labels[resultIndex]);
      spinTimerRef.current = window.setTimeout(onClose, controls.spinner.resultHoldMs);
    }, controls.spinner.spinMs);
  };
  const resultTextY = cy - r + controls.spinner.resultY;
  const resultBoxY = resultTextY - controls.spinner.numberBoxH / 2 - 2;
  const currentResultValue = spinResult ?? collectingValue ?? REWARD_SPINNER.labels[0];
  const arcId = `lobbySpinnerOuterArcText-${Math.round(cx)}-${Math.round(cy)}`;
  return (
    <g>
      <PopupBackdrop canvas={canvas} opacity={0.62} />
      <ellipse cx={cx} cy={cy + r + 34} rx={r * 0.82} ry="26" fill="#000" opacity="0.34" />
      <g className={`lobby-spinner-wheel ${isSpinning ? 'is-spinning' : ''}`} style={{ transform: `rotate(${spinRotation}deg)`, transformOrigin: `${cx}px ${cy}px`, transitionDuration: `${controls.spinner.spinMs}ms` }}>
        <circle className="lobby-spinner-ring-blue" cx={cx} cy={cy} r={r + 42} fill="#071321" stroke="#58bfff" strokeWidth="2.4" filter="url(#lobbyCyanGlow)" />
        <circle className="lobby-spinner-ring-dark" cx={cx} cy={cy} r={r + 32} fill="#06111f" stroke="#193b5a" strokeWidth="5" />
        <circle className="lobby-spinner-ring-purple" cx={cx} cy={cy} r={r + 24} fill="#06111f" stroke="#7d49ff" strokeWidth="5" filter="url(#lobbyPurpleGlow)" />
        <circle cx={cx} cy={cy} r={r + 8} fill="#020711" stroke="#ffca4b" strokeWidth="3" filter="url(#lobbyGoldGlow)" />
        {REWARD_SPINNER.labels.map((label, i) => {
          const mid = i * 360 / wedgeCount + 180 / wedgeCount;
          const [tx, ty] = toPt(mid, r * 0.82);
          const coinRad = r * 0.63;
          return (
            <g key={`${label}-${i}`}>
              <path d={wedgePath(i)} fill={REWARD_SPINNER.colors[i]} stroke="#020711" strokeWidth="1.2" />
              <path d={wedgePath(i)} fill="url(#lobbyCardHotspot)" opacity="0.24" />
              <text x={tx} y={ty} fill={REWARD_SPINNER.textColors[i]} fontSize={label.length >= 3 ? 25 : 30} fontWeight="950" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${mid} ${tx} ${ty})`}>{label}</text>
              {renderRewardCoins(label, mid, coinRad, label === '500' ? 16 : label.length >= 3 ? 15 : 14)}
            </g>
          );
        })}
        {Array.from({ length: 48 }, (_, i) => {
          const ang = i * 7.5;
          const [dx, dy] = toPt(ang, r + 13);
          const wedgeIndex = Math.floor((((ang % 360) + 360) % 360) / (360 / wedgeCount));
          return <circle key={i} cx={dx} cy={dy} r={i % 3 === 0 ? 3.4 : 2.3} fill={REWARD_SPINNER.colors[wedgeIndex]} stroke="#fff7c8" strokeWidth="0.35" opacity="0.98" />;
        })}
      </g>
      <g pointerEvents="none">
        <path d={selectionGlowPath()} fill="#12eaff" opacity={isSpinning ? 0.28 : 0.18} filter="url(#lobbyCyanGlow)" />
        <path d={selectionGlowPath()} fill="#8a35ff" opacity={isSpinning ? 0.2 : 0.12} filter="url(#lobbyPurpleGlow)" />
        <path d={selectionGlowPath()} fill="none" stroke="#ff2bff" strokeWidth="4" opacity="0.78" filter="url(#lobbyPurpleGlow)" />
        <path d={selectionGlowPath()} fill="none" stroke="#16f3ff" strokeWidth="2.2" opacity="0.95" filter="url(#lobbyCyanGlow)" />
        <path d={`M${cx - 90} ${cy - r + 1} A${r - 17} ${r - 17} 0 0 1 ${cx + 90} ${cy - r + 1}`} fill="none" stroke="#12eaff" strokeWidth="8" strokeLinecap="round" opacity="0.9" filter="url(#lobbyCyanGlow)" />
        <path d={`M${cx - 82} ${cy - r + 3} A${r - 18} ${r - 18} 0 0 1 ${cx + 82} ${cy - r + 3}`} fill="none" stroke="#ffca4b" strokeWidth="4" strokeLinecap="round" opacity="0.95" filter="url(#lobbyGoldGlow)" />
        <path d={`M${cx - 66} ${cy - r + 14} A${r - 31} ${r - 31} 0 0 1 ${cx + 66} ${cy - r + 14}`} fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.88" />
      </g>
      {!isSpinning && !spinResult ? renderArcText(REWARD_SPINNER.edgeText, r + controls.spinner.startTextRadius, -78, 78, controls.spinner.startTextSize, arcId) : null}
      {isSpinning || spinResult ? (
        <g pointerEvents="none" filter="url(#lobbyGoldGlow)">
          <text x={cx - controls.spinner.numberBoxW / 2 - 18} y={resultTextY} fill="#f6fbff" fontSize="22" fontWeight="950" textAnchor="end" dominantBaseline="middle" stroke="#07111f" strokeWidth="3" paintOrder="stroke fill">{isSpinning ? 'COLLECTING' : 'YOU WON'}</text>
          <rect x={cx - controls.spinner.numberBoxW / 2} y={resultBoxY} width={controls.spinner.numberBoxW} height={controls.spinner.numberBoxH} rx="10" fill="#071321" stroke="#58bfff" strokeWidth="1.6" opacity="0.96" />
          <rect x={cx - controls.spinner.numberBoxW / 2 + 4} y={resultBoxY + 4} width={controls.spinner.numberBoxW - 8} height={isSpinning ? 16 : 18} rx={isSpinning ? 7 : 8} fill="#ffffff" opacity="0.07" />
          <CenterTxt x={cx - controls.spinner.numberBoxW / 2} y={resultBoxY} w={controls.spinner.numberBoxW} h={controls.spinner.numberBoxH} text={currentResultValue} size={currentResultValue.length >= 3 ? 38 : 46} weight="950" fill="#ffca4b" />
          <text x={cx + controls.spinner.numberBoxW / 2 + 18} y={resultTextY} fill="#f6fbff" fontSize="22" fontWeight="950" textAnchor="start" dominantBaseline="middle" stroke="#07111f" strokeWidth="3" paintOrder="stroke fill">COINS</text>
        </g>
      ) : null}
      <g className="lobby-ui-hit lobby-spinner-center-button" onClick={spinWheel} filter="url(#lobbyGoldGlow)">
        <circle className="lobby-spinner-center-hover-ring" cx={cx} cy={cy} r={controls.spinner.centerGoldR + 6} fill="#35ff92" opacity="0" filter="url(#lobbyCyanGlow)" />
        <circle cx={cx} cy={cy} r={controls.spinner.centerGoldR} fill="#9a5e10" stroke="#58bfff" strokeWidth="2.2" opacity="0.95" />
        <circle cx={cx} cy={cy} r={controls.spinner.centerGoldR - 4} fill="#d8931f" stroke="#7d49ff" strokeWidth="3" />
        <circle cx={cx} cy={cy} r={controls.spinner.centerGoldR - 12} fill="url(#lobbySpinnerCenterGold)" stroke="#ffca4b" strokeWidth="1.2" />
        <path d={`M${cx},${cy - controls.spinner.arrowHeight} L${cx - 11},${cy - 129} L${cx - 4},${cy - 132} V${cy + 12} H${cx + 4} V${cy - 132} L${cx + 11},${cy - 129} Z`} fill="url(#lobbySpinnerArrowGold)" stroke="#fff0a2" strokeWidth="2.2" />
        <path d={`M${cx},${cy - controls.spinner.arrowHeight + 20} L${cx - 3.2},${cy - 135} V${cy + 8} H${cx + 3.2} V${cy - 135} Z`} fill="#fff7c8" opacity="0.38" />
        <circle cx={cx} cy={cy} r={innerR + 5} fill="#e4a530" stroke="#fff2a6" strokeWidth="3" opacity="0.96" />
      </g>
    </g>
  );
}

export function StatusOverlay({ loading, error, creating, canvas }: { loading: boolean; error: string | null; creating: boolean; canvas: LobbyCanvasRect }) {
  if (!loading && !error && !creating) return null;
  const x = canvas.x + canvas.w / 2 - 210;
  const y = canvas.y + canvas.h / 2 - 46;
  return (
    <g pointerEvents="none">
      <rect x={x} y={y} width="420" height="92" rx="12" fill="#06111f" stroke={error ? '#ff4b58' : '#58bfff'} opacity="0.96" filter="url(#lobbyFrameGlow)" />
      <CenterTxt x={x + 20} y={y + 20} w={380} h={28} text={error || (creating ? 'Creating room...' : 'Loading lobby...')} size={16} weight="950" fill={error ? '#ffb8bf' : '#edf7ff'} />
      <CenterTxt x={x + 20} y={y + 54} w={380} h={22} text={error ? 'Clear the runtime issue and refresh the lobby.' : 'Syncing room state and layout controls.'} size={11} weight="650" opacity={0.72} />
    </g>
  );
}
