/**
 * Durable Object for match coordination.
 * Per spec Section 8.1, lines 256-283: "Cloudflare Workers + Durable Objects recommended"
 * Each match gets a dedicated Durable Object instance that maintains ephemeral state.
 */
export class MatchCoordinatorDO {
    state;
    env;
    matchStates = new Map();
    transactionTimeouts = new Map();
    // Per critique Issue #13: WebSocket connections for real-time updates
    websockets = new Map(); // matchId -> WebSocket[]
    // Transaction timeout: 30 seconds per spec Section 8.1, line 300
    TX_TIMEOUT_MS = 30000;
    // Periodic sync: every 10 moves per spec Section 8.1, line 304
    SYNC_INTERVAL_MOVES = 10;
    // Checkpoint interval for high-value matches: every 20 moves
    CHECKPOINT_INTERVAL_MOVES = 20;
    constructor(state, env) {
        this.state = state;
        this.env = env;
    }
    async fetch(request) {
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
    async handleGetState(matchState) {
        return new Response(JSON.stringify(matchState), {
            headers: { 'Content-Type': 'application/json' },
        });
    }
    async handleCreateMatch(request, matchId) {
        const body = await request.json();
        const matchState = {
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
    async handleJoinMatch(request, matchState) {
        if (matchState.phase !== 0) {
            return new Response('Match already started', { status: 400 });
        }
        const body = await request.json();
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
    async handleSubmitMove(request, matchState) {
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
        const body = await request.json();
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
        const pendingTx = {
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
    async handleCreateCheckpoint(request, matchState) {
        const body = await request.json();
        const { anchorOnChain } = body || {};
        // Create checkpoint object
        const checkpoint = {
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
    async handleSyncState(request, matchState) {
        const body = await request.json();
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
        const onChainStateTyped = onChainState;
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
    async handleFinalizeMatch(request, matchState) {
        matchState.phase = 3; // Ended
        matchState.endedAt = Date.now();
        const body = await request.json();
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
    async alarm() {
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
    validateMove(matchState, move) {
        // Basic validation - full validation should mirror TypeScript RuleEngine
        // Per spec Section 8.1, line 266: "Durable Object holds match state, validates moves"
        if (!move || typeof move !== 'object') {
            return false;
        }
        // Add full game rule validation here
        return true;
    }
    compareStates(offChain, onChain) {
        // Compare key fields
        // Per spec Section 8.1, line 305: "verify off-chain state matches on-chain"
        if (!onChain || typeof onChain !== 'object') {
            return true; // Mismatch if on-chain state invalid
        }
        const onChainState = onChain;
        return (offChain.moveCount !== onChainState.moveCount ||
            offChain.currentPlayer !== onChainState.currentPlayer ||
            offChain.phase !== onChainState.phase);
    }
    async hashMatchState(matchState) {
        // Create deterministic hash of match state
        const stateJson = JSON.stringify(matchState, Object.keys(matchState).sort());
        const encoder = new TextEncoder();
        const data = encoder.encode(stateJson);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    async loadMatchState(matchId) {
        try {
            const value = await this.state.storage.get(`match:${matchId}`);
            return value;
        }
        catch (error) {
            console.error('Failed to load match state:', error);
            return undefined;
        }
    }
    async saveMatchState(matchState) {
        try {
            await this.state.storage.put(`match:${matchState.matchId}`, matchState);
            // Per critique Issue #13: Broadcast state updates to WebSocket clients
            this.broadcastToWebSockets(matchState.matchId, {
                type: 'state_update',
                matchState,
            });
        }
        catch (error) {
            console.error('Failed to save match state:', error);
        }
    }
    /**
     * Per critique Issue #13: Handle WebSocket connections for real-time updates.
     */
    async handleWebSocket(request) {
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
        this.websockets.get(matchId).push(server);
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
    broadcastToWebSockets(matchId, message) {
        const wsList = this.websockets.get(matchId);
        if (!wsList) {
            return;
        }
        const messageStr = JSON.stringify(message);
        for (const ws of wsList) {
            try {
                ws.send(messageStr);
            }
            catch (error) {
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
