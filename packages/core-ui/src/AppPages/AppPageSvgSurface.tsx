import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import {
  normalizeAppPageSvgControls,
  type AppPageSvgAction,
  type AppPageSvgControls,
  type AppPageSvgMetric,
  type AppPageSvgPanel,
} from './AppPageSvgSurfaceControls';
import './AppPageSvgSurface.css';

function splitText(value: string, limit: number, maxLines = 2): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > limit && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines.length > 0 ? lines : [''];
}

function safeText(value: string | number): string {
  return String(value).replace(/\s+/g, ' ').trim();
}

function SvgActionButton({
  action,
  x,
  y,
  width,
  variant = 'secondary',
}: {
  action: AppPageSvgAction;
  x: number;
  y: number;
  width: number;
  variant?: 'primary' | 'secondary';
}) {
  const disabled = action.disabled || !action.onClick;
  const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action.onClick?.();
    }
  };

  return (
    <g
      className={`app-page-svg-action app-page-svg-action--${variant} ${disabled ? 'is-disabled' : ''}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={disabled ? undefined : action.onClick}
      onKeyDown={handleKeyDown}
      transform={`translate(${x} ${y})`}
    >
      <rect width={width} height="52" rx="12" />
      <text x={width / 2} y="32" textAnchor="middle">{safeText(action.label)}</text>
    </g>
  );
}

function MetricStrip({
  metrics,
  accentColor,
}: {
  metrics: AppPageSvgMetric[];
  accentColor: string;
}) {
  return (
    <g transform="translate(56 286)">
      {metrics.slice(0, 5).map((metric, index) => {
        const x = index * 258;
        return (
          <g key={`${metric.label}-${index}`} transform={`translate(${x} 0)`}>
            <rect width="236" height="82" rx="18" className="app-page-svg-metric-bg" />
            <rect width="5" height="82" rx="2.5" fill={accentColor} />
            <text x="24" y="32" className="app-page-svg-metric-label">{safeText(metric.label)}</text>
            <text x="24" y="62" className="app-page-svg-metric-value">{safeText(metric.value)}</text>
          </g>
        );
      })}
    </g>
  );
}

function Panel({
  panel,
  index,
  x,
  y,
  width,
  height,
  accentColor,
}: {
  panel: AppPageSvgPanel;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  accentColor: string;
}) {
  const titleLines = splitText(panel.title, 26, 2);
  const subtitleLines = panel.subtitle ? splitText(panel.subtitle, 42, 2) : [];
  const rows = panel.rows.slice(0, 5);
  const actionWidth = Math.min(148, Math.max(112, (width - 46) / Math.max(panel.actions?.length ?? 1, 1)));

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={width} height={height} rx="22" className="app-page-svg-panel-bg" />
      <rect x="1" y="1" width={width - 2} height={height - 2} rx="21" className="app-page-svg-panel-line" />
      <circle cx="34" cy="34" r="10" fill={accentColor} opacity={0.82} />
      <text x="58" y="35" className="app-page-svg-panel-title">
        {titleLines.map((line, lineIndex) => (
          <tspan key={`${line}-${lineIndex}`} x="58" dy={lineIndex === 0 ? 0 : 22}>{line}</tspan>
        ))}
      </text>
      {subtitleLines.length > 0 ? (
        <text x="28" y={titleLines.length > 1 ? 86 : 64} className="app-page-svg-panel-subtitle">
          {subtitleLines.map((line, lineIndex) => (
            <tspan key={`${line}-${lineIndex}`} x="28" dy={lineIndex === 0 ? 0 : 18}>{line}</tspan>
          ))}
        </text>
      ) : null}
      <g transform={`translate(28 ${subtitleLines.length > 0 ? 116 : 86})`}>
        {rows.map((row, rowIndex) => (
          <g key={`${row.label}-${rowIndex}`} transform={`translate(0 ${rowIndex * 32})`}>
            <text x="0" y="18" className="app-page-svg-row-label">{safeText(row.label)}</text>
            <text x={width - 56} y="18" textAnchor="end" className="app-page-svg-row-value">
              {safeText(row.value)}
            </text>
            <line x1="0" x2={width - 56} y1="30" y2="30" className="app-page-svg-row-line" />
          </g>
        ))}
      </g>
      {panel.actions?.slice(0, 2).map((action, actionIndex) => (
        <SvgActionButton
          key={`${action.label}-${actionIndex}`}
          action={action}
          x={28 + actionIndex * (actionWidth + 12)}
          y={height - 70}
          width={actionWidth}
          variant={actionIndex === 0 && index === 0 ? 'primary' : 'secondary'}
        />
      ))}
    </g>
  );
}

export function AppPageSvgSurface({
  title,
  eyebrow,
  subtitle,
  routeLabel,
  metrics,
  panels,
  actions,
  loading,
  error,
  controls,
  footer,
}: {
  title: string;
  eyebrow: string;
  subtitle: string;
  routeLabel: string;
  metrics: AppPageSvgMetric[];
  panels: AppPageSvgPanel[];
  actions: AppPageSvgAction[];
  loading?: boolean;
  error?: string | null;
  controls?: Partial<AppPageSvgControls> | null;
  footer?: ReactNode;
}) {
  const normalized = normalizeAppPageSvgControls(controls);
  const panelOpacityStyle = { '--app-page-panel-opacity': normalized.panelOpacity } as CSSProperties;
  const panelGap = 28 * normalized.density;
  const columns = panels.length <= 2 ? panels.length || 1 : 3;
  const panelWidth = (1328 - panelGap * (columns - 1)) / columns;
  const panelHeight = 250 * normalized.density;
  const scaledWidth = 1440 / normalized.stageScale;
  const scaledHeight = 980 / normalized.stageScale;

  return (
    <main className="app-page-svg-main" style={panelOpacityStyle}>
      <svg
        className="app-page-svg-surface"
        viewBox={`0 0 ${scaledWidth} ${scaledHeight}`}
        role="img"
        aria-label={`${title} page layout`}
        preserveAspectRatio="xMidYMin meet"
      >
        <defs>
          <radialGradient id={`app-page-glow-${title}`} cx="50%" cy="0%" r="76%">
            <stop offset="0%" stopColor={normalized.accentColor} stopOpacity="0.24" />
            <stop offset="62%" stopColor="#0f172a" stopOpacity="0.46" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.88" />
          </radialGradient>
        </defs>
        <rect width={scaledWidth} height={scaledHeight} rx="0" fill={`url(#app-page-glow-${title})`} />
        <g transform={`translate(0 ${normalized.heroOffsetY})`}>
          <rect x="56" y="48" width="1328" height="210" rx="28" className="app-page-svg-hero-bg" />
          <text x="94" y="96" className="app-page-svg-eyebrow">{safeText(eyebrow)}</text>
          <text x="94" y="154" className="app-page-svg-title">{safeText(title)}</text>
          <text x="96" y="198" className="app-page-svg-subtitle">
            {splitText(subtitle, 78, 2).map((line, index) => (
              <tspan key={`${line}-${index}`} x="96" dy={index === 0 ? 0 : 24}>{line}</tspan>
            ))}
          </text>
          <text x="1298" y="96" textAnchor="end" className="app-page-svg-route">{safeText(routeLabel)}</text>
          {actions.slice(0, 3).map((action, index) => (
            <SvgActionButton
              key={`${action.label}-${index}`}
              action={action}
              x={898 + index * 154}
              y={174}
              width={140}
              variant={index === 0 ? 'primary' : 'secondary'}
            />
          ))}
        </g>
        <MetricStrip metrics={metrics} accentColor={normalized.accentColor} />
        {loading ? (
          <text x="720" y="500" textAnchor="middle" className="app-page-svg-state">Loading data...</text>
        ) : null}
        {error ? (
          <text x="720" y="500" textAnchor="middle" className="app-page-svg-error">{safeText(error)}</text>
        ) : null}
        {!loading && !error ? panels.slice(0, 6).map((panel, index) => {
          const col = index % columns;
          const row = Math.floor(index / columns);
          return (
            <Panel
              key={`${panel.title}-${index}`}
              panel={panel}
              index={index}
              x={56 + col * (panelWidth + panelGap)}
              y={392 + row * (panelHeight + panelGap)}
              width={panelWidth}
              height={panelHeight}
              accentColor={normalized.accentColor}
            />
          );
        }) : null}
        {normalized.showGuides ? (
          <g className="app-page-svg-guides">
            <rect x="56" y="48" width="1328" height="860" rx="0" />
            <line x1="720" x2="720" y1="48" y2="908" />
            <line x1="56" x2="1384" y1="392" y2="392" />
          </g>
        ) : null}
      </svg>
      {footer ? <div className="app-page-svg-footer">{footer}</div> : null}
    </main>
  );
}
