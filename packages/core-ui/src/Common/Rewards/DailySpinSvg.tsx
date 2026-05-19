import type { KeyboardEvent } from 'react';
import { Defs as LobbySvgDefs } from '../../AppPages/Lobby/LobbyPageSvgPrimitives';
import { DAILY_SPIN_SPINNER_CONTROLS } from './DailySpinControls';
import { REWARD_SPINNER } from './DailySpinData';
import { DailySpinPopup } from './DailySpinPopup';
import type {
  LobbyCanvasRect,
  LobbyRewardStatus,
} from '../../AppPages/Lobby/LobbyPageSvgTypes';

export type DailySpinRewardStatus = LobbyRewardStatus;
export type DailySpinCanvasRect = LobbyCanvasRect;

function handleDailySpinBadgeKey(event: KeyboardEvent<SVGGElement>, onOpen: () => void) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  onOpen();
}

function coinCountFor(value: string) {
  const numericValue = Number(value);
  if (!numericValue) return 0;
  if (numericValue < 10) return 1;
  if (numericValue < 25) return 2;
  if (numericValue < 50) return 3;
  if (numericValue < 100) return 4;
  if (numericValue < 250) return 5;
  if (numericValue < 500) return 6;
  return 8;
}

export function DailySpinBadgeSvg({
  x,
  y,
  w,
  h,
  reward,
  disabled,
  onOpen,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  reward?: DailySpinRewardStatus | null;
  disabled?: boolean;
  onOpen: () => void;
}) {
  const isDisabled = Boolean(disabled || reward?.claiming);
  const title = reward?.rewardLabel ?? REWARD_SPINNER.title;
  const readyLabel = reward?.claiming ? 'CLAIMING...' : reward?.readyLabel ?? REWARD_SPINNER.readyLabel;
  const headerH = Math.max(24, Math.min(42, h * 0.12));
  const footerH = Math.max(30, Math.min(46, h * 0.13));
  const pad = Math.max(7, Math.min(16, Math.min(w, h) * 0.04));
  const bodyY = y + headerH;
  const bodyH = Math.max(80, h - headerH - footerH);
  const bodyW = Math.max(80, w - pad * 2);
  const cx = x + w / 2;
  const cy = bodyY + bodyH * 0.5;
  const r = Math.max(34, Math.min(bodyW, bodyH) * 0.39);
  const innerR = r * 0.23;
  const wedgeCount = REWARD_SPINNER.labels.length;
  const toPt = (ang: number, rad: number) => {
    const a = (ang - 90) * Math.PI / 180;
    return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
  };
  const wedgePath = (i: number) => {
    const a0 = i * 360 / wedgeCount;
    const a1 = (i + 1) * 360 / wedgeCount;
    const [x0, y0] = toPt(a0, innerR);
    const [x1, y1] = toPt(a0, r - 4);
    const [x2, y2] = toPt(a1, r - 4);
    const [x3, y3] = toPt(a1, innerR);
    return `M${x0} ${y0} L${x1} ${y1} A${r - 4} ${r - 4} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${innerR} ${innerR} 0 0 0 ${x0} ${y0} Z`;
  };
  const renderCoin = (coinX: number, coinY: number, size = 4.8, rotate = 0, key?: string) => (
    <g key={key} transform={`translate(${coinX} ${coinY}) rotate(${rotate})`} filter="url(#lobbyGoldGlow)">
      <circle cx={size * 0.08} cy={size * 0.12} r={size / 2} fill="#000" opacity="0.24" />
      <circle cx="0" cy="0" r={size / 2} fill="url(#lobbyGold)" stroke="#fff2a6" strokeWidth={Math.max(0.4, size * 0.08)} />
      <circle cx="0" cy="0" r={size / 2 - Math.max(1, size * 0.22)} fill="none" stroke="#7a4b10" strokeWidth={Math.max(0.3, size * 0.06)} opacity="0.72" />
    </g>
  );
  const renderRewardCoins = (value: string, mid: number, baseRad: number, size = 5) => {
    const count = coinCountFor(value);
    if (!count) return null;
    const spread = Math.min(r * 0.22, count * size * 0.62);
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
    const outer = r - 4;
    const inner = innerR + r * 0.2;
    const [x0, y0] = toPt(a0, inner);
    const [x1, y1] = toPt(a0, outer);
    const [x2, y2] = toPt(a1, outer);
    const [x3, y3] = toPt(a1, inner);
    return `M${x0} ${y0} L${x1} ${y1} A${outer} ${outer} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${inner} ${inner} 0 0 0 ${x0} ${y0} Z`;
  };
  const labelSize = Math.max(6, Math.min(16, r * 0.18));
  const coinSize = Math.max(4.2, Math.min(12, r * 0.075));
  const headerTextSize = Math.max(10, Math.min(17, headerH * 0.45));
  const footerTextSize = Math.max(11, Math.min(17, footerH * 0.48));

  return (
    <g
      className={isDisabled ? 'lobby-ui-hit is-disabled' : 'lobby-ui-hit'}
      onClick={isDisabled ? undefined : onOpen}
      onKeyDown={isDisabled ? undefined : (event) => handleDailySpinBadgeKey(event, onOpen)}
      filter="url(#lobbyPurpleGlow)"
      role="button"
      aria-label="DAILY REWARD"
      tabIndex={isDisabled ? -1 : 0}
      opacity={isDisabled ? 0.78 : 1}
    >
      <LobbySvgDefs />
      <rect x={x} y={y} width={w} height={h} rx="10" fill="#100f2d" stroke="#6d35ff" strokeWidth="1.35" />
      <rect x={x + 1} y={y + 1} width={w - 2} height={headerH - 1} rx="8" fill="none" stroke="#7d49ff" strokeWidth="0.9" opacity="0.86" />
      <path d={`M${x + 1} ${y + headerH} H${x + w - 1}`} stroke="#58bfff" strokeWidth="0.8" opacity="0.52" />
      <text x={cx} y={y + headerH / 2 + 1} fill="#f8fbff" fontSize={headerTextSize} fontWeight="950" textAnchor="middle" dominantBaseline="middle">{title}</text>
      <ellipse cx={cx} cy={cy + r + r * 0.12} rx={r * 0.82} ry={Math.max(5, r * 0.08)} fill="#000" opacity="0.34" />
      <g className="daily-spin-badge__wheel">
        <circle className="lobby-spinner-ring-blue" cx={cx} cy={cy} r={r + r * 0.22} fill="#071321" stroke="#58bfff" strokeWidth={Math.max(1, r * 0.026)} filter="url(#lobbyCyanGlow)" />
        <circle className="lobby-spinner-ring-dark" cx={cx} cy={cy} r={r + r * 0.16} fill="#06111f" stroke="#193b5a" strokeWidth={Math.max(1.5, r * 0.045)} />
        <circle className="lobby-spinner-ring-purple" cx={cx} cy={cy} r={r + r * 0.11} fill="#06111f" stroke="#7d49ff" strokeWidth={Math.max(1.5, r * 0.045)} filter="url(#lobbyPurpleGlow)" />
        <circle cx={cx} cy={cy} r={r + r * 0.035} fill="#020711" stroke="#ffca4b" strokeWidth={Math.max(1, r * 0.025)} filter="url(#lobbyGoldGlow)" />
        {REWARD_SPINNER.labels.map((label, i) => {
          const mid = i * 360 / wedgeCount + 180 / wedgeCount;
          const [tx, ty] = toPt(mid, r * 0.77);
          return (
            <g key={`${label}-${i}`}>
              <path d={wedgePath(i)} fill={REWARD_SPINNER.colors[i]} stroke="#020711" strokeWidth={Math.max(0.6, r * 0.01)} />
              <path d={wedgePath(i)} fill="url(#lobbyCardHotspot)" opacity="0.22" />
              <text x={tx} y={ty} fill={REWARD_SPINNER.textColors[i]} fontSize={label.length >= 3 ? labelSize * 0.86 : labelSize} fontWeight="950" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${mid} ${tx} ${ty})`}>{label}</text>
              {renderRewardCoins(label, mid, r * 0.58, label === '500' ? coinSize * 1.1 : coinSize)}
            </g>
          );
        })}
        {Array.from({ length: 36 }, (_, i) => {
          const ang = i * 10;
          const [dx, dy] = toPt(ang, r + r * 0.075);
          const wedgeIndex = Math.floor((((ang % 360) + 360) % 360) / (360 / wedgeCount));
          return <circle key={i} cx={dx} cy={dy} r={i % 3 === 0 ? Math.max(1.1, r * 0.018) : Math.max(0.8, r * 0.012)} fill={REWARD_SPINNER.colors[wedgeIndex]} stroke="#fff7c8" strokeWidth="0.25" opacity="0.98" />;
        })}
      </g>
      <g pointerEvents="none">
        <path d={selectionGlowPath()} fill="#12eaff" opacity="0.16" filter="url(#lobbyCyanGlow)" />
        <path d={selectionGlowPath()} fill="none" stroke="#ff2bff" strokeWidth={Math.max(1.2, r * 0.03)} opacity="0.72" filter="url(#lobbyPurpleGlow)" />
        <path d={selectionGlowPath()} fill="none" stroke="#16f3ff" strokeWidth={Math.max(0.8, r * 0.018)} opacity="0.92" filter="url(#lobbyCyanGlow)" />
        <path d={`M${cx - r * 0.5} ${cy - r + r * 0.015} A${r - r * 0.06} ${r - r * 0.06} 0 0 1 ${cx + r * 0.5} ${cy - r + r * 0.015}`} fill="none" stroke="#12eaff" strokeWidth={Math.max(2.5, r * 0.06)} strokeLinecap="round" opacity="0.86" filter="url(#lobbyCyanGlow)" />
        <path d={`M${cx - r * 0.46} ${cy - r + r * 0.025} A${r - r * 0.07} ${r - r * 0.07} 0 0 1 ${cx + r * 0.46} ${cy - r + r * 0.025}`} fill="none" stroke="#ffca4b" strokeWidth={Math.max(1.4, r * 0.032)} strokeLinecap="round" opacity="0.95" filter="url(#lobbyGoldGlow)" />
      </g>
      <g className="daily-spin-badge__center" filter="url(#lobbyGoldGlow)">
        <circle cx={cx} cy={cy} r={r * 0.32} fill="#9a5e10" stroke="#58bfff" strokeWidth={Math.max(0.8, r * 0.018)} opacity="0.95" />
        <circle cx={cx} cy={cy} r={r * 0.29} fill="#d8931f" stroke="#7d49ff" strokeWidth={Math.max(1, r * 0.027)} />
        <circle cx={cx} cy={cy} r={r * 0.23} fill="url(#lobbySpinnerCenterGold)" stroke="#ffca4b" strokeWidth={Math.max(0.7, r * 0.012)} />
        <path d={`M${cx},${cy - r * 0.68} L${cx - r * 0.055},${cy - r * 0.74} L${cx - r * 0.02},${cy - r * 0.765} V${cy + r * 0.09} H${cx + r * 0.02} V${cy - r * 0.765} L${cx + r * 0.055},${cy - r * 0.74} Z`} fill="url(#lobbySpinnerArrowGold)" stroke="#fff0a2" strokeWidth={Math.max(0.8, r * 0.017)} />
        <path d={`M${cx},${cy - r * 0.57} L${cx - r * 0.018},${cy - r * 0.78} V${cy + r * 0.07} H${cx + r * 0.018} V${cy - r * 0.78} Z`} fill="#fff7c8" opacity="0.36" />
        <circle cx={cx} cy={cy} r={innerR + r * 0.045} fill="#e4a530" stroke="#fff2a6" strokeWidth={Math.max(1, r * 0.02)} opacity="0.96" />
      </g>
      <rect x={x + 1} y={y + h - footerH} width={w - 2} height={footerH - 1} rx="8" fill="#17143c" stroke="#7d49ff" strokeWidth="1" opacity="0.96" />
      <path d={`M${x + 1} ${y + h - footerH} H${x + w - 1}`} stroke="#58bfff" strokeWidth="0.8" opacity="0.42" />
      <text x={cx} y={y + h - footerH / 2 + 0.5} fill="#f8fbff" fontSize={footerTextSize} fontWeight="950" textAnchor="middle" dominantBaseline="middle">{readyLabel}</text>
    </g>
  );
}

export function DailySpinSpinnerSvg({
  open,
  onClose,
  canvas,
  reward,
  onSpin,
}: {
  open: boolean;
  onClose: () => void;
  canvas: DailySpinCanvasRect;
  reward?: DailySpinRewardStatus | null;
  onSpin?: () => void | Promise<void>;
}) {
  return (
    <g>
      <LobbySvgDefs />
      <DailySpinPopup
        open={open}
        onClose={onClose}
        controls={DAILY_SPIN_SPINNER_CONTROLS}
        canvas={canvas}
        reward={reward}
        onSpin={onSpin}
        backdropOpacity={0.02}
        backdropBlur
      />
    </g>
  );
}
