import { GamePhase, } from '../../types/game.js';
export const DEFAULT_RULES = {
    maxPlayers: 4,
    initialHandSize: 3,
    deckSize: 52,
};
export class RuleEngine {
    rules;
    constructor(rules = DEFAULT_RULES) {
        this.rules = rules;
    }
    validateAction(action, gameState) {
        const player = gameState.players.find((p) => p.id === action.playerId);
        if (!player)
            return false;
        const currentPlayerInTurn = gameState.players[gameState.currentPlayer];
        const isPlayerTurn = currentPlayerInTurn && currentPlayerInTurn.id === action.playerId;
        switch (action.type) {
            case 'pick_up':
                return this.validatePickUp(gameState, player, isPlayerTurn);
            case 'decline':
                return this.validateDecline(gameState, player, isPlayerTurn);
            case 'declare_intent':
                return this.validateDeclareIntent(gameState, player, action.data);
            case 'call_showdown':
                return this.validateCallShowdown(gameState, player);
            case 'rebuttal':
                return this.validateRebuttal(gameState, player, action.data);
            default:
                return false;
        }
    }
    validatePickUp(gameState, _player, isPlayerTurn) {
        return (gameState.phase === GamePhase.FLOOR_REVEAL &&
            isPlayerTurn &&
            gameState.floorCard !== null);
    }
    validateDecline(gameState, _player, isPlayerTurn) {
        return (gameState.phase === GamePhase.FLOOR_REVEAL &&
            isPlayerTurn &&
            gameState.floorCard !== null);
    }
    validateDeclareIntent(gameState, player, data) {
        if (gameState.phase !== GamePhase.PLAYER_ACTION)
            return false;
        if (player.declaredSuit !== null)
            return false;
        const suitLocked = gameState.players.some((p) => p.declaredSuit === data.suit);
        if (suitLocked)
            return false;
        const hasCardOfSuit = player.hand.some((card) => card.suit === data.suit);
        return hasCardOfSuit;
    }
    validateCallShowdown(gameState, player) {
        if (gameState.phase !== GamePhase.PLAYER_ACTION)
            return false;
        return player.declaredSuit !== null;
    }
    validateRebuttal(gameState, player, data) {
        if (gameState.phase !== GamePhase.SHOWDOWN)
            return false;
        if (player.declaredSuit !== null)
            return false;
        if (!data.cards || data.cards.length !== 3)
            return false;
        return this.isValidRun(data.cards);
    }
    isValidRun(cards) {
        if (cards.length !== 3)
            return false;
        const suit = cards[0].suit;
        if (!cards.every((card) => card.suit === suit))
            return false;
        const sortedCards = [...cards].sort((a, b) => a.value - b.value);
        const values = sortedCards.map((card) => card.value);
        if (values[1] === values[0] + 1 && values[2] === values[1] + 1) {
            return true;
        }
        if (values[0] === 2 && values[1] === 13 && values[2] === 14) {
            return true;
        }
        return false;
    }
    getNextPhase(currentPhase, action) {
        switch (currentPhase) {
            case GamePhase.DEALING:
                return GamePhase.FLOOR_REVEAL;
            case GamePhase.FLOOR_REVEAL:
                if (action.type === 'pick_up') {
                    return GamePhase.PLAYER_ACTION;
                }
                else if (action.type === 'decline') {
                    return GamePhase.FLOOR_REVEAL;
                }
                return currentPhase;
            case GamePhase.PLAYER_ACTION:
                if (action.type === 'call_showdown') {
                    return GamePhase.SHOWDOWN;
                }
                return currentPhase;
            case GamePhase.SHOWDOWN:
                if (action.type === 'rebuttal') {
                    return GamePhase.SCORING;
                }
                return GamePhase.SCORING;
            case GamePhase.SCORING:
                return GamePhase.GAME_END;
            default:
                return currentPhase;
        }
    }
    shouldEndGame(gameState) {
        return (gameState.deck.length === 0 || gameState.phase === GamePhase.GAME_END);
    }
    getRules() {
        return { ...this.rules };
    }
}
