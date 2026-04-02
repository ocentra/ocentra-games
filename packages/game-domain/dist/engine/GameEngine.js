import { GamePhase, AIPersonality, } from '../types/game.js';
import { RuleEngine } from '../engine/logic/RuleEngine.js';
import { TurnManager } from '../engine/logic/TurnManager.js';
import { ScoreCalculator } from '../engine/logic/ScoreCalculator.js';
import { StateValidator, } from '../engine/logic/StateValidator.js';
import { MechanicsRuntime } from '../engine/mechanics/MechanicsRuntime.js';
import { DefaultDeckProvider } from '../deck/DefaultDeckProvider.js';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
const log = MainAppLogger.instance;
const logInfo = (message, dataOrEnabled, enabled) => {
    if (typeof dataOrEnabled === 'boolean') {
        log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
    }
    else {
        log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
    }
};
log.register(import.meta.url);
const createRuntimeUuid = () => {
    const cryptoObject = globalThis.crypto;
    if (typeof cryptoObject?.randomUUID === 'function') {
        return cryptoObject.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
        const randomNibble = (Math.random() * 16) | 0;
        const value = character === 'x' ? randomNibble : (randomNibble & 0x3) | 0x8;
        return value.toString(16);
    });
};
export class GameEngine {
    gameState = null;
    updateCallbacks = new Set();
    aiManager = null;
    ruleEngine;
    deckProvider;
    turnManager;
    scoreCalculator;
    stateValidator;
    mechanicsSpec = null;
    mechanicsRuntime;
    constructor(options) {
        this.ruleEngine = new RuleEngine();
        this.deckProvider =
            options?.deckProvider ?? new DefaultDeckProvider();
        this.turnManager = new TurnManager();
        this.scoreCalculator = new ScoreCalculator();
        this.stateValidator = new StateValidator();
        this.mechanicsRuntime = new MechanicsRuntime(this.scoreCalculator);
        this.aiManager = options?.aiManager ?? null;
    }
    async initializeDeckProvider(deckProvider) {
        this.deckProvider = deckProvider;
    }
    setAiManager(aiManager) {
        this.aiManager = aiManager;
    }
    async initializeGame(config) {
        logInfo('Initializing game with config:', config);
        if (config.rules) {
            const mergedRules = {
                ...this.ruleEngine.getRules(),
                ...config.rules,
            };
            this.ruleEngine = new RuleEngine(mergedRules);
        }
        if (config.seed) {
            this.deckProvider.setSeed(config.seed);
        }
        const deck = await this.deckProvider.createStandardDeck();
        const shuffledDeck = this.deckProvider.shuffleDeck(deck);
        this.gameState = {
            id: createRuntimeUuid(),
            players: [],
            currentPlayer: 0,
            phase: GamePhase.DEALING,
            deck: shuffledDeck,
            floorCard: null,
            discardPile: [],
            round: 1,
            startTime: new Date(),
            lastAction: new Date(),
            mechanicsPhaseId: null,
            mechanicsContext: {
                dealerIndex: 0,
                showdownCallerId: null,
                revealedPlayerIds: [],
                lastMechanicsAction: null,
                tableCards: [],
                capturedCardsByPlayerId: {},
                foldedPlayerIds: [],
                roundPot: 0,
                trumpCard: null,
            },
        };
        this.applyMechanicsStartPhase();
        logInfo('Game initialized with config:', config);
    }
    async initializeAIEngines() {
        logInfo('Initializing AI engines');
        if (!this.gameState) {
            logInfo('Game not initialized');
            throw new Error('Game not initialized');
        }
        if (!this.aiManager) {
            logInfo('No AI manager configured, skipping AI initialization');
            return;
        }
        logInfo('Initializing AI engines with game state');
        await this.aiManager.initializeAIEngines(this.gameState);
        logInfo('AI engines initialized successfully');
    }
    async getAIAction() {
        if (!this.gameState) {
            throw new Error('Game not initialized');
        }
        if (!this.aiManager) {
            return null;
        }
        const currentPlayer = this.gameState.players[this.gameState.currentPlayer];
        if (!currentPlayer.isAI) {
            return null;
        }
        const decision = await this.aiManager.getAIDecision(currentPlayer.id, this.gameState);
        if (!decision) {
            return null;
        }
        return this.aiManager.createPlayerActionFromDecision(currentPlayer.id, decision);
    }
    addPlayer(playerData) {
        if (!this.gameState) {
            throw new Error('Game not initialized');
        }
        if (this.gameState.players.length >=
            (this.mechanicsSpec?.playerConfig.maxPlayers ??
                this.ruleEngine.getRules().maxPlayers)) {
            throw new Error('Game is full');
        }
        const player = {
            id: playerData.id,
            name: playerData.name,
            avatar: playerData.avatar ?? '',
            hand: [],
            declaredSuit: null,
            intentCard: null,
            score: 0,
            isConnected: true,
            isAI: playerData.isAI ?? false,
            aiPersonality: playerData.aiPersonality,
        };
        this.gameState.players.push(player);
        this.notifyStateUpdate();
    }
    async startGame() {
        logInfo('Starting game');
        if (!this.gameState) {
            logInfo('Game not initialized');
            throw new Error('Game not initialized');
        }
        const minimumPlayers = this.mechanicsSpec?.playerConfig.minPlayers ?? 2;
        if (this.gameState.players.length < minimumPlayers) {
            logInfo('Need more players to start, current players:', this.gameState.players.length);
            throw new Error(`Need at least ${minimumPlayers} players to start`);
        }
        if (this.mechanicsSpec) {
            const stateUpdates = this.mechanicsRuntime.startGame(this.gameState, this.mechanicsSpec, this.deckProvider);
            Object.assign(this.gameState, stateUpdates);
            await this.initializeAIEngines();
            this.notifyStateUpdate();
            logInfo('Game started successfully with mechanics runtime');
            return;
        }
        logInfo('Dealing initial hands');
        const rules = this.ruleEngine.getRules();
        const { hands, remainingDeck } = this.deckProvider.dealInitialHands(this.gameState.deck, this.gameState.players.length, rules.initialHandSize);
        this.gameState.players.forEach((player, index) => {
            player.hand = hands[index];
        });
        this.gameState.deck = remainingDeck;
        this.gameState.phase = GamePhase.FLOOR_REVEAL;
        logInfo('Revealing floor card');
        this.revealFloorCard();
        logInfo('Initializing AI engines');
        await this.initializeAIEngines();
        logInfo('Notifying state update');
        this.notifyStateUpdate();
        logInfo('Game started successfully');
    }
    async startSinglePlayer(difficulty) {
        logInfo('Starting single player game with difficulty:', difficulty);
        if (!this.gameState) {
            logInfo('Game not initialized');
            throw new Error('Game not initialized');
        }
        const aiPersonalities = [
            AIPersonality.AGGRESSIVE,
            AIPersonality.CONSERVATIVE,
            AIPersonality.ADAPTIVE,
        ];
        logInfo('Adding AI players to fill the game');
        for (let i = this.gameState.players.length; i < 4; i++) {
            this.addPlayer({
                id: `ai-${i}`,
                name: `AI Player ${i}`,
                isAI: true,
                aiPersonality: aiPersonalities[i % aiPersonalities.length],
            });
        }
        logInfo('Starting game');
        await this.startGame();
        logInfo('Started single player game with difficulty:', difficulty);
    }
    startMultiplayer(roomId) {
        if (!this.gameState) {
            throw new Error('Game not initialized');
        }
        logInfo('Starting multiplayer game with room:', roomId);
    }
    processPlayerAction(action) {
        if (!this.gameState) {
            throw new Error('Game not initialized');
        }
        if (this.mechanicsSpec) {
            const validation = this.mechanicsRuntime.validateAction(action, this.gameState, this.mechanicsSpec);
            if (!validation.isValid) {
                return validation;
            }
            const stateUpdates = this.mechanicsRuntime.processAction(this.gameState, action, this.mechanicsSpec, this.deckProvider);
            Object.assign(this.gameState, stateUpdates);
            if (this.gameState.phase === GamePhase.GAME_END) {
                this.endGame();
            }
            this.notifyStateUpdate();
            return validation;
        }
        const validation = this.stateValidator.validatePlayerAction(action, this.gameState);
        if (!validation.isValid) {
            logInfo('⚠️ Invalid action:', validation.errors);
            return validation;
        }
        const isLegal = this.ruleEngine.validateAction(action, this.gameState);
        if (!isLegal) {
            return {
                isValid: false,
                errors: ['Action violates game rules'],
                warnings: [],
            };
        }
        const stateUpdates = this.turnManager.processTurnAction(this.gameState, action);
        Object.assign(this.gameState, stateUpdates);
        const nextPhase = this.ruleEngine.getNextPhase(this.gameState.phase, action);
        if (nextPhase !== this.gameState.phase) {
            this.gameState.phase = nextPhase;
            this.handlePhaseTransition(nextPhase);
        }
        if (this.ruleEngine.shouldEndGame(this.gameState)) {
            this.endGame();
        }
        this.notifyStateUpdate();
        return validation;
    }
    loadMechanicsSpec(spec) {
        this.mechanicsSpec = spec;
        this.applyMechanicsStartPhase();
    }
    getCurrentMechanicsPhase() {
        if (!this.mechanicsSpec || !this.gameState) {
            return null;
        }
        const currentId = this.gameState.mechanicsPhaseId ??
            this.mechanicsSpec.phases[0]?.id ??
            null;
        if (!currentId) {
            return null;
        }
        return (this.mechanicsSpec.phases.find((phase) => phase.id === currentId) ??
            null);
    }
    applyMechanicsStartPhase() {
        if (!this.gameState || !this.mechanicsSpec) {
            return;
        }
        const firstPhase = this.mechanicsSpec.phases[0];
        if (firstPhase) {
            this.gameState.mechanicsPhaseId = firstPhase.id;
        }
    }
    isActionAllowedByMechanics(action) {
        if (!this.mechanicsSpec) {
            return true;
        }
        const phase = this.getCurrentMechanicsPhase();
        if (!phase) {
            return true;
        }
        if (phase.legalActions.includes(action.type)) {
            return true;
        }
        return this.mechanicsSpec.customActions.some((custom) => custom.id === action.type && custom.supported);
    }
    revealFloorCard() {
        if (!this.gameState)
            return;
        const { card, remainingDeck } = this.deckProvider.drawCard(this.gameState.deck);
        this.gameState.floorCard = card;
        this.gameState.deck = remainingDeck;
    }
    handlePhaseTransition(newPhase) {
        if (!this.gameState)
            return;
        switch (newPhase) {
            case GamePhase.FLOOR_REVEAL:
                this.revealFloorCard();
                break;
            case GamePhase.SCORING:
                this.calculateFinalScores();
                break;
            case GamePhase.GAME_END:
                this.endGame();
                break;
        }
    }
    calculateFinalScores() {
        if (!this.gameState)
            return;
        const scores = this.scoreCalculator.calculateAllScores(this.gameState);
        this.gameState.players.forEach((player) => {
            const scoreBreakdown = scores.get(player.id);
            if (scoreBreakdown) {
                player.score = scoreBreakdown.totalScore;
            }
        });
    }
    endGame() {
        if (!this.gameState)
            return;
        this.gameState.phase = GamePhase.GAME_END;
        const { winners, scores } = this.scoreCalculator.determineWinners(this.gameState);
        logInfo('Game ended. Winners:', winners.map((w) => w.name));
        logInfo('Final scores:', Array.from(scores.entries()));
    }
    getGameSeed() {
        return this.deckProvider.getSeed();
    }
    validateGameState() {
        if (!this.gameState) {
            return {
                isValid: false,
                errors: ['Game not initialized'],
                warnings: [],
            };
        }
        return this.stateValidator.validateGameState(this.gameState);
    }
    getGameState() {
        return this.gameState;
    }
    subscribeToUpdates(callback) {
        this.updateCallbacks.add(callback);
        return () => this.updateCallbacks.delete(callback);
    }
    notifyStateUpdate() {
        if (this.gameState) {
            this.updateCallbacks.forEach((callback) => callback(this.gameState));
        }
    }
}
