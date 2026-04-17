import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { GameHeader } from '@ocentra/core-ui';
import { GameEngine } from '@ocentra/game-domain/engine/GameEngine';
import type { Card, GameState, Player, PlayerActionTypeValue } from '@ocentra/game-domain/types/game';
import { GamePhase } from '@ocentra/game-domain/types/game';
import { AppFooter } from '@/ui/components/AppFooter';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { useNavigate } from 'react-router-dom';
import { AppScreenToken, buildHomePath } from '@/ui/navigation/appRoutes';
import CenterTableSvg from '@/ui/components/GameScreen/CardGameScreen/CardGameComponents/CenterTableSvg';
import type { CenterTableSVGProps } from '@/ui/components/GameScreen/CardGameScreen/CardGameComponents/CenterTableSvg';
import GameBackground from '@/ui/components/GameScreen/CardGameScreen/CardGameComponents/GameBackground';
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

function toCenterTableProps(
  table: LocalPlayableGameBundle['layoutPreset']['table'],
): Partial<CenterTableSVGProps> {
  return {
    width: table.width,
    height: table.height,
    offsetX: table.offsetX,
    offsetY: table.offsetY,
    curvature: table.curvature,
    rimThickness: table.rimThickness,
    rimColor: table.rimColor,
    rimGlowColor: table.rimGlowColor,
    rimGlowIntensity: table.rimGlowIntensity,
    rimGlowSpread: table.rimGlowSpread,
    rimGlowThickness: table.rimGlowThickness,
    rimGlowBlendMode: table.rimGlowBlendMode as CSSProperties['mixBlendMode'] | undefined,
    innerRimThickness: table.innerRimThickness,
    innerRimColor: table.innerRimColor,
    innerRimTexture: table.innerRimTexture,
    innerRimTextureBlendMode: table.innerRimTextureBlendMode as CSSProperties['mixBlendMode'] | undefined,
    innerRimTextureOpacity: table.innerRimTextureOpacity,
    feltInner: table.feltInner,
    feltOuter: table.feltOuter,
    feltInset: table.feltInset,
    emblemSize: table.emblemSize,
    emblemInnerColor: table.emblemInnerColor,
    emblemOuterColor: table.emblemOuterColor,
    emblemBlendMode: table.emblemBlendMode as CSSProperties['mixBlendMode'] | undefined,
  };
}

export const GameScreenPage: React.FC<GameScreenPageProps> = ({ gameModeId }) => {
  const headerProps = useCoreUIHeaderProps();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<LocalPlayableGameBundle | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [seed, setSeed] = useState(42);
  const [startingMatch, setStartingMatch] = useState(false);
  const engineRef = useRef<GameEngine | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setBundle(null);
      setGameState(null);

      try {
        const result = await loadLocalPlayableGame(gameModeId);
        if (cancelled) {
          return;
        }

        setBundle(result.bundle);
        setError(result.error);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setBundle(null);
        setError(loadError instanceof Error ? loadError.message : String(loadError));
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
  const centerTableProps = useMemo<Partial<CenterTableSVGProps>>(
    () => (bundle ? toCenterTableProps(bundle.layoutPreset.table) : {}),
    [bundle],
  );
  const winners = useMemo(() => (gameState ? getWinningPlayers(gameState.players) : []), [gameState]);

  const handleHome = () => {
    if (window.history && window.history.pushState) {
      window.history.pushState({ screen: AppScreenToken.Home }, '', buildHomePath());
    }
    EventBus.instance.publish(new ShowScreenEvent(AppScreenToken.Home));
    navigate(buildHomePath());
  };

  const startMatch = async () => {
    if (!bundle) {
      return;
    }

    unsubscribeRef.current?.();
    unsubscribeRef.current = null;

    const engine = new GameEngine({
      deckProvider: bundle.createDeckProvider(seed),
    });

    setStartingMatch(true);
    setError(null);
    setSelectedCardId(null);

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
  };

  const dispatchAction = (type: PlayerActionTypeValue, playerId: string, data?: unknown) => {
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
      setSelectedCardId(null);
      setGameState(cloneGameStateSnapshot(engine.getGameState()));
    };

  const handlePickUp = () => {
    if (!currentPlayer || !selectedCardId) {
      setError('Select a card to discard after picking up the floor card.');
      return;
    }

    dispatchAction('pick_up', currentPlayer.id, { discardCardId: selectedCardId });
  };

  const handleDeclare = (suit: string) => {
    if (!currentPlayer) {
      return;
    }

    dispatchAction('declare', currentPlayer.id, { suit });
  };

  const handleSimpleAction = (type: PlayerActionTypeValue) => {
    if (!currentPlayer) {
      return;
    }

    dispatchAction(type, currentPlayer.id);
  };

  const handleReveal = (playerId: string) => {
    dispatchAction('reveal_hand', playerId);
  };

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
          transform: `translate(-50%, -50%) rotate(${seat.rotation ?? 0}deg) scale(${Math.max(0.82, (seat.scale ?? 0.5) * 1.6)})`,
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
      <GameBackground />

      <div className="playable-game-screen__layer">
        <GameHeader
          {...headerProps}
          onHomeClick={handleHome}
        />

        <main className="playable-game-screen__content">
          <section className="playable-game-shell">
            <header className="playable-game-shell__header">
              <div>
                <p className="playable-game-shell__eyebrow">Local Pilot</p>
                <h1 className="playable-game-shell__title">
                  {bundle?.displayName || gameModeId}
                </h1>
                <p className="playable-game-shell__subtitle">
                  Claim local pilot: seeded local runtime, visible hands, and layout-driven seating so you can validate the mechanics on a real table.
                </p>
              </div>

              <div className="playable-game-shell__controls">
                <label className="playable-game-field">
                  <span>Seed</span>
                  <input
                    data-testid="claim-pilot-seed"
                    type="number"
                    value={seed}
                    onChange={(event) => setSeed(Number(event.target.value) || 1)}
                  />
                </label>
                <button
                  type="button"
                  data-testid="claim-pilot-start"
                  className="playable-game-button playable-game-button--primary"
                  onClick={() => void startMatch()}
                  disabled={!bundle || startingMatch}
                >
                  {startingMatch ? 'Starting...' : gameState ? 'Restart Match' : 'Start Match'}
                </button>
              </div>
            </header>

            {loading && (
              <div className="playable-game-panel">
                <p>Loading game assets...</p>
              </div>
            )}

            {!loading && error && (
              <div className="playable-game-panel playable-game-panel--error">
                <pre>{error}</pre>
              </div>
            )}

            {!loading && !bundle && !error && (
              <div className="playable-game-panel">
                <p>Game bundle could not be loaded.</p>
              </div>
            )}

            {!loading && bundle && (
              <>
                {isGameOver && (
                  <section className="playable-game-panel playable-game-panel--gameover" data-testid="claim-pilot-game-over">
                    <h2>Game Over</h2>
                    <p>
                      {winners.length > 1
                        ? `Tie game between ${winners.map((player) => player.name).join(', ')}.`
                        : `Winner: ${winners[0]?.name ?? 'Unknown'}.`}
                    </p>
                    <div className="playable-game-gameover__scores">
                      {gameState.players
                        .slice()
                        .sort((left, right) => right.score - left.score)
                        .map((player) => (
                          <div key={player.id} className="playable-game-gameover__score">
                            <strong>{player.name}</strong>
                            <span>{player.score}</span>
                          </div>
                        ))}
                    </div>
                  </section>
                )}

                <section className="playable-table-stage" data-testid="claim-pilot-table">
                  <CenterTableSvg
                    {...centerTableProps}
                    minScale={0.42}
                    maxScale={0.92}
                    responsivePaddingX={64}
                    responsivePaddingY={72}
                    containerClassName="playable-table-stage__table"
                  />

                  <div className="playable-table-stage__status">
                    <span className="playable-table-stage__phase">{isGameOver ? 'Game Over' : currentPhase?.label || 'Ready to start'}</span>
                    <span>Round {gameState?.round ?? 1}</span>
                    <span>
                      {isGameOver
                        ? 'Final scores locked'
                        : gameState
                          ? `${currentPlayer?.name || 'Seat'} to act`
                          : `${bundle.playerCount} seats staged`}
                    </span>
                  </div>

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

                  {!gameState && (
                    <div className="playable-table-stage__empty">
                      <h2>Ready to deal Claim</h2>
                      <p>
                        The Claim layout asset positioned the seats. Start the seeded match to deal three cards to each player and reveal the floor card.
                      </p>
                    </div>
                  )}
                </section>

                <section className="playable-game-grid playable-game-grid--table">
                  <article className="playable-game-panel">
                    <h2>Current Hand</h2>
                    {gameState && currentPlayer ? (
                      <>
                        <p className="playable-game-panel__lede">
                          {currentPlayer.name} is active.
                          {currentPlayer.declaredSuit
                            ? ` Declared suit: ${currentPlayer.declaredSuit}.`
                            : ' Select a suit to declare or pick up the floor card.'}
                        </p>
                        <div className="playable-game-cards" data-testid="claim-pilot-current-hand">
                          {currentPlayer.hand.map((card) => {
                            const isSelected = selectedCardId === card.id;
                            return (
                              <button
                                key={card.id}
                                type="button"
                                className={isSelected ? 'playable-game-card playable-game-card--selected' : 'playable-game-card'}
                                onClick={() => setSelectedCardId(card.id)}
                              >
                                <span>{formatCardLabel(card)}</span>
                                <small>{isSelected ? 'Selected discard' : 'Select discard'}</small>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <p className="playable-game-panel__lede">Start the match to deal visible hands and enable Claim actions.</p>
                    )}
                  </article>

                  <article className="playable-game-panel">
                    <h2>Actions</h2>
                    <div className="playable-game-action-list">
                      <dl className="playable-game-stats playable-game-stats--compact">
                        <div>
                          <dt>Family</dt>
                          <dd>{bundle.familyKernel}</dd>
                        </div>
                        <div>
                          <dt>Legacy Phase</dt>
                          <dd>{gameState?.phase || 'n/a'}</dd>
                        </div>
                        <div>
                          <dt>Legal Actions</dt>
                          <dd>{legalActions.join(', ') || 'n/a'}</dd>
                        </div>
                      </dl>

                      {legalActions.includes('pass') && (
                        <button type="button" className="playable-game-button" onClick={() => handleSimpleAction('pass')}>
                          Pass
                        </button>
                      )}
                      {legalActions.includes('pick_up') && (
                        <button
                          type="button"
                          className="playable-game-button"
                          onClick={handlePickUp}
                          disabled={!selectedCardId}
                        >
                          Pick Up And Discard Selected
                        </button>
                      )}
                      {legalActions.includes('call_showdown') && (
                        currentPlayer?.declaredSuit ? (
                          <button type="button" className="playable-game-button" onClick={() => handleSimpleAction('call_showdown')}>
                            Call Showdown
                          </button>
                        ) : (
                          <p>Declare a suit before calling showdown.</p>
                        )
                      )}
                      {legalActions.includes('declare') && currentPlayer?.declaredSuit === null && (
                        <div className="playable-game-inline-action playable-game-inline-action--wrap">
                          {distinctDeclareSuits.map((suit) => (
                            <button
                              key={suit}
                              type="button"
                              className="playable-game-button"
                              onClick={() => handleDeclare(suit)}
                            >
                              Declare {suit}
                            </button>
                          ))}
                        </div>
                      )}
                      {legalActions.includes('reveal_hand') && (
                        <div className="playable-game-inline-action playable-game-inline-action--wrap">
                          {revealablePlayers.map((player) => (
                            <button
                              key={player.id}
                              type="button"
                              className="playable-game-button"
                              onClick={() => handleReveal(player.id)}
                            >
                              Reveal {player.name}
                            </button>
                          ))}
                          {revealablePlayers.length === 0 && <p>All remaining players have already revealed.</p>}
                        </div>
                      )}
                    </div>
                  </article>
                </section>

                <section className="playable-game-panel">
                  <details>
                    <summary>Debug Snapshot</summary>
                    <pre className="playable-game-debug">
                      {JSON.stringify(gameState, null, 2)}
                    </pre>
                  </details>
                </section>
              </>
            )}
          </section>
        </main>

        <AppFooter />
      </div>
    </div>
  );
};

export default GameScreenPage;

export const ClaimGameScreenPage: React.FC = () => (
  <GameScreenPage gameModeId="claim" />
);
