import type { IDeckProvider } from '@/interfaces/IDeckProvider';
import {
  type GameState,
  type MechanicsRuntimeContext,
  type Player,
  type PlayerAction,
  GamePhase,
  type Suit,
} from '@/types/game';
import type { ValidationResult } from '@/engine/logic/StateValidator';
import { ScoreCalculator } from '@/engine/logic/ScoreCalculator';
import { BriscolaFamilyResolver } from '@/engine/mechanics/family/BriscolaFamilyResolver';
import { ClaimFamilyResolver } from '@/engine/mechanics/family/ClaimFamilyResolver';
import type { MechanicsFamilyResolver } from '@/engine/mechanics/family/MechanicsFamilyResolver';
import { VyingFamilyResolver } from '@/engine/mechanics/family/VyingFamilyResolver';
import type { MechanicsCustomAction, MechanicsPhase, MechanicsSpec } from '@/engine/mechanics/MechanicsSpec';

function clonePlayers(players: Player[]): Player[] {
  return players.map((player) => ({
    ...player,
    hand: [...player.hand],
    intentCard: player.intentCard ? { ...player.intentCard } : null,
  }));
}

function cloneContext(context: MechanicsRuntimeContext | undefined): MechanicsRuntimeContext {
  const familyState = context?.familyState
    ? JSON.parse(JSON.stringify(context.familyState)) as Record<string, unknown>
    : undefined;
  return {
    dealerIndex: context?.dealerIndex ?? 0,
    showdownCallerId: context?.showdownCallerId ?? null,
    revealedPlayerIds: [...(context?.revealedPlayerIds ?? [])],
    lastMechanicsAction: context?.lastMechanicsAction ?? null,
    tableCards: [...(context?.tableCards ?? [])].map((entry) => ({
      playerId: entry.playerId,
      card: { ...entry.card },
    })),
    capturedCardsByPlayerId: Object.fromEntries(
      Object.entries(context?.capturedCardsByPlayerId ?? {}).map(([playerId, cards]) => [
        playerId,
        cards.map((card) => ({ ...card })),
      ]),
    ),
    foldedPlayerIds: [...(context?.foldedPlayerIds ?? [])],
    roundPot: context?.roundPot ?? 0,
    trumpCard: context?.trumpCard ? { ...context.trumpCard } : null,
    familyState,
  };
}

export class MechanicsRuntime {
  private readonly scoreCalculator: ScoreCalculator;
  private readonly familyResolvers: MechanicsFamilyResolver[];

  constructor(scoreCalculator: ScoreCalculator = new ScoreCalculator()) {
    this.scoreCalculator = scoreCalculator;
    this.familyResolvers = [
      new ClaimFamilyResolver(),
      new BriscolaFamilyResolver(),
      new VyingFamilyResolver(),
    ];
  }

  startGame(
    gameState: GameState,
    spec: MechanicsSpec,
    deckProvider: IDeckProvider,
  ): Partial<GameState> {
    const phase = spec.phases[0] ?? null;
    const context = cloneContext(gameState.mechanicsContext);
    const workingState: GameState = {
      ...gameState,
      players: clonePlayers(gameState.players),
      mechanicsPhaseId: phase?.id ?? null,
      mechanicsContext: context,
      phase: this.mapMechanicsPhaseToLegacyPhase(phase),
      currentPlayer: this.resolveCurrentPlayerIndex(spec, context.dealerIndex, gameState.players.length),
    };

    return this.runAutomaticSystemPhases(workingState, spec, deckProvider);
  }

  validateAction(
    action: PlayerAction,
    gameState: GameState,
    spec: MechanicsSpec,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const player = gameState.players.find((entry) => entry.id === action.playerId);

    if (!player) {
      errors.push(`Player ${action.playerId} not found in game`);
      return { isValid: false, errors, warnings };
    }

    if (action.timestamp.getTime() < gameState.lastAction.getTime()) {
      errors.push('Action timestamp is before last game action');
    }

    const currentPhase = this.getCurrentPhase(gameState, spec);
    if (!currentPhase) {
      errors.push('No mechanics phase is active');
      return { isValid: false, errors, warnings };
    }

    const actionSpec = this.resolveActionSpec(spec, action.type);
    if (!actionSpec || !actionSpec.supported) {
      errors.push(`Action ${action.type} is not supported by the current mechanics`);
      return { isValid: false, errors, warnings };
    }

    if (!currentPhase.legalActions.includes(action.type)) {
      errors.push(`Action ${action.type} is not legal during phase ${currentPhase.id}`);
    }

    if (
      currentPhase.actor === 'current_player' &&
      gameState.players[gameState.currentPlayer]?.id !== action.playerId
    ) {
      errors.push('It is not this player’s turn');
    }

    if (action.type === 'reveal_hand') {
      this.validateReveal(gameState, player, errors);
    }

    const familyValidation = this.getFamilyResolver(spec)?.validateAction?.(gameState, action, spec);
    if (familyValidation && !familyValidation.isValid) {
      errors.push(...familyValidation.errors);
      warnings.push(...familyValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  processAction(
    gameState: GameState,
    action: PlayerAction,
    spec: MechanicsSpec,
    deckProvider: IDeckProvider,
  ): Partial<GameState> {
    const currentPhase = this.getCurrentPhase(gameState, spec);
    if (!currentPhase) {
      return {};
    }

    const players = clonePlayers(gameState.players);
    const context = cloneContext(gameState.mechanicsContext);
    const workingState: GameState = {
      ...gameState,
      players,
      mechanicsContext: context,
      lastAction: action.timestamp,
    };
    const familyResolver = this.getFamilyResolver(spec);

    const handledByFamily = familyResolver?.processAction?.(workingState, action, spec, deckProvider) ?? false;
    if (!handledByFamily) {
      switch (action.type) {
        case 'declare':
          this.processDeclare(workingState, action);
          break;
        case 'pick_up':
          this.processPickUp(workingState, action, spec, deckProvider);
          break;
        case 'pass':
          this.processPass(workingState, spec, deckProvider);
          break;
        case 'call_showdown':
          this.processCallShowdown(workingState, action, spec);
          break;
        case 'reveal_hand':
        case 'rebuttal':
          this.processReveal(workingState, action, spec, deckProvider);
          break;
        default:
          break;
      }
    }

    workingState.mechanicsContext = {
      ...cloneContext(workingState.mechanicsContext),
      lastMechanicsAction: action.type,
    };
    if (workingState.phase !== GamePhase.GAME_END) {
      const currentResolvedPhase = this.resolvePhaseById(spec, workingState.mechanicsPhaseId);
      workingState.phase = this.mapMechanicsPhaseToLegacyPhase(currentResolvedPhase);
    }

    if (workingState.mechanicsPhaseId === currentPhase.id) {
      const advancedPhase = this.resolveNextPhaseAfterAction(workingState, spec, currentPhase);
      if (advancedPhase) {
        workingState.mechanicsPhaseId = advancedPhase.id;
        workingState.phase = this.mapMechanicsPhaseToLegacyPhase(advancedPhase);
      }
    }

    const finalizedState = this.runAutomaticSystemPhases(workingState, spec, deckProvider);
    return finalizedState;
  }

  private validateDeclare(
    action: PlayerAction,
    player: Player,
    errors: string[],
  ): void {
    const suit = this.readSuit(action.data);
    if (!suit) {
      errors.push('Declare action requires a suit');
      return;
    }

    if (player.declaredSuit !== null) {
      errors.push('Player has already declared a suit');
      return;
    }

    const hasSuit = player.hand.some((card) => card.suit === suit);
    if (!hasSuit) {
      errors.push(`Player does not have a card in declared suit ${suit}`);
    }
  }

  private validatePickUp(
    action: PlayerAction,
    gameState: GameState,
    player: Player,
    spec: MechanicsSpec,
    errors: string[],
  ): void {
    if (!gameState.floorCard) {
      errors.push('No floor card is available to pick up');
      return;
    }

    const discardRequired = this.isDiscardRequired(spec);
    const discardCardId = this.readDiscardCardId(action.data);
    if (discardRequired && !discardCardId) {
      errors.push('Pick up requires a discardCardId');
      return;
    }

    if (!discardCardId) {
      return;
    }

    const candidateIds = new Set(player.hand.map((card) => card.id));
    candidateIds.add(gameState.floorCard.id);
    if (!candidateIds.has(discardCardId)) {
      errors.push(`Discard card ${discardCardId} is not available to the player`);
    }
  }

  private validatePass(
    gameState: GameState,
    errors: string[],
  ): void {
    if (!gameState.floorCard) {
      errors.push('No floor card is available to pass');
    }
  }

  private validateShowdown(
    gameState: GameState,
    player: Player,
    spec: MechanicsSpec,
    errors: string[],
  ): void {
    if (player.declaredSuit === null) {
      errors.push('Player must declare a suit before calling showdown');
    }

    const minimumScore = this.readShowdownMinimum(spec);
    const scoreBreakdown = this.scoreCalculator.calculatePlayerScore(player);
    if (minimumScore > 0 && scoreBreakdown.totalScore < minimumScore) {
      errors.push(`Player score ${scoreBreakdown.totalScore} is below showdown minimum ${minimumScore}`);
    }
  }

  private validateReveal(
    gameState: GameState,
    player: Player,
    errors: string[],
  ): void {
    if (gameState.phase !== GamePhase.SHOWDOWN) {
      errors.push('Reveal actions are only valid during showdown');
      return;
    }

    if (gameState.mechanicsContext?.revealedPlayerIds.includes(player.id)) {
      errors.push('Player has already revealed this showdown');
    }
  }

  private processDeclare(
    gameState: GameState,
    action: PlayerAction,
  ): void {
    const suit = this.readSuit(action.data);
    if (!suit) {
      return;
    }

    gameState.players = gameState.players.map((player) =>
      player.id === action.playerId
        ? { ...player, declaredSuit: suit }
        : player
    );

    gameState.currentPlayer = this.advancePlayerIndex(gameState);
  }

  private processPickUp(
    gameState: GameState,
    action: PlayerAction,
    spec: MechanicsSpec,
    deckProvider: IDeckProvider,
  ): void {
    const playerIndex = gameState.players.findIndex((player) => player.id === action.playerId);
    if (playerIndex < 0 || !gameState.floorCard) {
      return;
    }

    const discardCardId = this.readDiscardCardId(action.data);
    const floorCard = gameState.floorCard;
    const nextHand = [...gameState.players[playerIndex].hand, floorCard];
    if (discardCardId) {
      const discardIndex = nextHand.findIndex((card) => card.id === discardCardId);
      if (discardIndex >= 0) {
        const [discardedCard] = nextHand.splice(discardIndex, 1);
        if (discardedCard) {
          gameState.discardPile = [...gameState.discardPile, discardedCard];
        }
      }
    }

    gameState.players[playerIndex] = {
      ...gameState.players[playerIndex],
      hand: nextHand,
    };

    gameState.floorCard = null;
    this.refreshFloorCardIfNeeded(gameState, spec, deckProvider);
    gameState.currentPlayer = this.advancePlayerIndex(gameState);
  }

  private processPass(
    gameState: GameState,
    spec: MechanicsSpec,
    deckProvider: IDeckProvider,
  ): void {
    if (gameState.floorCard) {
      gameState.discardPile = [...gameState.discardPile, gameState.floorCard];
      gameState.floorCard = null;
    }

    this.refreshFloorCardIfNeeded(gameState, spec, deckProvider);
    gameState.currentPlayer = this.advancePlayerIndex(gameState);
  }

  private processCallShowdown(
    gameState: GameState,
    action: PlayerAction,
    spec: MechanicsSpec,
  ): void {
    const showdownPhase = spec.phases.find((phase) => phase.id === 'showdown')
      ?? this.resolvePhaseById(spec, this.resolveConditionalNextPhaseId(gameState, spec, this.getCurrentPhase(gameState, spec), 'showdown_called'));

    gameState.mechanicsContext = {
      ...cloneContext(gameState.mechanicsContext),
      showdownCallerId: action.playerId,
      revealedPlayerIds: [],
      lastMechanicsAction: action.type,
    };

    if (showdownPhase) {
      gameState.mechanicsPhaseId = showdownPhase.id;
      gameState.phase = this.mapMechanicsPhaseToLegacyPhase(showdownPhase);
    }
  }

  private processReveal(
    gameState: GameState,
    action: PlayerAction,
    spec: MechanicsSpec,
    deckProvider: IDeckProvider,
  ): void {
    const context = cloneContext(gameState.mechanicsContext);
    context.revealedPlayerIds = Array.from(new Set([...context.revealedPlayerIds, action.playerId]));
    context.lastMechanicsAction = action.type;
    gameState.mechanicsContext = context;

    const phase = this.getCurrentPhase(gameState, spec);
    if (!phase) {
      return;
    }

    const allPlayersRevealed = context.revealedPlayerIds.length >= gameState.players.length;
    if (allPlayersRevealed && phase.nextPhase) {
      gameState.mechanicsPhaseId = phase.nextPhase;
      const nextPhase = this.resolvePhaseById(spec, phase.nextPhase);
      gameState.phase = this.mapMechanicsPhaseToLegacyPhase(nextPhase);
      const finalized = this.runAutomaticSystemPhases(gameState, spec, deckProvider);
      Object.assign(gameState, finalized);
    }
  }

  private runAutomaticSystemPhases(
    gameState: GameState,
    spec: MechanicsSpec,
    deckProvider: IDeckProvider,
  ): Partial<GameState> {
    const workingState: GameState = {
      ...gameState,
      players: clonePlayers(gameState.players),
      mechanicsContext: cloneContext(gameState.mechanicsContext),
      discardPile: [...gameState.discardPile],
      deck: [...gameState.deck],
      floorCard: gameState.floorCard ? { ...gameState.floorCard } : null,
    };

    while (true) {
      const phase = this.getCurrentPhase(workingState, spec);
      if (!phase || phase.actor !== 'system') {
        break;
      }

      if (phase.legalActions.includes('setup_round')) {
        const handledByFamily = this.getFamilyResolver(spec)?.runSetupRound?.(workingState, spec, deckProvider) ?? false;
        if (!handledByFamily) {
          this.runSetupRound(workingState, spec, deckProvider);
        }
      } else if (phase.legalActions.includes('score_round')) {
        this.runScoreRound(workingState, spec);
      }

      const nextPhase = this.resolveNextSystemPhase(workingState, spec, phase);
      if (!nextPhase) {
        break;
      }

      workingState.mechanicsPhaseId = nextPhase.id;
      workingState.phase = this.mapMechanicsPhaseToLegacyPhase(nextPhase);

      if (workingState.phase === GamePhase.GAME_END) {
        break;
      }
    }

    return workingState;
  }

  private runSetupRound(
    gameState: GameState,
    spec: MechanicsSpec,
    deckProvider: IDeckProvider,
  ): void {
    const playerCount = gameState.players.length;
    const handSize = spec.initialHandSize ?? 0;
    const dealtPlayers = gameState.players.map((player) => ({
      ...player,
      hand: [],
      declaredSuit: null,
      intentCard: null,
    }));

    const { hands, remainingDeck } = deckProvider.dealInitialHands(
      gameState.deck,
      playerCount,
      handSize,
    );

    gameState.players = dealtPlayers.map((player, index) => ({
      ...player,
      hand: hands[index] ?? [],
    }));
    gameState.deck = remainingDeck;
    gameState.discardPile = [];
    gameState.floorCard = null;
    gameState.currentPlayer = this.resolveCurrentPlayerIndex(
      spec,
      cloneContext(gameState.mechanicsContext).dealerIndex,
      playerCount,
    );
    gameState.mechanicsContext = {
      ...cloneContext(gameState.mechanicsContext),
      showdownCallerId: null,
      revealedPlayerIds: [],
      lastMechanicsAction: 'setup_round',
      tableCards: [],
      capturedCardsByPlayerId: {},
      foldedPlayerIds: [],
      roundPot: 0,
      trumpCard: null,
    };
    this.refreshFloorCardIfNeeded(gameState, spec, deckProvider);
    this.getFamilyResolver(spec)?.onSetupRound?.(gameState, spec, deckProvider);
  }

  private runScoreRound(
    gameState: GameState,
    spec: MechanicsSpec,
  ): void {
    const handledByFamily = this.getFamilyResolver(spec)?.onScoreRound?.(gameState, spec) ?? false;
    if (!handledByFamily) {
      const scores = this.scoreCalculator.calculateAllScores(gameState);
      gameState.players = gameState.players.map((player) => {
        const breakdown = scores.get(player.id);
        return breakdown
          ? { ...player, score: player.score + breakdown.totalScore }
          : player;
      });
    }
    gameState.round += 1;
    gameState.mechanicsContext = {
      ...cloneContext(gameState.mechanicsContext),
      lastMechanicsAction: 'score_round',
    };
  }

  private resolveNextSystemPhase(
    gameState: GameState,
    spec: MechanicsSpec,
    phase: MechanicsPhase,
  ): MechanicsPhase | null {
    for (const conditional of phase.conditionalNext) {
      if (!this.evaluateCondition(
        conditional.condition,
        gameState,
        spec,
        cloneContext(gameState.mechanicsContext).lastMechanicsAction,
      )) {
        continue;
      }

      if (conditional.nextPhase) {
        return this.resolvePhaseById(spec, conditional.nextPhase);
      }

      if (this.shouldEndGame(gameState, spec) || conditional.condition === 'game_end_reached') {
        gameState.phase = GamePhase.GAME_END;
        gameState.mechanicsPhaseId = null;
      }

      return null;
    }

    if (phase.nextPhase) {
      return this.resolvePhaseById(spec, phase.nextPhase);
    }

    if (this.shouldEndGame(gameState, spec)) {
      gameState.phase = GamePhase.GAME_END;
      gameState.mechanicsPhaseId = null;
      return null;
    }

    return null;
  }

  private resolveNextPhaseAfterAction(
    gameState: GameState,
    spec: MechanicsSpec,
    phase: MechanicsPhase,
  ): MechanicsPhase | null {
    const conditionalPhaseId = this.resolveConditionalNextPhaseId(
      gameState,
      spec,
      phase,
      cloneContext(gameState.mechanicsContext).lastMechanicsAction,
    );
    if (conditionalPhaseId) {
      return this.resolvePhaseById(spec, conditionalPhaseId);
    }

    if (
      phase.id === 'showdown' &&
      cloneContext(gameState.mechanicsContext).revealedPlayerIds.length >= this.getRevealTargetCount(gameState) &&
      phase.nextPhase
    ) {
      return this.resolvePhaseById(spec, phase.nextPhase);
    }

    if (phase.nextPhase && cloneContext(gameState.mechanicsContext).lastMechanicsAction === 'score_round') {
      return this.resolvePhaseById(spec, phase.nextPhase);
    }

    return null;
  }

  private resolveConditionalNextPhaseId(
    gameState: GameState,
    spec: MechanicsSpec,
    phase: MechanicsPhase | null,
    lastAction: string | null,
  ): string | null {
    if (!phase) {
      return null;
    }

    for (const conditional of phase.conditionalNext) {
      if (this.evaluateCondition(conditional.condition, gameState, spec, lastAction)) {
        return conditional.nextPhase;
      }
    }

    return null;
  }

  private evaluateCondition(
    condition: string,
    gameState: GameState,
    spec: MechanicsSpec,
    lastAction: string | null,
  ): boolean {
    switch (condition) {
      case 'showdown_called':
        return lastAction === 'call_showdown';
      case 'all_players_revealed':
        return cloneContext(gameState.mechanicsContext).revealedPlayerIds.length >= this.getRevealTargetCount(gameState);
      case 'game_end_reached':
        return this.shouldEndGame(gameState, spec);
      case 'start_next_round':
        return !this.shouldEndGame(gameState, spec);
      default:
        return false;
    }
  }

  private shouldEndGame(
    gameState: GameState,
    spec: MechanicsSpec,
  ): boolean {
    const familyDecision = this.getFamilyResolver(spec)?.shouldEndGame?.(gameState, spec);
    if (typeof familyDecision === 'boolean') {
      return familyDecision;
    }

    const roundConfig = spec.roundConfig ?? {};
    const maxRounds = typeof roundConfig.maxRounds === 'number' ? roundConfig.maxRounds : null;
    if (maxRounds !== null && gameState.round >= maxRounds) {
      return true;
    }

    return gameState.deck.length === 0;
  }

  private resolveCurrentPlayerIndex(
    spec: MechanicsSpec,
    dealerIndex: number,
    playerCount: number,
  ): number {
    if (playerCount === 0) {
      return 0;
    }

    switch (spec.turnPolicy.startsWith) {
      case 'dealer':
        return dealerIndex % playerCount;
      case 'right_of_dealer':
        return (dealerIndex - 1 + playerCount) % playerCount;
      case 'left_of_dealer':
      case 'eldest_hand':
      default:
        return (dealerIndex + 1) % playerCount;
    }
  }

  private refreshFloorCardIfNeeded(
    gameState: GameState,
    spec: MechanicsSpec,
    deckProvider: IDeckProvider,
  ): void {
    const drawConfig = spec.drawConfig ?? {};
    const shouldReveal = drawConfig.floorCardCount === 1 || drawConfig.replenishesFloorAfterPickUp === true;
    if (!shouldReveal || gameState.floorCard || gameState.deck.length === 0) {
      return;
    }

    const { card, remainingDeck } = deckProvider.drawCard(gameState.deck);
    gameState.floorCard = card;
    gameState.deck = remainingDeck;
  }

  private advancePlayerIndex(gameState: GameState): number {
    if (gameState.players.length === 0) {
      return 0;
    }

    return (gameState.currentPlayer + 1) % gameState.players.length;
  }

  private readSuit(data: unknown): Suit | null {
    if (!data || typeof data !== 'object') {
      return null;
    }
    const value = (data as Record<string, unknown>).suit;
    return typeof value === 'string' && value.length > 0 ? (value as Suit) : null;
  }

  private readDiscardCardId(data: unknown): string | null {
    if (!data || typeof data !== 'object') {
      return null;
    }
    const value = (data as Record<string, unknown>).discardCardId;
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private readShowdownMinimum(spec: MechanicsSpec): number {
    const constantsMinimum = spec.constants?.showdownMinimum;
    if (typeof constantsMinimum === 'number') {
      return constantsMinimum;
    }

    const showdownAction = spec.customActions.find((action) => action.id === 'call_showdown');
    const hintedMinimum = showdownAction?.effectHints?.minimumScore;
    return typeof hintedMinimum === 'number' ? hintedMinimum : 0;
  }

  private isDiscardRequired(spec: MechanicsSpec): boolean {
    const discardConfig = spec.discardConfig ?? {};
    return discardConfig.requiredAfterPickUp === true;
  }

  private getFamilyResolver(spec: MechanicsSpec): MechanicsFamilyResolver | null {
    const preferredExecutorIds = new Set<string>();
    if (spec.runtimeIntegration?.resolverName) {
      preferredExecutorIds.add(spec.runtimeIntegration.resolverName);
    }

    spec.enabledModules
      ?.filter((module) => module.enabled !== false)
      .forEach((module) => {
        preferredExecutorIds.add(module.executorId);
      });

    const explicitResolver = this.familyResolvers.find((resolver) => {
      const executorId = resolver.executorId ?? resolver.family;
      return preferredExecutorIds.has(executorId) || preferredExecutorIds.has(resolver.family);
    });

    return explicitResolver ?? this.familyResolvers.find((resolver) => resolver.supports(spec)) ?? null;
  }

  private getRevealTargetCount(gameState: GameState): number {
    const folded = new Set(cloneContext(gameState.mechanicsContext).foldedPlayerIds);
    return gameState.players.filter((player) => !folded.has(player.id)).length;
  }

  private resolveActionSpec(
    spec: MechanicsSpec,
    actionType: string,
  ): { supported: boolean } | MechanicsCustomAction | null {
    const standardAction = spec.actions[actionType];
    if (standardAction) {
      return standardAction;
    }

    return spec.customActions.find((action) => action.id === actionType) ?? null;
  }

  private getCurrentPhase(
    gameState: GameState,
    spec: MechanicsSpec,
  ): MechanicsPhase | null {
    if (gameState.mechanicsPhaseId === null) {
      return null;
    }

    const currentId = gameState.mechanicsPhaseId ?? spec.phases[0]?.id ?? null;
    if (!currentId) {
      return null;
    }

    return this.resolvePhaseById(spec, currentId);
  }

  private resolvePhaseById(
    spec: MechanicsSpec,
    phaseId: string | null | undefined,
  ): MechanicsPhase | null {
    if (!phaseId) {
      return null;
    }

    return spec.phases.find((phase) => phase.id === phaseId) ?? null;
  }

  private mapMechanicsPhaseToLegacyPhase(
    phase: MechanicsPhase | null,
  ): GamePhase {
    if (!phase) {
      return GamePhase.PLAYER_ACTION;
    }

    if (phase.id.includes('showdown')) {
      return GamePhase.SHOWDOWN;
    }

    if (phase.id.includes('score')) {
      return GamePhase.SCORING;
    }

    if (phase.actor === 'system') {
      return GamePhase.DEALING;
    }

    return GamePhase.PLAYER_ACTION;
  }
}
