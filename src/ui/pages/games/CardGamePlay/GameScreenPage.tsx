import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameEngine } from '@ocentra/game-domain/engine/GameEngine';
import { createClaimBotAction } from '@ocentra/game-domain/engine/mechanics/family/ClaimFamilyResolver';
import type { GameState, PlayerActionTypeValue, Suit } from '@ocentra/game-domain/types/game';
import { AIPersonality, GamePhase } from '@ocentra/game-domain/types/game';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { useNavigate } from 'react-router-dom';
import { AppScreenToken, buildHomePath } from '@/ui/navigation/appRoutes';
import { CardGameTemplatePage } from '@ocentra/card-game-ui/CardGameTemplatePage';
import type {
  CardGameSeatPresentation,
  CardGameZonePresentation,
} from '@ocentra/card-game-ui/CardGamePreviewSurface';
import {
  LocalPilotArenaOverlay,
  LocalPilotStageOverlay,
} from '@ocentra/card-game-ui/localPilot/LocalPilotRuntimePresentation';
import {
  buildLocalPilotCardStripPresentation,
  buildLocalPilotHudActions,
  buildLocalPilotHudControls,
  buildLocalPilotScoreboardPresentation,
  buildLocalPilotSeatPresentation,
  buildLocalPilotZonePresentation,
  getLocalPilotWinnerText,
  type LocalPilotHudActionDescriptor,
} from '@ocentra/card-game-ui/localPilot/localPilotRuntimeHelpers';
import type { HudArtworkControls } from '@ocentra/card-game-ui/scene/HudArtwork.types';
import './GameScreenPage.css';
import {
  getLegalActions,
  loadLocalPlayableGame,
  type LocalPlayableGameBundle,
} from './playableSession';

interface GameScreenPageProps {
  gameModeId: string;
}

const LOCAL_PILOT_PLAYER_COUNT = 4;
const AUTO_START_COUNTDOWN_SECONDS = 3;
const BOT_ACTION_DELAY_MS = 350;

function getSeatName(index: number): string {
  return index === 0 ? 'You' : `Seat ${index + 1}`;
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
          familyState: state.mechanicsContext.familyState
            ? JSON.parse(JSON.stringify(state.mechanicsContext.familyState)) as Record<string, unknown>
            : undefined,
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
  const [seed] = useState(42);
  const [startingMatch, setStartingMatch] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timerNow, setTimerNow] = useState(() => Date.now());
  const engineRef = useRef<GameEngine | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const autoStartArmedRef = useRef(false);
  const botActionKeyRef = useRef<string | null>(null);

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
        botActionKeyRef.current = null;
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

  const legalActions = useMemo(
    () => (bundle ? getLegalActions(bundle.spec, gameState) : []),
    [bundle, gameState],
  );

  const currentPlayer = gameState ? gameState.players[gameState.currentPlayer] ?? null : null;
  const isGameOver = gameState?.phase === GamePhase.GAME_END;
  const distinctDeclareSuits = useMemo(
    () => Array.from(new Set(
      currentPlayer?.hand
        .map((card) => card.suit)
        .filter((suit): suit is Suit => typeof suit === 'string' && suit.length > 0) ?? [],
    )),
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

  const winnersText = useMemo(
    () => (gameState ? getLocalPilotWinnerText(gameState.players) : null),
    [gameState],
  );

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
          aiPersonality: index > 0 ? AIPersonality.ADAPTIVE : undefined,
          isAI: index > 0,
          name: getSeatName(index),
        });
      }

      unsubscribeRef.current = engine.subscribeToUpdates((nextState) => {
        setGameState(cloneGameStateSnapshot(nextState));
      });

      engineRef.current = engine;
      botActionKeyRef.current = null;
      await engine.startGame();
      setGameState(cloneGameStateSnapshot(engine.getGameState()));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setStartingMatch(false);
    }
  }, [bundle, seed]);

  useEffect(() => {
    if (!bundle || !gameState || isGameOver || startingMatch) {
      return undefined;
    }

    const currentBot = gameState.players[gameState.currentPlayer] ?? null;
    if (!currentBot?.isAI) {
      botActionKeyRef.current = null;
      return undefined;
    }

    const actionKey = [
      gameState.id,
      gameState.round,
      gameState.currentPlayer,
      gameState.lastAction.getTime(),
      gameState.mechanicsContext?.lastMechanicsAction ?? '',
      gameState.mechanicsContext?.familyState
        ? JSON.stringify(gameState.mechanicsContext.familyState)
        : '',
    ].join(':');
    if (botActionKeyRef.current === actionKey) {
      return undefined;
    }
    botActionKeyRef.current = actionKey;

    const timeoutId = window.setTimeout(() => {
      const engine = engineRef.current;
      const state = engine?.getGameState();
      if (!engine || !state) {
        return;
      }

      const botPlayer = state.players[state.currentPlayer] ?? null;
      if (!botPlayer?.isAI) {
        return;
      }

      const action = createClaimBotAction(state, bundle.spec, botPlayer.id, { seed });
      if (!action) {
        return;
      }

      const result = engine.processPlayerAction(action);
      if (!result?.isValid) {
        setError(result?.errors.join('\n') || 'Bot action failed.');
        return;
      }

      setError(null);
      setGameState(cloneGameStateSnapshot(engine.getGameState()));
    }, BOT_ACTION_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [bundle, gameState, isGameOver, seed, startingMatch]);

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

  const hudActions = useMemo<LocalPilotHudActionDescriptor[]>(() => buildLocalPilotHudActions({
    currentPlayer,
    distinctDeclareSuits,
    gameState,
    legalActions,
    revealablePlayers,
  }), [currentPlayer, distinctDeclareSuits, gameState, legalActions, revealablePlayers]);

  const runtimeHudControls = useMemo<HudArtworkControls | undefined>(() => {
    if (!bundle) {
      return undefined;
    }
    return buildLocalPilotHudControls(bundle.layoutDocument, hudActions);
  }, [bundle, hudActions]);

  const handleHudButtonClick = useCallback((index: number) => {
    const action = hudActions[index];
    if (!action || !currentPlayer) {
      return;
    }

    if (action.kind === 'declare' && action.suit) {
      dispatchAction(legalActions.includes('declare_suit') ? 'declare_suit' : 'declare', currentPlayer.id, { suit: action.suit });
      return;
    }

    if (action.kind === 'pick_up' && action.cardId) {
      dispatchAction('pick_up', currentPlayer.id, { discardCardId: action.cardId });
      return;
    }

    if (action.kind === 'take_stock') {
      dispatchAction('take_stock', currentPlayer.id);
      return;
    }

    if (action.kind === 'take_discard') {
      dispatchAction('take_discard', currentPlayer.id);
      return;
    }

    if (action.kind === 'discard_card' && action.cardId) {
      dispatchAction('discard_card', currentPlayer.id, { cardId: action.cardId });
      return;
    }

    if (action.kind === 'call_showdown') {
      handleSimpleAction('call_showdown');
      return;
    }

    if (action.kind === 'reveal_hand' && action.playerId) {
      handleReveal(action.playerId);
      return;
    }

    if (action.kind === 'pass') {
      handleSimpleAction('pass');
      return;
    }

    if (action.kind === 'end_turn') {
      handleSimpleAction('end_turn');
    }
  }, [currentPlayer, dispatchAction, handleReveal, handleSimpleAction, hudActions, legalActions]);

  useEffect(() => {
    if (gameState || startingMatch) {
      setCountdown(null);
    }
  }, [gameState, startingMatch]);

  useEffect(() => {
    if (!gameState || isGameOver) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setTimerNow(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [gameState, isGameOver]);

  const activeTurnTimer = useMemo(() => {
    const timerSeconds = bundle?.spec.turnPolicy.timerSeconds;
    if (!gameState || !timerSeconds || timerSeconds <= 0 || isGameOver) {
      return null;
    }

    const elapsedSeconds = Math.max(0, (timerNow - gameState.lastAction.getTime()) / 1000);
    const remainingSeconds = Math.max(0, timerSeconds - elapsedSeconds);
    return {
      label: `${Math.ceil(remainingSeconds)}s`,
      progress: remainingSeconds / timerSeconds,
    };
  }, [bundle?.spec.turnPolicy.timerSeconds, gameState, isGameOver, timerNow]);

  const seatPresentationById = useMemo<Partial<Record<number, CardGameSeatPresentation>>>(() => (
    buildLocalPilotSeatPresentation({
      gameState,
      playerCount: bundle?.playerCount ?? LOCAL_PILOT_PLAYER_COUNT,
      turnTimerLabel: activeTurnTimer?.label,
      turnTimerProgress: activeTurnTimer?.progress,
    })
  ), [activeTurnTimer, bundle?.playerCount, gameState]);

  const zonePresentationById = useMemo<Partial<Record<string, CardGameZonePresentation>>>(() => {
    if (!bundle) {
      return {};
    }
    return buildLocalPilotZonePresentation({
      deckSize: bundle.deckSize,
      document: bundle.layoutDocument,
      gameState,
    });
  }, [bundle, gameState]);
  const scoreboardPresentation = useMemo(() => {
    if (!bundle) {
      return undefined;
    }
    return buildLocalPilotScoreboardPresentation({
      document: bundle.layoutDocument,
      gameMode: bundle.gameMode,
      gameState,
    });
  }, [bundle, gameState]);
  const cardStripPresentation = useMemo(() => {
    if (!bundle) {
      return undefined;
    }
    return buildLocalPilotCardStripPresentation({
      document: bundle.layoutDocument,
      gameMode: bundle.gameMode,
      gameState,
    });
  }, [bundle, gameState]);

  return (
    <div className="playable-game-screen">
      <CardGameTemplatePage
        document={bundle?.layoutDocument}
        playerCount={bundle?.playerCount ?? LOCAL_PILOT_PLAYER_COUNT}
        surfaceMode="play"
        viewerPerspective={{ mode: 'rotateToLocal', localSeatId: 0 }}
        headerProps={headerProps}
        headerTitle={bundle?.displayName || gameModeId}
        headerTagline=""
        onHomeClick={handleHome}
        showLocalSeat
        seatPresentationById={seatPresentationById}
        zonePresentationById={zonePresentationById}
        scoreboardPresentation={scoreboardPresentation}
        cardStripPresentation={cardStripPresentation}
        hudControlsOverride={runtimeHudControls}
        onHudButtonClick={(index) => handleHudButtonClick(index)}
        showHeaderDebugControls={false}
        arenaOverlay={bundle ? (
          <LocalPilotArenaOverlay
            countdown={countdown}
            displayName={bundle.displayName || gameModeId}
            hasGameState={Boolean(gameState)}
            loading={loading}
            playerCount={bundle.playerCount}
          />
        ) : null}
        stageOverlay={(
          <LocalPilotStageOverlay
            countdown={countdown}
            error={error}
            isGameOver={Boolean(isGameOver)}
            loading={loading}
            restartDisabled={!bundle || startingMatch}
            startingMatch={startingMatch}
            winnersText={winnersText}
            onRestart={() => {
              autoStartArmedRef.current = true;
              setCountdown(null);
              void startMatch();
            }}
          />
        )}
      />
    </div>
  );
};

export default GameScreenPage;
