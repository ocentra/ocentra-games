/**
 * Durable Object for match coordination.
 * Per spec Section 8.1, lines 256-283: "Cloudflare Workers + Durable Objects recommended"
 * Each match gets a dedicated Durable Object instance that maintains ephemeral state.
 */

import type { Env } from '../index';

export interface MatchState {
  matchId: string;
  gameName: string;
  gameType: number;
  seed: number;
  phase: number; // 0=created, 1=join, 2=playing, 3=ended
  currentPlayer: number;
  players: string[]; // Player public keys
  playerCount: number;
  moveCount: number;
  createdAt: number;
  endedAt?: number;
  matchHash?: string;
  hotUrl?: string;
  pendingTransactions: Map<string, PendingTransaction>;
  lastCheckpoint?: Checkpoint;
}

export interface PendingTransaction {
  txSignature: string;
  moveIndex: number;
  matchStateBefore: MatchState;
  timestamp: number;
  timeoutHandle?: number;
}

export interface Checkpoint {
  eventIndex: number;
  stateHash: string;
  timestamp: string;
  anchoredAt?: string;
  anchorTxSignature?: string;
}

export class MatchCoordinatorDO implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private matchStates: Map<string, MatchState> = new Map();
  private transactionTimeouts: Map<string, number> = new Map();
  
  // Per critique Issue #13: WebSocket connections for real-time updates
  private websockets: Map<string, WebSocket[]> = new Map(); // matchId -> WebSocket[]
  
  // Transaction timeout: 30 seconds per spec Section 8.1, line 300
  private readonly TX_TIMEOUT_MS = 30000;
  
  // Periodic sync: every 10 moves per spec Section 8.1, line 304
  private readonly SYNC_INTERVAL_MOVES = 10;
  
  // Checkpoint interval for high-value matches: every 20 moves
  private readonly CHECKPOINT_INTERVAL_MOVES = 20;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Per critique Issue #13: Handle WebSocket upgrade requests
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader === 'websocket') {
      return this.handleWebSocket(request);
    }

    // Extract match ID from path: /match/{matchId}/...
    const matchIdMatch = path.match(/^\/match\/([^/]+)/);
    if (!matchIdMatch) {
      return new Response('Match ID required', { status: 400 });
    }
    const matchId = matchIdMatch[1];

    // Get or create match state
    let matchState = this.matchStates.get(matchId);
    if (!matchState) {
      matchState = await this.loadMatchState(matchId);
      if (!matchState) {
        return new Response('Match not found', { status: 404 });
      }
      this.matchStates.set(matchId, matchState);
    }

    // Route requests
    if (path.endsWith('/state') && method === 'GET') {
      return this.handleGetState(matchState);
    }

    if (path.endsWith('/create') && method === 'POST') {
      return this.handleCreateMatch(request, matchId);
    }

    if (path.endsWith('/join') && method === 'POST') {
      return this.handleJoinMatch(request, matchState);
    }

    if (path.endsWith('/move') && method === 'POST') {
      return this.handleSubmitMove(request, matchState);
    }

    if (path.endsWith('/checkpoint') && method === 'POST') {
      return this.handleCreateCheckpoint(request, matchState);
    }

    if (path.endsWith('/sync') && method === 'POST') {
      return this.handleSyncState(request, matchState);
    }

    if (path.endsWith('/finalize') && method === 'POST') {
      return this.handleFinalizeMatch(request, matchState);
    }

    return new Response('Not Found', { status: 404 });
  }

  private async handleGetState(matchState: MatchState): Promise<Response> {
    return new Response(JSON.stringify(matchState), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleCreateMatch(request: Request, matchId: string): Promise<Response> {
    const body = await request.json() as { gameName?: string; gameType?: number; seed?: number };
    const matchState: MatchState = {
      matchId,
      gameName: body.gameName || 'CLAIM',
      gameType: body.gameType || 0,
      seed: body.seed || Math.floor(Math.random() * 1000000),
      phase: 0, // Created
      currentPlayer: 0,
      players: [],
      playerCount: 0,
      moveCount: 0,
      createdAt: Date.now(),
      pendingTransactions: new Map(),
    };

    this.matchStates.set(matchId, matchState);
    await this.saveMatchState(matchState);

    return new Response(JSON.stringify({ success: true, matchState }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleJoinMatch(request: Request, matchState: MatchState): Promise<Response> {
    if (matchState.phase !== 0) {
      return new Response('Match already started', { status: 400 });
    }

    const body = await request.json() as { playerPubkey?: string };
    const playerPubkey = body.playerPubkey;
    if (!playerPubkey) {
      return new Response('Player public key required', { status: 400 });
    }

    if (matchState.players.includes(playerPubkey)) {
      return new Response('Player already joined', { status: 400 });
    }

    matchState.players.push(playerPubkey);
    matchState.playerCount = matchState.players.length;

    await this.saveMatchState(matchState);

    return new Response(JSON.stringify({ success: true, matchState }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleSubmitMove(
    request: Request,
    matchState: MatchState
  ): Promise<Response> {
    // Per critique Issue #13: Verify Firebase token before processing move
    if (this.env.FIREBASE_PROJECT_ID) {
      const { verifyAuth } = await import('../auth');
      const authResult = await verifyAuth(request, this.env.FIREBASE_PROJECT_ID);
      if (authResult.error || !authResult.userId) {
        return new Response(JSON.stringify({ 
          error: 'Unauthorized', 
          message: authResult.error || 'Authentication required' 
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // Store userId for audit trail
      // Note: userId is Firebase UID, not Solana pubkey
    }

    if (matchState.phase !== 2) {
      return new Response('Match not in playing phase', { status: 400 });
    }

    const body = await request.json() as { move?: unknown; txSignature?: string; userId?: string };
    const { move, txSignature, userId } = body;
    if (!move || !txSignature) {
      return new Response('Move and transaction signature required', { status: 400 });
    }
    
    // Validate userId if provided (should match authenticated user)
    if (userId && this.env.FIREBASE_PROJECT_ID) {
      const { verifyAuth } = await import('../auth');
      const authResult = await verifyAuth(request, this.env.FIREBASE_PROJECT_ID);
      if (authResult.userId !== userId) {
        return new Response('User ID mismatch', { status: 403 });
      }
    }

    // Validate move off-chain first (fast feedback)
    // Per spec Section 8.1, line 288: "Coordinator validates move off-chain first"
    const isValid = this.validateMove(matchState, move);
    if (!isValid) {
      return new Response('Invalid move', { status: 400 });
    }

    // Store pending transaction
    const pendingTx: PendingTransaction = {
      txSignature,
      moveIndex: matchState.moveCount,
      matchStateBefore: { ...matchState },
      timestamp: Date.now(),
    };

    matchState.pendingTransactions.set(txSignature, pendingTx);

    // Update match state optimistically
    matchState.moveCount++;
    matchState.currentPlayer = (matchState.currentPlayer + 1) % matchState.playerCount;

    // Set transaction timeout
    // Note: setAlarm returns Promise<void>, we store the alarm time instead
    await this.state.storage.setAlarm(Date.now() + this.TX_TIMEOUT_MS);
    this.transactionTimeouts.set(txSignature, Date.now() + this.TX_TIMEOUT_MS);

    // Check if periodic sync needed (every 10 moves)
    if (matchState.moveCount % this.SYNC_INTERVAL_MOVES === 0) {
      // Trigger sync (client should call /sync endpoint)
      // Per spec Section 8.1, line 304: "Every 10 moves: verify off-chain state matches on-chain"
    }

    // Check if checkpoint needed for high-value matches (every 20 moves)
    if (matchState.moveCount % this.CHECKPOINT_INTERVAL_MOVES === 0) {
      // Trigger checkpoint creation
      // Per spec Section 3, line 103: "Periodic checkpoint (optional): coordinator emits checkpoint object"
    }

    await this.saveMatchState(matchState);

    return new Response(JSON.stringify({ success: true, matchState }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleCreateCheckpoint(
    request: Request,
    matchState: MatchState
  ): Promise<Response> {
    const body = await request.json() as { anchorOnChain?: boolean } | null;
    const { anchorOnChain } = body || {};

    // Create checkpoint object
    const checkpoint: Checkpoint = {
      eventIndex: matchState.moveCount,
      stateHash: await this.hashMatchState(matchState),
      timestamp: new Date().toISOString(),
    };

    // Optionally anchor to Solana if match is high-value
    // Per spec Section 3, line 103: "hash checkpoint and optionally anchor to Solana if match is high-value"
    if (anchorOnChain) {
      // This would call the Solana client to anchor the checkpoint
      // For now, we just store the checkpoint
      checkpoint.anchoredAt = new Date().toISOString();
    }

    matchState.lastCheckpoint = checkpoint;
    await this.saveMatchState(matchState);

    return new Response(JSON.stringify({ success: true, checkpoint }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleSyncState(
    request: Request,
    matchState: MatchState
  ): Promise<Response> {
    const body = await request.json() as { onChainState?: unknown };
    const { onChainState } = body;
    if (!onChainState) {
      return new Response('On-chain state required', { status: 400 });
    }

    // Compare off-chain state with on-chain state
    // Per spec Section 8.1, line 305: "On mismatch: pause match, alert coordinator, manual resolution"
    const isMismatch = this.compareStates(matchState, onChainState);
    if (isMismatch) {
      // Pause match
      matchState.phase = 3; // Paused/ended
      await this.saveMatchState(matchState);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'State mismatch detected',
        matchState 
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 409, // Conflict
      });
    }

    // Clear confirmed transactions
    const onChainStateTyped = onChainState as { moveCount?: number };
    for (const [txSig, pendingTx] of matchState.pendingTransactions.entries()) {
      if (onChainStateTyped.moveCount && onChainStateTyped.moveCount > pendingTx.moveIndex) {
        // Transaction confirmed
        matchState.pendingTransactions.delete(txSig);
        // Clear timeout - alarms are cleared by not setting a new one
        // Note: deleteAlarm doesn't exist in Durable Objects API, alarms are cleared automatically
        this.transactionTimeouts.delete(txSig);
      }
    }

    await this.saveMatchState(matchState);

    return new Response(JSON.stringify({ success: true, matchState }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleFinalizeMatch(
    request: Request,
    matchState: MatchState
  ): Promise<Response> {
    matchState.phase = 3; // Ended
    matchState.endedAt = Date.now();

    const body = await request.json() as { matchHash?: string; hotUrl?: string };
    if (body.matchHash) {
      matchState.matchHash = body.matchHash;
    }
    if (body.hotUrl) {
      matchState.hotUrl = body.hotUrl;
    }

    await this.saveMatchState(matchState);

    return new Response(JSON.stringify({ success: true, matchState }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Alarm handler for transaction timeouts
  async alarm(): Promise<void> {
    // Handle transaction timeout
    // Per spec Section 8.1, line 301: "After timeout, assume failure and rollback"
    for (const [, matchState] of this.matchStates.entries()) {
      for (const [txSig, pendingTx] of matchState.pendingTransactions.entries()) {
        const age = Date.now() - pendingTx.timestamp;
        if (age > this.TX_TIMEOUT_MS) {
          // Rollback to state before transaction
          Object.assign(matchState, pendingTx.matchStateBefore);
          matchState.pendingTransactions.delete(txSig);
          await this.saveMatchState(matchState);
        }
      }
    }
  }

  private validateMove(matchState: MatchState, move: unknown): boolean {
    // Basic validation - full validation should mirror TypeScript RuleEngine
    // Per spec Section 8.1, line 266: "Durable Object holds match state, validates moves"
    if (!move || typeof move !== 'object') {
      return false;
    }
    // Add full game rule validation here
    return true;
  }

  private compareStates(offChain: MatchState, onChain: unknown): boolean {
    // Compare key fields
    // Per spec Section 8.1, line 305: "verify off-chain state matches on-chain"
    if (!onChain || typeof onChain !== 'object') {
      return true; // Mismatch if on-chain state invalid
    }
    const onChainState = onChain as MatchState;
    return (
      offChain.moveCount !== onChainState.moveCount ||
      offChain.currentPlayer !== onChainState.currentPlayer ||
      offChain.phase !== onChainState.phase
    );
  }

  private async hashMatchState(matchState: MatchState): Promise<string> {
    // Create deterministic hash of match state
    const stateJson = JSON.stringify(matchState, Object.keys(matchState).sort());
    const encoder = new TextEncoder();
    const data = encoder.encode(stateJson);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async loadMatchState(matchId: string): Promise<MatchState | undefined> {
    try {
      const value = await this.state.storage.get<MatchState>(`match:${matchId}`);
      return value;
    } catch (error) {
      console.error('Failed to load match state:', error);
      return undefined;
    }
  }

  private async saveMatchState(matchState: MatchState): Promise<void> {
    try {
      await this.state.storage.put(`match:${matchState.matchId}`, matchState);
      
      // Per critique Issue #13: Broadcast state updates to WebSocket clients
      this.broadcastToWebSockets(matchState.matchId, {
        type: 'state_update',
        matchState,
      });
    } catch (error) {
      console.error('Failed to save match state:', error);
    }
  }

  /**
   * Per critique Issue #13: Handle WebSocket connections for real-time updates.
   */
  private async handleWebSocket(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const matchIdMatch = url.pathname.match(/^\/match\/([^/]+)/);
    if (!matchIdMatch) {
      return new Response('Match ID required', { status: 400 });
    }
    const matchId = matchIdMatch[1];

    // Per critique Issue #13: Verify Firebase token for WebSocket connections
    if (this.env.FIREBASE_PROJECT_ID) {
      const { verifyAuth } = await import('../auth');
      const authResult = await verifyAuth(request, this.env.FIREBASE_PROJECT_ID);
      if (authResult.error || !authResult.userId) {
        return new Response('Unauthorized: Invalid or missing Firebase token', { status: 401 });
      }
    }

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept WebSocket connection
    server.accept();

    // Add to WebSocket list for this match
    if (!this.websockets.has(matchId)) {
      this.websockets.set(matchId, []);
    }
    this.websockets.get(matchId)!.push(server);

    // Handle WebSocket close
    server.addEventListener('close', () => {
      const wsList = this.websockets.get(matchId);
      if (wsList) {
        const index = wsList.indexOf(server);
        if (index > -1) {
          wsList.splice(index, 1);
        }
        if (wsList.length === 0) {
          this.websockets.delete(matchId);
        }
      }
    });

    // Send current state on connection
    const matchState = this.matchStates.get(matchId);
    if (matchState) {
      server.send(JSON.stringify({
        type: 'state_update',
        matchState,
      }));
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Per critique Issue #13: Broadcast messages to all WebSocket clients for a match.
   */
  private broadcastToWebSockets(matchId: string, message: unknown): void {
    const wsList = this.websockets.get(matchId);
    if (!wsList) {
      return;
    }

    const messageStr = JSON.stringify(message);
    for (const ws of wsList) {
      try {
        ws.send(messageStr);
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        // Remove failed WebSocket
        const index = wsList.indexOf(ws);
        if (index > -1) {
          wsList.splice(index, 1);
        }
      }
    }
  }
}

