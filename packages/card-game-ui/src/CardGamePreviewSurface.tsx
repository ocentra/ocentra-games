import React, { useMemo } from 'react';
import type {
  CardGameLayoutDocument,
  CardFanControls,
  HudArtworkControls,
  LayoutPreset,
} from '@ocentra/game-ui-types/cardGameLayoutTypes';
import { createLayoutPreset } from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import './CardGamePreviewSurface.css';

export interface CardGamePreviewSurfaceProps {
  document: CardGameLayoutDocument;
  playerCount?: number;
  className?: string;
}

function resolvePreset(document: CardGameLayoutDocument, playerCount: number): LayoutPreset {
  return (
    document.presets[String(playerCount)] ??
    document.presets[String(document.defaultPlayerCount)] ??
    createLayoutPreset(playerCount)
  );
}

function renderSeatPosition(index: number, seatCount: number, seatX: number, seatY: number) {
  const left = 12 + seatX * 76;
  const top = 12 + seatY * 54;
  const labelLeft = 12 + seatX * 76;
  const labelTop = 16 + seatY * 54;
  const size = Math.max(12, 16 - Math.min(6, seatCount / 2));

  return {
    left,
    top,
    labelLeft,
    labelTop,
    size,
    label: `P${index + 1}`,
  };
}

function CardFanSummary({ cardFan }: { cardFan: CardFanControls }) {
  const spans = Array.from({ length: Math.max(1, Math.min(8, cardFan.cardCount)) }, (_, index) => index);
  return (
    <div className="card-game-preview-surface__fan" aria-label="Card fan preview">
      {spans.map((index) => (
        <div
          key={index}
          className="card-game-preview-surface__fan-card"
          style={{
            transform: `translateX(${index * 18 - (spans.length - 1) * 9}px) rotate(${cardFan.fanTilt + (index - (spans.length - 1) / 2) * 6}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function HudSummary({ hud }: { hud: HudArtworkControls }) {
  return (
    <div className="card-game-preview-surface__hud">
      <div className="card-game-preview-surface__hud-rail" />
      <div className="card-game-preview-surface__hud-buttons">
        {hud.buttonLabels.slice(0, hud.buttonCount).map((label) => (
          <span key={label} className="card-game-preview-surface__hud-button">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export const CardGamePreviewSurface: React.FC<CardGamePreviewSurfaceProps> = ({
  document,
  playerCount,
  className,
}) => {
  const resolvedPlayerCount = playerCount ?? document.defaultPlayerCount;
  const preset = useMemo(() => resolvePreset(document, resolvedPlayerCount), [document, resolvedPlayerCount]);
  const table = preset.table;
  const seats = preset.seats;
  const hud = document.hud;
  const cardFan = document.cardFan;

  return (
    <div className={`card-game-preview-surface${className ? ` ${className}` : ''}`}>
      <div className="card-game-preview-surface__stage">
        <svg className="card-game-preview-surface__table" viewBox="0 0 1000 700" role="img" aria-label="Card game layout preview">
          <defs>
            <linearGradient id="card-game-preview-surface-table" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2e6d4d" />
              <stop offset="100%" stopColor="#0d2118" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="1000" height="700" rx="32" fill="#111827" />
          <ellipse
            cx={500 + (table.offsetX ?? 0)}
            cy={350 + (table.offsetY ?? 0)}
            rx={(table.width ?? 960) / 2}
            ry={(table.height ?? 560) / 2}
            fill="url(#card-game-preview-surface-table)"
            stroke="#eab308"
            strokeWidth="10"
          />
          {seats.map((seat, index) => {
            const position = renderSeatPosition(index, seats.length, seat.position.x, seat.position.y);
            return (
              <g key={seat.id}>
                <circle
                  cx={position.left}
                  cy={position.top}
                  r={position.size}
                  fill="#ffffff"
                  fillOpacity="0.12"
                  stroke="#cbd5e1"
                  strokeWidth="2"
                />
                <text
                  x={position.labelLeft}
                  y={position.labelTop}
                  textAnchor="middle"
                  className="card-game-preview-surface__seat-label"
                >
                  {seat.label ?? position.label}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="card-game-preview-surface__overlay">
          <HudSummary hud={hud} />
          <CardFanSummary cardFan={cardFan} />
        </div>
      </div>
    </div>
  );
};
