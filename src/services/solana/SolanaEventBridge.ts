import { EventBus } from '@lib/eventing';
import { CreateLobbyEvent } from '@lib/eventing/events/lobby/CreateLobbyEvent';
import { JoinLobbyEvent } from '@lib/eventing/events/lobby/JoinLobbyEvent';
import { StartLobbyAsHostEvent } from '@lib/eventing/events/lobby/StartLobbyAsHostEvent';
import { DecisionTakenEvent } from '@lib/eventing/events/game/DecisionTakenEvent';
import { GameClient } from './GameClient';
import { Connection } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
import { AnchorClient } from './AnchorClient';

export class SolanaEventBridge {
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
    EventBus.instance.subscribe(CreateLobbyEvent, async (event) => {
      if (!this.gameClient || !this.wallet) {
        console.warn('SolanaEventBridge not initialized');
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
        console.log('Match created on Solana:', matchId);
      } catch (error) {
        console.error('Failed to create match on Solana:', error);
      }
    });

    EventBus.instance.subscribe(JoinLobbyEvent, async (event) => {
      if (!this.gameClient || !this.wallet) {
        console.warn('SolanaEventBridge not initialized');
        return;
      }

      try {
        // Create adapter to convert Wallet to GameClient's expected type
        const gameWallet = {
          publicKey: this.wallet.publicKey,
          signTransaction: this.wallet.signTransaction.bind(this.wallet) as (tx: unknown) => Promise<unknown>,
        };
        await this.gameClient.joinMatch(event.lobbyId, gameWallet);
        console.log('Joined match on Solana:', event.lobbyId);
      } catch (error) {
        console.error('Failed to join match on Solana:', error);
      }
    });

    EventBus.instance.subscribe(StartLobbyAsHostEvent, async (event) => {
      if (!this.gameClient || !this.wallet) {
        console.warn('SolanaEventBridge not initialized');
        return;
      }

      try {
        // Create adapter to convert Wallet to GameClient's expected type
        const gameWallet = {
          publicKey: this.wallet.publicKey,
          signTransaction: this.wallet.signTransaction.bind(this.wallet) as (tx: unknown) => Promise<unknown>,
        };
        await this.gameClient.startMatch(event.lobbyId, gameWallet);
        console.log('Started match on Solana:', event.lobbyId);
      } catch (error) {
        console.error('Failed to start match on Solana:', error);
      }
    });

    EventBus.instance.subscribe(DecisionTakenEvent, async (event) => {
      if (!this.gameClient || !this.wallet) {
        console.warn('SolanaEventBridge not initialized');
        return;
      }

      try {
        const matchId = this.getCurrentMatchId();
        if (!matchId) {
          console.warn('No active match ID found');
          return;
        }

        // Create adapter to convert Wallet to GameClient's expected type
        const gameWallet = {
          publicKey: this.wallet.publicKey,
          signTransaction: this.wallet.signTransaction.bind(this.wallet) as (tx: unknown) => Promise<unknown>,
        };
        await this.gameClient.submitMove(matchId, event.action, gameWallet);
        console.log('Move submitted on Solana');
      } catch (error) {
        console.error('Failed to submit move on Solana:', error);
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

