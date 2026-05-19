import { useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import {
  DEFAULT_SHOP_PAGE_CONTENT,
  normalizeShopPageContent,
  type ShopPageContentData,
  type ShopRightTabId,
} from './ShopPageSvgContent';
import type {
  ShopIcon,
  ShopPreviewRow,
  ShopQuest,
  ShopSideItem,
  ShopStaticItem,
  ShopTone,
  ShopVaultShowcaseGroup,
} from './ShopPageSvgData';
import { resolveShopPageImageUrl } from './ShopPageImageResolver';
import type { ShopTab } from './ShopPageSvgTypes';

type ShopContentPanelTab = 'overview' | 'pageShell' | 'sectionCards' | 'offers' | 'vault' | 'quests' | 'rightPanel' | 'rawJson';
type SectionListKey = 'featured' | 'categories';
type OfferListKey = 'creditPacks' | 'passes';
type ShellSurfaceKey = 'sidePanel' | 'header' | 'mainBody' | 'rightPanel' | 'bottomPanel' | 'footer';
type SelectOption<T extends string> = T | { value: T; label: string };

type ShopPageContentControlsPanelProps = {
  content: ShopPageContentData;
  onContentChange: Dispatch<SetStateAction<ShopPageContentData>>;
  onSave?: (content: ShopPageContentData) => Promise<string | void> | string | void;
};

const shopTabs: ShopTab[] = ['Treasury', 'Elite', 'Vault', 'Play Access', 'Events'];
const rightTabIds: ShopRightTabId[] = ['account', 'wallet', 'pass', 'events', 'recent'];
const toneOptions: ShopTone[] = ['cyan', 'gold', 'violet', 'green', 'orange', 'silver', 'danger'];
const iconOptions: ShopIcon[] = ['coins', 'crown', 'chest', 'cards', 'trophy', 'crate', 'shield', 'link', 'lock', 'cart'];
const panelTabs: Array<{ id: ShopContentPanelTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'pageShell', label: 'Page Shell' },
  { id: 'sectionCards', label: 'Cards' },
  { id: 'offers', label: 'Packs & Passes' },
  { id: 'vault', label: 'Vault' },
  { id: 'quests', label: 'Quests' },
  { id: 'rightPanel', label: 'Right Panel' },
  { id: 'rawJson', label: 'Raw JSON' },
];

function newShopItem(prefix: string): ShopStaticItem {
  return {
    title: `New ${prefix}`,
    subtitle: 'Describe what this marketplace card unlocks.',
    tone: 'cyan',
    icon: 'crate',
    badge: 'NEW',
    imageUrl: '',
    price: 'Coming Soon',
    benefits: ['Add the first player-facing benefit.'],
  };
}

function newQuest(): ShopQuest {
  return {
    key: `quest_${Date.now()}`,
    group: 'New',
    title: 'New Reward Quest',
    reward: '+1 Spin',
    cadence: 'Weekly',
    tone: 'cyan',
    icon: 'trophy',
    action: 'Start',
    imageUrl: '',
    description: 'Describe the action a player completes.',
    details: ['Add the first verification step.'],
  };
}

function newVaultGroup(): ShopVaultShowcaseGroup {
  return {
    key: `vault-${Date.now()}`,
    title: 'New Vault Group',
    subtitle: 'Describe this vault collection.',
    tone: 'cyan',
    icon: 'crate',
    badge: 'NEW',
    heroImageUrl: '',
    items: [newShopItem('Vault Item')],
  };
}

function newPreviewRow(tab: ShopPreviewRow['tab'] = 'Treasury'): ShopPreviewRow {
  return {
    title: `${tab.toUpperCase()} PREVIEW`,
    tab,
    subtitle: 'Describe what this bottom preview carousel shows.',
    items: ['New preview item'],
    accent: '#54e2ff',
    imageUrls: [],
  };
}

function linesFromText(value: string): string[] {
  return value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(length - 1, index));
}

function reorder<T>(items: T[], index: number, delta: number): T[] {
  const nextIndex = index + delta;
  if (index < 0 || index >= items.length || nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

function optionValue<T extends string>(option: SelectOption<T>): T {
  return typeof option === 'string' ? option : option.value;
}

function optionLabel<T extends string>(option: SelectOption<T>): string {
  return typeof option === 'string' ? option : option.label;
}

function itemOption(item: ShopStaticItem, index: number): SelectOption<string> {
  const parts = [`${index + 1}. ${item.title}`];
  if (item.price) parts.push(item.price);
  if (item.badge) parts.push(item.badge);
  return { value: String(index), label: parts.join(' - ') };
}

function namedOption(title: string, index: number, detail?: string): SelectOption<string> {
  return { value: String(index), label: `${index + 1}. ${title}${detail ? ` - ${detail}` : ''}` };
}

function titleList(items: Array<{ title: string; subtitle?: string }>, fallback: string): string[] {
  return items.length > 0 ? items.map(item => `${item.title}${item.subtitle ? ` - ${item.subtitle}` : ''}`) : [fallback];
}

function imageFileName(imageUrl: string): string {
  const value = imageUrl.split(/[?#]/, 1)[0] ?? imageUrl;
  try {
    return decodeURIComponent(value.split('/').pop() ?? value);
  } catch {
    return value.split('/').pop() ?? value;
  }
}

function sidePanelItemMetrics(content: ShopPageContentData, key: ShopTab): string[] {
  const section = content.sections[key];
  const featuredCount = section.featured?.length ?? 0;
  const categoryCount = section.categories?.length ?? 0;
  if (key === 'Treasury') return [`${content.creditPacks.length} credit packs`, `${featuredCount} featured cards`, `${categoryCount} category cards`];
  if (key === 'Elite') return [`${content.passes.length} passes`, `${featuredCount} featured cards`, `${categoryCount} category cards`];
  if (key === 'Vault') return [`${content.vaultShowcaseGroups.length} vault groups`, `${content.vaultShowcaseGroups.reduce((sum, group) => sum + group.items.length, 0)} vault items`, `${categoryCount} top cards`];
  if (key === 'Play Access') return [`${featuredCount} access cards`, `${categoryCount} category cards`, `${content.previews.filter(preview => preview.tab === key).length} bottom previews`];
  return [`${featuredCount} event cards`, `${categoryCount} category cards`, `${content.quests.length} quest actions`];
}

function productSurfaceMetrics(content: ShopPageContentData, key: ShopTab): string[] {
  if (key === 'Treasury') return [`${content.creditPacks.length} credit packs`];
  if (key === 'Elite') return [`${content.passes.length} passes`];
  if (key === 'Vault') return [
    `${content.vaultShowcaseGroups.length} vault groups`,
    `${content.vaultShowcaseGroups.reduce((sum, group) => sum + group.items.length, 0)} vault items`,
  ];
  if (key === 'Events') return [`${content.quests.length} event quests`];
  return [`${content.previews.filter(preview => preview.tab === key).length} bottom preview row`];
}

function productEditorLabel(key: ShopTab): string {
  if (key === 'Treasury') return 'Credit packs';
  if (key === 'Elite') return 'Passes';
  if (key === 'Vault') return 'Vault groups';
  if (key === 'Events') return 'Event quests';
  return 'Access cards';
}

function sectionListLabel(key: SectionListKey): string {
  return key === 'featured' ? 'Top main cards' : 'Bottom main cards';
}

function updateArrayItem<T>(items: T[], index: number, item: T): T[] {
  return items.map((candidate, candidateIndex) => candidateIndex === index ? item : candidate);
}

const shellStyle: CSSProperties = {
  display: 'grid',
  gap: '0.75rem',
  color: '#e0fbff',
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
  flexWrap: 'wrap',
};

const tabButtonStyle = (active: boolean): CSSProperties => ({
  appearance: 'none',
  border: '1px solid rgba(84,226,255,.32)',
  borderRadius: '0.45rem',
  background: active ? 'rgba(84,226,255,.2)' : 'rgba(5,18,31,.72)',
  color: active ? '#effcff' : '#bcecff',
  padding: '0.42rem 0.62rem',
  fontWeight: active ? 900 : 750,
  cursor: 'pointer',
});

const cardStyle: CSSProperties = {
  border: '1px solid rgba(84,226,255,.22)',
  borderRadius: '0.55rem',
  background: 'rgba(2,10,19,.66)',
  padding: '0.75rem',
  display: 'grid',
  gap: '0.65rem',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
  gap: '0.65rem',
};

const summaryGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
  gap: '0.75rem',
};

const summaryCardStyle: CSSProperties = {
  border: '1px solid rgba(84,226,255,.22)',
  borderRadius: '0.55rem',
  background: 'rgba(4,16,29,.72)',
  padding: '0.75rem',
  display: 'grid',
  gap: '0.45rem',
};

const summaryListStyle: CSSProperties = {
  display: 'grid',
  gap: '0.28rem',
  margin: 0,
  paddingLeft: '1rem',
  color: '#bcecff',
  fontSize: '0.78rem',
  lineHeight: 1.35,
};

const surfaceNavStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(8.8rem, 1fr))',
  gap: '0.5rem',
};

const surfaceButtonStyle = (active: boolean): CSSProperties => ({
  ...tabButtonStyle(active),
  minHeight: '3rem',
  textAlign: 'left',
  display: 'grid',
  alignContent: 'center',
  gap: '0.1rem',
});

const surfaceGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))',
  gap: '0.85rem',
  alignItems: 'start',
};

const authorListStyle: CSSProperties = {
  display: 'grid',
  gap: '0.55rem',
};

const authorListItemStyle = (active: boolean): CSSProperties => ({
  border: `1px solid ${active ? 'rgba(84,226,255,.82)' : 'rgba(84,226,255,.24)'}`,
  borderRadius: '0.55rem',
  background: active ? 'rgba(30,130,160,.24)' : 'rgba(5,18,31,.78)',
  color: '#effcff',
  padding: '0.55rem',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: '0.65rem',
  alignItems: 'center',
  textAlign: 'left',
  boxShadow: active ? '0 0 0.9rem rgba(84,226,255,.16)' : undefined,
});

const authorSelectButtonStyle: CSSProperties = {
  appearance: 'none',
  border: 0,
  background: 'transparent',
  color: 'inherit',
  padding: 0,
  display: 'grid',
  gridTemplateColumns: '3rem minmax(0, 1fr)',
  gap: '0.65rem',
  alignItems: 'center',
  textAlign: 'left',
  cursor: 'pointer',
  minWidth: 0,
};

const thumbStyle: CSSProperties = {
  width: '3rem',
  height: '3rem',
  borderRadius: '0.45rem',
  border: '1px solid rgba(84,226,255,.35)',
  background: 'rgba(3,13,25,.9)',
  objectFit: 'contain',
  boxSizing: 'border-box',
};

const listActionBarStyle: CSSProperties = {
  display: 'flex',
  gap: '0.3rem',
  alignItems: 'center',
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
};

const surfacePanelStyle: CSSProperties = {
  ...cardStyle,
  background: 'rgba(3,13,25,.74)',
};

const labelStyle: CSSProperties = {
  display: 'grid',
  gap: '0.25rem',
  color: '#d9f7ff',
  fontSize: '0.78rem',
  fontWeight: 800,
};

const inputStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  border: '1px solid rgba(84,226,255,.28)',
  borderRadius: '0.4rem',
  background: 'rgba(4,16,29,.92)',
  color: '#f0fdff',
  padding: '0.45rem 0.55rem',
};

const buttonStyle: CSSProperties = {
  appearance: 'none',
  border: '1px solid rgba(84,226,255,.36)',
  borderRadius: '0.4rem',
  background: 'rgba(7,28,44,.84)',
  color: '#dcfbff',
  padding: '0.42rem 0.58rem',
  fontWeight: 850,
  cursor: 'pointer',
};

const iconButtonStyle: CSSProperties = {
  ...buttonStyle,
  padding: '0.32rem 0.46rem',
  minWidth: '2rem',
};

const dangerButtonStyle: CSSProperties = {
  ...buttonStyle,
  borderColor: 'rgba(248,113,113,.44)',
  color: '#fecaca',
};

function TextField({ label, value, onChange, wide = false, readOnly = false }: { label: string; value: string; onChange: (value: string) => void; wide?: boolean; readOnly?: boolean }) {
  return (
    <label style={wide ? { ...labelStyle, gridColumn: '1 / -1' } : labelStyle}>
      {label}
      <input
        style={readOnly ? { ...inputStyle, color: '#9ccbd6', cursor: 'not-allowed', opacity: 0.8 } : inputStyle}
        value={value}
        readOnly={readOnly}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange, wide = false }: { label: string; value: string; onChange: (value: string) => void; wide?: boolean }) {
  return (
    <label style={wide ? { ...labelStyle, gridColumn: '1 / -1' } : labelStyle}>
      {label}
      <textarea style={{ ...inputStyle, minHeight: '6rem', resize: 'vertical' }} value={value} onChange={event => onChange(event.target.value)} />
    </label>
  );
}

function SelectField<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<SelectOption<T>>; onChange: (value: T) => void }) {
  return (
    <label style={labelStyle}>
      {label}
      <select style={inputStyle} value={value} onChange={event => onChange(event.target.value as T)}>
        {options.map(option => {
          const nextValue = optionValue(option);
          return <option key={nextValue} value={nextValue}>{optionLabel(option)}</option>;
        })}
      </select>
    </label>
  );
}

function AuthoringThumb({ imageUrl, label }: { imageUrl: string; label: string }) {
  const resolvedImageUrl = resolveShopPageImageUrl(imageUrl);
  if (!resolvedImageUrl) {
    return (
      <span style={{ ...thumbStyle, display: 'grid', placeItems: 'center', color: '#54e2ff', fontWeight: 950 }}>
        {label.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return <img src={resolvedImageUrl} alt="" style={thumbStyle} />;
}

function SummaryCard({
  title,
  count,
  items,
  onOpen,
}: {
  title: string;
  count: number;
  items: string[];
  onOpen: () => void;
}) {
  return (
    <button type="button" style={{ ...summaryCardStyle, color: '#e0fbff', textAlign: 'left', cursor: 'pointer' }} onClick={onOpen}>
      <span style={{ color: '#54e2ff', fontSize: '0.78rem', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</span>
      <strong style={{ fontSize: '1.15rem' }}>{count} authored</strong>
      <ul style={summaryListStyle}>
        {items.slice(0, 5).map(item => <li key={item}>{item}</li>)}
        {items.length > 5 ? <li>{items.length - 5} more</li> : null}
      </ul>
    </button>
  );
}

function ShopItemEditor({ item, onChange }: { item: ShopStaticItem; onChange: (item: ShopStaticItem) => void }) {
  return (
    <div style={gridStyle}>
      <TextField label="Title" value={item.title} onChange={value => onChange({ ...item, title: value })} />
      <TextField label="Subtitle" value={item.subtitle} onChange={value => onChange({ ...item, subtitle: value })} />
      <TextField label="Badge" value={item.badge ?? ''} onChange={value => onChange({ ...item, badge: value })} />
      <TextField label="Price / CTA" value={item.price ?? ''} onChange={value => onChange({ ...item, price: value })} />
      <TextField label={`Image URL${item.imageUrl ? ` (${imageFileName(item.imageUrl)})` : ''}`} value={item.imageUrl} wide onChange={value => onChange({ ...item, imageUrl: value })} />
      <SelectField label="Tone" value={item.tone} options={toneOptions} onChange={value => onChange({ ...item, tone: value })} />
      <SelectField label="Icon" value={item.icon} options={iconOptions} onChange={value => onChange({ ...item, icon: value })} />
      <TextAreaField label="Benefits" value={(item.benefits ?? []).join('\n')} wide onChange={value => onChange({ ...item, benefits: linesFromText(value) })} />
    </div>
  );
}

export function ShopPageContentControlsPanel({
  content,
  onContentChange,
  onSave,
}: ShopPageContentControlsPanelProps) {
  const normalized = useMemo(() => normalizeShopPageContent(content), [content]);
  const [activePanel, setActivePanel] = useState<ShopContentPanelTab>('overview');
  const [shellSurfaceKey, setShellSurfaceKey] = useState<ShellSurfaceKey>('sidePanel');
  const [shellItemIndex, setShellItemIndex] = useState(0);
  const [headerBadgeIndex, setHeaderBadgeIndex] = useState(0);
  const [footerItemIndex, setFooterItemIndex] = useState(0);
  const [activeShopTab, setActiveShopTab] = useState<ShopTab>('Treasury');
  const [sectionListKey, setSectionListKey] = useState<SectionListKey>('featured');
  const [sectionItemIndex, setSectionItemIndex] = useState(0);
  const [offerListKey, setOfferListKey] = useState<OfferListKey>('creditPacks');
  const [offerItemIndex, setOfferItemIndex] = useState(0);
  const [vaultGroupIndex, setVaultGroupIndex] = useState(0);
  const [vaultItemIndex, setVaultItemIndex] = useState(0);
  const [questIndex, setQuestIndex] = useState(0);
  const [rightTabId, setRightTabId] = useState<ShopRightTabId>('account');
  const [rightRowIndex, setRightRowIndex] = useState(0);
  const [rawJson, setRawJson] = useState('');
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const updateContent = (producer: (current: ShopPageContentData) => ShopPageContentData) => {
    onContentChange(previous => normalizeShopPageContent(producer(normalizeShopPageContent(previous))));
    setStatus('Unsaved content changes');
  };

  const sectionItems = normalized.sections[activeShopTab][sectionListKey] ?? [];
  const safeSectionItemIndex = clampIndex(sectionItemIndex, sectionItems.length);
  const selectedSectionItem = sectionItems[safeSectionItemIndex];
  const offerItems = normalized[offerListKey];
  const safeOfferItemIndex = clampIndex(offerItemIndex, offerItems.length);
  const selectedOfferItem = offerItems[safeOfferItemIndex];
  const vaultGroups = normalized.vaultShowcaseGroups;
  const safeVaultGroupIndex = clampIndex(vaultGroupIndex, vaultGroups.length);
  const selectedVaultGroup = vaultGroups[safeVaultGroupIndex];
  const vaultItems = selectedVaultGroup?.items ?? [];
  const safeVaultItemIndex = clampIndex(vaultItemIndex, vaultItems.length);
  const selectedVaultItem = vaultItems[safeVaultItemIndex];
  const safeQuestIndex = clampIndex(questIndex, normalized.quests.length);
  const selectedQuest = normalized.quests[safeQuestIndex];
  const rightRows = normalized.rightDetails[rightTabId] ?? [];
  const safeRightRowIndex = clampIndex(rightRowIndex, rightRows.length);
  const selectedRightRow = rightRows[safeRightRowIndex];
  const selectedRightTab = normalized.rightTabs.find(tab => tab.id === rightTabId);
  const safeSideItemIndex = clampIndex(shellItemIndex, normalized.sideItems.length);
  const selectedSideItem = normalized.sideItems[safeSideItemIndex];
  const safeHeaderStatIndex = clampIndex(shellItemIndex, normalized.headerStats.length);
  const selectedHeaderStat = normalized.headerStats[safeHeaderStatIndex];
  const safeHeaderBadgeIndex = clampIndex(headerBadgeIndex, normalized.uiCopy.header.badges.length);
  const selectedHeaderBadge = normalized.uiCopy.header.badges[safeHeaderBadgeIndex];
  const safePreviewIndex = clampIndex(shellItemIndex, normalized.previews.length);
  const selectedPreview = normalized.previews[safePreviewIndex];
  const safeFooterItemIndex = clampIndex(footerItemIndex, normalized.uiCopy.footer.length);
  const selectedFooterItem = normalized.uiCopy.footer[safeFooterItemIndex];
  const missingSideTabs = shopTabs.filter(tab => !normalized.sideItems.some(item => item.key === tab));
  const sectionCardCount = shopTabs.reduce((sum, tab) => {
    const section = normalized.sections[tab];
    return sum + (section.featured?.length ?? 0) + (section.categories?.length ?? 0);
  }, 0);
  const vaultItemCount = normalized.vaultShowcaseGroups.reduce((sum, group) => sum + group.items.length, 0);
  const rightDetailCount = rightTabIds.reduce((sum, tabId) => sum + (normalized.rightDetails[tabId]?.length ?? 0), 0);
  const previewImageCount = normalized.previews.reduce((sum, preview) => sum + preview.imageUrls.length, 0);
  const previewTabOptions: Array<SelectOption<ShopPreviewRow['tab']>> = [...shopTabs, 'Earn Free AC'].map(tab => ({
    value: tab as ShopPreviewRow['tab'],
    label: tab,
  }));

  const updateSectionItems = (items: ShopStaticItem[]) => {
    updateContent(current => ({
      ...current,
      sections: {
        ...current.sections,
        [activeShopTab]: {
          ...current.sections[activeShopTab],
          [sectionListKey]: items,
        },
      },
    }));
  };

  const updateOfferItems = (items: ShopStaticItem[]) => {
    updateContent(current => ({ ...current, [offerListKey]: items }));
  };

  const updateVaultGroups = (groups: ShopVaultShowcaseGroup[]) => {
    updateContent(current => ({ ...current, vaultShowcaseGroups: groups }));
  };

  const updateQuests = (quests: ShopQuest[]) => {
    updateContent(current => ({ ...current, quests }));
  };

  const updateSideItems = (sideItems: ShopSideItem[]) => {
    updateContent(current => ({ ...current, sideItems }));
  };

  const updateHeaderStats = (headerStats: ShopPageContentData['headerStats']) => {
    updateContent(current => ({ ...current, headerStats }));
  };

  const updatePreviews = (previews: ShopPreviewRow[]) => {
    updateContent(current => ({ ...current, previews }));
  };

  const openSectionEditor = (tab: ShopTab, listKey: SectionListKey) => {
    setActivePanel('sectionCards');
    setActiveShopTab(tab);
    setSectionListKey(listKey);
    setSectionItemIndex(0);
  };

  const handleSave = async () => {
    if (!onSave || isSaving) return;
    setIsSaving(true);
    setStatus('Saving content...');
    try {
      const result = await onSave(normalized);
      setStatus(result || 'Content saved');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Content save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const openSidePanelItems = (key: ShopTab) => {
    if (key === 'Treasury') {
      setActivePanel('offers');
      setOfferListKey('creditPacks');
      setOfferItemIndex(0);
      return;
    }
    if (key === 'Elite') {
      setActivePanel('offers');
      setOfferListKey('passes');
      setOfferItemIndex(0);
      return;
    }
    if (key === 'Vault') {
      setActivePanel('vault');
      setVaultGroupIndex(0);
      setVaultItemIndex(0);
      return;
    }
    if (key === 'Events') {
      setActivePanel('quests');
      setQuestIndex(0);
      return;
    }
    openSectionEditor(key, 'featured');
  };

  return (
    <section style={shellStyle}>
      <div style={toolbarStyle}>
        <strong>Shop Content Authoring</strong>
        <span style={{ flex: 1 }} />
        <button type="button" style={buttonStyle} onClick={() => {
          setRawJson(JSON.stringify(normalized, null, 2));
          setActivePanel('rawJson');
        }}>View JSON</button>
        <button type="button" style={buttonStyle} onClick={() => {
          onContentChange(normalizeShopPageContent(DEFAULT_SHOP_PAGE_CONTENT));
          setStatus('Content reset to default authored data');
        }}>Reset Content</button>
        <button type="button" style={buttonStyle} disabled={isSaving} onClick={() => void handleSave()}>{isSaving ? 'Saving...' : 'Save Content'}</button>
      </div>
      <div style={toolbarStyle}>
        {panelTabs.map(tab => (
          <button key={tab.id} type="button" style={tabButtonStyle(activePanel === tab.id)} onClick={() => setActivePanel(tab.id)}>{tab.label}</button>
        ))}
      </div>
      {status ? <div style={{ color: status.includes('saved') || status.includes('Saved') ? '#bbf7d0' : '#fde68a', fontSize: '0.82rem' }}>{status}</div> : null}

      {activePanel === 'overview' ? (
        <div style={cardStyle}>
          <div>
            <strong>Current authored shop data</strong>
            <div style={{ color: '#bcecff', fontSize: '0.82rem', marginTop: '0.2rem' }}>
              This is the content currently carried by the shop layout asset. Use these blocks to jump to the editor for what already exists, then add or adjust only the dataset you intend to run.
            </div>
          </div>
          <div style={summaryGridStyle}>
            <SummaryCard
              title="Page shell"
              count={normalized.sideItems.length + normalized.headerStats.length + normalized.previews.length}
              items={[`${normalized.sideItems.length} side buttons`, `${normalized.headerStats.length} top stats`, `${normalized.previews.length} bottom previews`, `${previewImageCount} preview images`]}
              onOpen={() => {
                setActivePanel('pageShell');
                setShellSurfaceKey('sidePanel');
                setShellItemIndex(0);
              }}
            />
            <SummaryCard
              title="Section cards"
              count={sectionCardCount}
              items={shopTabs.map(tab => `${tab}: ${(normalized.sections[tab].featured?.length ?? 0)} featured, ${(normalized.sections[tab].categories?.length ?? 0)} categories`)}
              onOpen={() => {
                setActivePanel('sectionCards');
                setActiveShopTab('Treasury');
                setSectionListKey('featured');
                setSectionItemIndex(0);
              }}
            />
            <SummaryCard
              title="Packs and passes"
              count={normalized.creditPacks.length + normalized.passes.length}
              items={[...titleList(normalized.creditPacks, 'No credit packs'), ...titleList(normalized.passes, 'No passes')]}
              onOpen={() => {
                setActivePanel('offers');
                setOfferListKey('creditPacks');
                setOfferItemIndex(0);
              }}
            />
            <SummaryCard
              title="Vault"
              count={vaultItemCount}
              items={normalized.vaultShowcaseGroups.map(group => `${group.title}: ${group.items.length} items`)}
              onOpen={() => {
                setActivePanel('vault');
                setVaultGroupIndex(0);
                setVaultItemIndex(0);
              }}
            />
            <SummaryCard
              title="Quests"
              count={normalized.quests.length}
              items={normalized.quests.map(quest => `${quest.title}: ${quest.reward}`)}
              onOpen={() => {
                setActivePanel('quests');
                setQuestIndex(0);
              }}
            />
            <SummaryCard
              title="Right panel"
              count={rightDetailCount}
              items={normalized.rightTabs.map(tab => `${tab.title}: ${normalized.rightDetails[tab.id]?.length ?? 0} rows`)}
              onOpen={() => {
                setActivePanel('rightPanel');
                setRightTabId('account');
                setRightRowIndex(0);
              }}
            />
          </div>
        </div>
      ) : null}

      {activePanel === 'pageShell' ? (
        <div style={cardStyle}>
          <div style={surfaceNavStyle}>
            {[
              { id: 'sidePanel' as const, title: 'Side Panel', detail: `${normalized.sideItems.length} buttons + earn CTA` },
              { id: 'header' as const, title: 'Header', detail: `${normalized.uiCopy.header.badges.length} badges, ${normalized.headerStats.length} stats` },
              { id: 'mainBody' as const, title: 'Main Body', detail: `${sectionCardCount} cards across sections` },
              { id: 'rightPanel' as const, title: 'Right Sidepanel', detail: `${normalized.rightTabs.length} tabs, ${rightDetailCount} rows` },
              { id: 'bottomPanel' as const, title: 'Bottom Panel', detail: `${normalized.previews.length} preview rows` },
              { id: 'footer' as const, title: 'Footer', detail: `${normalized.uiCopy.footer.length} trust items` },
            ].map(surface => (
              <button key={surface.id} type="button" style={surfaceButtonStyle(shellSurfaceKey === surface.id)} onClick={() => {
                setShellSurfaceKey(surface.id);
                setShellItemIndex(0);
              }}>
                <strong>{surface.title}</strong>
                <span style={{ color: '#9edfee', fontSize: '0.72rem' }}>{surface.detail}</span>
              </button>
            ))}
          </div>

          {shellSurfaceKey === 'sidePanel' ? (
            <div style={surfaceGridStyle}>
              <div style={surfacePanelStyle}>
                <div style={toolbarStyle}>
                  <strong>Side Panel</strong>
                  <span style={{ flex: 1 }} />
                  <button type="button" style={buttonStyle} disabled={missingSideTabs.length === 0} onClick={() => {
                    const defaultSideItem = DEFAULT_SHOP_PAGE_CONTENT.sideItems.find(item => item.key === missingSideTabs[0]);
                    if (!defaultSideItem) return;
                    const next = [...normalized.sideItems, { ...defaultSideItem }];
                    updateSideItems(next);
                    setShellItemIndex(next.length - 1);
                  }}>+ Add Button</button>
                </div>
                <div style={authorListStyle}>
                  {normalized.sideItems.map((item, index) => {
                    const active = index === safeSideItemIndex;
                    return (
                      <div key={item.key} style={authorListItemStyle(active)}>
                        <button type="button" style={authorSelectButtonStyle} onClick={() => setShellItemIndex(index)}>
                          <AuthoringThumb imageUrl={item.imageUrl} label={item.title} />
                          <span style={{ display: 'grid', gap: '0.16rem', minWidth: 0 }}>
                            <strong>{item.title}</strong>
                            <span style={{ color: '#bcecff', fontSize: '0.76rem' }}>{item.subtitle}</span>
                            <span style={{ color: '#7dd3fc', fontSize: '0.72rem' }}>{sidePanelItemMetrics(normalized, item.key).join(' | ')}</span>
                          </span>
                        </button>
                        <span style={listActionBarStyle}>
                          <button type="button" style={iconButtonStyle} onClick={() => openSidePanelItems(item.key)}>Items</button>
                          <button type="button" style={iconButtonStyle} aria-label={`Move ${item.title} up`} onClick={(event) => {
                            event.stopPropagation();
                            updateSideItems(reorder(normalized.sideItems, index, -1));
                            setShellItemIndex(clampIndex(index - 1, normalized.sideItems.length));
                          }}>Up</button>
                          <button type="button" style={iconButtonStyle} aria-label={`Move ${item.title} down`} onClick={(event) => {
                            event.stopPropagation();
                            updateSideItems(reorder(normalized.sideItems, index, 1));
                            setShellItemIndex(clampIndex(index + 1, normalized.sideItems.length));
                          }}>Down</button>
                          <button type="button" style={dangerButtonStyle} aria-label={`Delete ${item.title}`} onClick={(event) => {
                            event.stopPropagation();
                            const next = normalized.sideItems.filter((_, itemIndex) => itemIndex !== index);
                            updateSideItems(next);
                            setShellItemIndex(clampIndex(index - 1, next.length));
                          }}>X</button>
                        </span>
                      </div>
                    );
                  })}
                  <div style={{ ...summaryCardStyle, color: '#e0fbff' }}>
                    <span style={{ color: '#54e2ff', fontWeight: 950 }}>Earn Free AC CTA</span>
                    <strong>{normalized.uiCopy.earnPanel.title}</strong>
                    <span style={{ color: '#bcecff', fontSize: '0.78rem' }}>{normalized.uiCopy.earnPanel.description}</span>
                    <span style={{ color: '#fde68a', fontSize: '0.76rem', fontWeight: 900 }}>Button: {normalized.uiCopy.earnPanel.buttonLabel}</span>
                  </div>
                </div>
              </div>
              <div style={surfacePanelStyle}>
                <strong>{selectedSideItem ? `Edit ${selectedSideItem.title}` : 'No side button selected'}</strong>
                {selectedSideItem ? (
                  <div style={gridStyle}>
                    <TextField label="Section key" value={selectedSideItem.key} readOnly onChange={() => undefined} />
                    <TextField label="Title" value={selectedSideItem.title} onChange={value => updateSideItems(updateArrayItem(normalized.sideItems, safeSideItemIndex, { ...selectedSideItem, title: value }))} />
                    <TextField label="Subtitle" value={selectedSideItem.subtitle} onChange={value => updateSideItems(updateArrayItem(normalized.sideItems, safeSideItemIndex, { ...selectedSideItem, subtitle: value }))} />
                    <TextField label={`Image URL${selectedSideItem.imageUrl ? ` (${imageFileName(selectedSideItem.imageUrl)})` : ''}`} value={selectedSideItem.imageUrl} wide onChange={value => updateSideItems(updateArrayItem(normalized.sideItems, safeSideItemIndex, { ...selectedSideItem, imageUrl: value }))} />
                    <SelectField label="Tone" value={selectedSideItem.tone} options={toneOptions} onChange={value => updateSideItems(updateArrayItem(normalized.sideItems, safeSideItemIndex, { ...selectedSideItem, tone: value }))} />
                    <SelectField label="Icon" value={selectedSideItem.icon} options={iconOptions} onChange={value => updateSideItems(updateArrayItem(normalized.sideItems, safeSideItemIndex, { ...selectedSideItem, icon: value }))} />
                    <div style={{ ...summaryCardStyle, gridColumn: '1 / -1', color: '#e0fbff' }}>
                      <strong>Items controlled by this button</strong>
                      <ul style={summaryListStyle}>{sidePanelItemMetrics(normalized, selectedSideItem.key).map(item => <li key={item}>{item}</li>)}</ul>
                      <button type="button" style={buttonStyle} onClick={() => openSidePanelItems(selectedSideItem.key)}>Open linked items</button>
                    </div>
                    <div style={{ ...summaryCardStyle, gridColumn: '1 / -1', color: '#e0fbff' }}>
                      <strong>Earn Free AC CTA</strong>
                      <div style={gridStyle}>
                        <TextField label="Title" value={normalized.uiCopy.earnPanel.title} onChange={value => updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, earnPanel: { ...current.uiCopy.earnPanel, title: value } } }))} />
                        <TextField label="Button label" value={normalized.uiCopy.earnPanel.buttonLabel} onChange={value => updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, earnPanel: { ...current.uiCopy.earnPanel, buttonLabel: value } } }))} />
                        <TextAreaField label="Description" value={normalized.uiCopy.earnPanel.description} wide onChange={value => updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, earnPanel: { ...current.uiCopy.earnPanel, description: value } } }))} />
                      </div>
                    </div>
                  </div>
                ) : <div>No side panel buttons authored.</div>}
              </div>
            </div>
          ) : null}

          {shellSurfaceKey === 'header' ? (
            <div style={surfaceGridStyle}>
              <div style={surfacePanelStyle}>
                <strong>Header Copy</strong>
                <div style={gridStyle}>
                  <TextField label="Title" value={normalized.uiCopy.header.title} onChange={value => updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, header: { ...current.uiCopy.header, title: value } } }))} />
                  <TextField label="Subtitle" value={normalized.uiCopy.header.subtitle} onChange={value => updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, header: { ...current.uiCopy.header, subtitle: value } } }))} />
                  <TextField label="Balance title" value={normalized.uiCopy.header.balanceTitle} onChange={value => updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, header: { ...current.uiCopy.header, balanceTitle: value } } }))} />
                  <TextField label="Balance unit" value={normalized.uiCopy.header.balanceUnit} onChange={value => updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, header: { ...current.uiCopy.header, balanceUnit: value } } }))} />
                  <TextField label="Balance subtitle" value={normalized.uiCopy.header.balanceSub} wide onChange={value => updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, header: { ...current.uiCopy.header, balanceSub: value } } }))} />
                </div>
                <div style={{ ...summaryCardStyle, color: '#e0fbff' }}>
                  <div style={toolbarStyle}>
                    <strong>Header badges</strong>
                    <span style={{ flex: 1 }} />
                    <button type="button" style={buttonStyle} onClick={() => {
                      const next = [...normalized.uiCopy.header.badges, { title: 'New', sub: 'Badge', icon: 'shield' as ShopIcon, tone: 'cyan' as ShopTone }];
                      updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, header: { ...current.uiCopy.header, badges: next } } }));
                      setHeaderBadgeIndex(next.length - 1);
                    }}>+ Badge</button>
                  </div>
                  <div style={authorListStyle}>
                    {normalized.uiCopy.header.badges.map((badge, index) => (
                      <div key={`${badge.title}-${index}`} style={authorListItemStyle(index === safeHeaderBadgeIndex)}>
                        <button type="button" style={authorSelectButtonStyle} onClick={() => setHeaderBadgeIndex(index)}>
                          <span style={{ ...thumbStyle, display: 'grid', placeItems: 'center', fontWeight: 950 }}>{badge.icon}</span>
                          <span style={{ display: 'grid', minWidth: 0 }}><strong>{badge.title}</strong><span style={{ color: '#bcecff' }}>{badge.sub}</span></span>
                        </button>
                        <span style={listActionBarStyle}>
                          <button type="button" style={iconButtonStyle} onClick={(event) => {
                            event.stopPropagation();
                            const next = reorder(normalized.uiCopy.header.badges, index, -1);
                            updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, header: { ...current.uiCopy.header, badges: next } } }));
                            setHeaderBadgeIndex(clampIndex(index - 1, normalized.uiCopy.header.badges.length));
                          }}>Up</button>
                          <button type="button" style={iconButtonStyle} onClick={(event) => {
                            event.stopPropagation();
                            const next = reorder(normalized.uiCopy.header.badges, index, 1);
                            updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, header: { ...current.uiCopy.header, badges: next } } }));
                            setHeaderBadgeIndex(clampIndex(index + 1, normalized.uiCopy.header.badges.length));
                          }}>Down</button>
                          <button type="button" style={dangerButtonStyle} onClick={(event) => {
                            event.stopPropagation();
                            const next = normalized.uiCopy.header.badges.filter((_, badgeIndex) => badgeIndex !== index);
                            updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, header: { ...current.uiCopy.header, badges: next } } }));
                            setHeaderBadgeIndex(clampIndex(index - 1, next.length));
                          }}>X</button>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div style={surfacePanelStyle}>
                <strong>Header Stats</strong>
                <div style={toolbarStyle}>
                  <button type="button" style={buttonStyle} onClick={() => {
                    const next = [...normalized.headerStats, { label: 'New Stat', value: 'N/A' }];
                    updateHeaderStats(next);
                    setShellItemIndex(next.length - 1);
                  }}>+ Stat</button>
                </div>
                <div style={authorListStyle}>
                  {normalized.headerStats.map((stat, index) => (
                    <div key={`${stat.label}-${index}`} style={authorListItemStyle(index === safeHeaderStatIndex)}>
                      <button type="button" style={authorSelectButtonStyle} onClick={() => setShellItemIndex(index)}>
                        <span style={{ ...thumbStyle, display: 'grid', placeItems: 'center', fontWeight: 950 }}>{index + 1}</span>
                        <span style={{ display: 'grid', minWidth: 0 }}>
                          <strong>{stat.label}</strong>
                          <span style={{ color: '#bcecff' }}>{stat.value}</span>
                        </span>
                      </button>
                      <span style={listActionBarStyle}>
                        <button type="button" style={iconButtonStyle} onClick={(event) => {
                          event.stopPropagation();
                          updateHeaderStats(reorder(normalized.headerStats, index, -1));
                          setShellItemIndex(clampIndex(index - 1, normalized.headerStats.length));
                        }}>Up</button>
                        <button type="button" style={iconButtonStyle} onClick={(event) => {
                          event.stopPropagation();
                          updateHeaderStats(reorder(normalized.headerStats, index, 1));
                          setShellItemIndex(clampIndex(index + 1, normalized.headerStats.length));
                        }}>Down</button>
                        <button type="button" style={dangerButtonStyle} onClick={(event) => {
                          event.stopPropagation();
                          const next = normalized.headerStats.filter((_, statIndex) => statIndex !== index);
                          updateHeaderStats(next);
                          setShellItemIndex(clampIndex(index - 1, next.length));
                        }}>X</button>
                      </span>
                    </div>
                  ))}
                </div>
                {selectedHeaderStat ? (
                  <div style={gridStyle}>
                    <TextField label="Label" value={selectedHeaderStat.label} onChange={value => updateHeaderStats(updateArrayItem(normalized.headerStats, safeHeaderStatIndex, { ...selectedHeaderStat, label: value }))} />
                    <TextField label="Value" value={selectedHeaderStat.value} onChange={value => updateHeaderStats(updateArrayItem(normalized.headerStats, safeHeaderStatIndex, { ...selectedHeaderStat, value }))} />
                  </div>
                ) : null}
                {selectedHeaderBadge ? (
                  <div style={{ ...summaryCardStyle, color: '#e0fbff' }}>
                    <strong>Selected Badge</strong>
                    <div style={gridStyle}>
                      <TextField label="Title" value={selectedHeaderBadge.title} onChange={value => updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, header: { ...current.uiCopy.header, badges: updateArrayItem(current.uiCopy.header.badges, safeHeaderBadgeIndex, { ...selectedHeaderBadge, title: value }) } } }))} />
                      <TextField label="Subtitle" value={selectedHeaderBadge.sub} onChange={value => updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, header: { ...current.uiCopy.header, badges: updateArrayItem(current.uiCopy.header.badges, safeHeaderBadgeIndex, { ...selectedHeaderBadge, sub: value }) } } }))} />
                      <SelectField label="Icon" value={selectedHeaderBadge.icon} options={iconOptions} onChange={value => updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, header: { ...current.uiCopy.header, badges: updateArrayItem(current.uiCopy.header.badges, safeHeaderBadgeIndex, { ...selectedHeaderBadge, icon: value }) } } }))} />
                      <SelectField label="Tone" value={selectedHeaderBadge.tone} options={toneOptions} onChange={value => updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, header: { ...current.uiCopy.header, badges: updateArrayItem(current.uiCopy.header.badges, safeHeaderBadgeIndex, { ...selectedHeaderBadge, tone: value }) } } }))} />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {shellSurfaceKey === 'mainBody' ? (
            <div style={surfacePanelStyle}>
              <strong>Main Body</strong>
              <div style={{ color: '#bcecff', fontSize: '0.82rem' }}>Each section has separate authoring paths for top cards, bottom cards, and the product data it opens.</div>
              <div style={summaryGridStyle}>
                {shopTabs.map(tab => {
                  const section = normalized.sections[tab];
                  const featuredCount = section.featured?.length ?? 0;
                  const categoryCount = section.categories?.length ?? 0;
                  return (
                    <div key={tab} style={{ ...summaryCardStyle, color: '#e0fbff' }}>
                      <span style={{ color: '#54e2ff', fontSize: '0.78rem', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{tab}</span>
                      <strong style={{ fontSize: '1.08rem' }}>{featuredCount + categoryCount} section cards</strong>
                      <ul style={summaryListStyle}>
                        <li>{featuredCount} top main cards</li>
                        <li>{categoryCount} bottom main cards</li>
                        {productSurfaceMetrics(normalized, tab).map(item => <li key={item}>{item}</li>)}
                      </ul>
                      <div style={listActionBarStyle}>
                        <button type="button" style={buttonStyle} onClick={() => openSectionEditor(tab, 'featured')}>Edit top cards</button>
                        <button type="button" style={buttonStyle} onClick={() => openSectionEditor(tab, 'categories')}>Edit bottom cards</button>
                        <button type="button" style={buttonStyle} onClick={() => openSidePanelItems(tab)}>Edit {productEditorLabel(tab)}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {shellSurfaceKey === 'rightPanel' ? (
            <div style={surfacePanelStyle}>
              <strong>Right Sidepanel</strong>
              <div style={summaryGridStyle}>
                {normalized.rightTabs.map(tab => (
                  <SummaryCard
                    key={tab.id}
                    title={tab.title}
                    count={normalized.rightDetails[tab.id]?.length ?? 0}
                    items={(normalized.rightDetails[tab.id] ?? []).map(row => `${row.label}: ${row.value}`)}
                    onOpen={() => {
                      setActivePanel('rightPanel');
                      setRightTabId(tab.id);
                      setRightRowIndex(0);
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {shellSurfaceKey === 'bottomPanel' ? (
            <div style={surfaceGridStyle}>
              <div style={surfacePanelStyle}>
                <div style={toolbarStyle}>
                  <strong>Bottom Panel Preview Rows</strong>
                  <span style={{ flex: 1 }} />
                  <button type="button" style={buttonStyle} onClick={() => {
                    const next = [...normalized.previews, newPreviewRow()];
                    updatePreviews(next);
                    setShellItemIndex(next.length - 1);
                  }}>+ Preview Row</button>
                </div>
                <div style={authorListStyle}>
                  {normalized.previews.map((preview, index) => (
                    <div key={`${preview.title}-${index}`} style={authorListItemStyle(index === safePreviewIndex)}>
                      <button type="button" style={authorSelectButtonStyle} onClick={() => setShellItemIndex(index)}>
                        <AuthoringThumb imageUrl={preview.imageUrls[0] ?? ''} label={preview.title} />
                        <span style={{ display: 'grid', gap: '0.12rem', minWidth: 0 }}>
                          <strong>{preview.title}</strong>
                          <span style={{ color: '#bcecff', fontSize: '0.76rem' }}>{preview.subtitle}</span>
                          <span style={{ color: '#7dd3fc', fontSize: '0.72rem' }}>{preview.items.length} buttons | {preview.imageUrls.length} images | {preview.tab}</span>
                        </span>
                      </button>
                      <span style={listActionBarStyle}>
                        <button type="button" style={iconButtonStyle} onClick={(event) => {
                          event.stopPropagation();
                          const next = [
                            ...normalized.previews.slice(0, index + 1),
                            { ...preview, title: `${preview.title} Copy` },
                            ...normalized.previews.slice(index + 1),
                          ];
                          updatePreviews(next);
                          setShellItemIndex(index + 1);
                        }}>Copy</button>
                        <button type="button" style={iconButtonStyle} onClick={(event) => {
                          event.stopPropagation();
                          updatePreviews(reorder(normalized.previews, index, -1));
                          setShellItemIndex(clampIndex(index - 1, normalized.previews.length));
                        }}>Up</button>
                        <button type="button" style={iconButtonStyle} onClick={(event) => {
                          event.stopPropagation();
                          updatePreviews(reorder(normalized.previews, index, 1));
                          setShellItemIndex(clampIndex(index + 1, normalized.previews.length));
                        }}>Down</button>
                        <button type="button" style={dangerButtonStyle} onClick={(event) => {
                          event.stopPropagation();
                          const next = normalized.previews.filter((_, previewIndex) => previewIndex !== index);
                          updatePreviews(next);
                          setShellItemIndex(clampIndex(index - 1, next.length));
                        }}>X</button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={surfacePanelStyle}>
                <strong>{selectedPreview ? `Edit ${selectedPreview.title}` : 'No bottom preview selected'}</strong>
                {selectedPreview ? (
                  <div style={gridStyle}>
                    <TextField label="Title" value={selectedPreview.title} onChange={value => updatePreviews(updateArrayItem(normalized.previews, safePreviewIndex, { ...selectedPreview, title: value }))} />
                    <SelectField<ShopPreviewRow['tab']> label="Target tab" value={selectedPreview.tab} options={previewTabOptions} onChange={value => updatePreviews(updateArrayItem(normalized.previews, safePreviewIndex, { ...selectedPreview, tab: value }))} />
                    <TextField label="Subtitle" value={selectedPreview.subtitle} onChange={value => updatePreviews(updateArrayItem(normalized.previews, safePreviewIndex, { ...selectedPreview, subtitle: value }))} />
                    <TextField label="Accent color" value={selectedPreview.accent} onChange={value => updatePreviews(updateArrayItem(normalized.previews, safePreviewIndex, { ...selectedPreview, accent: value }))} />
                    <TextAreaField label="Button labels / items" value={selectedPreview.items.join('\n')} wide onChange={value => updatePreviews(updateArrayItem(normalized.previews, safePreviewIndex, { ...selectedPreview, items: linesFromText(value) }))} />
                    <TextAreaField label="Image URLs" value={selectedPreview.imageUrls.join('\n')} wide onChange={value => updatePreviews(updateArrayItem(normalized.previews, safePreviewIndex, { ...selectedPreview, imageUrls: linesFromText(value) }))} />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {shellSurfaceKey === 'footer' ? (
            <div style={surfaceGridStyle}>
              <div style={surfacePanelStyle}>
                <div style={toolbarStyle}>
                  <strong>Footer Trust Row</strong>
                  <span style={{ flex: 1 }} />
                  <button type="button" style={buttonStyle} onClick={() => {
                    const next = [...normalized.uiCopy.footer, { title: 'New Footer Item', sub: 'Describe the trust signal', icon: 'shield' as ShopIcon, tone: 'cyan' as ShopTone }];
                    updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, footer: next } }));
                    setFooterItemIndex(next.length - 1);
                  }}>+ Footer Item</button>
                </div>
                <div style={authorListStyle}>
                  {normalized.uiCopy.footer.map((item, index) => (
                    <div key={`${item.title}-${index}`} style={authorListItemStyle(index === safeFooterItemIndex)}>
                      <button type="button" style={authorSelectButtonStyle} onClick={() => setFooterItemIndex(index)}>
                        <span style={{ ...thumbStyle, display: 'grid', placeItems: 'center', fontWeight: 950 }}>{item.icon}</span>
                        <span style={{ display: 'grid', minWidth: 0 }}><strong>{item.title}</strong><span style={{ color: '#bcecff' }}>{item.sub}</span></span>
                      </button>
                      <span style={listActionBarStyle}>
                        <button type="button" style={iconButtonStyle} onClick={(event) => {
                          event.stopPropagation();
                          const next = reorder(normalized.uiCopy.footer, index, -1);
                          updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, footer: next } }));
                          setFooterItemIndex(clampIndex(index - 1, normalized.uiCopy.footer.length));
                        }}>Up</button>
                        <button type="button" style={iconButtonStyle} onClick={(event) => {
                          event.stopPropagation();
                          const next = reorder(normalized.uiCopy.footer, index, 1);
                          updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, footer: next } }));
                          setFooterItemIndex(clampIndex(index + 1, normalized.uiCopy.footer.length));
                        }}>Down</button>
                        <button type="button" style={dangerButtonStyle} onClick={(event) => {
                          event.stopPropagation();
                          const next = normalized.uiCopy.footer.filter((_, footerIndex) => footerIndex !== index);
                          updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, footer: next } }));
                          setFooterItemIndex(clampIndex(index - 1, next.length));
                        }}>X</button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={surfacePanelStyle}>
                <strong>{selectedFooterItem ? `Edit ${selectedFooterItem.title}` : 'No footer item selected'}</strong>
                {selectedFooterItem ? (
                  <div style={gridStyle}>
                    <TextField label="Title" value={selectedFooterItem.title} onChange={value => updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, footer: updateArrayItem(current.uiCopy.footer, safeFooterItemIndex, { ...selectedFooterItem, title: value }) } }))} />
                    <TextField label="Subtitle" value={selectedFooterItem.sub} onChange={value => updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, footer: updateArrayItem(current.uiCopy.footer, safeFooterItemIndex, { ...selectedFooterItem, sub: value }) } }))} />
                    <SelectField label="Icon" value={selectedFooterItem.icon} options={iconOptions} onChange={value => updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, footer: updateArrayItem(current.uiCopy.footer, safeFooterItemIndex, { ...selectedFooterItem, icon: value }) } }))} />
                    <SelectField label="Tone" value={selectedFooterItem.tone} options={toneOptions} onChange={value => updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, footer: updateArrayItem(current.uiCopy.footer, safeFooterItemIndex, { ...selectedFooterItem, tone: value }) } }))} />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {activePanel === 'sectionCards' ? (
        <div style={cardStyle}>
          <div>
            <strong>Section Cards</strong>
            <div style={{ color: '#bcecff', fontSize: '0.82rem', marginTop: '0.2rem' }}>
              Pick the shop section, then choose whether you are editing the top main strip or the bottom main cards.
            </div>
          </div>
          <div style={surfaceNavStyle}>
            {shopTabs.map(tab => {
              const section = normalized.sections[tab];
              return (
                <button key={tab} type="button" style={surfaceButtonStyle(activeShopTab === tab)} onClick={() => {
                  setActiveShopTab(tab);
                  setSectionItemIndex(0);
                }}>
                  <strong>{tab}</strong>
                  <span style={{ color: '#9edfee', fontSize: '0.72rem' }}>{section.featured?.length ?? 0} top, {section.categories?.length ?? 0} bottom</span>
                </button>
              );
            })}
          </div>
          <div style={toolbarStyle}>
            {(['featured', 'categories'] as SectionListKey[]).map(listKey => (
              <button key={listKey} type="button" style={tabButtonStyle(sectionListKey === listKey)} onClick={() => {
                setSectionListKey(listKey);
                setSectionItemIndex(0);
              }}>{sectionListLabel(listKey)} ({normalized.sections[activeShopTab][listKey]?.length ?? 0})</button>
            ))}
            <span style={{ flex: 1 }} />
            <button type="button" style={buttonStyle} onClick={() => openSidePanelItems(activeShopTab)}>Edit {productEditorLabel(activeShopTab)}</button>
          </div>
          <div style={surfaceGridStyle}>
            <div style={surfacePanelStyle}>
              <div style={toolbarStyle}>
                <strong>{activeShopTab} - {sectionListLabel(sectionListKey)}</strong>
                <span style={{ flex: 1 }} />
                <button type="button" style={buttonStyle} onClick={() => {
                  const next = [...sectionItems, newShopItem(`${activeShopTab} Card`)];
                  updateSectionItems(next);
                  setSectionItemIndex(next.length - 1);
                }}>+ Card</button>
              </div>
              <div style={authorListStyle}>
                {sectionItems.map((item, index) => (
                  <div key={`${item.title}-${index}`} style={authorListItemStyle(index === safeSectionItemIndex)}>
                    <button type="button" style={authorSelectButtonStyle} onClick={() => setSectionItemIndex(index)}>
                      <AuthoringThumb imageUrl={item.imageUrl} label={item.title} />
                      <span style={{ display: 'grid', gap: '0.12rem', minWidth: 0 }}>
                        <strong>{item.title}</strong>
                        <span style={{ color: '#bcecff', fontSize: '0.76rem' }}>{item.subtitle}</span>
                        <span style={{ color: '#7dd3fc', fontSize: '0.72rem' }}>{item.price || 'No CTA'} | {item.badge || 'No badge'} | {item.tone}</span>
                      </span>
                    </button>
                    <span style={listActionBarStyle}>
                      <button type="button" style={iconButtonStyle} onClick={(event) => {
                        event.stopPropagation();
                        const next = [
                          ...sectionItems.slice(0, index + 1),
                          { ...item, title: `${item.title} Copy` },
                          ...sectionItems.slice(index + 1),
                        ];
                        updateSectionItems(next);
                        setSectionItemIndex(index + 1);
                      }}>Copy</button>
                      <button type="button" style={iconButtonStyle} onClick={(event) => {
                        event.stopPropagation();
                        updateSectionItems(reorder(sectionItems, index, -1));
                        setSectionItemIndex(clampIndex(index - 1, sectionItems.length));
                      }}>Up</button>
                      <button type="button" style={iconButtonStyle} onClick={(event) => {
                        event.stopPropagation();
                        updateSectionItems(reorder(sectionItems, index, 1));
                        setSectionItemIndex(clampIndex(index + 1, sectionItems.length));
                      }}>Down</button>
                      <button type="button" style={dangerButtonStyle} onClick={(event) => {
                        event.stopPropagation();
                        const next = sectionItems.filter((_, itemIndex) => itemIndex !== index);
                        updateSectionItems(next);
                        setSectionItemIndex(clampIndex(index - 1, next.length));
                      }}>X</button>
                    </span>
                  </div>
                ))}
                {sectionItems.length === 0 ? (
                  <div style={{ ...summaryCardStyle, color: '#e0fbff' }}>
                    <strong>No {sectionListLabel(sectionListKey).toLowerCase()} authored for {activeShopTab}.</strong>
                    <span style={{ color: '#bcecff', fontSize: '0.8rem' }}>Use + Card for visible section cards, or use Edit {productEditorLabel(activeShopTab)} for the product list behind this section.</span>
                  </div>
                ) : null}
              </div>
            </div>
            <div style={surfacePanelStyle}>
              <strong>{selectedSectionItem ? `Edit ${selectedSectionItem.title}` : `${activeShopTab} ${sectionListLabel(sectionListKey)}`}</strong>
              {selectedSectionItem ? (
                <ShopItemEditor item={selectedSectionItem} onChange={item => updateSectionItems(sectionItems.map((candidate, index) => index === safeSectionItemIndex ? item : candidate))} />
              ) : (
                <div style={{ color: '#bcecff', fontSize: '0.82rem' }}>Select a card or add one to edit title, copy, image, tone, badge, CTA, and benefits.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activePanel === 'offers' ? (
        <div style={cardStyle}>
          <div style={toolbarStyle}>
            <SelectField label="Offer list" value={offerListKey} options={[
              { value: 'creditPacks', label: `Arena Credit packs (${normalized.creditPacks.length})` },
              { value: 'passes', label: `Passes and subscriptions (${normalized.passes.length})` },
            ]} onChange={(value) => {
              setOfferListKey(value);
              setOfferItemIndex(0);
            }} />
          </div>
          <div style={toolbarStyle}>
            <button type="button" style={buttonStyle} onClick={() => {
              const next = [...offerItems, newShopItem(offerListKey === 'creditPacks' ? 'Credit Pack' : 'Pass')];
              updateOfferItems(next);
              setOfferItemIndex(next.length - 1);
            }}>+ Offer</button>
            <button type="button" style={buttonStyle} disabled={!selectedOfferItem} onClick={() => {
              const next = [...offerItems, { ...selectedOfferItem, title: `${selectedOfferItem.title} Copy` }];
              updateOfferItems(next);
              setOfferItemIndex(next.length - 1);
            }}>Duplicate</button>
            <button type="button" style={buttonStyle} disabled={!selectedOfferItem} onClick={() => {
              updateOfferItems(reorder(offerItems, safeOfferItemIndex, -1));
              setOfferItemIndex(clampIndex(safeOfferItemIndex - 1, offerItems.length));
            }}>Up</button>
            <button type="button" style={buttonStyle} disabled={!selectedOfferItem} onClick={() => {
              updateOfferItems(reorder(offerItems, safeOfferItemIndex, 1));
              setOfferItemIndex(clampIndex(safeOfferItemIndex + 1, offerItems.length));
            }}>Down</button>
            <button type="button" style={dangerButtonStyle} disabled={!selectedOfferItem} onClick={() => {
              const next = offerItems.filter((_, index) => index !== safeOfferItemIndex);
              updateOfferItems(next);
              setOfferItemIndex(clampIndex(safeOfferItemIndex - 1, next.length));
            }}>Remove</button>
          </div>
          {offerItems.length > 0 ? <SelectField label="Selected offer" value={String(safeOfferItemIndex)} options={offerItems.map(itemOption)} onChange={value => setOfferItemIndex(Number(value))} /> : null}
          {selectedOfferItem ? (
            <ShopItemEditor item={selectedOfferItem} onChange={item => updateOfferItems(offerItems.map((candidate, index) => index === safeOfferItemIndex ? item : candidate))} />
          ) : <div>No offers yet.</div>}
        </div>
      ) : null}

      {activePanel === 'vault' ? (
        <div style={cardStyle}>
          <div style={toolbarStyle}>
            <button type="button" style={buttonStyle} onClick={() => {
              const next = [...vaultGroups, newVaultGroup()];
              updateVaultGroups(next);
              setVaultGroupIndex(next.length - 1);
              setVaultItemIndex(0);
            }}>+ Vault Group</button>
            <button type="button" style={dangerButtonStyle} disabled={!selectedVaultGroup} onClick={() => {
              updateVaultGroups(vaultGroups.filter((_, index) => index !== safeVaultGroupIndex));
              setVaultGroupIndex(clampIndex(safeVaultGroupIndex - 1, vaultGroups.length - 1));
              setVaultItemIndex(0);
            }}>Remove Group</button>
          </div>
          {vaultGroups.length > 0 ? <SelectField label="Vault group" value={String(safeVaultGroupIndex)} options={vaultGroups.map((group, index) => namedOption(group.title, index, `${group.items.length} items`))} onChange={value => {
            setVaultGroupIndex(Number(value));
            setVaultItemIndex(0);
          }} /> : null}
          {selectedVaultGroup ? (
            <>
              <div style={gridStyle}>
                <TextField label="Group key" value={selectedVaultGroup.key} onChange={value => updateVaultGroups(vaultGroups.map((group, index) => index === safeVaultGroupIndex ? { ...group, key: value } : group))} />
                <TextField label="Group title" value={selectedVaultGroup.title} onChange={value => updateVaultGroups(vaultGroups.map((group, index) => index === safeVaultGroupIndex ? { ...group, title: value } : group))} />
                <TextField label="Subtitle" value={selectedVaultGroup.subtitle} onChange={value => updateVaultGroups(vaultGroups.map((group, index) => index === safeVaultGroupIndex ? { ...group, subtitle: value } : group))} />
                <TextField label={`Hero image URL${selectedVaultGroup.heroImageUrl ? ` (${imageFileName(selectedVaultGroup.heroImageUrl)})` : ''}`} value={selectedVaultGroup.heroImageUrl} wide onChange={value => updateVaultGroups(vaultGroups.map((group, index) => index === safeVaultGroupIndex ? { ...group, heroImageUrl: value } : group))} />
                <SelectField label="Tone" value={selectedVaultGroup.tone} options={toneOptions} onChange={value => updateVaultGroups(vaultGroups.map((group, index) => index === safeVaultGroupIndex ? { ...group, tone: value } : group))} />
                <SelectField label="Icon" value={selectedVaultGroup.icon} options={iconOptions} onChange={value => updateVaultGroups(vaultGroups.map((group, index) => index === safeVaultGroupIndex ? { ...group, icon: value } : group))} />
              </div>
              <div style={toolbarStyle}>
                <button type="button" style={buttonStyle} onClick={() => {
                  const nextItems = [...vaultItems, newShopItem('Vault Item')];
                  updateVaultGroups(vaultGroups.map((group, index) => index === safeVaultGroupIndex ? { ...group, items: nextItems } : group));
                  setVaultItemIndex(nextItems.length - 1);
                }}>+ Vault Item</button>
                <button type="button" style={dangerButtonStyle} disabled={!selectedVaultItem} onClick={() => {
                  const nextItems = vaultItems.filter((_, index) => index !== safeVaultItemIndex);
                  updateVaultGroups(vaultGroups.map((group, index) => index === safeVaultGroupIndex ? { ...group, items: nextItems } : group));
                  setVaultItemIndex(clampIndex(safeVaultItemIndex - 1, nextItems.length));
                }}>Remove Item</button>
              </div>
              {vaultItems.length > 0 ? <SelectField label="Selected vault item" value={String(safeVaultItemIndex)} options={vaultItems.map(itemOption)} onChange={value => setVaultItemIndex(Number(value))} /> : null}
              {selectedVaultItem ? (
                <ShopItemEditor item={selectedVaultItem} onChange={item => updateVaultGroups(vaultGroups.map((group, groupIndex) => groupIndex === safeVaultGroupIndex ? { ...group, items: vaultItems.map((candidate, itemIndex) => itemIndex === safeVaultItemIndex ? item : candidate) } : group))} />
              ) : null}
            </>
          ) : <div>No vault groups yet.</div>}
        </div>
      ) : null}

      {activePanel === 'quests' ? (
        <div style={cardStyle}>
          <div style={toolbarStyle}>
            <button type="button" style={buttonStyle} onClick={() => {
              const next = [...normalized.quests, newQuest()];
              updateQuests(next);
              setQuestIndex(next.length - 1);
            }}>+ Quest</button>
            <button type="button" style={dangerButtonStyle} disabled={!selectedQuest} onClick={() => {
              const next = normalized.quests.filter((_, index) => index !== safeQuestIndex);
              updateQuests(next);
              setQuestIndex(clampIndex(safeQuestIndex - 1, next.length));
            }}>Remove Quest</button>
          </div>
          {normalized.quests.length > 0 ? <SelectField label="Selected quest" value={String(safeQuestIndex)} options={normalized.quests.map((quest, index) => namedOption(quest.title, index, `${quest.reward} | ${quest.cadence}`))} onChange={value => setQuestIndex(Number(value))} /> : null}
          {selectedQuest ? (
            <div style={gridStyle}>
              <TextField label="Key" value={selectedQuest.key} onChange={value => updateQuests(normalized.quests.map((quest, index) => index === safeQuestIndex ? { ...quest, key: value } : quest))} />
              <TextField label="Group" value={selectedQuest.group} onChange={value => updateQuests(normalized.quests.map((quest, index) => index === safeQuestIndex ? { ...quest, group: value } : quest))} />
              <TextField label="Title" value={selectedQuest.title} onChange={value => updateQuests(normalized.quests.map((quest, index) => index === safeQuestIndex ? { ...quest, title: value } : quest))} />
              <TextField label="Reward" value={selectedQuest.reward} onChange={value => updateQuests(normalized.quests.map((quest, index) => index === safeQuestIndex ? { ...quest, reward: value } : quest))} />
              <TextField label="Cadence" value={selectedQuest.cadence} onChange={value => updateQuests(normalized.quests.map((quest, index) => index === safeQuestIndex ? { ...quest, cadence: value } : quest))} />
              <TextField label="Action" value={selectedQuest.action} onChange={value => updateQuests(normalized.quests.map((quest, index) => index === safeQuestIndex ? { ...quest, action: value } : quest))} />
              <TextField label={`Image URL${selectedQuest.imageUrl ? ` (${imageFileName(selectedQuest.imageUrl)})` : ''}`} value={selectedQuest.imageUrl} wide onChange={value => updateQuests(normalized.quests.map((quest, index) => index === safeQuestIndex ? { ...quest, imageUrl: value } : quest))} />
              <SelectField label="Tone" value={selectedQuest.tone} options={toneOptions} onChange={value => updateQuests(normalized.quests.map((quest, index) => index === safeQuestIndex ? { ...quest, tone: value } : quest))} />
              <SelectField label="Icon" value={selectedQuest.icon} options={iconOptions} onChange={value => updateQuests(normalized.quests.map((quest, index) => index === safeQuestIndex ? { ...quest, icon: value } : quest))} />
              <TextAreaField label="Description" value={selectedQuest.description} wide onChange={value => updateQuests(normalized.quests.map((quest, index) => index === safeQuestIndex ? { ...quest, description: value } : quest))} />
              <TextAreaField label="Details" value={selectedQuest.details.join('\n')} wide onChange={value => updateQuests(normalized.quests.map((quest, index) => index === safeQuestIndex ? { ...quest, details: linesFromText(value) } : quest))} />
            </div>
          ) : <div>No quests yet.</div>}
        </div>
      ) : null}

      {activePanel === 'rightPanel' ? (
        <div style={cardStyle}>
          <SelectField label="Right panel tab" value={rightTabId} options={normalized.rightTabs.map(tab => ({
            value: tab.id,
            label: `${tab.title} (${normalized.rightDetails[tab.id]?.length ?? 0} rows)`,
          }))} onChange={(value) => {
            setRightTabId(value);
            setRightRowIndex(0);
          }} />
          {selectedRightTab ? (
            <div style={gridStyle}>
              <TextField label="Tab title" value={selectedRightTab.title} onChange={value => updateContent(current => ({
                ...current,
                rightTabs: current.rightTabs.map(tab => tab.id === rightTabId ? { ...tab, title: value } : tab),
              }))} />
              <TextField label="Accent color" value={selectedRightTab.accent} onChange={value => updateContent(current => ({
                ...current,
                rightTabs: current.rightTabs.map(tab => tab.id === rightTabId ? { ...tab, accent: value } : tab),
              }))} />
            </div>
          ) : null}
          <div style={toolbarStyle}>
            <button type="button" style={buttonStyle} onClick={() => updateContent(current => ({
              ...current,
              rightDetails: {
                ...current.rightDetails,
                [rightTabId]: [...(current.rightDetails[rightTabId] ?? []), { label: 'New row', value: 'Value', detail: 'Describe this account preview row.' }],
              },
            }))}>+ Detail Row</button>
            <button type="button" style={dangerButtonStyle} disabled={!selectedRightRow} onClick={() => updateContent(current => ({
              ...current,
              rightDetails: {
                ...current.rightDetails,
                [rightTabId]: (current.rightDetails[rightTabId] ?? []).filter((_, index) => index !== safeRightRowIndex),
              },
            }))}>Remove Row</button>
          </div>
          {rightRows.length > 0 ? <SelectField label="Selected row" value={String(safeRightRowIndex)} options={rightRows.map((row, index) => namedOption(row.label, index, row.value))} onChange={value => setRightRowIndex(Number(value))} /> : null}
          {selectedRightRow ? (
            <div style={gridStyle}>
              <TextField label="Label" value={selectedRightRow.label} onChange={value => updateContent(current => ({
                ...current,
                rightDetails: {
                  ...current.rightDetails,
                  [rightTabId]: (current.rightDetails[rightTabId] ?? []).map((row, index) => index === safeRightRowIndex ? { ...row, label: value } : row),
                },
              }))} />
              <TextField label="Value" value={selectedRightRow.value} onChange={value => updateContent(current => ({
                ...current,
                rightDetails: {
                  ...current.rightDetails,
                  [rightTabId]: (current.rightDetails[rightTabId] ?? []).map((row, index) => index === safeRightRowIndex ? { ...row, value } : row),
                },
              }))} />
              <TextAreaField label="Detail" value={selectedRightRow.detail} onChange={value => updateContent(current => ({
                ...current,
                rightDetails: {
                  ...current.rightDetails,
                  [rightTabId]: (current.rightDetails[rightTabId] ?? []).map((row, index) => index === safeRightRowIndex ? { ...row, detail: value } : row),
                },
              }))} />
            </div>
          ) : <div>No detail rows yet.</div>}
        </div>
      ) : null}

      {activePanel === 'rawJson' ? (
        <div style={cardStyle}>
          <TextAreaField label="Full shopContent JSON" value={rawJson || JSON.stringify(normalized, null, 2)} wide onChange={setRawJson} />
          <div style={toolbarStyle}>
            <button type="button" style={buttonStyle} onClick={() => setRawJson(JSON.stringify(normalized, null, 2))}>Refresh From Form</button>
            <button type="button" style={buttonStyle} onClick={() => {
              try {
                onContentChange(normalizeShopPageContent(JSON.parse(rawJson || JSON.stringify(normalized))));
                setStatus('Applied JSON');
              } catch (error) {
                setStatus(error instanceof Error ? error.message : 'Invalid JSON');
              }
            }}>Apply JSON</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
