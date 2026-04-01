import { GamePhase, Suit, } from '../../types/game.js';
export class StateValidator {
    validateGameState(gameState) {
        const errors = [];
        const warnings = [];
        this.validateBasicStructure(gameState, errors);
        this.validatePlayers(gameState, errors, warnings);
        this.validateCardDistribution(gameState, errors);
        this.validatePhaseConsistency(gameState, errors, warnings);
        this.validateTurnOrder(gameState, errors, warnings);
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
    validatePlayerAction(action, gameState) {
        const errors = [];
        const warnings = [];
        const player = gameState.players.find((p) => p.id === action.playerId);
        if (!player) {
            errors.push(`Player ${action.playerId} not found in game`);
            return { isValid: false, errors, warnings };
        }
        this.validateActionTiming(action, gameState, errors, warnings);
        this.validateActionTypeRules(action, gameState, player, errors, warnings);
        this.validateAntiCheat(action, gameState, player, errors, warnings);
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
    validateBasicStructure(gameState, errors) {
        if (!gameState.id) {
            errors.push('Game state missing ID');
        }
        if (!Array.isArray(gameState.players)) {
            errors.push('Players must be an array');
        }
        if (gameState.currentPlayer < 0 ||
            gameState.currentPlayer >= gameState.players.length) {
            errors.push('Current player index out of bounds');
        }
        if (!Object.values(GamePhase).includes(gameState.phase)) {
            errors.push(`Invalid game phase: ${gameState.phase}`);
        }
        if (!Array.isArray(gameState.deck)) {
            errors.push('Deck must be an array');
        }
        if (!Array.isArray(gameState.discardPile)) {
            errors.push('Discard pile must be an array');
        }
    }
    validatePlayers(gameState, errors, warnings) {
        if (gameState.players.length < 2) {
            errors.push('Game requires at least 2 players');
        }
        if (gameState.players.length > 4) {
            errors.push('Game supports maximum 4 players');
        }
        const playerIds = gameState.players.map((p) => p.id);
        const uniqueIds = new Set(playerIds);
        if (playerIds.length !== uniqueIds.size) {
            errors.push('Duplicate player IDs detected');
        }
        for (const player of gameState.players) {
            this.validatePlayer(player, errors, warnings);
        }
        const declaredSuits = gameState.players
            .map((p) => p.declaredSuit)
            .filter((suit) => suit !== null);
        const uniqueSuits = new Set(declaredSuits);
        if (declaredSuits.length !== uniqueSuits.size) {
            errors.push('Multiple players cannot declare the same suit');
        }
    }
    validatePlayer(player, errors, warnings) {
        void warnings;
        if (!player.id) {
            errors.push('Player missing ID');
        }
        if (!player.name) {
            warnings.push(`Player ${player.id} missing name`);
        }
        if (!Array.isArray(player.hand)) {
            errors.push(`Player ${player.id} hand must be an array`);
        }
        if (player.declaredSuit &&
            !Object.values(Suit).includes(player.declaredSuit)) {
            errors.push(`Player ${player.id} has invalid declared suit: ${player.declaredSuit}`);
        }
        if (player.declaredSuit) {
            const hasCardOfSuit = player.hand.some((card) => card.suit === player.declaredSuit);
            if (!hasCardOfSuit) {
                errors.push(`Player ${player.id} declared ${player.declaredSuit} but has no cards of that suit`);
            }
        }
    }
    validateCardDistribution(gameState, errors) {
        const allCards = [];
        for (const player of gameState.players) {
            allCards.push(...player.hand);
        }
        allCards.push(...gameState.deck);
        allCards.push(...gameState.discardPile);
        if (gameState.floorCard) {
            allCards.push(gameState.floorCard);
        }
        if (allCards.length !== 52) {
            errors.push(`Invalid total card count: ${allCards.length}, expected 52`);
        }
        const cardIds = allCards.map((card) => card.id);
        const uniqueCardIds = new Set(cardIds);
        if (cardIds.length !== uniqueCardIds.size) {
            errors.push('Duplicate cards detected in game');
        }
        for (const card of allCards) {
            if (!this.isValidCard(card)) {
                errors.push(`Invalid card structure: ${JSON.stringify(card)}`);
            }
        }
    }
    validatePhaseConsistency(gameState, errors, warnings) {
        switch (gameState.phase) {
            case GamePhase.DEALING:
                if (gameState.players.some((p) => p.hand.length > 0)) {
                    warnings.push('Cards already dealt but phase is still DEALING');
                }
                break;
            case GamePhase.FLOOR_REVEAL:
                if (!gameState.floorCard && gameState.deck.length > 0) {
                    warnings.push('No floor card revealed but deck has cards');
                }
                break;
            case GamePhase.PLAYER_ACTION:
                if (gameState.floorCard) {
                    warnings.push('Floor card still present during PLAYER_ACTION phase');
                }
                break;
            case GamePhase.SHOWDOWN: {
                const declaredPlayers = gameState.players.filter((p) => p.declaredSuit !== null);
                if (declaredPlayers.length === 0) {
                    errors.push('Showdown called but no players have declared intent');
                }
                break;
            }
            case GamePhase.GAME_END:
                break;
        }
    }
    validateTurnOrder(gameState, errors, warnings) {
        void warnings;
        if (gameState.currentPlayer >= gameState.players.length) {
            errors.push('Current player index exceeds player count');
        }
        const currentPlayer = gameState.players[gameState.currentPlayer];
        if (currentPlayer &&
            !currentPlayer.isConnected &&
            !currentPlayer.isAI) {
            warnings.push('Current player is disconnected');
        }
    }
    validateActionTiming(action, gameState, errors, warnings) {
        void warnings;
        const actionTime = action.timestamp.getTime();
        const lastActionTime = gameState.lastAction.getTime();
        if (actionTime < lastActionTime) {
            errors.push('Action timestamp is before last game action');
        }
        const maxFutureTime = Date.now() + 5000;
        if (actionTime > maxFutureTime) {
            errors.push('Action timestamp is too far in the future');
        }
    }
    validateActionTypeRules(action, gameState, player, errors, warnings) {
        switch (action.type) {
            case 'declare_intent':
                this.validateDeclareIntentAction(action, gameState, player, errors);
                break;
            case 'call_showdown':
                this.validateCallShowdownAction(action, gameState, player, errors, warnings);
                break;
            case 'rebuttal':
                this.validateRebuttalAction(action, gameState, player, errors, warnings);
                break;
        }
    }
    validateDeclareIntentAction(action, gameState, player, errors) {
        const data = action.data;
        if (!data || !data.suit) {
            errors.push('Declare intent action missing suit data');
            return;
        }
        if (!Object.values(Suit).includes(data.suit)) {
            errors.push(`Invalid suit in declare intent: ${data.suit}`);
        }
        if (player.declaredSuit !== null) {
            errors.push('Player has already declared intent');
        }
        const suitLocked = gameState.players.some((p) => p.declaredSuit === data.suit);
        if (suitLocked) {
            errors.push(`Suit ${data.suit} is already locked by another player`);
        }
    }
    validateCallShowdownAction(_action, gameState, player, errors, warnings) {
        void warnings;
        if (player.declaredSuit === null) {
            errors.push('Player must declare intent before calling showdown');
        }
        if (gameState.phase !== GamePhase.PLAYER_ACTION) {
            errors.push('Showdown can only be called during player action phase');
        }
    }
    validateRebuttalAction(action, gameState, player, errors, warnings) {
        void warnings;
        if (player.declaredSuit !== null) {
            errors.push('Only undeclared players can make rebuttals');
        }
        if (gameState.phase !== GamePhase.SHOWDOWN) {
            errors.push('Rebuttals can only be made during showdown phase');
        }
        const data = action.data;
        if (!data ||
            !Array.isArray(data.cards) ||
            data.cards.length !== 3) {
            errors.push('Rebuttal must include exactly 3 cards');
        }
    }
    validateAntiCheat(action, gameState, player, errors, warnings) {
        void gameState;
        void warnings;
        if (action.type === 'rebuttal') {
            const data = action.data;
            if (data && data.cards) {
                for (const card of data.cards) {
                    const hasCard = player.hand.some((handCard) => handCard.id === card.id);
                    if (!hasCard) {
                        errors.push(`Player attempting to play card not in hand: ${card.id}`);
                    }
                }
            }
        }
        const timeSinceLastAction = action.timestamp.getTime() - gameState.lastAction.getTime();
        if (timeSinceLastAction < 100) {
            warnings.push('Suspiciously fast action detected');
        }
    }
    isValidCard(card) {
        return (typeof card.id === 'string' &&
            Object.values(Suit).includes(card.suit) &&
            typeof card.value === 'number' &&
            card.value >= 2 &&
            card.value <= 14);
    }
}
