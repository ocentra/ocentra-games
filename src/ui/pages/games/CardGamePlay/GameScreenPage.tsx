import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameEngine } from '@ocentra/game-domain/engine/GameEngine';
import type { Card, GameState, Player, PlayerActionTypeValue } from '@ocentra/game-domain/types/game';
import { GamePhase } from '@ocentra/game-domain/types/game';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { useNavigate } from 'react-router-dom';
import { AppScreenToken, buildHomePath } from '@/ui/navigation/appRoutes';
import { CardGameTemplatePage } from '@ocentra/card-game-ui/CardGameTemplatePage';
import type { HudArtworkControls } from '@ocentra/card-game-ui/scene/HudArtwork.types';
import { cloneCardGameLayoutDocument } from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import './GameScreenPage.css';
import {
  describePlayer,
  formatCardLabel,
  getCurrentMechanicsPhase,
  getLegalActions,
  loadLocalPlayableGame,
  type LocalPlayableGameBundle,
} from './playableSession';

interface GameScreenPageProps {
  gameModeId: string;
}

interface HudActionDescriptor {
  label: string;
  onClick: () => void;
}

const LOCAL_PILOT_PLAYER_COUNT = 2;
const AUTO_START_COUNTDOWN_SECONDS = 3;

function getSeatName(index: number): string {
  return index === 0 ? 'You' : `Seat ${index + 1}`;
}

function formatCardShortLabel(card: Card): string {
  const valueMap: Record<number, string> = {
    14: 'A',
    13: 'K',
    12: 'Q',
    11: 'J',
  };
  const suitMap: Record<string, string> = {
    spades: 'SP',
    hearts: 'HE',
    diamonds: 'DI',
    clubs: 'CL',
  };

  return `${valueMap[card.value] ?? String(card.value)} ${suitMap[card.suit] ?? card.suit.slice(0, 2).toUpperCase()}`;
}

function getWinningPlayers(players: Player[]): Player[] {
  if (players.length === 0) {
    return [];
  }

  const topScore = Math.max(...players.map((player) => player.score));
  return players.filter((player) => player.score === topScore);
}

function cloneGameStateSnapshot(state: GameState | null): GameState | null {
  if (!state) {
    return null;
  }

  if (typeof structuredClone === 'function') {
    return structuredClone(state) as GameState;
  }

  return {
    ...state,
    players: state.players.map((player) => ({
      ...player,
      hand: [...player.hand],
      intentCard: player.intentCard ? { ...player.intentCard } : null,
    })),
    deck: [...state.deck],
    floorCard: state.floorCard ? { ...state.floorCard } : null,
    discardPile: [...state.discardPile],
    startTime: new Date(state.startTime),
    lastAction: new Date(state.lastAction),
    mechanicsContext: state.mechanicsContext
      ? {
          ...state.mechanicsContext,
          revealedPlayerIds: [...state.mechanicsContext.revealedPlayerIds],
          tableCards: [...state.mechanicsContext.tableCards].map((entry) => ({
            playerId: entry.playerId,
            card: { ...entry.card },
          })),
          capturedCardsByPlayerId: Object.fromEntries(
            Object.entries(state.mechanicsContext.capturedCardsByPlayerId).map(([playerId, cards]) => [
              playerId,
              cards.map((card) => ({ ...card })),
            ]),
          ),
          foldedPlayerIds: [...state.mechanicsContext.foldedPlayerIds],
          trumpCard: state.mechanicsContext.trumpCard ? { ...state.mechanicsContext.trumpCard } : null,
        }
      : undefined,
  };
}

export const GameScreenPage: React.FC<GameScreenPageProps> = ({ gameModeId }) => {
  const headerProps = useCoreUIHeaderProps();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<LocalPlayableGameBundle | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [seed, setSeed] = useState(42);
  const [startingMatch, setStartingMatch] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const autoStartArmedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setBundle(null);
      setGameState(null);

      try {
        const result = await loadLocalPlayableGame(gameModeId, LOCAL_PILOT_PLAYER_COUNT);
        if (cancelled) {
          return;
        }

        setBundle(result.bundle);
        setError(result.error);
        setCountdown(result.bundle ? AUTO_START_COUNTDOWN_SECONDS : null);
        autoStartArmedRef.current = false;
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setBundle(null);
        setError(loadError instanceof Error ? loadError.message : String(loadError));
        setCountdown(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      engineRef.current = null;
    };
  }, [gameModeId]);

  useEffect(() => {
    const hideLoading = (globalThis as Record<string, unknown>).__hideAppLoading as (() => void) | undefined;
    hideLoading?.();
  }, []);

  const currentPhase = useMemo(
    () => (bundle ? getCurrentMechanicsPhase(bundle.spec, gameState) : null),
    [bundle, gameState],
  );

  const legalActions = useMemo(
    () => (bundle ? getLegalActions(bundle.spec, gameState) : []),
    [bundle, gameState],
  );

  const currentPlayer = gameState ? gameState.players[gameState.currentPlayer] ?? null : null;
  const isGameOver = gameState?.phase === GamePhase.GAME_END;
  const distinctDeclareSuits = useMemo(
    () => Array.from(new Set(currentPlayer?.hand.map((card) => card.suit) ?? [])),
    [currentPlayer],
  );

  const revealablePlayers = useMemo(() => {
    if (!gameState) {
      return [];
    }

    const revealed = new Set(gameState.mechanicsContext?.revealedPlayerIds ?? []);
    const folded = new Set(gameState.mechanicsContext?.foldedPlayerIds ?? []);
    return gameState.players.filter((player) => !revealed.has(player.id) && !folded.has(player.id));
  }, [gameState]);

  const orderedSeats = useMemo(
    () => [...(bundle?.layoutPreset.seats ?? [])].sort((left, right) => left.id - right.id),
    [bundle?.layoutPreset.seats],
  );
  const winners = useMemo(() => (gameState ? getWinningPlayers(gameState.players) : []), [gameState]);

  const handleHome = () => {
    if (window.history && window.history.pushState) {
      window.history.pushState({ screen: AppScreenToken.Home }, '', buildHomePath());
    }
    EventBus.instance.publish(new ShowScreenEvent(AppScreenToken.Home));
    navigate(buildHomePath());
  };

  const startMatch = useCallback(async () => {
    if (!bundle) {
      return;
    }

    unsubscribeRef.current?.();
    unsubscribeRef.current = null;

    const engine = new GameEngine({
      deckProvider: bundle.createDeckProvider(seed),
    });

    setStartingMatch(true);
    setCountdown(null);
    setError(null);

    try {
      await engine.initializeGame({
        maxPlayers: bundle.playerCount,
        enablePhysics: false,
        seed,
      });
      engine.loadMechanicsSpec(bundle.spec);

      for (let index = 0; index < bundle.playerCount; index += 1) {
        engine.addPlayer({
          id: `p${index + 1}`,
          name: getSeatName(index),
        });
      }

      unsubscribeRef.current = engine.subscribeToUpdates((nextState) => {
        setGameState(cloneGameStateSnapshot(nextState));
      });

      engineRef.current = engine;
      await engine.startGame();
      setGameState(cloneGameStateSnapshot(engine.getGameState()));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setStartingMatch(false);
    }
  }, [bundle, seed]);

  const dispatchAction = useCallback((type: PlayerActionTypeValue, playerId: string, data?: unknown) => {
    const engine = engineRef.current;
    const state = engine?.getGameState();
    if (!engine || !state) {
      return;
    }

    const result = engine.processPlayerAction({
      type,
      playerId,
      data,
      timestamp: new Date(state.lastAction.getTime() + 1000),
    });

    if (!result?.isValid) {
      setError(result?.errors.join('\n') || 'Action failed.');
      return;
    }

    setError(null);
    setGameState(cloneGameStateSnapshot(engine.getGameState()));
  }, []);

  const handleDeclare = useCallback((suit: string) => {
    if (!currentPlayer) {
      return;
    }

    dispatchAction('declare', currentPlayer.id, { suit });
  }, [currentPlayer, dispatchAction]);

  const handleSimpleAction = useCallback((type: PlayerActionTypeValue) => {
    if (!currentPlayer) {
      return;
    }

    dispatchAction(type, currentPlayer.id);
  }, [currentPlayer, dispatchAction]);

  const handleReveal = useCallback((playerId: string) => {
    dispatchAction('reveal_hand', playerId);
  }, [dispatchAction]);

  useEffect(() => {
    if (loading || error || !bundle || gameState || startingMatch || autoStartArmedRef.current) {
      return;
    }

    autoStartArmedRef.current = true;
    setCountdown(AUTO_START_COUNTDOWN_SECONDS);

    const intervalId = window.setInterval(() => {
      setCountdown((current) => {
        if (current === null) {
          return null;
        }
        if (current <= 1) {
          window.clearInterval(intervalId);
          void startMatch();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [bundle, error, gameState, loading, startMatch, startingMatch]);

  const hudActions = useMemo<HudActionDescriptor[]>(() => {
    if (!bundle || !gameState || !currentPlayer) {
      return [];
    }

    const actions: HudActionDescriptor[] = [];

    if (legalActions.includes('declare') && currentPlayer.declaredSuit === null) {
      distinctDeclareSuits.forEach((suit) => {
        actions.push({
          label: `Declare ${suit.slice(0, 3).toUpperCase()}`,
          onClick: () => handleDeclare(suit),
        });
      });
    }

    if (legalActions.includes('pick_up')) {
      currentPlayer.hand.forEach((card) => {
        actions.push({
          label: `Pick ${formatCardShortLabel(card)}`,
          onClick: () => dispatchAction('pick_up', currentPlayer.id, { discardCardId: card.id }),
        });
      });
    }

    if (legalActions.includes('call_showdown')) {
      actions.push({
        label: 'Showdown',
        onClick: () => handleSimpleAction('call_showdown'),
      });
    }

    if (legalActions.includes('reveal_hand')) {
      revealablePlayers.forEach((player) => {
        actions.push({
          label: `Reveal ${player.name}`,
          onClick: () => handleReveal(player.id),
        });
      });
    }

    if (legalActions.includes('pass')) {
      actions.push({
        label: 'Pass',
        onClick: () => handleSimpleAction('pass'),
      });
    }

    return actions.slice(0, 6);
  }, [
    bundle,
    currentPlayer,
    dispatchAction,
    distinctDeclareSuits,
    gameState,
    handleDeclare,
    handleReveal,
    handleSimpleAction,
    legalActions,
    revealablePlayers,
  ]);

  const runtimeHudControls = useMemo<HudArtworkControls | undefined>(() => {
    if (!bundle) {
      return undefined;
    }

    const nextDocument = cloneCardGameLayoutDocument(bundle.layoutDocument);
    const nextLabels = Array.from({ length: 6 }, (_, index) => hudActions[index]?.label ?? '');
    nextDocument.hud.buttonLabels = nextLabels;
    nextDocument.hud.buttonCount = Math.max(1, Math.min(6, hudActions.length || 1));
    nextDocument.hud.layerVisibility = {
      ...nextDocument.hud.layerVisibility,
      table: false,
      seats: false,
    };
    return nextDocument.hud;
  }, [bundle, hudActions]);

  const handleHudButtonClick = useCallback((index: number) => {
    hudActions[index]?.onClick();
  }, [hudActions]);

  useEffect(() => {
    if (gameState || startingMatch) {
      setCountdown(null);
    }
  }, [gameState, startingMatch]);

  const renderSeat = (seatId: number, player: Player | null) => {
    const seat = orderedSeats.find((entry) => entry.id === seatId);
    if (!seat) {
      return null;
    }

    const details = player ? describePlayer(player, gameState) : [];
    const isActive = seatId === gameState?.currentPlayer;
    const isPlaceholder = !player;

    return (
      <article
        key={seat.id}
        className={
          isActive
            ? 'playable-seat playable-seat--active'
            : isPlaceholder
              ? 'playable-seat playable-seat--placeholder'
              : 'playable-seat'
        }
        style={{
          left: `${seat.position.x * 100}%`,
          top: `${seat.position.y * 100}%`,
          transform: `translate(-50%, -50%) rotate(${seat.rotation ?? 0}deg) scale(${seat.scale ?? 1})`,
        }}
      >
        <header className="playable-seat__header">
          <div>
            <h3>{player?.name ?? getSeatName(seat.id)}</h3>
            <p>{[isActive ? 'Current turn' : 'Waiting', ...details].filter(Boolean).join(' | ') || 'Waiting'}</p>
          </div>
          <span className="playable-seat__score">Score {player?.score ?? 0}</span>
        </header>

        <div className="playable-seat__cards">
          {(player?.hand ?? []).map((card) => (
            <span key={card.id} className="playable-seat__card">
              {formatCardShortLabel(card)}
            </span>
          ))}
          {(!player || player.hand.length === 0) && (
            <span className="playable-seat__card playable-seat__card--muted">
              {player ? 'No cards' : 'Seat reserved'}
            </span>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="playable-game-screen">
      <CardGameTemplatePage
        document={bundle?.layoutDocument}
        playerCount={bundle?.playerCount ?? LOCAL_PILOT_PLAYER_COUNT}
        headerProps={headerProps}
        footerVersion="1.0.0-dev"
        onHomeClick={handleHome}
        hudControlsOverride={runtimeHudControls}
        onHudButtonClick={(index) => handleHudButtonClick(index)}
        arenaOverlay={bundle ? (
          <div className="playable-table-stage" data-testid="claim-pilot-table">
            <div className="playable-table-stage__zones">
              <div className="playable-table-zone playable-table-zone--deck" data-testid="claim-pilot-deck-zone">
                <span>Deck</span>
                <strong>{gameState?.deck.length ?? bundle.deckSize}</strong>
              </div>
              <div className="playable-table-zone playable-table-zone--floor" data-testid="claim-pilot-floor-zone">
                <span>Floor Card</span>
                <strong>{gameState?.floorCard ? formatCardLabel(gameState.floorCard) : 'Waiting for deal'}</strong>
              </div>
              <div className="playable-table-zone playable-table-zone--discard" data-testid="claim-pilot-discard-zone">
                <span>Discard</span>
                <strong>
                  {gameState?.discardPile.length
                    ? formatCardLabel(gameState.discardPile[gameState.discardPile.length - 1])
                    : 'Empty'}
                </strong>
              </div>
              <div className="playable-table-zone playable-table-zone--pot" data-testid="claim-pilot-pot-zone">
                <span>Pot</span>
                <strong>{gameState?.mechanicsContext?.roundPot ?? 0}</strong>
              </div>
              <div className="playable-table-zone playable-table-zone--trick">
                <span>Table Cards</span>
                <strong>
                  {gameState?.mechanicsContext?.tableCards?.length
                    ? gameState.mechanicsContext.tableCards.map((entry) => `${entry.playerId}: ${formatCardShortLabel(entry.card)}`).join(' | ')
                    : 'None'}
                </strong>
              </div>
            </div>

            <div className="playable-table-stage__seats">
              {orderedSeats.map((seat) => renderSeat(seat.id, gameState?.players[seat.id] ?? null))}
            </div>

            {!gameState ? (
              <div className="playable-table-stage__empty">
                <h2>Starting local pilot</h2>
                <p>
                  {loading
                    ? 'Loading Claim assets...'
                    : countdown && countdown > 0
                      ? `Dealing a 2-player test table in ${countdown}...`
                  : 'Preparing the first deal.'}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
        stageOverlay={(
          <>
            <div className="playable-template-status">
              <span className="playable-template-status__item playable-template-status__item--accent">
                {isGameOver ? 'Game Over' : currentPhase?.label || (loading ? 'Loading' : 'Standby')}
              </span>
              <span className="playable-template-status__item">2P Local Pilot</span>
              <span className="playable-template-status__item">Round {gameState?.round ?? 1}</span>
              <span className="playable-template-status__item">
                {startingMatch
                  ? 'Dealing...'
                  : gameState
                    ? `${currentPlayer?.name || 'Seat'} to act`
                    : countdown && countdown > 0
                      ? `Starting in ${countdown}`
                      : 'Booting table'}
              </span>
            </div>

            <aside className="playable-pilot-panel">
              <div className="playable-pilot-panel__header">
                <div>
                  <p className="playable-pilot-panel__eyebrow">Local Pilot</p>
                  <h2>{bundle?.displayName || gameModeId}</h2>
                </div>
                <button
                  type="button"
                  className="playable-pilot-panel__restart"
                  onClick={() => {
                    autoStartArmedRef.current = true;
                    setCountdown(null);
                    void startMatch();
                  }}
                  disabled={!bundle || startingMatch}
                >
                  {startingMatch ? 'Starting...' : gameState ? 'Redeal' : 'Start Now'}
                </button>
              </div>

              <label className="playable-pilot-panel__field">
                <span>Seed</span>
                <input
                  data-testid="claim-pilot-seed"
                  type="number"
                  value={seed}
                  onChange={(event) => setSeed(Number(event.target.value) || 1)}
                />
              </label>

              {error ? (
                <div className="playable-pilot-panel__error">
                  {error}
                </div>
              ) : null}

              {isGameOver ? (
                <div className="playable-pilot-panel__section">
                  <strong>Result</strong>
                  <p>
                    {winners.length > 1
                      ? `Tie game between ${winners.map((player) => player.name).join(', ')}.`
                      : `Winner: ${winners[0]?.name ?? 'Unknown'}.`}
                  </p>
                </div>
              ) : null}

              <div className="playable-pilot-panel__section">
                <strong>Current Hand</strong>
                <div className="playable-pilot-panel__cards" data-testid="claim-pilot-current-hand">
                  {currentPlayer?.hand.length ? currentPlayer.hand.map((card) => (
                    <span key={card.id} className="playable-pilot-panel__card">
                      {formatCardLabel(card)}
                    </span>
                  )) : (
                    <span className="playable-pilot-panel__chip playable-pilot-panel__chip--muted">
                      {loading ? 'Loading...' : 'Waiting for first deal'}
                    </span>
                  )}
                </div>
              </div>
            </aside>
          </>
        )}
      />
    </div>
  );
};

export default GameScreenPage;

export const ClaimGameScreenPage: React.FC = () => (
  <GameScreenPage gameModeId="claim" />
);
