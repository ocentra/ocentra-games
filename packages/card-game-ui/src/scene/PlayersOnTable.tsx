import React, { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import PlayerUI from './PlayerUI';
import './PlayersOnTable.css';
import { tableLayoutStore } from '@ocentra/game-layout-domain/tableLayoutStore';
import type { SeatLayout } from '@ocentra/game-ui-types/tableLayoutTypes';
import type { TableLayoutState } from '@ocentra/game-layout-domain/tableLayoutStore';

const PlayersOnTable: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layoutState = useSyncExternalStore<TableLayoutState>(
    tableLayoutStore.subscribe,
    tableLayoutStore.getState,
    tableLayoutStore.getState
  );

  const seats = layoutState.seats ?? [];
  const selectedSeatId = layoutState.selectedSeatId ?? null;
  const playerUiDefaults = layoutState.asset?.layout.playerUiDefaults ?? {};

  const handleSeatSelect = useCallback((seatId: number | null) => {
    tableLayoutStore.setSelectedSeat(seatId);
  }, []);

  return (
    <div className="players-on-table" ref={containerRef}>
      {seats
        .filter((seat: SeatLayout) => seat.id !== 0)
        .map((seat: SeatLayout, index: number) => (
          <PlayerSeatContainer
            key={seat.id ?? `seat-${index}`}
            seat={seat}
            selected={seat.id === selectedSeatId}
            onSelect={handleSeatSelect}
            playerUiDefaults={playerUiDefaults}
          />
        ))}
    </div>
  );
};

interface PlayerSeatContainerProps {
  seat: SeatLayout;
  onSelect: (seatId: number) => void;
  selected: boolean;
  playerUiDefaults: Record<string, unknown>;
}

const PlayerSeatContainer: React.FC<PlayerSeatContainerProps> = ({ seat, onSelect, selected, playerUiDefaults }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    node.style.setProperty('--seat-left', `${(seat.position?.x ?? 0.5) * 100}%`);
    node.style.setProperty('--seat-top', `${(seat.position?.y ?? 0.5) * 100}%`);
    node.style.setProperty('--seat-rotation', `${seat.rotation ?? 0}deg`);
    node.style.setProperty('--seat-scale', `${seat.scale ?? 1}`);
  }, [seat.position?.x, seat.position?.y, seat.rotation, seat.scale]);

  const handleClick = useCallback(() => {
    onSelect(seat.id);
  }, [onSelect, seat.id]);

  const className = selected ? 'player-seat player-seat--selected' : 'player-seat';
  return (
    <div
      ref={ref}
      className={className}
      data-seat-id={seat.id}
      aria-hidden="true"
      onClick={handleClick}
    >
      <PlayerUI {...playerUiDefaults} {...(seat.playerOverrides ?? {})} />
    </div>
  );
};

export default PlayersOnTable;
