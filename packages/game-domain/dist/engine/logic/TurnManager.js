import { GamePhase, } from '../../types/game.js';
export class TurnManager {
    turnTimeoutMs;
    constructor(turnTimeoutMs = 30000) {
        this.turnTimeoutMs = turnTimeoutMs;
    }
    advanceToNextPlayer(gameState) {
        return (gameState.currentPlayer + 1) % gameState.players.length;
    }
    getNextActivePlayer(gameState) {
        switch (gameState.phase) {
            case GamePhase.FLOOR_REVEAL:
                return gameState.currentPlayer;
            case GamePhase.PLAYER_ACTION:
                return gameState.currentPlayer;
            case GamePhase.SHOWDOWN:
                return this.getNextUndeclaredPlayer(gameState);
            default:
                return gameState.currentPlayer;
        }
    }
    processTurnAction(gameState, action) {
        const updates = {
            lastAction: new Date(),
        };
        switch (action.type) {
            case 'pick_up':
                return this.processPickUpAction(gameState, action, updates);
            case 'decline':
                return this.processDeclineAction(gameState, action, updates);
            case 'declare_intent':
                return this.processDeclareIntentAction(gameState, action, updates);
            case 'call_showdown':
                return this.processCallShowdownAction(gameState, action, updates);
            case 'rebuttal':
                return this.processRebuttalAction(gameState, action, updates);
            default:
                return updates;
        }
    }
    processPickUpAction(gameState, action, updates) {
        const player = gameState.players.find((p) => p.id === action.playerId);
        if (!player || !gameState.floorCard)
            return updates;
        const updatedPlayers = gameState.players.map((p) => p.id === action.playerId
            ? { ...p, hand: [...p.hand, gameState.floorCard] }
            : p);
        return {
            ...updates,
            players: updatedPlayers,
            floorCard: null,
            phase: GamePhase.PLAYER_ACTION,
        };
    }
    processDeclineAction(gameState, _action, updates) {
        const updatedDiscardPile = gameState.floorCard
            ? [...gameState.discardPile, gameState.floorCard]
            : gameState.discardPile;
        const nextPlayer = this.advanceToNextPlayer(gameState);
        return {
            ...updates,
            currentPlayer: nextPlayer,
            floorCard: null,
            discardPile: updatedDiscardPile,
        };
    }
    processDeclareIntentAction(gameState, action, updates) {
        const { suit } = action.data;
        const updatedPlayers = gameState.players.map((p) => p.id === action.playerId ? { ...p, declaredSuit: suit } : p);
        return {
            ...updates,
            players: updatedPlayers,
        };
    }
    processCallShowdownAction(_gameState, _action, updates) {
        return {
            ...updates,
            phase: GamePhase.SHOWDOWN,
        };
    }
    processRebuttalAction(_gameState, _action, updates) {
        return {
            ...updates,
            phase: GamePhase.SCORING,
        };
    }
    getNextUndeclaredPlayer(gameState) {
        const undeclaredPlayers = gameState.players
            .map((player, index) => ({ player, index }))
            .filter(({ player }) => player.declaredSuit === null);
        if (undeclaredPlayers.length === 0) {
            return gameState.currentPlayer;
        }
        const currentIndex = gameState.currentPlayer;
        const nextUndeclared = undeclaredPlayers.find(({ index }) => index > currentIndex) ||
            undeclaredPlayers[0];
        return nextUndeclared.index;
    }
    isPhaseComplete(gameState) {
        switch (gameState.phase) {
            case GamePhase.FLOOR_REVEAL:
                return gameState.floorCard === null;
            case GamePhase.PLAYER_ACTION:
                return false;
            case GamePhase.SHOWDOWN:
                return true;
            default:
                return true;
        }
    }
    getRemainingActionTime(gameState) {
        const timeSinceLastAction = Date.now() - gameState.lastAction.getTime();
        return Math.max(0, this.turnTimeoutMs - timeSinceLastAction);
    }
    hasActionTimedOut(gameState) {
        return this.getRemainingActionTime(gameState) === 0;
    }
}
