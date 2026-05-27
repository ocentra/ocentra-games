import { useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import {
  DEFAULT_PLAYER_HUB_PAGE_CONTENT,
  normalizePlayerHubPageContent,
  parsePlayerHubPageContent,
  type PlayerHubCard,
  type PlayerHubIcon,
  type PlayerHubPageContentData,
  type PlayerHubRightDetailId,
  type PlayerHubSectionId,
  type PlayerHubTone,
} from './PlayerHubPageSvgContent';
import { PLAYER_HUB_TAB_ORDER } from './PlayerHubPageSvgSurfaceControls';
import { resolveShopPageImageUrl } from '../Shop/ShopPageImageResolver';

type PlayerHubContentPanelTab = 'overview' | 'sections' | 'rightPanel' | 'shellCopy' | 'rawJson';
type SectionCardListKey = 'summaryCards' | 'detailCards';

type PlayerHubPageContentControlsPanelProps = {
  content: PlayerHubPageContentData;
  onContentChange: Dispatch<SetStateAction<PlayerHubPageContentData>>;
  onSave?: (content: PlayerHubPageContentData) => Promise<string | void> | string | void;
};

const rightDetailIds: PlayerHubRightDetailId[] = ['account', 'settings', 'ai', 'balances', 'learning', 'competition', 'recent'];
const toneOptions: PlayerHubTone[] = ['cyan', 'gold', 'violet', 'green', 'orange', 'silver', 'danger'];
const iconOptions: PlayerHubIcon[] = ['coins', 'crown', 'chest', 'cards', 'trophy', 'crate', 'shield', 'link', 'lock', 'cart'];
const panelTabs: Array<{ id: PlayerHubContentPanelTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'sections', label: 'Sections & Cards' },
  { id: 'rightPanel', label: 'Right Panel' },
  { id: 'shellCopy', label: 'Shell Copy' },
  { id: 'rawJson', label: 'Raw JSON' },
];

const defaultTargetBySection: Record<PlayerHubSectionId, PlayerHubRightDetailId> = {
  overview: 'account',
  matches: 'recent',
  learning: 'learning',
  ai: 'ai',
  competition: 'competition',
  inventory: 'balances',
  rewards: 'recent',
  account: 'settings',
};

function newHubCard(sectionId: PlayerHubSectionId): PlayerHubCard {
  return {
    id: `${sectionId}-${Date.now()}`,
    title: `New ${sectionId} card`,
    subtitle: 'Author the exact Player Hub copy for this account surface.',
    tone: 'cyan',
    icon: 'cards',
    imageUrl: '',
    targetDetail: defaultTargetBySection[sectionId],
    badge: 'New',
    cta: 'Details',
    bullets: ['Add the first player-facing detail.'],
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

function imageFileName(imageUrl: string): string {
  const value = imageUrl.split(/[?#]/, 1)[0] ?? imageUrl;
  try {
    return decodeURIComponent(value.split('/').pop() ?? value);
  } catch {
    return value.split('/').pop() ?? value;
  }
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

const dangerButtonStyle: CSSProperties = {
  ...buttonStyle,
  borderColor: 'rgba(248,113,113,.44)',
  color: '#fecaca',
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

function TextField({ label, value, onChange, wide = false }: { label: string; value: string; onChange: (value: string) => void; wide?: boolean }) {
  return (
    <label style={wide ? { ...labelStyle, gridColumn: '1 / -1' } : labelStyle}>
      {label}
      <input style={inputStyle} value={value} onChange={event => onChange(event.target.value)} />
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

function SelectField<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: T[]; onChange: (value: T) => void }) {
  return (
    <label style={labelStyle}>
      {label}
      <select style={inputStyle} value={value} onChange={event => onChange(event.target.value as T)}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
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

function HubCardEditor({ card, onChange }: { card: PlayerHubCard; onChange: (card: PlayerHubCard) => void }) {
  return (
    <div style={gridStyle}>
      <TextField label="Title" value={card.title} onChange={value => onChange({ ...card, title: value })} />
      <TextField label="Subtitle" value={card.subtitle} onChange={value => onChange({ ...card, subtitle: value })} />
      <TextField label="Badge" value={card.badge ?? ''} onChange={value => onChange({ ...card, badge: value })} />
      <TextField label="CTA / small value" value={card.cta ?? ''} onChange={value => onChange({ ...card, cta: value })} />
      <TextField label={`Image URL${card.imageUrl ? ` (${imageFileName(card.imageUrl)})` : ''}`} value={card.imageUrl} wide onChange={value => onChange({ ...card, imageUrl: value })} />
      <SelectField label="Target detail" value={card.targetDetail} options={rightDetailIds} onChange={value => onChange({ ...card, targetDetail: value })} />
      <SelectField label="Tone" value={card.tone} options={toneOptions} onChange={value => onChange({ ...card, tone: value })} />
      <SelectField label="Icon" value={card.icon} options={iconOptions} onChange={value => onChange({ ...card, icon: value })} />
      <TextAreaField label="Bullets" value={(card.bullets ?? []).join('\n')} wide onChange={value => onChange({ ...card, bullets: linesFromText(value) })} />
    </div>
  );
}

export function PlayerHubPageContentControlsPanel({
  content,
  onContentChange,
  onSave,
}: PlayerHubPageContentControlsPanelProps) {
  const normalized = useMemo(() => normalizePlayerHubPageContent(content), [content]);
  const [activePanel, setActivePanel] = useState<PlayerHubContentPanelTab>('overview');
  const [sectionId, setSectionId] = useState<PlayerHubSectionId>('overview');
  const [cardListKey, setCardListKey] = useState<SectionCardListKey>('summaryCards');
  const [cardIndex, setCardIndex] = useState(0);
  const [rightDetailId, setRightDetailId] = useState<PlayerHubRightDetailId>('account');
  const [rightRowIndex, setRightRowIndex] = useState(0);
  const [rawJson, setRawJson] = useState('');
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const updateContent = (producer: (current: PlayerHubPageContentData) => PlayerHubPageContentData) => {
    onContentChange(previous => normalizePlayerHubPageContent(producer(normalizePlayerHubPageContent(previous))));
    setStatus('Unsaved Player Hub content changes');
  };

  const currentSection = normalized.sections[sectionId];
  const currentCards = currentSection[cardListKey];
  const safeCardIndex = clampIndex(cardIndex, currentCards.length);
  const selectedCard = currentCards[safeCardIndex];
  const rightRows = normalized.rightDetails[rightDetailId];
  const safeRightRowIndex = clampIndex(rightRowIndex, rightRows.length);
  const selectedRightRow = rightRows[safeRightRowIndex];
  const selectedRightTab = normalized.rightTabs.find(tab => tab.id === rightDetailId);

  const updateSectionCards = (cards: PlayerHubCard[]) => {
    updateContent(current => ({
      ...current,
      sections: {
        ...current.sections,
        [sectionId]: {
          ...current.sections[sectionId],
          [cardListKey]: cards,
        },
      },
    }));
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      const result = await onSave(normalizePlayerHubPageContent(normalized));
      setStatus(typeof result === 'string' && result.trim().length > 0 ? result : 'Player Hub content saved.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section style={shellStyle}>
      <header style={{ ...cardStyle, gap: '0.35rem' }}>
        <h2 style={{ margin: 0, color: '#effcff' }}>Player Hub Content</h2>
        <p style={{ margin: 0, color: '#aeefff', lineHeight: 1.45 }}>
          Author Player Hub sections, cards, right-panel details, empty copy, and imagery. This writes playerHubContent, not shopContent.
        </p>
      </header>

      <div style={toolbarStyle}>
        {panelTabs.map(tab => (
          <button key={tab.id} type="button" style={tabButtonStyle(activePanel === tab.id)} onClick={() => setActivePanel(tab.id)}>
            {tab.label}
          </button>
        ))}
        {onSave && (
          <button type="button" style={{ ...buttonStyle, marginLeft: 'auto' }} disabled={isSaving} onClick={() => void handleSave()}>
            {isSaving ? 'Saving...' : 'Save + Sync'}
          </button>
        )}
      </div>

      {status ? <div style={cardStyle}>{status}</div> : null}

      {activePanel === 'overview' ? (
        <div style={gridStyle}>
          {PLAYER_HUB_TAB_ORDER.map(id => {
            const section = normalized.sections[id];
            return (
              <button
                key={id}
                type="button"
                style={{ ...cardStyle, color: '#e0fbff', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => {
                  setSectionId(id);
                  setActivePanel('sections');
                  setCardIndex(0);
                }}
              >
                <strong style={{ color: '#54e2ff' }}>{section.title}</strong>
                <span>{section.summaryCards.length + section.detailCards.length} cards</span>
                <span style={{ color: '#bcecff', fontSize: '0.8rem' }}>{section.subtitle}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {activePanel === 'sections' ? (
        <div style={cardStyle}>
          <div style={gridStyle}>
            <SelectField label="Player Hub section" value={sectionId} options={PLAYER_HUB_TAB_ORDER} onChange={value => {
              setSectionId(value);
              setCardIndex(0);
            }} />
            <SelectField label="Card surface" value={cardListKey} options={['summaryCards', 'detailCards']} onChange={value => {
              setCardListKey(value);
              setCardIndex(0);
            }} />
            <TextField label="Section title" value={currentSection.title} onChange={value => updateContent(current => ({
              ...current,
              sections: {
                ...current.sections,
                [sectionId]: { ...current.sections[sectionId], title: value },
              },
            }))} />
            <TextField label="Footer title" value={currentSection.footerTitle} onChange={value => updateContent(current => ({
              ...current,
              sections: {
                ...current.sections,
                [sectionId]: { ...current.sections[sectionId], footerTitle: value },
              },
            }))} />
            <TextAreaField label="Section subtitle" value={currentSection.subtitle} wide onChange={value => updateContent(current => ({
              ...current,
              sections: {
                ...current.sections,
                [sectionId]: { ...current.sections[sectionId], subtitle: value },
              },
            }))} />
            <TextAreaField label="Footer items" value={currentSection.footerItems.join('\n')} wide onChange={value => updateContent(current => ({
              ...current,
              sections: {
                ...current.sections,
                [sectionId]: { ...current.sections[sectionId], footerItems: linesFromText(value) },
              },
            }))} />
          </div>
          <div style={toolbarStyle}>
            <button type="button" style={buttonStyle} onClick={() => {
              const next = [...currentCards, newHubCard(sectionId)];
              updateSectionCards(next);
              setCardIndex(next.length - 1);
            }}>+ Card</button>
            <button type="button" style={buttonStyle} disabled={!selectedCard} onClick={() => {
              if (!selectedCard) return;
              const next = [...currentCards, { ...selectedCard, id: `${selectedCard.id}-copy`, title: `${selectedCard.title} Copy` }];
              updateSectionCards(next);
              setCardIndex(next.length - 1);
            }}>Duplicate</button>
            <button type="button" style={buttonStyle} disabled={!selectedCard} onClick={() => {
              updateSectionCards(reorder(currentCards, safeCardIndex, -1));
              setCardIndex(clampIndex(safeCardIndex - 1, currentCards.length));
            }}>Up</button>
            <button type="button" style={buttonStyle} disabled={!selectedCard} onClick={() => {
              updateSectionCards(reorder(currentCards, safeCardIndex, 1));
              setCardIndex(clampIndex(safeCardIndex + 1, currentCards.length));
            }}>Down</button>
            <button type="button" style={dangerButtonStyle} disabled={!selectedCard} onClick={() => {
              const next = currentCards.filter((_, index) => index !== safeCardIndex);
              updateSectionCards(next);
              setCardIndex(clampIndex(safeCardIndex - 1, next.length));
            }}>Remove</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(16rem, 0.45fr) minmax(0, 1fr)', gap: '0.75rem', alignItems: 'start' }}>
            <div style={cardStyle}>
              {currentCards.map((card, index) => (
                <button
                  key={`${card.id}:${index}`}
                  type="button"
                  style={{
                    ...buttonStyle,
                    display: 'grid',
                    gridTemplateColumns: '3rem minmax(0, 1fr)',
                    gap: '0.65rem',
                    textAlign: 'left',
                    background: index === safeCardIndex ? 'rgba(84,226,255,.2)' : 'rgba(7,28,44,.84)',
                  }}
                  onClick={() => setCardIndex(index)}
                >
                  <AuthoringThumb imageUrl={card.imageUrl} label={card.title} />
                  <span style={{ display: 'grid', minWidth: 0 }}>
                    <strong>{card.title}</strong>
                    <span style={{ color: '#bcecff', fontSize: '0.76rem' }}>{card.targetDetail} | {card.cta || 'No CTA'}</span>
                  </span>
                </button>
              ))}
              {currentCards.length === 0 ? <span>No cards on this surface.</span> : null}
            </div>
            <div style={cardStyle}>
              {selectedCard ? (
                <HubCardEditor
                  card={selectedCard}
                  onChange={card => updateSectionCards(currentCards.map((candidate, index) => index === safeCardIndex ? card : candidate))}
                />
              ) : (
                <span>Select or add a card.</span>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activePanel === 'rightPanel' ? (
        <div style={cardStyle}>
          <SelectField label="Right detail" value={rightDetailId} options={rightDetailIds} onChange={value => {
            setRightDetailId(value);
            setRightRowIndex(0);
          }} />
          {selectedRightTab ? (
            <div style={gridStyle}>
              <TextField label="Tab title" value={selectedRightTab.title} onChange={value => updateContent(current => ({
                ...current,
                rightTabs: current.rightTabs.map(tab => tab.id === rightDetailId ? { ...tab, title: value } : tab),
              }))} />
              <TextField label="Accent color" value={selectedRightTab.accent} onChange={value => updateContent(current => ({
                ...current,
                rightTabs: current.rightTabs.map(tab => tab.id === rightDetailId ? { ...tab, accent: value } : tab),
              }))} />
            </div>
          ) : null}
          <div style={toolbarStyle}>
            <button type="button" style={buttonStyle} onClick={() => updateContent(current => ({
              ...current,
              rightDetails: {
                ...current.rightDetails,
                [rightDetailId]: [...current.rightDetails[rightDetailId], { label: 'New row', value: DEFAULT_PLAYER_HUB_PAGE_CONTENT.uiCopy.status.unknownValue, detail: 'Describe this Player Hub detail row.' }],
              },
            }))}>+ Detail Row</button>
            <button type="button" style={dangerButtonStyle} disabled={!selectedRightRow} onClick={() => updateContent(current => ({
              ...current,
              rightDetails: {
                ...current.rightDetails,
                [rightDetailId]: current.rightDetails[rightDetailId].filter((_, index) => index !== safeRightRowIndex),
              },
            }))}>Remove Row</button>
          </div>
          {rightRows.length > 0 ? (
            <SelectField label="Selected row" value={String(safeRightRowIndex)} options={rightRows.map((_, index) => String(index))} onChange={value => setRightRowIndex(Number(value))} />
          ) : null}
          {selectedRightRow ? (
            <div style={gridStyle}>
              <TextField label="Label" value={selectedRightRow.label} onChange={value => updateContent(current => ({
                ...current,
                rightDetails: {
                  ...current.rightDetails,
                  [rightDetailId]: current.rightDetails[rightDetailId].map((row, index) => index === safeRightRowIndex ? { ...row, label: value } : row),
                },
              }))} />
              <TextField label="Default value" value={selectedRightRow.value} onChange={value => updateContent(current => ({
                ...current,
                rightDetails: {
                  ...current.rightDetails,
                  [rightDetailId]: current.rightDetails[rightDetailId].map((row, index) => index === safeRightRowIndex ? { ...row, value } : row),
                },
              }))} />
              <TextAreaField label="Detail" value={selectedRightRow.detail} onChange={value => updateContent(current => ({
                ...current,
                rightDetails: {
                  ...current.rightDetails,
                  [rightDetailId]: current.rightDetails[rightDetailId].map((row, index) => index === safeRightRowIndex ? { ...row, detail: value } : row),
                },
              }))} />
            </div>
          ) : <span>No detail rows yet.</span>}
        </div>
      ) : null}

      {activePanel === 'shellCopy' ? (
        <div style={cardStyle}>
          <div style={gridStyle}>
            <TextField label="Header title" value={normalized.uiCopy.header.title} onChange={value => updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, header: { ...current.uiCopy.header, title: value } } }))} />
            <TextField label="Loading text" value={normalized.uiCopy.status.loadingHub} onChange={value => updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, status: { ...current.uiCopy.status, loadingHub: value } } }))} />
            <TextField label="Retry label" value={normalized.uiCopy.status.retry} onChange={value => updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, status: { ...current.uiCopy.status, retry: value } } }))} />
            <TextField label="Unknown value" value={normalized.uiCopy.status.unknownValue} onChange={value => updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, status: { ...current.uiCopy.status, unknownValue: value } } }))} />
            <TextAreaField label="Header subtitle" value={normalized.uiCopy.header.subtitle} wide onChange={value => updateContent(current => ({ ...current, uiCopy: { ...current.uiCopy, header: { ...current.uiCopy.header, subtitle: value } } }))} />
          </div>
        </div>
      ) : null}

      {activePanel === 'rawJson' ? (
        <div style={cardStyle}>
          <TextAreaField label="Full playerHubContent JSON" value={rawJson || JSON.stringify(normalized, null, 2)} wide onChange={setRawJson} />
          <div style={toolbarStyle}>
            <button type="button" style={buttonStyle} onClick={() => setRawJson(JSON.stringify(normalized, null, 2))}>Refresh From Form</button>
            <button type="button" style={buttonStyle} onClick={() => {
              try {
                onContentChange(parsePlayerHubPageContent(JSON.parse(rawJson || JSON.stringify(normalized))));
                setStatus('Applied Player Hub JSON');
              } catch (error) {
                setStatus(error instanceof Error ? error.message : 'Invalid Player Hub JSON');
              }
            }}>Apply JSON</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
