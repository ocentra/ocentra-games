import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  createUnifiedHeaderConfig,
  type UnifiedHeaderConfig,
  type UnifiedHeaderConfigInput,
  type UnifiedHeaderLayoutConfig,
  type UnifiedHeaderStyleConfig,
  type UnifiedHeaderCenterConfig,
  type UnifiedHeaderLeftConfig,
  type UnifiedHeaderRightConfig,
  type CenterModeAConfig,
  type CenterModeBConfig,
  type HeaderBoxRect,
  type HeaderIconRenderArgs,
  type HeaderIconRenderer,
  type CenterMode,
  type TextStyleConfig
} from './UnifiedHeader.config';
import { ProfilePictureModal } from './ProfilePictureModal';

import './header-tokens.css';
import styles from './UnifiedHeader.module.css';

// Auto-import all bundled profiles
const BUNDLED_PROFILES = import.meta.glob('./profiles/*.json', { eager: true });
const bundledProfileNames = Object.keys(BUNDLED_PROFILES).map(path => 
  path.split('/').pop()?.replace('.json', '') || ''
).filter(Boolean);

const ENABLE_HEADER_DEBUG_CONTROLS = true;

export interface UnifiedHeaderProps {
  config?: UnifiedHeaderConfigInput;
  profileName?: string;
  leftContent?: React.ReactNode;
  rightSuffixContent?: React.ReactNode;
}

export function UnifiedHeader({ 
  config: inputConfig, 
  profileName,
  leftContent,
  rightSuffixContent
}: UnifiedHeaderProps) {
  const resolved = createUnifiedHeaderConfig(inputConfig);
  const [initialConfig] = useState<UnifiedHeaderConfig>(resolved);
  const [config, setConfig] = useState<UnifiedHeaderConfig>(resolved);
  const [showControls, setShowControls] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showPictureModal, setShowPictureModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'layout' | 'wings' | 'style' | 'sections' | 'profiles' | 'metadata'>('layout');
  const [activeProfile, setActiveProfile] = useState(profileName || 'main_screen');
  const [profiles, setProfiles] = useState<string[]>(Array.from(new Set(['main_screen', 'game_page', 'asset_editor', ...bundledProfileNames])));

  const { layout, style, left, center, right } = config;
  const initialViewWidth = 1000;
  const svgHeight = 80;
  const [renderedSize, setRenderedSize] = useState({ width: initialViewWidth, height: svgHeight });
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Load profiles and active config on mount
  useEffect(() => {
    const init = async () => {
      try {
        let detectedProfile = profileName;

        // Auto-detect profile based on route patterns if no explicit profileName
        if (!detectedProfile && typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          for (const [path, content] of Object.entries(BUNDLED_PROFILES)) {
            const profileContent = (content as { default?: UnifiedHeaderConfigInput } & UnifiedHeaderConfigInput);
            const config = profileContent.default || profileContent;
            const patterns = config.metadata?.matchPatterns || [];
            const name = path.split('/').pop()?.replace('.json', '');
            
            if (name && patterns.some((p: string) => {
              // Simple glob to regex
              const regex = new RegExp('^' + p.replace(/\//g, '\\/').replace(/\*/g, '.*') + '$');
              return regex.test(currentPath);
            })) {
              detectedProfile = name;
              break;
            }
          }
        }

        const active = detectedProfile || 'main_screen';
        setActiveProfile(active);

        // Desktop / Tauri Path
        if (typeof window !== 'undefined' && (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
          const { invoke } = await import('@tauri-apps/api/core');
          const availableProfiles = await invoke<string[]>('list_configs');
          if (availableProfiles.length > 0) {
            setProfiles(availableProfiles);
            if (availableProfiles.includes(active)) {
              const savedJson = await invoke<string>('load_config', { name: active });
              const saved = JSON.parse(savedJson);
              if (saved.config) setConfig(saved.config);
            }
          }
        } 
        // Web / Vite Middleware Path
        else if (typeof window !== 'undefined') {
          const { LocalApiEndpoint } = await import('@ocentra/endpoint-domain/constants/local');
          const response = await fetch(LocalApiEndpoint.HeaderConfig);
          if (response.ok) {
            const availableProfiles = await response.json();
            if (Array.isArray(availableProfiles) && availableProfiles.length > 0) {
              setProfiles(availableProfiles);
              if (availableProfiles.includes(activeProfile)) {
                const res = await fetch(`${LocalApiEndpoint.HeaderConfig}?name=${activeProfile}`);
                if (res.ok) {
                  const saved = await res.json();
                  if (saved.config) setConfig(saved.config);
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to load header profiles:', e);
      }
    };
    init();
  }, [profileName, activeProfile]);

  // Handle profile switching
  useEffect(() => {
    const loadProfile = async () => {
      // 1. Check bundled profiles first
      const bundledPath = `./profiles/${activeProfile}.json`;
      const bundled = BUNDLED_PROFILES[bundledPath] as { default?: { config: UnifiedHeaderConfig }; config?: UnifiedHeaderConfig };
      const configData = bundled?.default || bundled;
      if (configData && configData.config) {
        setConfig(configData.config);
        return;
      }

      // 2. Fallback to dynamic loading
      try {
        if (typeof window !== 'undefined' && (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
          const { invoke } = await import('@tauri-apps/api/core');
          const savedJson = await invoke<string>('load_config', { name: activeProfile });
          const saved = JSON.parse(savedJson);
          if (saved.config) setConfig(saved.config);
        } else if (typeof window !== 'undefined') {
          const { LocalApiEndpoint } = await import('@ocentra/endpoint-domain/constants/local');
          const res = await fetch(`${LocalApiEndpoint.HeaderConfig}?name=${activeProfile}`);
          if (res.ok) {
            const saved = await res.json();
            if (saved.config) setConfig(saved.config);
          }
        }
      } catch {
        console.warn(`Profile ${activeProfile} not found on disk or bundle, using initial.`);
      }
    };
    loadProfile();
  }, [activeProfile]);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element || typeof window === 'undefined') return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setRenderedSize({ width: rect.width || initialViewWidth, height: rect.height || svgHeight });
    };

    update();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const updateLayout = (patch: Partial<UnifiedHeaderLayoutConfig>) =>
    setConfig((current) => ({ ...current, layout: { ...current.layout, ...patch } }));

  const updateStyle = (patch: Partial<UnifiedHeaderStyleConfig>) =>
    setConfig((current) => ({ ...current, style: { ...current.style, ...patch } }));

  const updateLeft = (patch: Partial<UnifiedHeaderLeftConfig>) =>
    setConfig((current) => ({ ...current, left: { ...current.left, ...patch } }));

  const updateRight = (patch: Partial<UnifiedHeaderRightConfig>) =>
    setConfig((current) => ({ ...current, right: { ...current.right, ...patch } }));

  const updateCenter = (patch: Partial<UnifiedHeaderCenterConfig>) =>
    setConfig((current) => ({ ...current, center: { ...current.center, ...patch } }));

  const updateCenterA = (patch: Partial<CenterModeAConfig>) =>
    setConfig((current) => ({
      ...current,
      center: {
        ...current.center,
        modeA: { ...current.center.modeA, ...patch },
      },
    }));

  const updateCenterB = (patch: Partial<CenterModeBConfig>) =>
    setConfig((current) => ({
      ...current,
      center: {
        ...current.center,
        modeB: { ...current.center.modeB, ...patch },
      },
    }));

  const renderDebugPanel = () => (
    <div className={styles.debugPanel}>
      <div className={styles.debugPanelHeader}>Live Header Tuning</div>

      <div className={styles.debugTabs}>
        {(['layout', 'wings', 'style', 'sections', 'profiles', 'metadata'] as const).map(tab => (
          <button
            key={tab}
            className={`${styles.debugTabButton} ${activeTab === tab ? styles.active : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
        <button
          className={styles.debugTabButton}
          style={{ marginLeft: 'auto', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5' }}
          onClick={() => setConfig(initialConfig)}
        >
          Reset All
        </button>
        <button
          className={styles.debugTabButton}
          style={{ backgroundColor: 'rgba(52, 211, 153, 0.2)', color: '#a7f3d0' }}
          onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(config, null, 2));
            alert("Config copied to clipboard!");
          }}
        >
          Copy
        </button>
      </div>

      <div className={styles.debugScrollArea}>
        {activeTab === 'layout' && (
          <>
            <div className={styles.debugSectionHeader}>
              <span>Dimensions & Margins</span>
              <button onClick={() => updateLayout(initialConfig.layout)} className={styles.debugTabReset}>Reset Tab</button>
            </div>
            <Control label="Header height" value={config.layout.heightPx} min={36} max={120} step={1} onChange={(v) => updateLayout({ heightPx: v })} onReset={() => updateLayout({ heightPx: initialConfig.layout.heightPx })} />
            <ToggleControl label="Limit width" value={Boolean(config.layout.maxWidthPx)} onChange={(v) => updateLayout({ maxWidthPx: v ? 1920 : undefined })} onReset={() => updateLayout({ maxWidthPx: initialConfig.layout.maxWidthPx })} />
            <Control label="Max width" value={config.layout.maxWidthPx || 1920} min={640} max={5120} step={10} onChange={(v) => updateLayout({ maxWidthPx: v })} onReset={() => updateLayout({ maxWidthPx: initialConfig.layout.maxWidthPx })} />
            <Control label="Outer margin" value={config.layout.outerMargin} min={0} max={60} step={1} onChange={(v) => updateLayout({ outerMargin: v })} onReset={() => updateLayout({ outerMargin: initialConfig.layout.outerMargin })} />
            <Control label="Box gap" value={config.layout.boxGap} min={0} max={40} step={1} onChange={(v) => updateLayout({ boxGap: v })} onReset={() => updateLayout({ boxGap: initialConfig.layout.boxGap })} />
            <Control label="Left width" value={config.layout.leftExpandedWidth} min={72} max={220} step={1} onChange={(v) => updateLayout({ leftExpandedWidth: v })} onReset={() => updateLayout({ leftExpandedWidth: initialConfig.layout.leftExpandedWidth })} />
            <Control label="Left icon width" value={config.layout.leftCollapsedWidth} min={44} max={120} step={1} onChange={(v) => updateLayout({ leftCollapsedWidth: v })} onReset={() => updateLayout({ leftCollapsedWidth: initialConfig.layout.leftCollapsedWidth })} />
            <Control label="Center width" value={config.layout.centerWidth} min={96} max={320} step={1} onChange={(v) => updateLayout({ centerWidth: v })} onReset={() => updateLayout({ centerWidth: initialConfig.layout.centerWidth })} />
            <Control label="Right width" value={config.layout.rightWidth} min={72} max={240} step={1} onChange={(v) => updateLayout({ rightWidth: v })} onReset={() => updateLayout({ rightWidth: initialConfig.layout.rightWidth })} />
            <Control label="Right icon width" value={config.layout.rightCollapsedWidth} min={44} max={140} step={1} onChange={(v) => updateLayout({ rightCollapsedWidth: v })} onReset={() => updateLayout({ rightCollapsedWidth: initialConfig.layout.rightCollapsedWidth })} />
          </>
        )}

        {activeTab === 'wings' && (
          <>
            <div className={styles.debugSectionHeader}>
              <span>Bars (Wings)</span>
              <button onClick={() => updateLayout({
                wingCurve: initialConfig.layout.wingCurve,
                wingUnderlap: initialConfig.layout.wingUnderlap,
                wingHeight: initialConfig.layout.wingHeight,
                boxHeight: initialConfig.layout.boxHeight,
              })} className={styles.debugTabReset}>Reset Tab</button>
            </div>
            <Control label="Curve" value={config.layout.wingCurve} min={0} max={60} step={1} onChange={(v) => updateLayout({ wingCurve: v })} onReset={() => updateLayout({ wingCurve: initialConfig.layout.wingCurve })} />
            <Control label="Underlap" value={config.layout.wingUnderlap} min={0} max={60} step={1} onChange={(v) => updateLayout({ wingUnderlap: v })} onReset={() => updateLayout({ wingUnderlap: initialConfig.layout.wingUnderlap })} />
            <Control label="Bar thickness" value={config.layout.wingHeight} min={0} max={80} step={1} onChange={(v) => updateLayout({ wingHeight: v })} onReset={() => updateLayout({ wingHeight: initialConfig.layout.wingHeight })} />
            <Control label="Wing opacity" value={config.style.wingOpacity} min={0} max={0.8} step={0.01} onChange={(v) => updateStyle({ wingOpacity: v })} onReset={() => updateStyle({ wingOpacity: initialConfig.style.wingOpacity })} />

            <div className={styles.debugDivider}>Boxes (Pills)</div>
            <Control label="Pill height" value={config.layout.boxHeight} min={36} max={76} step={1} onChange={(v) => updateLayout({ boxHeight: v })} onReset={() => updateLayout({ boxHeight: initialConfig.layout.boxHeight })} />
            <Control label="Pill Glow" value={config.style.pillGlowBlur} min={0} max={20} step={0.1} onChange={(v) => updateStyle({ pillGlowBlur: v })} onReset={() => updateStyle({ pillGlowBlur: initialConfig.style.pillGlowBlur })} />
          </>
        )}

        {activeTab === 'style' && (
          <>
            <div className={styles.debugSectionHeader}>
              <span>Visual Theme</span>
              <button onClick={() => updateStyle(initialConfig.style)} className={styles.debugTabReset}>Reset Tab</button>
            </div>
            <div className={styles.debugDivider}>Global Colors</div>
            <ColorControl label="Tint color" value={config.style.tintColor} onChange={(v) => updateStyle({ tintColor: v })} onReset={() => updateStyle({ tintColor: initialConfig.style.tintColor })} />
            <ColorControl label="Edge color" value={config.style.edgeColor} onChange={(v) => updateStyle({ edgeColor: v })} onReset={() => updateStyle({ edgeColor: initialConfig.style.edgeColor })} />
            <ColorControl label="Circle Fill" value={config.style.circleFillColor} onChange={(v) => updateStyle({ circleFillColor: v })} onReset={() => updateStyle({ circleFillColor: initialConfig.style.circleFillColor })} />

            <div className={styles.debugDivider}>Opacities</div>
            <Control label="Box opacity" value={config.style.boxOpacity} min={0} max={1} step={0.01} onChange={(v) => updateStyle({ boxOpacity: v })} onReset={() => updateStyle({ boxOpacity: initialConfig.style.boxOpacity })} />
            <Control label="Blur" value={config.style.backdropBlur} min={0} max={40} step={1} onChange={(v) => updateStyle({ backdropBlur: v })} onReset={() => updateStyle({ backdropBlur: initialConfig.style.backdropBlur })} />

            <div className={styles.debugDivider}>Glows</div>
            <Control label="Pill Glow" value={config.style.pillGlowBlur} min={0} max={10} step={0.1} onChange={(v) => updateStyle({ pillGlowBlur: v })} onReset={() => updateStyle({ pillGlowBlur: initialConfig.style.pillGlowBlur })} />
            <Control label="Text Glow" value={config.style.textGlowBlur} min={0} max={10} step={0.1} onChange={(v) => updateStyle({ textGlowBlur: v })} onReset={() => updateStyle({ textGlowBlur: initialConfig.style.textGlowBlur })} />
            <Control label="Icon Glow" value={config.style.iconGlowBlur} min={0} max={10} step={0.1} onChange={(v) => updateStyle({ iconGlowBlur: v })} onReset={() => updateStyle({ iconGlowBlur: initialConfig.style.iconGlowBlur })} />

            <div className={styles.debugDivider}>Hover State</div>
            <ColorControl label="Hover Tint" value={config.style.hoverTintColor} onChange={(v) => updateStyle({ hoverTintColor: v })} onReset={() => updateStyle({ hoverTintColor: initialConfig.style.hoverTintColor })} />
            <ColorControl label="Hover Edge" value={config.style.hoverEdgeColor} onChange={(v) => updateStyle({ hoverEdgeColor: v })} onReset={() => updateStyle({ hoverEdgeColor: initialConfig.style.hoverEdgeColor })} />
            <Control label="Hover boost" value={config.style.hoverBoxOpacityBoost} min={0} max={0.4} step={0.01} onChange={(v) => updateStyle({ hoverBoxOpacityBoost: v })} onReset={() => updateStyle({ hoverBoxOpacityBoost: initialConfig.style.hoverBoxOpacityBoost })} />
            <div className={styles.debugSectionHeader}>Dropdown Aesthetics</div>
            <ColorControl label="Dropdown tint" value={config.style.dropdownTint} onChange={(v) => updateStyle({ dropdownTint: v })} onReset={() => updateStyle({ dropdownTint: initialConfig.style.dropdownTint })} />
            <TextInput label="Dropdown border" value={config.style.dropdownBorderColor} onChange={(v) => updateStyle({ dropdownBorderColor: v })} onReset={() => updateStyle({ dropdownBorderColor: initialConfig.style.dropdownBorderColor })} />
            <Control label="Section opacity" value={config.style.dropdownSectionOpacity} min={0} max={0.3} step={0.01} onChange={(v) => updateStyle({ dropdownSectionOpacity: v })} onReset={() => updateStyle({ dropdownSectionOpacity: initialConfig.style.dropdownSectionOpacity })} />
          </>
        )}

        {activeTab === 'sections' && (
          <>
            <div className={styles.debugSectionHeader}>
              <span>Pill Content & Text</span>
              <button onClick={() => {
                updateLeft(initialConfig.left);
                updateCenter(initialConfig.center);
                updateRight(initialConfig.right);
              }} className={styles.debugTabReset}>Reset Tab</button>
            </div>
            <div className={styles.debugDivider}>Left Section (Home)</div>
            <TextInput label="Label" value={config.left.text} onChange={(v) => updateLeft({ text: v })} onReset={() => updateLeft({ text: initialConfig.left.text })} />
            <Control label="Icon size" value={config.left.iconSize} min={8} max={44} step={1} onChange={(v) => updateLeft({ iconSize: v })} onReset={() => updateLeft({ iconSize: initialConfig.left.iconSize })} />
            <Control label="Icon X" value={config.left.iconOffsetX} min={-30} max={30} step={1} onChange={(v) => updateLeft({ iconOffsetX: v })} onReset={() => updateLeft({ iconOffsetX: initialConfig.left.iconOffsetX })} />
            <Control label="Icon Y" value={config.left.iconOffsetY} min={-20} max={20} step={1} onChange={(v) => updateLeft({ iconOffsetY: v })} onReset={() => updateLeft({ iconOffsetY: initialConfig.left.iconOffsetY })} />
            <ToggleControl label="Button" value={config.left.isButton ?? false} onChange={(v) => updateLeft({ isButton: v })} onReset={() => updateLeft({ isButton: initialConfig.left.isButton })} />
            <Control label="Collapse width" value={config.layout.leftCollapseWidth} min={320} max={1200} step={10} onChange={(v) => updateLayout({ leftCollapseWidth: v })} onReset={() => updateLayout({ leftCollapseWidth: initialConfig.layout.leftCollapsedWidth })} />

            <div className={styles.debugDivider}>Center Section</div>
            {config.center.mode === 'A' && (
              <>
                <TextInput label="Left Label" value={config.center.modeA.leftText} onChange={(v) => updateCenterA({ leftText: v })} onReset={() => updateCenterA({ leftText: initialConfig.center.modeA.leftText })} />
                <TextInput label="Right Label" value={config.center.modeA.rightText} onChange={(v) => updateCenterA({ rightText: v })} onReset={() => updateCenterA({ rightText: initialConfig.center.modeA.rightText })} />
              </>
            )}
            {config.center.mode === 'B' && (
              <TextInput label="Label" value={config.center.modeB.text} onChange={(v) => updateCenterB({ text: v })} onReset={() => updateCenterB({ text: initialConfig.center.modeB.text })} />
            )}
            <label className={styles.debugSelectLabel}>
              <span>Mode</span>
              <select value={config.center.mode} onChange={(e) => updateCenter({ mode: e.target.value as CenterMode })}>
                <option value="A">Branding (A)</option>
                <option value="B">Suits (B)</option>
              </select>
            </label>
            <Control label="Min width" value={config.layout.centerMinWidth} min={60} max={220} step={1} onChange={(v) => updateLayout({ centerMinWidth: v })} onReset={() => updateLayout({ centerMinWidth: initialConfig.layout.centerMinWidth })} />
            <Control label="Shared gap" value={config.center.contentGap} min={0} max={24} step={1} onChange={(v) => updateCenter({ contentGap: v })} onReset={() => updateCenter({ contentGap: initialConfig.center.contentGap })} />

            <div className={styles.debugDivider}>Right Section (User/Login)</div>
            <TextInput label="Label" value={config.right.text} onChange={(v) => updateRight({ text: v })} onReset={() => updateRight({ text: initialConfig.right.text })} />
            <ToggleControl label="Button" value={config.right.isButton ?? false} onChange={(v) => updateRight({ isButton: v })} onReset={() => updateRight({ isButton: initialConfig.right.isButton })} />
            <div className={styles.debugRow} style={{ padding: '8px 12px' }}>
              <label style={{ fontSize: '12px', color: '#94a3b8', marginRight: '8px' }}>Mode:</label>
              <button
                className={`${styles.debugMiniButton} ${!config.right.isProfile ? styles.active : ''}`}
                onClick={() => updateRight({ isProfile: false })}
                style={{ padding: '2px 8px', fontSize: '11px' }}
              >Text Only</button>
              <button
                className={`${styles.debugMiniButton} ${config.right.isProfile ? styles.active : ''}`}
                onClick={() => updateRight({ isProfile: true, user: config.right.user || { name: 'Player One', isLoggedIn: true } })}
                style={{ padding: '2px 8px', fontSize: '11px' }}
              >User Profile</button>
            </div>
            {config.right.isProfile && (
              <>
                <TextInput label="User Name" value={config.right.user?.name || ''} onChange={(v) => updateRight({ user: { ...config.right.user!, name: v } })} onReset={() => updateRight({ user: { ...config.right.user!, name: initialConfig.right.user?.name || '' } })} />
                <TextInput label="Avatar URL" value={config.right.user?.avatarUrl || ''} onChange={(v) => updateRight({ user: { ...config.right.user!, avatarUrl: v } })} onReset={() => updateRight({ user: { ...config.right.user!, avatarUrl: initialConfig.right.user?.avatarUrl || '' } })} />
              </>
            )}
            <Control label="Collapse width" value={config.layout.rightCollapseWidth} min={320} max={1200} step={10} onChange={(v) => updateLayout({ rightCollapseWidth: v })} onReset={() => updateLayout({ rightCollapseWidth: initialConfig.layout.rightCollapseWidth })} />

            <div className={styles.debugDivider}>Right Text Style</div>
            <Control label="R Text size" value={config.right.textStyle.size} min={7} max={40} step={1} onChange={(v) => updateRight({ textStyle: { ...config.right.textStyle, size: v } })} onReset={() => updateRight({ textStyle: { ...config.right.textStyle, size: initialConfig.right.textStyle.size } })} />
            <Control label="R Weight" value={config.right.textStyle.weight} min={100} max={900} step={100} onChange={(v) => updateRight({ textStyle: { ...config.right.textStyle, weight: v } })} onReset={() => updateRight({ textStyle: { ...config.right.textStyle, weight: initialConfig.right.textStyle.weight } })} />
            <ColorControl label="R Text color" value={config.right.textStyle.color} onChange={(v) => updateRight({ textStyle: { ...config.right.textStyle, color: v } })} onReset={() => updateRight({ textStyle: { ...config.right.textStyle, color: initialConfig.right.textStyle.color } })} />
            <Control label="R Glow" value={config.right.textStyle.glowBlur ?? 0} min={0} max={10} step={0.1} onChange={(v) => updateRight({ textStyle: { ...config.right.textStyle, glowBlur: v } })} onReset={() => updateRight({ textStyle: { ...config.right.textStyle, glowBlur: initialConfig.right.textStyle.glowBlur } })} />
          </>
        )}

        {activeTab === 'metadata' && (
          <div className={styles.debugControlRow} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <div className={styles.debugControlLabel}>Route Match Patterns (comma separated)</div>
            <textarea
              style={{ width: '100%', minHeight: '60px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '8px', fontSize: '0.8rem' }}
              value={(config.metadata?.matchPatterns || []).join(', ')}
              onChange={(e) => {
                const patterns = e.target.value.split(',').map(p => p.trim()).filter(Boolean);
                setConfig({ ...config, metadata: { ...config.metadata, matchPatterns: patterns } });
              }}
              placeholder="/route/*, /another-page"
            />
            <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '4px' }}>Example: /asset-editor*, /game/:id, /shop</div>
          </div>
        )}

        {activeTab === 'profiles' && (
          <>
            <div className={styles.debugDivider}>Profile Management</div>
            <label className={styles.debugSelectLabel}>
              <span>Active Profile</span>
              <select value={activeProfile} onChange={(e) => setActiveProfile(e.target.value)}>
                {profiles.map(p => (
                  <option key={p} value={p}>{p}.json</option>
                ))}
              </select>
            </label>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button
                className={styles.debugToggleButton}
                style={{ flex: 1, backgroundColor: '#0044ff', borderColor: '#0066ff', color: 'white' }}
                onClick={async () => {
                  try {
                    const content = JSON.stringify({ profile: activeProfile, config }, null, 2);
                    navigator.clipboard.writeText(content);
                    
                    // Try to save via Tauri if available
                    if (typeof window !== 'undefined' && (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
                      try {
                        const { invoke } = await import('@tauri-apps/api/core');
                        await invoke('save_config', { name: activeProfile, content });
                        alert(`Profile "${activeProfile}" saved and copied to clipboard!`);
                      } catch (e) {
                        console.error('Tauri save failed:', e);
                        alert(`Config copied, but native save failed: ${e}`);
                      }
                    } 
                    // Try to save via Web Middleware
                    else if (typeof window !== 'undefined') {
                      try {
                        const { LocalApiEndpoint } = await import('@ocentra/endpoint-domain/constants/local');
                        const response = await fetch(LocalApiEndpoint.HeaderConfig, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: activeProfile, content })
                        });
                        if (response.ok) {
                          alert(`Profile "${activeProfile}" saved via web middleware!`);
                        } else {
                          throw new Error(`HTTP error ${response.status}`);
                        }
                      } catch (e) {
                        console.error('Web save failed:', e);
                        alert(`Config copied, but web save failed: ${e}`);
                      }
                    }
                    else {
                      alert(`Profile "${activeProfile}" copied to clipboard!`);
                    }
                  } catch (err) {
                    console.error('Save failed:', err);
                    alert("Failed to save profile.");
                  }
                }}
              >
                Apply & Save
              </button>
            </div>

            <div className={styles.debugDivider}>Create New</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="profile_name"
                style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px', padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value;
                    if (val && !profiles.includes(val)) {
                      setProfiles([...profiles, val]);
                      setActiveProfile(val);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );

  const scaleY = renderedSize.height / svgHeight;
  const viewWidth = Math.max(layout.minViewWidth, renderedSize.width / Math.max(0.0001, scaleY));
  const scaleX = renderedSize.width / viewWidth;
  const aspectCorrection = scaleX > 0 ? scaleY / scaleX : 1;

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
      {leftContent}
      <div
        ref={wrapRef}
        className={styles.unifiedHeaderWrapper}
        style={{
          flex: 1,
          maxWidth: layout.maxWidthPx ? `${layout.maxWidthPx}px` : 'none',
          height: `${layout.heightPx}px`,
          backdropFilter: style.backdropBlur > 0 ? `blur(${style.backdropBlur}px)` : undefined,
          pointerEvents: 'none',
        }}
      >
        <svg
          viewBox={`0 0 ${viewWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          className={styles.headerSvg}
          style={{ pointerEvents: 'auto' }}
        >
          <defs>
            <filter id="pillGlow" x="-20%" y="-80%" width="140%" height="260%">
              <feGaussianBlur stdDeviation={String(style.pillGlowBlur)} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="textGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={String(style.textGlowBlur)} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="iconGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={String(style.iconGlowBlur)} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {(() => {
            const boxHeight = Math.min(layout.boxHeight, svgHeight - 8);
            const wingHeight = Math.min(layout.wingHeight, boxHeight / 2);
            const wingY = (svgHeight - wingHeight) / 2;
            const boxY = (svgHeight - boxHeight) / 2;
            const wingUnderlap = layout.wingUnderlap;

            const outerMargin = layout.outerMargin;
            const boxGap = layout.boxGap;

            const isLeftCollapsed = renderedSize.width < layout.leftCollapseWidth;
            const finalLeftWidth = isLeftCollapsed ? boxHeight : layout.leftExpandedWidth;

            const isRightCollapsed = renderedSize.width < layout.rightCollapseWidth;
            const finalRightWidth = isRightCollapsed ? boxHeight : layout.rightWidth;

            const centerX = viewWidth / 2;
            const maxCenterWidthFromLeft = Math.max(layout.centerMinWidth, 2 * (centerX - (outerMargin + finalLeftWidth + boxGap)));
            const maxCenterWidthFromRight = Math.max(layout.centerMinWidth, 2 * ((viewWidth - outerMargin - finalRightWidth - boxGap) - centerX));
            const responsiveCenterWidth = Math.max(
              layout.centerMinWidth,
              Math.min(layout.centerWidth, maxCenterWidthFromLeft, maxCenterWidthFromRight),
            );

            const leftBox: HeaderBoxRect = { x: outerMargin, y: boxY, w: finalLeftWidth, h: boxHeight };
            const rightBox: HeaderBoxRect = { x: viewWidth - outerMargin - finalRightWidth, y: boxY, w: finalRightWidth, h: boxHeight };
            const centerBox: HeaderBoxRect = { x: centerX - responsiveCenterWidth / 2, y: boxY, w: responsiveCenterWidth, h: boxHeight };

            const leftWing = {
              x1: leftBox.x + leftBox.w - wingUnderlap,
              x2: centerBox.x + wingUnderlap,
              y: wingY,
              h: wingHeight,
            };

            const rightWing = {
              x1: centerBox.x + centerBox.w - wingUnderlap,
              x2: rightBox.x + wingUnderlap,
              y: wingY,
              h: wingHeight,
            };

            return (
              <>
                <WingShape box={leftWing} curve={layout.wingCurve} style={style} />
                <WingShape box={rightWing} curve={layout.wingCurve} style={style} />

                <HeaderPill box={leftBox} style={style} onClick={left.onClick} isButton={left.isButton} ariaLabel={left.ariaLabel ?? left.text}>
                  {left.customRenderer ? (
                    left.customRenderer({ box: leftBox, config: left, aspectCorrection })
                  ) : (
                    <LeftHomeContent
                      box={leftBox}
                      collapsed={isLeftCollapsed}
                      config={left}
                      style={style}
                      aspectCorrection={aspectCorrection}
                    />
                  )}
                </HeaderPill>

                <HeaderPill box={centerBox} style={style}>
                  <CenterContent
                    box={centerBox}
                    config={center}
                    aspectCorrection={aspectCorrection}
                  />
                </HeaderPill>

                <HeaderPill
                  box={rightBox}
                  style={style}
                  onClick={right.isProfile ? () => setShowProfileDropdown((value) => !value) : right.onClick}
                  isButton={right.isButton || right.isProfile}
                  ariaLabel={right.ariaLabel ?? right.text}
                >
                  {right.customRenderer ? (
                    right.customRenderer({ box: rightBox, config: right, aspectCorrection })
                  ) : right.isProfile ? (
                    <RightProfileContent
                      box={rightBox}
                      collapsed={isRightCollapsed}
                      user={right.user}
                      textStyle={right.textStyle}
                    />
                  ) : (
                    <FitText
                      text={isRightCollapsed ? '' : right.text}
                      x={rightBox.x + rightBox.w / 2}
                      y={rightBox.y + rightBox.h / 2 + 5}
                      maxWidth={rightBox.w - 20}
                      anchor="middle"
                      fontSize={right.textStyle.size}
                      color={right.textStyle.color}
                      fontWeight={right.textStyle.weight}
                      strokeColor={right.textStyle.strokeColor}
                      strokeWidth={right.textStyle.strokeWidth}
                      smallCaps={right.textStyle.smallCaps}
                      letterSpacing={right.textStyle.letterSpacing}
                      glowBlur={right.textStyle.glowBlur}
                      aspectCorrection={aspectCorrection}
                    />
                  )}
                </HeaderPill>
              </>
            );
          })()}
        </svg>

        {/* Logic for boxes rendering ends here */}
      </div>
      {rightSuffixContent}

      {showProfileDropdown && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'transparent', pointerEvents: 'auto' }} 
          onClick={() => setShowProfileDropdown(false)}
        />
      )}

      {showProfileDropdown && config.right.isProfile && config.right.user && (
        <div 
          className={styles.profileDropdown}
          style={{
            '--dropdown-tint': config.style.dropdownTint,
            '--dropdown-border': config.style.dropdownBorderColor,
            '--dropdown-section-opacity': config.style.dropdownSectionOpacity,
            zIndex: 10000,
            pointerEvents: 'auto'
          } as React.CSSProperties}
        >
          <div className={styles.dropdownHeader}>
              <button 
                className={styles.dropdownAvatar}
                onClick={() => {
                  setShowPictureModal(true);
                  setShowProfileDropdown(false);
                }}
                title="Change profile picture"
              >
                {config.right.user.avatarUrl ? (
                  <img src={config.right.user.avatarUrl} alt={config.right.user.name} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <span>{config.right.user.name.charAt(0).toUpperCase() || 'U'}</span>
                )}
                <div className={styles.editOverlay}>
                  <span>✏️</span>
                </div>
              </button>
              <div className={styles.dropdownInfo}>
                <div className={styles.dropdownName}>{config.right.user.name}</div>
                {config.right.user.email && <div className={styles.dropdownStatus}>{config.right.user.email}</div>}
              </div>
            </div>
            <div className={styles.dropdownDivider} />
            <div className={styles.dropdownStats}>
              <div><span>ELO</span><strong>{config.right.user.eloRating ?? 1200}</strong></div>
              <div><span>Games</span><strong>{config.right.user.gamesPlayed ?? 0}</strong></div>
              <div><span>Win</span><strong>{config.right.user.winRate?.toFixed(1) ?? '0'}%</strong></div>
            </div>
            <div className={styles.dropdownDivider} />
            <div className={styles.dropdownMenuSections}>
              <div className={styles.dropdownMenuSection}>
                {config.right.user.isAdmin && config.right.onAdminDashboardClick && (
                  <button className={styles.dropdownItem} onClick={() => { config.right.onAdminDashboardClick?.(); setShowProfileDropdown(false); }}>
                    <span style={{ fontSize: '16px' }}>👑</span>
                    Admin Dashboard
                  </button>
                )}
                <button className={styles.dropdownItem} onClick={() => { config.right.onViewProfileClick?.(); setShowProfileDropdown(false); }}>View Profile</button>
                <button className={styles.dropdownItem} onClick={() => { config.right.onSettingsClick?.(); setShowProfileDropdown(false); }}>Settings</button>
                <button className={styles.dropdownItem} onClick={() => { config.right.onSecurityClick?.(); setShowProfileDropdown(false); }}>Security</button>
              </div>

              <div className={styles.dropdownMenuSectionDanger}>
                <button className={styles.dropdownItemLogout} onClick={() => { config.right.onLogout?.(); setShowProfileDropdown(false); }}>
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

      {showPictureModal && config.right.isProfile && config.right.user && config.right.onUpdatePhoto && (
        <ProfilePictureModal
          isOpen={showPictureModal}
          onClose={() => setShowPictureModal(false)}
          user={{
            uid: config.right.user.uid || config.right.user.name || 'current-user',
            displayName: config.right.user.name,
            email: config.right.user.email || '',
            photoURL: config.right.user.avatarUrl || '',
            isAdmin: config.right.user.isAdmin,
            eloRating: config.right.user.eloRating,
            gamesPlayed: config.right.user.gamesPlayed,
            winRate: config.right.user.winRate,
          }}
          onUpdatePhoto={config.right.onUpdatePhoto}
          getAvatars={config.right.getAvatars || (async () => [])}
        />
      )}

      {ENABLE_HEADER_DEBUG_CONTROLS && (
        <div className={styles.debugControlsFloating}>
          {showControls && renderDebugPanel()}
          <button
            type="button"
            onClick={() => setShowControls((v) => !v)}
            className={styles.debugToggleButton}
          >
            {showControls ? 'Hide Header Controls' : 'Show Header Controls'}
          </button>
        </div>
      )}
    </div>
  );
}
type WingBox = {
  x1: number;
  x2: number;
  y: number;
  h: number;
};

function WingShape({ box, curve, style }: { box: WingBox; curve: number; style: UnifiedHeaderStyleConfig }) {
  const top = box.y;
  const bottom = box.y + box.h;
  const d = [
    `M ${box.x1} ${top}`,
    `L ${box.x2} ${top}`,
    `C ${box.x2 - curve} ${top} ${box.x2 - curve} ${bottom} ${box.x2} ${bottom}`,
    `L ${box.x1} ${bottom}`,
    `C ${box.x1 + curve} ${bottom} ${box.x1 + curve} ${top} ${box.x1} ${top}`,
    'Z',
  ].join(' ');

  return (
    <path
      d={d}
      fill={style.tintColor}
      fillOpacity={style.wingOpacity}
      stroke={style.edgeColor}
      strokeWidth={1}
      strokeOpacity={0.45}
      vectorEffect="non-scaling-stroke"
    />
  );
}

function HeaderPill({
  box,
  style,
  children,
  onClick,
  isButton,
  ariaLabel,
}: {
  box: HeaderBoxRect;
  style: UnifiedHeaderStyleConfig;
  children?: ReactNode;
  onClick?: () => void;
  isButton?: boolean;
  ariaLabel?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const interactive = Boolean(onClick || isButton);
  const edgeColor = interactive && hovered ? style.hoverEdgeColor : style.edgeColor;
  const fillColor = interactive && hovered ? style.hoverTintColor : style.tintColor;
  const fillOpacity = interactive && hovered ? Math.min(1, style.boxOpacity + style.hoverBoxOpacityBoost) : style.boxOpacity;

  return (
    <g
      filter="url(#pillGlow)"
      onClick={() => onClick?.()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      }}
      role={interactive ? 'button' : undefined}
      aria-label={interactive ? ariaLabel : undefined}
      tabIndex={interactive ? 0 : undefined}
      style={{ cursor: interactive ? 'pointer' : 'default', outline: 'none' }}
    >
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        rx={box.h / 2}
        fill={fillColor}
        fillOpacity={fillOpacity}
        stroke={edgeColor}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        filter="url(#pillGlow)"
      />
      <g filter="url(#iconGlow)">
        {children}
      </g>
    </g>
  );
}

function LeftHomeContent({
  box,
  collapsed,
  config,
  style,
  aspectCorrection,
}: {
  box: HeaderBoxRect;
  collapsed: boolean;
  config: UnifiedHeaderLeftConfig;
  style: UnifiedHeaderStyleConfig;
  aspectCorrection: number;
}) {
  const circlePadding = 3;
  const circleRadius = Math.min((box.h - circlePadding * 2) / 2, 24);
  const circleCx = collapsed ? box.x + box.w / 2 : box.x + circlePadding + circleRadius;
  const circleCy = box.y + box.h / 2;
  const textX = circleCx + circleRadius + 6;
  const maxTextWidth = Math.max(1, box.x + box.w - 14 - textX);
  const safeIconSize = Math.min(config.iconSize, circleRadius * 1.55);

  return (
    <g>
      <g transform={`translate(${circleCx} ${circleCy}) scale(${aspectCorrection} 1) translate(${-circleCx} ${-circleCy})`}>
        <circle
          cx={circleCx}
          cy={circleCy}
          r={circleRadius}
          fill={style.circleFillColor}
          fillOpacity={0.22}
          stroke={style.edgeColor}
          strokeOpacity={0.55}
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />
        {config.icon({
          cx: circleCx + config.iconOffsetX,
          cy: circleCy + config.iconOffsetY,
          size: safeIconSize,
          color: '#ffffff',
        })}
      </g>

      {!collapsed && (
        <FitText
          text={config.text}
          x={textX}
          y={circleCy + 5}
          maxWidth={maxTextWidth}
          anchor="start"
          fontSize={13}
          color="#ffffff"
          fontWeight={700}
          glowBlur={style.textGlowBlur}
        />
      )}
    </g>
  );
}

function CenterContent({ box, config, aspectCorrection }: { box: HeaderBoxRect; config: UnifiedHeaderCenterConfig; aspectCorrection: number }) {
  if (config.customRenderer) {
    return config.customRenderer({ box, config, aspectCorrection });
  }

  if (config.mode === 'B') {
    return <CenterModeB box={box} config={config} aspectCorrection={aspectCorrection} />;
  }

  return <CenterModeA box={box} config={config} aspectCorrection={aspectCorrection} />;
}

function CenterModeA({ box, config, aspectCorrection }: { box: HeaderBoxRect; config: UnifiedHeaderCenterConfig; aspectCorrection: number }) {
  const mode = config.modeA;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const fontSize = Math.min(mode.textStyle.size, box.h);
  const logoSize = Math.min(mode.logo.size, box.h);
  const logoCx = cx + mode.logo.offsetX;
  const logoCy = cy + mode.logo.offsetY;
  const logoVisualRadius = (logoSize / 2) * aspectCorrection;
  const leftTextEnd = logoCx - logoVisualRadius - config.contentGap;
  const rightTextStart = logoCx + logoVisualRadius + config.contentGap;
  const leftTextWidth = Math.max(1, leftTextEnd - (box.x + config.sidePadding));
  const rightTextWidth = Math.max(1, box.x + box.w - config.sidePadding - rightTextStart);

  return (
    <g>
      <FitText
        text={mode.leftText}
        x={leftTextEnd}
        y={cy + fontSize * 0.36}
        maxWidth={leftTextWidth}
        anchor="end"
        fontSize={fontSize}
        color={mode.textStyle.color}
        fontWeight={mode.textStyle.weight}
        strokeColor={mode.textStyle.strokeColor}
        strokeWidth={mode.textStyle.strokeWidth}
        smallCaps={mode.textStyle.smallCaps}
        letterSpacing={mode.textStyle.letterSpacing}
        glowBlur={mode.textStyle.glowBlur}
      />

      {mode.logo.renderer({
        cx: logoCx,
        cy: logoCy,
        size: logoSize,
        color: mode.textStyle.color,
        strokeWidth: mode.logo.strokeWidth,
        innerOpacity: mode.logo.innerOpacity,
        aspectCorrection,
      })}

      <FitText
        text={mode.rightText}
        x={rightTextStart}
        y={cy + fontSize * 0.36}
        maxWidth={rightTextWidth}
        anchor="start"
        fontSize={fontSize}
        color={mode.textStyle.color}
        fontWeight={mode.textStyle.weight}
        strokeColor={mode.textStyle.strokeColor}
        strokeWidth={mode.textStyle.strokeWidth}
        smallCaps={mode.textStyle.smallCaps}
        letterSpacing={mode.textStyle.letterSpacing}
        glowBlur={mode.textStyle.glowBlur}
      />
    </g>
  );
}

function CenterModeB({ box, config, aspectCorrection }: { box: HeaderBoxRect; config: UnifiedHeaderCenterConfig; aspectCorrection: number }) {
  const mode = config.modeB;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const fontSize = Math.min(mode.textStyle.size, box.h);
  const spacing = mode.textStyle.letterSpacing ?? 0;
  const iconSize = Math.min(mode.iconSize, box.h * 0.55);
  const textWidthEstimate = Math.max(fontSize, mode.text.length * (fontSize * 0.55 + spacing));
  const maxTextWidth = Math.max(1, box.w - config.sidePadding * 2 - iconSize * 4 - mode.pairGap * 2 - config.contentGap * 2);
  const textWidth = Math.min(textWidthEstimate, maxTextWidth);
  const leftUnitStart = box.x + config.sidePadding;
  const leftUnitEnd = cx - textWidth / 2 - config.contentGap;
  const rightUnitStart = cx + textWidth / 2 + config.contentGap;
  const rightUnitEnd = box.x + box.w - config.sidePadding;
  const leftPairCenter = leftUnitStart + Math.max(1, leftUnitEnd - leftUnitStart) / 2;
  const rightPairCenter = rightUnitStart + Math.max(1, rightUnitEnd - rightUnitStart) / 2;
  const pairHalfSpread = Math.max(0, iconSize + mode.pairGap) / 2;

  return (
    <g>
      <CorrectedIcon cx={leftPairCenter - pairHalfSpread} cy={cy} size={iconSize} color="#050505" aspectCorrection={aspectCorrection} renderer={mode.icons[0]} />
      <CorrectedIcon cx={leftPairCenter + pairHalfSpread} cy={cy} size={iconSize} color="#ff3b45" aspectCorrection={aspectCorrection} renderer={mode.icons[1]} />
      <FitText
        text={mode.text}
        x={cx}
        y={cy + fontSize * 0.36}
        maxWidth={maxTextWidth}
        anchor="middle"
        fontSize={fontSize}
        color={mode.textStyle.color}
        fontWeight={mode.textStyle.weight}
        strokeColor={mode.textStyle.strokeColor}
        strokeWidth={mode.textStyle.strokeWidth}
        smallCaps={mode.textStyle.smallCaps}
        letterSpacing={mode.textStyle.letterSpacing}
        glowBlur={mode.textStyle.glowBlur}
      />
      <CorrectedIcon cx={rightPairCenter - pairHalfSpread} cy={cy} size={iconSize} color="#ff3b45" aspectCorrection={aspectCorrection} renderer={mode.icons[2]} />
      <CorrectedIcon cx={rightPairCenter + pairHalfSpread} cy={cy} size={iconSize} color="#050505" aspectCorrection={aspectCorrection} renderer={mode.icons[3]} />
    </g>
  );
}

function CorrectedIcon({
  cx,
  cy,
  size,
  color,
  aspectCorrection,
  renderer,
}: HeaderIconRenderArgs & { aspectCorrection: number; renderer?: HeaderIconRenderer }) {
  if (!renderer) return null;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${aspectCorrection} 1) translate(${-cx} ${-cy})`}>
      {renderer({ cx, cy, size, color })}
    </g>
  );
}


function RightProfileContent({
  box,
  collapsed,
  user,
  textStyle,
}: {
  box: HeaderBoxRect;
  collapsed: boolean;
  user?: { name: string; avatarUrl?: string | null };
  textStyle: TextStyleConfig;
}) {
  const avatarSize = box.h * 0.7;
  const avatarX = collapsed ? box.x + (box.w - avatarSize) / 2 : box.x + 12;
  const avatarY = box.y + (box.h - avatarSize) / 2;
  const name = user?.name || 'Login';
  const firstLetter = name.charAt(0).toUpperCase() || 'U';

  return (
    <g>
      <defs>
        <clipPath id="avatarClip">
          <circle cx={avatarX + avatarSize / 2} cy={avatarY + avatarSize / 2} r={avatarSize / 2} />
        </clipPath>
      </defs>

      <circle
        cx={avatarX + avatarSize / 2}
        cy={avatarY + avatarSize / 2}
        r={avatarSize / 2 + 1}
        fill="white"
        fillOpacity={0.1}
      />

      {user?.avatarUrl ? (
        <image
          href={user.avatarUrl}
          x={avatarX}
          y={avatarY}
          width={avatarSize}
          height={avatarSize}
          clipPath="url(#avatarClip)"
        />
      ) : (
        <g>
          <circle
            cx={avatarX + avatarSize / 2}
            cy={avatarY + avatarSize / 2}
            r={avatarSize / 2}
            fill="rgba(255,255,255,0.2)"
          />
          <text
            x={avatarX + avatarSize / 2}
            y={avatarY + avatarSize / 2 + textStyle.size * 0.32}
            textAnchor="middle"
            fontFamily="Arial, sans-serif"
            fontSize={Math.min(textStyle.size, avatarSize * 0.45)}
            fontWeight={textStyle.weight}
            fill={textStyle.color}
          >
            {firstLetter}
          </text>
        </g>
      )}

      {!collapsed && (
        <FitText
          text={name}
          x={avatarX + avatarSize + 10}
          y={box.y + box.h / 2 + 5}
          maxWidth={box.w - avatarSize - 40}
          anchor="start"
          fontSize={textStyle.size}
          color={textStyle.color}
          fontWeight={textStyle.weight}
          strokeColor={textStyle.strokeColor}
          strokeWidth={textStyle.strokeWidth}
          smallCaps={textStyle.smallCaps}
          letterSpacing={textStyle.letterSpacing}
          glowBlur={textStyle.glowBlur}
        />
      )}

      {!collapsed && user && (
        <path
          d={`M ${box.x + box.w - 20} ${box.y + box.h / 2 - 2} l 5 5 l 5 -5`}
          fill="none"
          stroke={textStyle.color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </g>
  );
}

function FitText({
  text,
  x,
  y,
  maxWidth,
  anchor,
  fontSize,
  color,
  fontWeight,
  strokeColor,
  strokeWidth,
  smallCaps,
  letterSpacing,
  glowBlur,
  aspectCorrection = 1,
}: {
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  anchor: "start" | "middle" | "end";
  fontSize?: number;
  color?: string;
  fontWeight?: string | number;
  strokeColor?: string;
  strokeWidth?: number;
  smallCaps?: boolean;
  letterSpacing?: number;
  glowBlur?: number;
  aspectCorrection?: number;
}) {
  const safeFontSize = fontSize ?? 16;
  const spacing = letterSpacing ?? 0;
  const estimatedWidth = Math.max(safeFontSize, text.length * (safeFontSize * 0.55 + spacing));
  const shouldCompress = estimatedWidth > maxWidth;

  return (
    <g transform={`translate(${x} ${y}) scale(${aspectCorrection} 1) translate(${-x} ${-y})`}>
      <text
        x={x}
        y={y}
        textAnchor={anchor}
        fontFamily="Impact, sans-serif"
        fontSize={safeFontSize}
        fontWeight={fontWeight}
        fill={color}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        style={{
          fontVariant: smallCaps ? 'small-caps' : undefined,
        }}
        letterSpacing={letterSpacing}
        textLength={shouldCompress ? maxWidth : undefined}
        lengthAdjust={shouldCompress ? 'spacingAndGlyphs' : undefined}
        filter={glowBlur && glowBlur > 0 ? 'url(#textGlow)' : undefined}
      >
        {text}
      </text>
    </g>
  );
}

function TextInput({ label, value, onChange, onReset }: { label: string; value: string; onChange: (v: string) => void; onReset?: () => void }) {
  return (
    <div className={styles.debugControlRow}>
      <span className={styles.debugControlLabel}>{label}</span>
      <div className={styles.debugControlInputs}>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={styles.debugInput} />
        {onReset && <button className={styles.debugResetLink} onClick={onReset} title="Reset">↺</button>}
      </div>
    </div>
  );
}

function ColorControl({ label, value, onChange, onReset }: { label: string; value: string; onChange: (value: string) => void; onReset?: () => void }) {
  return (
    <div className={styles.debugControlRow}>
      <span className={styles.debugControlLabel}>{label}</span>
      <div className={styles.debugControlInputs}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className={styles.debugColorInput} />
        <span className={styles.debugValueDisplay}>{value}</span>
        {onReset && <button className={styles.debugResetLink} onClick={onReset} title="Reset">↺</button>}
      </div>
    </div>
  );
}

function ToggleControl({ label, value, onChange, onReset }: { label: string; value: boolean; onChange: (value: boolean) => void; onReset?: () => void }) {
  return (
    <div className={styles.debugControlRow}>
      <span className={styles.debugControlLabel}>{label}</span>
      <div className={styles.debugControlInputs}>
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
        <span className={styles.debugValueDisplay}>{value ? 'ON' : 'OFF'}</span>
        {onReset && <button className={styles.debugResetLink} onClick={onReset} title="Reset">↺</button>}
      </div>
    </div>
  );
}

function Control({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onReset
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onReset?: () => void;
}) {
  return (
    <div className={styles.debugControlRow}>
      <span className={styles.debugControlLabel}>{label}</span>
      <div className={styles.debugControlInputs}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={styles.debugRangeInput}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={styles.debugNumberInput}
        />
        {onReset && <button className={styles.debugResetLink} onClick={onReset} title="Reset">↺</button>}
      </div>
    </div>
  );
}
