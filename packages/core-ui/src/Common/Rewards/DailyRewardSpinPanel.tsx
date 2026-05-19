import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DailySpinBadgeSvg, DailySpinSpinnerSvg, type DailySpinRewardStatus } from './DailySpinSvg';
import './DailyRewardSpinPanel.css';

export type DailyRewardSpinStatus = DailySpinRewardStatus;

export type DailyRewardSpinPanelProps = {
  status?: DailyRewardSpinStatus | null;
  onOpen?: () => void;
  loadingCube?: boolean;
  mode?: 'cover' | 'compact';
};

export type DailyRewardSpinDialogProps = {
  open: boolean;
  status?: DailyRewardSpinStatus | null;
  onClose: () => void;
  onSpin?: () => void | Promise<void>;
};

const MINI_SPINNER_VIEWBOX = { x: 0, y: 0, width: 300, height: 190 };
const POPUP_SPINNER_CANVAS = { x: 0, y: 0, w: 1536, h: 930 };

function displayStatus(status?: DailyRewardSpinStatus | null, loadingCube = false): string {
  if (status?.claiming) return 'CLAIMING...';
  if (status?.readyLabel) return status.readyLabel;
  if (status?.claimed || status?.alreadyClaimed || status?.available === false) return 'CLAIMED TODAY';
  if (!status) return loadingCube ? 'PREPARING SHOWCASE' : 'CHECKING REWARD';
  return 'SPIN READY';
}

function isRewardCollected(status?: DailyRewardSpinStatus | null): boolean {
  const readyLabel = status?.readyLabel?.toLowerCase() ?? '';
  return Boolean(status?.claimed || status?.alreadyClaimed || readyLabel.includes('claimed') || readyLabel.includes('collected'));
}

function footerLabel(status?: DailyRewardSpinStatus | null, loadingCube = false): string {
  if (status?.claiming) return 'Claiming...';
  if (isRewardCollected(status)) return 'Collected today';
  if (!status) return loadingCube ? 'Preparing reward' : 'Checking reward';
  if (status.available === false && status.readyLabel) return status.readyLabel;
  return 'Click to spin';
}

function amountLabel(status?: DailyRewardSpinStatus | null): string {
  const label = status?.rewardLabel?.trim() || '';
  return /^daily reward$/i.test(label) ? '' : label;
}

function dialogCopy(status?: DailyRewardSpinStatus | null, loadingCube = false): {
  title: string;
  body: string;
  action: string;
} {
  const amount = amountLabel(status);
  if (isRewardCollected(status)) {
    return {
      title: 'Daily Reward Collected',
      body: amount ? `${amount} collected for today. Come back tomorrow.` : 'Collected for today. Come back tomorrow.',
      action: 'Close',
    };
  }

  if (status?.claiming) {
    return {
      title: 'Claiming Daily Reward',
      body: amount ? `${amount} is being added to your account.` : 'Your daily reward is being added to your account.',
      action: 'Close',
    };
  }

  if (status?.available === false && status.readyLabel) {
    return {
      title: 'Claim Daily Reward',
      body: status.readyLabel,
      action: 'Close',
    };
  }

  return {
    title: 'Claim Daily Reward',
    body: loadingCube ? 'Checking today\'s reward while the showcase prepares.' : 'Checking today\'s reward.',
    action: 'Close',
  };
}

function toLobbyRewardStatus(status?: DailyRewardSpinStatus | null, loadingCube = false, forceReady = false): DailySpinRewardStatus {
  const alreadyClaimed = forceReady ? false : isRewardCollected(status);
  return {
    available: Boolean((forceReady || status?.available) && !status?.claiming && !alreadyClaimed),
    claiming: status?.claiming,
    claimed: alreadyClaimed,
    alreadyClaimed: forceReady ? false : status?.alreadyClaimed,
    currentDay: status?.currentDay,
    loginStreak: status?.loginStreak,
    nextAt: status?.nextAt,
    rewardLabel: status?.rewardLabel ?? 'DAILY REWARD',
    readyLabel: forceReady ? 'SPIN TO CLAIM' : displayStatus(status, loadingCube),
    balanceLabel: status?.balanceLabel,
    spinRewardLabel: status?.spinRewardLabel,
    spinRewardAmount: status?.spinRewardAmount,
  };
}

function DailyRewardMiniSpinnerSvg({
  reward,
  onOpen,
  disabled = false,
}: {
  reward: DailySpinRewardStatus;
  onOpen?: () => void;
  disabled?: boolean;
}) {
  return (
    <svg
      className="daily-reward-spin-panel__svg"
      viewBox={`${MINI_SPINNER_VIEWBOX.x} ${MINI_SPINNER_VIEWBOX.y} ${MINI_SPINNER_VIEWBOX.width} ${MINI_SPINNER_VIEWBOX.height}`}
      role="img"
      aria-label="Daily reward spin"
    >
      <DailySpinBadgeSvg
        x={4}
        y={4}
        w={292}
        h={182}
        reward={reward}
        disabled={disabled}
        onOpen={onOpen ?? (() => undefined)}
      />
    </svg>
  );
}

export function DailyRewardSpinPanel({
  status,
  onOpen,
  loadingCube = false,
  mode = 'cover',
}: DailyRewardSpinPanelProps) {
  const reward = useMemo(
    () => toLobbyRewardStatus(status, loadingCube),
    [loadingCube, status],
  );
  const canOpen = Boolean(onOpen);
  const panelFooterLabel = footerLabel(status, loadingCube);

  return (
    <button
      className={`daily-reward-spin-panel daily-reward-spin-panel--${mode}`}
      type="button"
      disabled={!canOpen}
      onClick={canOpen ? () => onOpen?.() : undefined}
      aria-label={panelFooterLabel}
    >
      <DailyRewardMiniSpinnerSvg reward={reward} onOpen={canOpen ? onOpen : undefined} disabled={!canOpen} />
    </button>
  );
}

export function DailyRewardSpinDialog({ open, status, onClose, onSpin }: DailyRewardSpinDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [canvas, setCanvas] = useState(POPUP_SPINNER_CANVAS);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const node = dialogRef.current;
    if (!node) return undefined;

    const updateCanvas = () => {
      const rect = node.getBoundingClientRect();
      const nextW = Math.max(320, Math.round(rect.width));
      const nextH = Math.max(320, Math.round(rect.height));
      setCanvas((previous) => (
        previous.w === nextW && previous.h === nextH
          ? previous
          : { x: 0, y: 0, w: nextW, h: nextH }
      ));
    };

    updateCanvas();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateCanvas) : null;
    observer?.observe(node);
    window.addEventListener('resize', updateCanvas);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateCanvas);
    };
  }, [open]);

  if (!open) return null;
  const collected = isRewardCollected(status);
  const canSpin = Boolean((status?.available && !status?.claiming) || collected);

  if (canSpin) {
    const reward = toLobbyRewardStatus(status);
    return (
      <div ref={dialogRef} className="daily-reward-spin-dialog" role="dialog" aria-modal="true" aria-label="Daily reward spin">
        <svg className="daily-reward-spin-dialog__svg" viewBox={`0 0 ${canvas.w} ${canvas.h}`} preserveAspectRatio="xMidYMid meet">
          <DailySpinSpinnerSvg
            open={open}
            onClose={onClose}
            canvas={canvas}
            reward={reward}
            onSpin={collected ? undefined : onSpin}
          />
        </svg>
      </div>
    );
  }

  const copy = dialogCopy(status);
  return (
    <div className="daily-reward-spin-dialog daily-reward-spin-dialog--status" role="dialog" aria-modal="true" aria-label={copy.title}>
      <button className="daily-reward-spin-dialog__backdrop" type="button" aria-label="Close daily reward dialog" onClick={onClose} />
      <div className="daily-reward-spin-dialog__status-card">
        <button className="daily-reward-spin-dialog__close" type="button" onClick={onClose}>Close</button>
        <div className="daily-reward-spin-dialog__status-wheel">
          <DailyRewardMiniSpinnerSvg reward={toLobbyRewardStatus(status)} disabled />
        </div>
        <div className="daily-reward-spin-dialog__status-copy">
          <h2>{copy.title}</h2>
          <p>{copy.body}</p>
        </div>
        <button className="daily-reward-spin-dialog__status-action" type="button" onClick={onClose}>{copy.action}</button>
      </div>
    </div>
  );
}
