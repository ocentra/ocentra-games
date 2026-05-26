import { useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import {
  PLAYER_HUB_QUICK_ACTION_ORDER,
  PLAYER_HUB_TAB_ORDER,
  normalizePlayerHubPageSvgControls,
  type PlayerHubEmptyStateCopy,
  type PlayerHubPageSvgControls,
  type PlayerHubQuickActionId,
  type PlayerHubTabId,
} from './PlayerHubPageSvgSurfaceControls';

type PlayerHubControlsPanelTab = 'header' | 'sections' | 'actions' | 'emptyStates';

type PlayerHubPageSvgControlsPanelProps = {
  title?: string;
  description?: string;
  controls: PlayerHubPageSvgControls;
  onControlsChange: Dispatch<SetStateAction<PlayerHubPageSvgControls>>;
  onSave?: (controls: PlayerHubPageSvgControls) => Promise<string | void> | string | void;
};

const panelTabs: Array<{ id: PlayerHubControlsPanelTab; label: string }> = [
  { id: 'header', label: 'Header' },
  { id: 'sections', label: 'Sections' },
  { id: 'actions', label: 'Actions' },
  { id: 'emptyStates', label: 'Empty States' },
];

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

const checkboxRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.45rem',
  color: '#d9f7ff',
  fontSize: '0.82rem',
  fontWeight: 800,
};

function asTextareaStyle(rows: number): CSSProperties {
  return {
    ...inputStyle,
    minHeight: `${rows * 1.7}rem`,
    resize: 'vertical',
    lineHeight: 1.4,
  };
}

export function PlayerHubPageSvgControlsPanel({
  title = 'Player Hub Page Controls',
  description = 'Author the private Player Hub shell, tabs, account shortcuts, and real-data empty states.',
  controls,
  onControlsChange,
  onSave,
}: PlayerHubPageSvgControlsPanelProps) {
  const [activeTab, setActiveTab] = useState<PlayerHubControlsPanelTab>('header');
  const [saveMessage, setSaveMessage] = useState<string>('');

  const updateControls = (updater: (controls: PlayerHubPageSvgControls) => PlayerHubPageSvgControls) => {
    onControlsChange(previous => normalizePlayerHubPageSvgControls(updater(previous)));
    setSaveMessage('');
  };

  const updateHeader = <Key extends keyof PlayerHubPageSvgControls['header']>(
    key: Key,
    value: PlayerHubPageSvgControls['header'][Key],
  ) => {
    updateControls(previous => ({
      ...previous,
      header: {
        ...previous.header,
        [key]: value,
      },
    }));
  };

  const updateLabel = <Key extends keyof PlayerHubPageSvgControls['labels']>(
    key: Key,
    value: PlayerHubPageSvgControls['labels'][Key],
  ) => {
    updateControls(previous => ({
      ...previous,
      labels: {
        ...previous.labels,
        [key]: value,
      },
    }));
  };

  const updateTab = (tabId: PlayerHubTabId, key: 'label' | 'enabled', value: string | boolean) => {
    updateControls(previous => ({
      ...previous,
      tabs: previous.tabs.map(tab => (tab.id === tabId ? { ...tab, [key]: value } : tab)),
    }));
  };

  const updateQuickAction = (actionId: PlayerHubQuickActionId, key: 'label' | 'enabled', value: string | boolean) => {
    updateControls(previous => ({
      ...previous,
      quickActions: previous.quickActions.map(action => (action.id === actionId ? { ...action, [key]: value } : action)),
    }));
  };

  const updateEmptyState = (tabId: PlayerHubTabId, key: keyof PlayerHubEmptyStateCopy, value: string) => {
    updateControls(previous => ({
      ...previous,
      emptyStates: {
        ...previous.emptyStates,
        [tabId]: {
          ...previous.emptyStates[tabId],
          [key]: value,
        },
      },
    }));
  };

  const handleSave = async () => {
    if (!onSave) return;
    const result = await onSave(normalizePlayerHubPageSvgControls(controls));
    setSaveMessage(typeof result === 'string' && result.trim().length > 0 ? result : 'Player Hub controls saved.');
  };

  return (
    <div style={shellStyle}>
      <header style={{ ...cardStyle, gap: '0.35rem' }}>
        <h2 style={{ margin: 0, color: '#effcff' }}>{title}</h2>
        <p style={{ margin: 0, color: '#aeefff', lineHeight: 1.45 }}>{description}</p>
      </header>

      <div style={toolbarStyle}>
        {panelTabs.map(tab => (
          <button key={tab.id} type="button" style={tabButtonStyle(activeTab === tab.id)} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
        {onSave && (
          <button type="button" style={{ ...buttonStyle, marginLeft: 'auto' }} onClick={handleSave}>
            Save + Sync
          </button>
        )}
      </div>

      {saveMessage && (
        <div style={{ ...cardStyle, borderColor: 'rgba(74,222,128,.42)', color: '#bbf7d0' }}>
          {saveMessage}
        </div>
      )}

      {activeTab === 'header' && (
        <section style={cardStyle}>
          <div style={gridStyle}>
            <label style={labelStyle}>
              Header title
              <input style={inputStyle} value={controls.header.title} onChange={event => updateHeader('title', event.target.value)} />
            </label>
            <label style={labelStyle}>
              Status label
              <input style={inputStyle} value={controls.header.statusLabel} onChange={event => updateHeader('statusLabel', event.target.value)} />
            </label>
            <label style={labelStyle}>
              Main kicker
              <input style={inputStyle} value={controls.labels.mainKicker} onChange={event => updateLabel('mainKicker', event.target.value)} />
            </label>
            <label style={labelStyle}>
              Account status fallback
              <input style={inputStyle} value={controls.labels.accountStatusLabel} onChange={event => updateLabel('accountStatusLabel', event.target.value)} />
            </label>
          </div>
          <label style={labelStyle}>
            Subtitle
            <textarea style={asTextareaStyle(3)} value={controls.header.subtitle} onChange={event => updateHeader('subtitle', event.target.value)} />
          </label>
          <label style={checkboxRowStyle}>
            <input type="checkbox" checked={controls.header.showSubtitle} onChange={event => updateHeader('showSubtitle', event.target.checked)} />
            Show subtitle in the live page header
          </label>
        </section>
      )}

      {activeTab === 'sections' && (
        <section style={cardStyle}>
          <div style={gridStyle}>
            <label style={labelStyle}>
              Side panel title
              <input style={inputStyle} value={controls.labels.sidePanelTitle} onChange={event => updateLabel('sidePanelTitle', event.target.value)} />
            </label>
            <label style={labelStyle}>
              Stats title
              <input style={inputStyle} value={controls.labels.statsTitle} onChange={event => updateLabel('statsTitle', event.target.value)} />
            </label>
            <label style={labelStyle}>
              Action title
              <input style={inputStyle} value={controls.labels.nextActionTitle} onChange={event => updateLabel('nextActionTitle', event.target.value)} />
            </label>
            <label style={labelStyle}>
              Default tab
              <select style={inputStyle} value={controls.defaultTab} onChange={event => updateControls(previous => ({ ...previous, defaultTab: event.target.value as PlayerHubTabId }))}>
                {controls.tabs.filter(tab => tab.enabled).map(tab => (
                  <option key={tab.id} value={tab.id}>{tab.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div style={gridStyle}>
            {PLAYER_HUB_TAB_ORDER.map(tabId => {
              const tab = controls.tabs.find(item => item.id === tabId);
              if (!tab) return null;
              return (
                <article key={tab.id} style={cardStyle}>
                  <label style={labelStyle}>
                    {tab.id} label
                    <input style={inputStyle} value={tab.label} onChange={event => updateTab(tab.id, 'label', event.target.value)} />
                  </label>
                  <label style={checkboxRowStyle}>
                    <input type="checkbox" checked={tab.enabled} onChange={event => updateTab(tab.id, 'enabled', event.target.checked)} />
                    Enabled
                  </label>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === 'actions' && (
        <section style={cardStyle}>
          <div style={gridStyle}>
            {PLAYER_HUB_QUICK_ACTION_ORDER.map(actionId => {
              const action = controls.quickActions.find(item => item.id === actionId);
              if (!action) return null;
              return (
                <article key={action.id} style={cardStyle}>
                  <label style={labelStyle}>
                    {action.id} label
                    <input style={inputStyle} value={action.label} onChange={event => updateQuickAction(action.id, 'label', event.target.value)} />
                  </label>
                  <label style={checkboxRowStyle}>
                    <input type="checkbox" checked={action.enabled} onChange={event => updateQuickAction(action.id, 'enabled', event.target.checked)} />
                    Enabled
                  </label>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === 'emptyStates' && (
        <section style={cardStyle}>
          <div style={gridStyle}>
            {PLAYER_HUB_TAB_ORDER.map(tabId => {
              const emptyState = controls.emptyStates[tabId];
              return (
                <article key={tabId} style={cardStyle}>
                  <label style={labelStyle}>
                    {tabId} empty title
                    <input style={inputStyle} value={emptyState.title} onChange={event => updateEmptyState(tabId, 'title', event.target.value)} />
                  </label>
                  <label style={labelStyle}>
                    Body
                    <textarea style={asTextareaStyle(4)} value={emptyState.body} onChange={event => updateEmptyState(tabId, 'body', event.target.value)} />
                  </label>
                  <label style={labelStyle}>
                    Action label
                    <input style={inputStyle} value={emptyState.actionLabel ?? ''} onChange={event => updateEmptyState(tabId, 'actionLabel', event.target.value)} />
                  </label>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
