import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { CreateLobbyEvent } from '@ocentra/eventing-domain/events/lobby/CreateLobbyEvent';
import { JoinLobbyEvent } from '@ocentra/eventing-domain/events/lobby/JoinLobbyEvent';
import { StartLobbyAsHostEvent } from '@ocentra/eventing-domain/events/lobby/StartLobbyAsHostEvent';
import { DecisionTakenEvent } from '@ocentra/eventing-domain/events/game/DecisionTakenEvent';
import { GameClient } from './GameClient';
import { Connection } from '@solana/web3.js';
import type { Wallet } from '@coral-xyz/anchor';
import { AnchorClient } from './AnchorClient';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};
const logWarn = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
  }
};
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

export class SolanaEventBridge {
  static {
    log.register(import.meta.url);
  }

  private gameClient: GameClient | null = null;
  private wallet: Wallet | null = null;
  // Connection is only used during initialization to create AnchorClient
  // It's not stored as a property since it's not needed afterward

  constructor() {
    this.setupEventListeners();
  }

  initialize(connection: Connection, wallet: Wallet): void {
    this.wallet = wallet;
    const anchorClient = new AnchorClient(connection, wallet);
    this.gameClient = new GameClient(anchorClient);
  }

  private setupEventListeners(): void {
    EventBus.instance.subscribe(CreateLobbyEvent, async (event: CreateLobbyEvent) => {
      if (!this.gameClient || !this.wallet) {
        logWarn('SolanaEventBridge not initialized');
        return;
      }

      try {
        const gameType = this.mapGameNameToType(event.options.gameMode || 'CLAIM');
        const seed = Math.floor(Math.random() * 1000000);

        // Create adapter to convert Wallet to GameClient's expected type
        const gameWallet = {
          publicKey: this.wallet.publicKey,
          signTransaction: this.wallet.signTransaction.bind(this.wallet) as (tx: unknown) => Promise<unknown>,
        };

        const matchId = await this.gameClient.createMatch(
          gameType,
          seed,
          gameWallet
        );

        this.setCurrentMatchId(matchId);
        logInfo('Match created on Solana:', { data: matchId });
      } catch (error) {
        logError('Failed to create match on Solana:', { data: error });
      }
    });

    EventBus.instance.subscribe(JoinLobbyEvent, async (event) => {
      if (!this.gameClient || !this.wallet) {
        logWarn('SolanaEventBridge not initialized');
        return;
      }

      try {
        // Create adapter to convert Wallet to GameClient's expected type
        const gameWallet = {
          publicKey: this.wallet.publicKey,
          signTransaction: this.wallet.signTransaction.bind(this.wallet) as (tx: unknown) => Promise<unknown>,
        };
        await this.gameClient.joinMatch(event.lobbyId, gameWallet);
        logInfo('Joined match on Solana:', { data: event.lobbyId });
      } catch (error) {
        logError('Failed to join match on Solana:', { data: error });
      }
    });

    EventBus.instance.subscribe(StartLobbyAsHostEvent, async (event: StartLobbyAsHostEvent) => {
      if (!this.gameClient || !this.wallet) {
        logWarn('SolanaEventBridge not initialized');
        return;
      }

      try {
        // Create adapter to convert Wallet to GameClient's expected type
        const gameWallet = {
          publicKey: this.wallet.publicKey,
          signTransaction: this.wallet.signTransaction.bind(this.wallet) as (tx: unknown) => Promise<unknown>,
        };
        await this.gameClient.startMatch(event.lobbyId, gameWallet);
        logInfo('Started match on Solana:', { data: event.lobbyId });
      } catch (error) {
        logError('Failed to start match on Solana:', { data: error });
      }
    });

    EventBus.instance.subscribe(DecisionTakenEvent, async (event: DecisionTakenEvent) => {
      if (!this.gameClient || !this.wallet) {
        logWarn('SolanaEventBridge not initialized');
        return;
      }

      try {
        const matchId = this.getCurrentMatchId();
        if (!matchId) {
          logWarn('No active match ID found');
          return;
        }

        // Create adapter to convert Wallet to GameClient's expected type
        const gameWallet = {
          publicKey: this.wallet.publicKey,
          signTransaction: this.wallet.signTransaction.bind(this.wallet) as (tx: unknown) => Promise<unknown>,
        };
        await this.gameClient.submitMove(matchId, event.action, gameWallet);
        logInfo('Move submitted on Solana');
      } catch (error) {
        logError('Failed to submit move on Solana:', { data: error });
      }
    });
  }

  private mapGameNameToType(gameName: string): number {
    const mapping: Record<string, number> = {
      'CLAIM': 0,
      'THREECARDBRAG': 1,
      'POKER': 2,
      'BRIDGE': 3,
      'RUMMY': 4,
      'SCRABBLE': 5,
      'WORDSEARCH': 6,
      'CROSSWORDS': 7,
    };
    return mapping[gameName.toUpperCase()] ?? 0;
  }

  private getCurrentMatchId(): string | null {
    return sessionStorage.getItem('currentMatchId');
  }

  setCurrentMatchId(matchId: string): void {
    sessionStorage.setItem('currentMatchId', matchId);
  }

  clearCurrentMatchId(): void {
    sessionStorage.removeItem('currentMatchId');
  }
}


