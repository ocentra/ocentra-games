import { useEffect, useRef, useState } from 'react';
import { CenterTxt, PopupBackdrop } from '../../AppPages/Lobby/LobbyPageSvgPrimitives';
import type { LobbyPageSvgControls } from '../../AppPages/Lobby/LobbyPageSvgSurfaceControls';
import type { LobbyCanvasRect, LobbyRewardStatus } from '../../AppPages/Lobby/LobbyPageSvgTypes';
import { REWARD_SPINNER } from './DailySpinData';

export function DailySpinPopup({
  open,
  onClose,
  controls,
  canvas,
  reward,
  onSpin,
  backdropOpacity = 0.62,
  backdropBlur = false,
}: {
  open: boolean;
  onClose: () => void;
  controls: LobbyPageSvgControls;
  canvas: LobbyCanvasRect;
  reward?: LobbyRewardStatus | null;
  onSpin?: () => void | Promise<void>;
  backdropOpacity?: number;
  backdropBlur?: boolean;
}) {
  if (!open) return null;
  return (
    <DailySpinPopupContent
      onClose={onClose}
      controls={controls}
      canvas={canvas}
      reward={reward}
      onSpin={onSpin}
      backdropOpacity={backdropOpacity}
      backdropBlur={backdropBlur}
    />
  );
}

function isRewardCollected(reward?: LobbyRewardStatus | null): boolean {
  const readyLabel = reward?.readyLabel?.toLowerCase() ?? '';
  return Boolean(reward?.claimed || reward?.alreadyClaimed || readyLabel.includes('claimed') || readyLabel.includes('collected'));
}

function rewardValueFromLabel(label?: string | null): string | null {
  const match = label?.match(/\d[\d,]*/);
  if (!match) return null;
  const value = Number(match[0].replace(/,/g, ''));
  return Number.isFinite(value) && value >= 0 ? String(value) : null;
}

function rewardSpinValue(reward?: LobbyRewardStatus | null): string | null {
  if (typeof reward?.spinRewardAmount === 'number' && Number.isFinite(reward.spinRewardAmount)) {
    return String(Math.max(0, Math.round(reward.spinRewardAmount)));
  }
  return rewardValueFromLabel(reward?.spinRewardLabel) ?? rewardValueFromLabel(reward?.rewardLabel);
}

function DailySpinPopupContent({
  onClose,
  controls,
  canvas,
  reward,
  onSpin,
  backdropOpacity,
  backdropBlur,
}: {
  onClose: () => void;
  controls: LobbyPageSvgControls;
  canvas: LobbyCanvasRect;
  reward?: LobbyRewardStatus | null;
  onSpin?: () => void | Promise<void>;
  backdropOpacity: number;
  backdropBlur: boolean;
}) {
  const [spinRotation, setSpinRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<string | null>(null);
  const [collectingValue, setCollectingValue] = useState<string | null>(null);
  const [lastSpinWasReplay, setLastSpinWasReplay] = useState(false);
  const [closeHovered, setCloseHovered] = useState(false);
  const spinTimerRef = useRef<number | null>(null);
  const collectTimerRef = useRef<number | null>(null);
  const alreadyCollected = isRewardCollected(reward);
  const knownRewardValue = rewardSpinValue(reward);
  const rewardLabels: readonly string[] = REWARD_SPINNER.labels;

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

  const backdropX = canvas.x - 14;
  const backdropY = canvas.y - 14;
  const backdropW = canvas.w + 28;
  const backdropH = canvas.h + 28;
  const cx = backdropX + backdropW / 2;
  const r = controls.spinner.radius;
  const innerR = controls.spinner.innerRadius;
  const closeW = 78;
  const closeH = 30;
  const closePad = 16;
  const spinnerMargin = 24;
  const topExtent = Math.max(
    r + controls.spinner.startTextRadius + controls.spinner.startTextSize * 2,
    r + 138,
  );
  const bottomExtent = r + 68;
  const sideExtent = Math.max(r + 56, controls.spinner.numberBoxW / 2 + 184);
  const spinnerScale = Math.min(
    1,
    (backdropW - spinnerMargin * 2) / (sideExtent * 2),
    (backdropH - spinnerMargin * 2) / (topExtent + bottomExtent),
  );
  const spinnerContentH = (topExtent + bottomExtent) * spinnerScale;
  const cy = backdropY
    + spinnerMargin
    + Math.max(0, backdropH - spinnerMargin * 2 - spinnerContentH) / 2
    + topExtent * spinnerScale;
  const wedgeCount = rewardLabels.length;
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
    const replaySpin = alreadyCollected;
    setLastSpinWasReplay(replaySpin);
    if (!replaySpin) void onSpin?.();
    const zeroIndex = Math.max(0, rewardLabels.indexOf('0'));
    const knownIndex = knownRewardValue ? rewardLabels.indexOf(knownRewardValue) : -1;
    const resultIndex = replaySpin
      ? zeroIndex
      : knownIndex >= 0
        ? knownIndex
        : Math.floor(Math.random() * rewardLabels.length);
    const wedgeAngle = 360 / wedgeCount;
    const resultCenterAngle = resultIndex * wedgeAngle + wedgeAngle / 2;
    const currentNorm = ((spinRotation % 360) + 360) % 360;
    const targetNorm = ((-resultCenterAngle % 360) + 360) % 360;
    const deltaToTarget = (targetNorm - currentNorm + 360) % 360;
    const jitter = (Math.random() - 0.5) * wedgeAngle * 0.34;
    const nextRotation = spinRotation + (controls.spinner.extraTurnsMin + Math.floor(Math.random() * Math.max(1, controls.spinner.extraTurnsRandom))) * 360 + deltaToTarget + jitter;
    setSpinResult(null);
    setCollectingValue(rewardLabels[0]);
    setIsSpinning(true);
    setSpinRotation(nextRotation);
    if (spinTimerRef.current) window.clearTimeout(spinTimerRef.current);
    if (collectTimerRef.current) window.clearInterval(collectTimerRef.current);
    let tick = 0;
    collectTimerRef.current = window.setInterval(() => {
      tick += 1;
      setCollectingValue(rewardLabels[tick % rewardLabels.length]);
    }, controls.spinner.collectTickMs);
    spinTimerRef.current = window.setTimeout(() => {
      if (collectTimerRef.current) {
        window.clearInterval(collectTimerRef.current);
        collectTimerRef.current = null;
      }
      setIsSpinning(false);
      setSpinResult(rewardLabels[resultIndex]);
      setCollectingValue(rewardLabels[resultIndex]);
      spinTimerRef.current = window.setTimeout(onClose, controls.spinner.resultHoldMs);
    }, controls.spinner.spinMs);
  };
  const resultBannerW = Math.max(440, controls.spinner.numberBoxW + 300);
  const resultBannerH = Math.max(64, controls.spinner.numberBoxH * 1.02);
  const resultBannerY = cy - r - 128;
  const currentResultValue = spinResult ?? collectingValue ?? rewardLabels[0];
  const resultBannerPrefix = lastSpinWasReplay && spinResult ? 'NICE TRY' : isSpinning ? 'COLLECTING' : 'YOU WON';
  const resultBannerSuffix = lastSpinWasReplay && spinResult ? 'COLLECTED TODAY' : 'AC';
  const resultBannerTextSize = currentResultValue.length >= 3 ? 21 : 23;
  const resultBannerNumberSize = currentResultValue.length >= 3 ? 56 : 62;
  const resultBannerTextY = resultBannerY + resultBannerH / 2 + 1;
  const resultBannerTextPad = 22;
  const arcId = `dailySpinOuterArcText-${Math.round(cx)}-${Math.round(cy)}`;

  return (
    <g>
      <PopupBackdrop canvas={canvas} opacity={backdropOpacity} blur={backdropBlur} onClose={onClose} />
      <g
        className="lobby-ui-hit"
        filter={closeHovered ? 'url(#lobbyRedGlow)' : 'url(#lobbyCyanGlow)'}
        role="button"
        aria-label="CLOSE"
        tabIndex={0}
        onClick={onClose}
        onMouseEnter={() => setCloseHovered(true)}
        onMouseLeave={() => setCloseHovered(false)}
        onFocus={() => setCloseHovered(true)}
        onBlur={() => setCloseHovered(false)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          onClose();
        }}
      >
        <rect
          x={backdropX + backdropW - closeW - closePad}
          y={backdropY + closePad}
          width={closeW}
          height={closeH}
          rx="7"
          fill="#071426"
          stroke={closeHovered ? '#ff4655' : '#20e6ff'}
          strokeWidth={closeHovered ? 1.6 : 1}
        />
        <rect
          x={backdropX + backdropW - closeW - closePad + 2}
          y={backdropY + closePad + 2}
          width={closeW - 4}
          height={Math.max(2, closeH * 0.3)}
          rx="6"
          fill="#fff"
          opacity={closeHovered ? 0.1 : 0.08}
        />
        <CenterTxt x={backdropX + backdropW - closeW - closePad} y={backdropY + closePad} w={closeW} h={closeH} text="CLOSE" size={10} weight="850" />
      </g>
      <g transform={spinnerScale < 1 ? `translate(${cx} ${cy}) scale(${spinnerScale}) translate(${-cx} ${-cy})` : undefined}>
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
        <g className="lobby-spinner-vegas-ring" pointerEvents="none">
          {Array.from({ length: 48 }, (_, i) => {
            const ang = i * 7.5;
            const [dx, dy] = toPt(ang, r + 13);
            const wedgeIndex = Math.floor((((ang % 360) + 360) % 360) / (360 / wedgeCount));
            const baseR = i % 3 === 0 ? 3.4 : 2.3;
            const chaseDuration = 4.8;
            const delay = `${(i * chaseDuration / 48).toFixed(3)}s`;
            const bulbFill = i % 2 === 0 ? '#ffca4b' : '#58f4ff';
            const glowFilter = i % 2 === 0 ? 'url(#lobbyVegasGoldGlow)' : 'url(#lobbyVegasCyanGlow)';
            return (
              <g key={i}>
                <circle cx={dx} cy={dy} r={baseR * 2.4} fill={bulbFill} filter={glowFilter} opacity="0">
                  <animate attributeName="opacity" values="0;0;0.86;0;0" keyTimes="0;0.006;0.018;0.034;1" dur={`${chaseDuration}s`} begin={delay} repeatCount="indefinite" />
                  <animate attributeName="r" values={`${baseR * 1.1};${baseR * 1.1};${baseR * 3.3};${baseR * 1.5};${baseR * 1.1}`} keyTimes="0;0.006;0.018;0.034;1" dur={`${chaseDuration}s`} begin={delay} repeatCount="indefinite" />
                </circle>
                <circle cx={dx} cy={dy} r={baseR} fill={REWARD_SPINNER.colors[wedgeIndex]} stroke="#fff7c8" strokeWidth="0.35" opacity="0.34">
                  <animate attributeName="opacity" values="0.34;0.34;1;0.36;0.34" keyTimes="0;0.006;0.018;0.034;1" dur={`${chaseDuration}s`} begin={delay} repeatCount="indefinite" />
                </circle>
                <circle cx={dx} cy={dy} r={baseR} fill={bulbFill} stroke="#fff7c8" strokeWidth="0.45" opacity="0">
                  <animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.006;0.018;0.034;1" dur={`${chaseDuration}s`} begin={delay} repeatCount="indefinite" />
                  <animate attributeName="r" values={`${baseR};${baseR};${baseR * 1.18};${baseR};${baseR}`} keyTimes="0;0.006;0.018;0.034;1" dur={`${chaseDuration}s`} begin={delay} repeatCount="indefinite" />
                </circle>
              </g>
            );
          })}
        </g>
        {!isSpinning && !spinResult ? renderArcText(REWARD_SPINNER.edgeText, r + controls.spinner.startTextRadius, -78, 78, controls.spinner.startTextSize, arcId) : null}
        {isSpinning || spinResult ? (
          <g pointerEvents="none" filter="url(#lobbyGoldGlow)">
            <rect x={cx - resultBannerW / 2} y={resultBannerY} width={resultBannerW} height={resultBannerH} rx="12" fill="#071321" stroke="#58bfff" strokeWidth="1.6" opacity="0.96" />
            <rect x={cx - resultBannerW / 2 + 5} y={resultBannerY + 5} width={resultBannerW - 10} height={Math.max(13, resultBannerH * 0.32)} rx="9" fill="#ffffff" opacity="0.07" />
            <text x={cx - resultBannerW / 2 + resultBannerTextPad} y={resultBannerTextY} fontSize={resultBannerTextSize} fontWeight="950" textAnchor="start" dominantBaseline="middle" fill="#f6fbff" stroke="#07111f" strokeWidth="3" paintOrder="stroke fill">
              {resultBannerPrefix}
            </text>
            <text x={cx} y={resultBannerTextY} fontSize={resultBannerNumberSize} fontWeight="950" textAnchor="middle" dominantBaseline="middle" fill="#ffca4b" stroke="#07111f" strokeWidth="3" paintOrder="stroke fill" filter="url(#lobbyGoldGlow)">
              {currentResultValue}
            </text>
            <text x={cx + resultBannerW / 2 - resultBannerTextPad} y={resultBannerTextY} fontSize={resultBannerTextSize} fontWeight="950" textAnchor="end" dominantBaseline="middle" fill="#f6fbff" stroke="#07111f" strokeWidth="3" paintOrder="stroke fill">
              {resultBannerSuffix}
            </text>
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
    </g>
  );
}
