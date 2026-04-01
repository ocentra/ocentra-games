import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GameHeader } from '@ocentra/core-ui';
import { GameEngine } from '@ocentra/game-domain/engine/GameEngine';
import type { GameState, PlayerActionTypeValue } from '@ocentra/game-domain/types/game';
import { AppFooter } from '@/ui/components/AppFooter';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { useNavigate } from 'react-router-dom';
import { AppScreenToken, buildHomePath } from '@/ui/navigation/appRoutes';
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

const SUPPORTED_LOCAL_GAMES = new Set(['claim', 'briscola', 'three-card-brag']);

export const GameScreenPage: React.FC<GameScreenPageProps> = ({ gameModeId }) => {
  const headerProps = useCoreUIHeaderProps();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<LocalPlayableGameBundle | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(1);
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

      const result = await loadLocalPlayableGame(gameModeId);
      if (cancelled) {
        return;
      }

      setBundle(result.bundle);
      setError(result.error);
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      engineRef.current = null;
    };
  }, [gameModeId]);

  const currentPhase = useMemo(
    () => (bundle ? getCurrentMechanicsPhase(bundle.spec, gameState) : null),
    [bundle, gameState],
  );

  const legalActions = useMemo(
    () => (bundle ? getLegalActions(bundle.spec, gameState) : []),
    [bundle, gameState],
  );

  const currentPlayer = gameState ? gameState.players[gameState.currentPlayer] ?? null : null;
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
          name: index === 0 ? 'You' : `Seat ${index + 1}`,
        });
      }

      unsubscribeRef.current = engine.subscribeToUpdates((nextState) => {
        setGameState(nextState);
      });

      engineRef.current = engine;
      await engine.startGame();
      setGameState(engine.getGameState());
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
    setGameState(engine.getGameState());
  };

  const handlePlayCard = (cardId: string) => {
    if (!currentPlayer) {
      return;
    }
    dispatchAction('play_card', currentPlayer.id, { cardId });
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

  const handleBet = () => {
    if (!currentPlayer) {
      return;
    }
    dispatchAction('bet', currentPlayer.id, { amount: betAmount });
  };

  const isSupportedLocalGame = useMemo(() => {
    const candidate = bundle?.gameId || gameModeId.split(':')[0];
    return SUPPORTED_LOCAL_GAMES.has(candidate);
  }, [bundle?.gameId, gameModeId]);

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
                  Manual local session. All hands stay visible so you can drive every seat while validating the mechanics.
                </p>
              </div>

              <div className="playable-game-shell__controls">
                <label className="playable-game-field">
                  <span>Seed</span>
                  <input
                    type="number"
                    value={seed}
                    onChange={(event) => setSeed(Number(event.target.value) || 1)}
                  />
                </label>
                <button
                  type="button"
                  className="playable-game-button playable-game-button--primary"
                  onClick={() => void startMatch()}
                  disabled={!bundle || startingMatch || !isSupportedLocalGame}
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

            {!loading && bundle && !isSupportedLocalGame && (
              <div className="playable-game-panel">
                <p>Local pilot mode is currently limited to Claim, Briscola, and Three Card Brag.</p>
              </div>
            )}

            {bundle && (
              <>
                <section className="playable-game-grid">
                  <article className="playable-game-panel">
                    <h2>Match State</h2>
                    <dl className="playable-game-stats">
                      <div>
                        <dt>Family</dt>
                        <dd>{bundle.familyKernel}</dd>
                      </div>
                      <div>
                        <dt>Phase</dt>
                        <dd>{currentPhase?.label || 'Not started'}</dd>
                      </div>
                      <div>
                        <dt>Legacy Phase</dt>
                        <dd>{gameState?.phase || 'n/a'}</dd>
                      </div>
                      <div>
                        <dt>Round</dt>
                        <dd>{gameState?.round || 0}</dd>
                      </div>
                      <div>
                        <dt>Current Seat</dt>
                        <dd>{currentPlayer?.name || 'n/a'}</dd>
                      </div>
                      <div>
                        <dt>Legal Actions</dt>
                        <dd>{legalActions.join(', ') || 'n/a'}</dd>
                      </div>
                    </dl>
                  </article>

                  <article className="playable-game-panel">
                    <h2>Center Table</h2>
                    <div className="playable-game-zones">
                      <div className="playable-game-zone">
                        <span>Floor / Trump</span>
                        <strong>{gameState?.floorCard ? formatCardLabel(gameState.floorCard) : 'None'}</strong>
                      </div>
                      <div className="playable-game-zone">
                        <span>Trick</span>
                        <strong>
                          {gameState?.mechanicsContext?.tableCards.length
                            ? gameState.mechanicsContext.tableCards.map((entry) => `${entry.playerId}: ${formatCardLabel(entry.card)}`).join(' | ')
                            : 'Empty'}
                        </strong>
                      </div>
                      <div className="playable-game-zone">
                        <span>Pot</span>
                        <strong>{gameState?.mechanicsContext?.roundPot ?? 0}</strong>
                      </div>
                      <div className="playable-game-zone">
                        <span>Deck</span>
                        <strong>{gameState?.deck.length ?? 0}</strong>
                      </div>
                      <div className="playable-game-zone">
                        <span>Discard</span>
                        <strong>
                          {gameState?.discardPile.length
                            ? formatCardLabel(gameState.discardPile[gameState.discardPile.length - 1])
                            : 'Empty'}
                        </strong>
                      </div>
                    </div>
                  </article>
                </section>

                <section className="playable-game-panel">
                  <h2>Players</h2>
                  <div className="playable-game-players">
                    {(gameState?.players ?? []).map((player, index) => (
                      <article
                        key={player.id}
                        className={index === gameState?.currentPlayer ? 'playable-game-player playable-game-player--active' : 'playable-game-player'}
                      >
                        <header>
                          <h3>{player.name}</h3>
                          <span>Score {player.score}</span>
                        </header>
                        <p>{describePlayer(player, gameState).join(' · ') || 'No flags'}</p>
                        <div className="playable-game-cards playable-game-cards--compact">
                          {player.hand.map((card) => (
                            <span key={card.id} className="playable-game-card-chip">
                              {formatCardLabel(card)}
                            </span>
                          ))}
                          {player.hand.length === 0 && <span className="playable-game-card-chip playable-game-card-chip--muted">No cards</span>}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="playable-game-grid playable-game-grid--actions">
                  <article className="playable-game-panel">
                    <h2>Current Hand</h2>
                    <div className="playable-game-cards">
                      {(currentPlayer?.hand ?? []).map((card) => {
                        const canPlayCard = legalActions.includes('play_card');
                        const isSelected = selectedCardId === card.id;
                        return (
                          <button
                            key={card.id}
                            type="button"
                            className={isSelected ? 'playable-game-card playable-game-card--selected' : 'playable-game-card'}
                            onClick={() => {
                              if (canPlayCard) {
                                handlePlayCard(card.id);
                                return;
                              }
                              setSelectedCardId(card.id);
                            }}
                          >
                            <span>{formatCardLabel(card)}</span>
                            {!canPlayCard && <small>{isSelected ? 'Selected discard' : 'Select'}</small>}
                          </button>
                        );
                      })}
                      {!currentPlayer?.hand.length && <p>No active hand.</p>}
                    </div>
                  </article>

                  <article className="playable-game-panel">
                    <h2>Actions</h2>
                    <div className="playable-game-action-list">
                      {legalActions.includes('pass') && (
                        <button type="button" className="playable-game-button" onClick={() => handleSimpleAction('pass')}>
                          Pass
                        </button>
                      )}
                      {legalActions.includes('pick_up') && (
                        <button type="button" className="playable-game-button" onClick={handlePickUp}>
                          Pick Up and Discard Selected
                        </button>
                      )}
                      {legalActions.includes('call_showdown') && (
                        <button type="button" className="playable-game-button" onClick={() => handleSimpleAction('call_showdown')}>
                          Call Showdown
                        </button>
                      )}
                      {legalActions.includes('fold') && (
                        <button type="button" className="playable-game-button" onClick={() => handleSimpleAction('fold')}>
                          Fold
                        </button>
                      )}
                      {legalActions.includes('bet') && (
                        <div className="playable-game-inline-action">
                          <label className="playable-game-field">
                            <span>Bet</span>
                            <input
                              type="number"
                              min={1}
                              value={betAmount}
                              onChange={(event) => setBetAmount(Math.max(1, Number(event.target.value) || 1))}
                            />
                          </label>
                          <button type="button" className="playable-game-button" onClick={handleBet}>
                            Place Bet
                          </button>
                        </div>
                      )}
                      {legalActions.includes('declare') && (
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
                          {revealablePlayers.length === 0 && <p>All remaining players have revealed.</p>}
                        </div>
                      )}
                      {!gameState && <p>Start a match to enable actions.</p>}
                    </div>
                  </article>
                </section>

                <section className="playable-game-panel">
                  <h2>Engine Snapshot</h2>
                  <pre className="playable-game-debug">
                    {JSON.stringify(gameState, null, 2)}
                  </pre>
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
