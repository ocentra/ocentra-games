import type { Env } from '@/constants/env';
import { requireAuth } from '@/utils/auth-middleware';
import { HttpStatus, HttpHeader, HttpContentType, WebSocketProtocol, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { computeSha256 } from '@/utils/crypto-utils';
import { Timeout } from '@/constants/time';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { buildMatchKey, buildSafeBucketKey } from '@/utils/path-sanitizer';
import { MetadataField } from '@ocentra/endpoint-domain/constants/idempotency';
import { CorsOrigin } from '@/constants/cors';
import type { MatchId } from '@ocentra/endpoint-domain/constants/match';
import { validateMatchId } from '@ocentra/endpoint-domain/constants/match';
import { CreditsDO, DOBaseUrl, MatchCoordinatorDOSegment, MatchWSChannel, MatchWSMessageType } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { MatchCoordinatorDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import { GameName, PlayerType } from '@ocentra/endpoint-domain/constants/game';
import {
  MatchWSIncomingMessageSchema,
  MatchWSChatMessageSchema,
  MatchWSVoiceTextMessageSchema,
} from '@ocentra/endpoint-domain/schemas/match-ws';
import type {
  MatchAIDump,
  MatchChatMessage,
  MatchWSAiDumpMessage,
  MatchWSAttachment,
  MatchWSChatMessage,
  MatchWSFinalizeMessage,
  MatchWSIncomingMessage,
  MatchWSMoveMessage,
  MatchWSSyncMessage,
  MatchWSVoiceTextMessage,
} from '@ocentra/endpoint-domain/types/cloudflare/matches';

export interface MatchState {
  matchId: MatchId;
  gameName: string;
  gameType: number;
  seed: number;
  phase: number;
  currentPlayer: number;
  players: string[];
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
}

export interface Checkpoint {
  eventIndex: number;
  stateHash: string;
  timestamp: string;
  anchoredAt?: string;
  anchorTxSignature?: string;
}

interface BatchAwardEntry {
  userId: string;
  amount: number;
  reason: string;
  metadata: Record<string, unknown>;
}

interface StoredAIDump extends MatchAIDump {
  uploaderId: string;
  uploadedAt: number;
}

export class MatchCoordinatorDO implements DurableObject {
  private readonly log = Logger.instance;
  private readonly matchStates = new Map<string, MatchState>();
  private readonly chatRateLimit = new Map<string, number>();
  private readonly TX_TIMEOUT_MS = Timeout.TxTimeoutMs;
  private readonly SYNC_INTERVAL_MOVES = 10;
  private readonly CHECKPOINT_INTERVAL_MOVES = 20;
  private readonly CHAT_HISTORY_MAX = 200;
  private readonly CHAT_RATE_LIMIT_MS = 500;
  private readonly CHAT_BLOCKED_PATTERNS = [/badword/i, /spam/i];
  private readonly MAX_AI_DUMP_BYTES = 1024 * 1024;
  private readonly MATCH_WS_TAG_PREFIX = 'match:';
  private readonly LOG_MATCH_INFO = false;
  private readonly LOG_MATCH_WARNINGS = false;

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env
  ) {
    this.log.register(import.meta.url);
  }

  private logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
    this.log.logInfo(message, stackTrace, data, enabled);
  };

  private logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
    this.log.logWarn(message, stackTrace, data, enabled);
  };

  private logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
    this.log.logError(message, stackTrace, data);
  };

  private logDebug = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
    this.log.logDebug(message, stackTrace, data, enabled);
  };

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get(HttpHeader.Upgrade) === WebSocketProtocol.WebSocket) {
      return this.handleWebSocket(request);
    }

    const parsed = this.parseMatchPath(new URL(request.url).pathname);
    if (parsed.error || !parsed.matchId) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: parsed.error || ErrorMessage.MatchIdRequired,
      }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }

    const requestOrigin = request.headers.get(HttpHeader.Origin);
    const authResult = await requireAuth(request, this.env, requestOrigin || undefined, 'Authentication required for match operations');
    if (authResult instanceof Response) {
      return authResult;
    }

    if (parsed.action === MatchCoordinatorDOSegment.Create && request.method === HttpMethod.Post) {
      return this.handleCreateMatch(request, parsed.matchId);
    }

    if (parsed.action === MatchCoordinatorDOSegment.Delete && request.method === HttpMethod.Delete) {
      return this.handleDeleteMatch(parsed.matchId);
    }

    if (await this.isMatchDeleted(parsed.matchId)) {
      return new Response(ErrorMessage.MatchNotFound, { status: HttpStatus.Gone });
    }

    const matchState = await this.getOrLoadMatchState(parsed.matchId);
    if (!matchState) {
      return new Response(ErrorMessage.MatchNotFound, { status: HttpStatus.NotFound });
    }

    if (parsed.action === MatchCoordinatorDOSegment.State && request.method === HttpMethod.Get) {
      return new Response(JSON.stringify(this.serializeMatchState(matchState)), {
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }

    if (parsed.action === MatchCoordinatorDOSegment.Join && request.method === HttpMethod.Post) {
      return this.handleJoinMatch(request, matchState);
    }

    return new Response(ErrorMessage.NotFound, { status: HttpStatus.NotFound });
  }

  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    this.ctx.waitUntil(this.handleWebSocketMessage(ws, message).catch((error) => {
      this.logError('Failed to handle WebSocket message', getStackTrace(), error);
      this.sendToSocket(ws, {
        type: MatchWSMessageType.Error,
        message: ErrorMessage.InternalServerError,
      });
    }));
  }

  webSocketClose(_ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): void {
  }

  async alarm(): Promise<void> {
    for (const matchState of this.matchStates.values()) {
      for (const [txSig, pendingTx] of matchState.pendingTransactions.entries()) {
        const age = Date.now() - pendingTx.timestamp;
        if (age > this.TX_TIMEOUT_MS) {
          const restoredState = this.cloneMatchState(pendingTx.matchStateBefore);
          restoredState.pendingTransactions.delete(txSig);
          this.matchStates.set(restoredState.matchId, restoredState);
          await this.saveMatchState(restoredState);
        }
      }
    }
  }

  private parseMatchPath(path: string): { matchId: MatchId | null; action: string | null; error: string | null } {
    const pathMatch = path.match(/^\/match\/([^/]+)(?:\/([^/]+))?$/);
    if (!pathMatch) {
      return { matchId: null, action: null, error: 'Invalid match path' };
    }

    const matchIdValidation = validateMatchId(pathMatch[1]);
    if (!matchIdValidation.valid || !matchIdValidation.matchId) {
      return {
        matchId: null,
        action: null,
        error: matchIdValidation.error || 'Invalid matchId format',
      };
    }

    return {
      matchId: matchIdValidation.matchId,
      action: pathMatch[2] ?? null,
      error: null,
    };
  }

  private getMatchStorageKey(matchId: string): string {
    return `${MatchCoordinatorDOStoragePrefix.Match}${matchId}`;
  }

  private getDeletedMatchStorageKey(matchId: string): string {
    return `${MatchCoordinatorDOStoragePrefix.Deleted}${matchId}`;
  }

  private async isMatchDeleted(matchId: string): Promise<boolean> {
    try {
      const deletedValue = await this.ctx.storage.get(this.getDeletedMatchStorageKey(matchId));
      return deletedValue !== null && deletedValue !== undefined;
    } catch (error) {
      this.logError('Failed to check match deletion state', getStackTrace(), error);
      return false;
    }
  }

  private async clearMatchDeletionMark(matchId: string): Promise<void> {
    try {
      await this.ctx.storage.delete(this.getDeletedMatchStorageKey(matchId));
    } catch (error) {
      this.logError('Failed to clear match deletion mark', getStackTrace(), error);
    }
  }

  private async handleCreateMatch(request: Request, matchId: MatchId): Promise<Response> {
    let body: { gameName?: string; gameType?: number; seed?: number };
    try {
      body = await request.json() as typeof body;
    } catch {
      body = {};
    }

    const matchState: MatchState = {
      matchId,
      gameName: body.gameName || GameName.Claim,
      gameType: body.gameType || 0,
      seed: body.seed || Math.floor(Math.random() * 1000000),
      phase: 0,
      currentPlayer: 0,
      players: [],
      playerCount: 0,
      moveCount: 0,
      createdAt: Date.now(),
      pendingTransactions: new Map(),
    };

    await this.clearMatchDeletionMark(matchId);
    this.matchStates.delete(matchId);
    this.matchStates.set(matchId, matchState);
    await this.saveMatchState(matchState);

    return new Response(JSON.stringify({
      success: true,
      matchState: this.serializeMatchState(matchState),
    }), {
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async handleDeleteMatch(matchId: MatchId): Promise<Response> {
    const deletedKey = this.getDeletedMatchStorageKey(matchId);
    const matchKey = this.getMatchStorageKey(matchId);
    const cleanupKeys = [
      matchKey,
      `${MatchCoordinatorDOStoragePrefix.ChatHistory}${matchId}`,
      `${MatchCoordinatorDOStoragePrefix.AiDump}${matchId}`,
      `${MatchCoordinatorDOStoragePrefix.SyncTriggered}${matchId}`,
      `${MatchCoordinatorDOStoragePrefix.CheckpointTriggered}${matchId}`,
    ];

    try {
      const existingState = this.matchStates.get(matchId) ?? await this.loadMatchState(matchId);
      if (existingState) {
        this.closeMatchSockets(matchId, 1000, 'Match deleted');
      }

      await this.ctx.storage.put(deletedKey, JSON.stringify({ deletedAt: Date.now() }));
      this.matchStates.delete(matchId);

      const cleanupResults = await Promise.allSettled(cleanupKeys.map((key) => this.ctx.storage.delete(key)));
      const failedCleanup = cleanupResults.find((result) => result.status === 'rejected');
      if (failedCleanup) {
        throw failedCleanup.reason;
      }

      return new Response(JSON.stringify({
        success: true,
        matchId,
      }), {
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    } catch (error) {
      this.logError('Failed to delete match', getStackTrace(), error);
      return new Response(JSON.stringify({
        error: ErrorMessage.InternalServerError,
      }), {
        status: HttpStatus.InternalServerError,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
  }

  private async handleJoinMatch(request: Request, matchState: MatchState): Promise<Response> {
    if (matchState.phase !== 0) {
      return new Response('Match already started', { status: HttpStatus.BadRequest });
    }

    const body = await request.json() as { playerPubkey?: string };
    const playerPubkey = body.playerPubkey;
    if (!playerPubkey) {
      return new Response('Player public key required', { status: HttpStatus.BadRequest });
    }

    if (matchState.players.includes(playerPubkey)) {
      return new Response('Player already joined', { status: HttpStatus.BadRequest });
    }

    matchState.players.push(playerPubkey);
    matchState.playerCount = matchState.players.length;
    await this.saveMatchState(matchState);

    return new Response(JSON.stringify({
      success: true,
      matchState: this.serializeMatchState(matchState),
    }), {
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const parsed = this.parseMatchPath(new URL(request.url).pathname);
    if (parsed.error || !parsed.matchId) {
      return new Response('Match ID required', { status: HttpStatus.BadRequest });
    }

    const requestOrigin = request.headers.get(HttpHeader.Origin);
    const authResult = await requireAuth(request, this.env, requestOrigin || undefined, 'Authentication required for WebSocket connection');
    if (authResult instanceof Response) {
      return authResult;
    }

    if (!this.validateWebSocketOrigin(requestOrigin)) {
      return new Response(JSON.stringify({
        error: ErrorMessage.Forbidden,
        message: 'Origin not allowed for WebSocket connection',
      }), {
        status: HttpStatus.Forbidden,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }

    const matchState = await this.getOrLoadMatchState(parsed.matchId);
    if (!matchState) {
      return new Response(ErrorMessage.MatchNotFound, { status: HttpStatus.NotFound });
    }

    const playerIndex = matchState.players.indexOf(authResult.userId);
    if (playerIndex < 0) {
      return new Response(JSON.stringify({
        error: ErrorMessage.Forbidden,
        message: 'User is not a participant in this match',
      }), {
        status: HttpStatus.Forbidden,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [this.getMatchTag(parsed.matchId)]);
    const attachment: MatchWSAttachment = {
      userId: authResult.userId,
      matchId: parsed.matchId,
      connectedAt: Date.now(),
      playerIndex,
    };
    server.serializeAttachment(attachment);

    this.sendToSocket(server, {
      type: MatchWSMessageType.StateUpdate,
      matchId: parsed.matchId,
      matchState: this.serializeMatchState(matchState),
    });

    return new Response(null, {
      status: HttpStatus.SwitchingProtocols,
      webSocket: client,
    });
  }

  private async handleWebSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const attachment = ws.deserializeAttachment() as MatchWSAttachment | null;
    if (!attachment) {
      this.sendError(ws, 'Missing socket attachment');
      return;
    }

    const payloadText = typeof message === 'string' ? message : new TextDecoder().decode(message);
    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(payloadText);
    } catch {
      this.sendError(ws, 'Invalid JSON payload');
      return;
    }

    if (parsedPayload && typeof parsedPayload === 'object' && 'userId' in parsedPayload) {
      const payloadUserId = (parsedPayload as { userId?: unknown }).userId;
      if (typeof payloadUserId === 'string' && payloadUserId !== attachment.userId) {
        this.sendError(ws, ErrorMessage.UserIdMismatch);
        return;
      }
    }

    const parsed = MatchWSIncomingMessageSchema.safeParse(parsedPayload);
    if (!parsed.success) {
      this.sendError(ws, 'Invalid WebSocket message');
      return;
    }

    const payload = parsed.data as MatchWSIncomingMessage;
    if ('matchId' in payload && payload.matchId !== attachment.matchId) {
      this.sendError(ws, ErrorMessage.MatchIdMismatch);
      return;
    }

    switch (payload.type) {
      case MatchWSMessageType.Move:
        await this.handleMoveMessage(ws, attachment, payload);
        break;
      case MatchWSMessageType.Sync:
        await this.handleSyncMessage(ws, attachment, payload);
        break;
      case MatchWSMessageType.Finalize:
        await this.handleFinalizeMessage(ws, attachment, payload);
        break;
      case MatchWSMessageType.Chat:
        await this.handleChatMessage(ws, attachment, payload, MatchWSChannel.Text);
        break;
      case MatchWSMessageType.VoiceText:
        await this.handleChatMessage(ws, attachment, payload, MatchWSChannel.Voice);
        break;
      case MatchWSMessageType.AiDump:
        await this.handleAiDumpMessage(ws, attachment, payload);
        break;
      case MatchWSMessageType.Ping:
        this.sendToSocket(ws, {
          type: MatchWSMessageType.Pong,
          matchId: attachment.matchId,
          timestamp: Date.now(),
        });
        break;
      default:
        this.sendError(ws, 'Unsupported message type');
        break;
    }
  }

  private async handleMoveMessage(
    ws: WebSocket,
    attachment: MatchWSAttachment,
    payload: MatchWSMoveMessage
  ): Promise<void> {
    const matchState = await this.getOrLoadMatchState(attachment.matchId);
    if (!matchState) {
      this.sendError(ws, ErrorMessage.MatchNotFound, attachment.matchId);
      return;
    }

    if (matchState.phase !== 2) {
      this.sendError(ws, 'Match not in playing phase', attachment.matchId);
      return;
    }

    if (attachment.playerIndex !== matchState.currentPlayer) {
      this.sendError(ws, 'Not your turn', attachment.matchId);
      return;
    }

    if (!this.validateMove(payload.move)) {
      this.sendError(ws, 'Invalid move', attachment.matchId);
      return;
    }

    const pendingTx: PendingTransaction = {
      txSignature: payload.txSignature,
      moveIndex: matchState.moveCount,
      matchStateBefore: this.cloneMatchState(matchState),
      timestamp: Date.now(),
    };

    matchState.pendingTransactions.set(payload.txSignature, pendingTx);
    matchState.moveCount += 1;
    matchState.currentPlayer = (matchState.currentPlayer + 1) % Math.max(1, matchState.playerCount);
    await this.ctx.storage.setAlarm(Date.now() + this.TX_TIMEOUT_MS);

    if (matchState.moveCount % this.SYNC_INTERVAL_MOVES === 0) {
      await this.ctx.storage.put(`${MatchCoordinatorDOStoragePrefix.SyncTriggered}${matchState.matchId}`, Date.now());
    }

    if (matchState.moveCount % this.CHECKPOINT_INTERVAL_MOVES === 0) {
      await this.ctx.storage.put(`${MatchCoordinatorDOStoragePrefix.CheckpointTriggered}${matchState.matchId}`, Date.now());
      const checkpoint: Checkpoint = {
        eventIndex: matchState.moveCount,
        stateHash: await this.hashMatchState(matchState),
        timestamp: new Date().toISOString(),
      };
      matchState.lastCheckpoint = checkpoint;
      this.sendToSocket(ws, {
        type: MatchWSMessageType.CheckpointCreated,
        matchId: matchState.matchId,
        checkpoint,
      });
    }

    await this.saveMatchState(matchState);
  }

  private async handleSyncMessage(
    ws: WebSocket,
    attachment: MatchWSAttachment,
    payload: MatchWSSyncMessage
  ): Promise<void> {
    const matchState = await this.getOrLoadMatchState(attachment.matchId);
    if (!matchState) {
      this.sendError(ws, ErrorMessage.MatchNotFound, attachment.matchId);
      return;
    }

    const isMismatch = this.compareStates(matchState, payload.onChainState);
    if (isMismatch) {
      matchState.phase = 3;
      await this.saveMatchState(matchState);
      this.sendError(ws, 'State mismatch detected', attachment.matchId);
      return;
    }

    const onChainState = payload.onChainState as { moveCount?: number };
    for (const [txSig, pendingTx] of matchState.pendingTransactions.entries()) {
      if (typeof onChainState.moveCount === 'number' && onChainState.moveCount > pendingTx.moveIndex) {
        matchState.pendingTransactions.delete(txSig);
      }
    }

    await this.saveMatchState(matchState);
  }

  private async handleFinalizeMessage(
    ws: WebSocket,
    attachment: MatchWSAttachment,
    payload: MatchWSFinalizeMessage
  ): Promise<void> {
    const matchState = await this.getOrLoadMatchState(attachment.matchId);
    if (!matchState) {
      this.sendError(ws, ErrorMessage.MatchNotFound, attachment.matchId);
      return;
    }

    if (matchState.phase === 3) {
      this.sendToSocket(ws, {
        type: MatchWSMessageType.StateUpdate,
        matchId: matchState.matchId,
        matchState: this.serializeMatchState(matchState),
      });
      return;
    }

    const finalizeValidation = this.validateFinalizePayload(payload, matchState);
    if (!finalizeValidation.valid) {
      this.sendError(ws, finalizeValidation.message, attachment.matchId);
      return;
    }

    const endedAt = Date.now();
    const finalizedState: MatchState = {
      ...matchState,
      phase: 3,
      endedAt,
      matchHash: payload.matchHash || matchState.matchHash,
      hotUrl: payload.hotUrl || matchState.hotUrl,
    };

    try {
      const chatHistory = await this.loadChatHistory(matchState.matchId);
      const aiDump = await this.loadAIDump(matchState.matchId);

      const matchRecord = {
        match_id: matchState.matchId,
        matchId: matchState.matchId,
        version: '2.0.0',
        schema_version: '2.0.0',
        gameName: matchState.gameName,
        gameType: matchState.gameType,
        seed: matchState.seed,
        phase: finalizedState.phase,
        currentPlayer: finalizedState.currentPlayer,
        moveCount: finalizedState.moveCount,
        createdAt: new Date(matchState.createdAt).toISOString(),
        endedAt: new Date(endedAt).toISOString(),
        matchHash: finalizedState.matchHash,
        hotUrl: finalizedState.hotUrl,
        players: matchState.players.map((pubkey, index) => ({
          player_id: pubkey,
          public_key: pubkey,
          pubkey,
          index,
          type: PlayerType.Human,
        })),
        scores: [],
        winner: undefined,
        events: payload.events || [],
        playerCount: matchState.playerCount,
        lastCheckpoint: finalizedState.lastCheckpoint ? {
          eventIndex: finalizedState.lastCheckpoint.eventIndex,
          stateHash: finalizedState.lastCheckpoint.stateHash,
          timestamp: finalizedState.lastCheckpoint.timestamp,
          anchoredAt: finalizedState.lastCheckpoint.anchoredAt,
          anchorTxSignature: finalizedState.lastCheckpoint.anchorTxSignature,
        } : undefined,
        chatHistory,
        aiDump,
      };

      await this.env.MATCHES_BUCKET.put(buildMatchKey(matchState.matchId), JSON.stringify(matchRecord, null, 2), {
        httpMetadata: { contentType: HttpContentType.ApplicationJson },
      });

      if (chatHistory.length > 0) {
        const chatKey = buildSafeBucketKey(BucketPath.MatchChat, `${matchState.matchId}.json`);
        await this.env.MATCHES_BUCKET.put(chatKey, JSON.stringify({
          matchId: matchState.matchId,
          messages: chatHistory,
          persistedAt: new Date().toISOString(),
        }), {
          httpMetadata: { contentType: HttpContentType.ApplicationJson },
        });
      }

      if (aiDump) {
        const aiDumpKey = buildSafeBucketKey(BucketPath.AiDecisions, matchState.matchId, 'all.json');
        await this.env.MATCHES_BUCKET.put(aiDumpKey, JSON.stringify({
          matchId: matchState.matchId,
          ...aiDump,
        }), {
          httpMetadata: { contentType: HttpContentType.ApplicationJson },
        });
      }

      await this.awardPlayersViaBatch(matchState);
      matchState.phase = finalizedState.phase;
      matchState.endedAt = finalizedState.endedAt;
      matchState.matchHash = finalizedState.matchHash;
      matchState.hotUrl = finalizedState.hotUrl;
      await this.saveMatchState(matchState);
    } catch (error) {
      this.logError(`Failed to finalize match ${matchState.matchId}`, getStackTrace(), error);
      this.sendError(ws, 'Failed to finalize match', attachment.matchId);
      return;
    }

    this.closeMatchSockets(matchState.matchId, 1000, 'Match finalized');
  }

  private async handleChatMessage(
    ws: WebSocket,
    attachment: MatchWSAttachment,
    payload: MatchWSChatMessage | MatchWSVoiceTextMessage,
    channel: typeof MatchWSChannel.Text | typeof MatchWSChannel.Voice
  ): Promise<void> {
    const parsed = channel === MatchWSChannel.Voice
      ? MatchWSVoiceTextMessageSchema.safeParse(payload)
      : MatchWSChatMessageSchema.safeParse(payload);

    if (!parsed.success) {
      this.sendError(ws, 'Invalid chat payload', attachment.matchId);
      return;
    }

    const rateLimitKey = `${attachment.matchId}:${attachment.userId}`;
    const now = Date.now();
    const lastSent = this.chatRateLimit.get(rateLimitKey) || 0;
    if (now - lastSent < this.CHAT_RATE_LIMIT_MS) {
      this.sendError(ws, 'Rate limited', attachment.matchId);
      return;
    }
    this.chatRateLimit.set(rateLimitKey, now);

    const rawContent = parsed.data.content.trim();
    if (rawContent.length === 0) {
      return;
    }

    let content = rawContent;
    for (const pattern of this.CHAT_BLOCKED_PATTERNS) {
      content = content.replace(pattern, '[filtered]');
    }

    const senderIsAi = parsed.data.senderType === PlayerType.Ai;
    const senderId = senderIsAi && parsed.data.aiPlayerId ? parsed.data.aiPlayerId : attachment.userId;
    const senderType = senderIsAi ? PlayerType.Ai : PlayerType.Human;
    const chatMessage: MatchChatMessage = {
      messageId: crypto.randomUUID(),
      senderId,
      senderType,
      content,
      timestamp: now,
      channel,
    };

    const history = await this.loadChatHistory(attachment.matchId);
    history.push(chatMessage);
    if (history.length > this.CHAT_HISTORY_MAX) {
      history.splice(0, history.length - this.CHAT_HISTORY_MAX);
    }
    await this.saveChatHistory(attachment.matchId, history);

    this.broadcastMatchMessage(attachment.matchId, {
      type: MatchWSMessageType.ChatBroadcast,
      matchId: attachment.matchId,
      message: chatMessage,
    });
  }

  private async handleAiDumpMessage(
    ws: WebSocket,
    attachment: MatchWSAttachment,
    payload: MatchWSAiDumpMessage
  ): Promise<void> {
    if (!Array.isArray(payload.decisions)) {
      this.sendError(ws, 'Invalid ai_dump payload', attachment.matchId);
      return;
    }

    const encoded = new TextEncoder().encode(JSON.stringify(payload.decisions));
    if (encoded.byteLength > this.MAX_AI_DUMP_BYTES) {
      this.sendError(ws, 'AI dump payload too large', attachment.matchId);
      return;
    }

    const dump: StoredAIDump = {
      decisions: payload.decisions,
      uploaderId: attachment.userId,
      uploadedAt: Date.now(),
    };
    await this.ctx.storage.put(`${MatchCoordinatorDOStoragePrefix.AiDump}${attachment.matchId}`, dump);
  }

  private async awardPlayersViaBatch(matchState: MatchState): Promise<void> {
    if (!this.env.CREDITS_DO || matchState.players.length === 0) {
      return;
    }

    const awards: BatchAwardEntry[] = [];

    for (let i = 0; i < matchState.players.length; i++) {
      const playerId = matchState.players[i];
      const amount = 25;
      const reason = `Completed match ${matchState.matchId}`;
      awards.push({
        userId: playerId,
        amount,
        reason,
        metadata: {
          match_id: matchState.matchId,
          game_type: matchState.gameType,
          position: i + 1,
          payout_type: 'participation',
          [MetadataField.IdempotencyKey]: this.buildAwardIdempotencyKey(matchState.matchId, i),
        },
      });
    }

    const stub = this.env.CREDITS_DO.get(this.env.CREDITS_DO.idFromName(`match-${matchState.matchId}`));
    const response = await stub.fetch(`${DOBaseUrl}${CreditsDO.BatchAward}`, {
      method: HttpMethod.Post,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify({ awards }),
    });

    if (!response.ok) {
      await response.text().catch(() => undefined);
      throw new Error(`Batch GP award failed with status ${response.status}`);
    }

    const payloadResponse = await response.json() as {
      results?: Array<{ userId: string; success: boolean; error?: string; already_processed?: boolean }>;
    };
    const failed = (payloadResponse.results || []).filter(result => !result.success);
    if (failed.length > 0) {
      throw new Error(`Batch GP award failed for ${failed.length} participant(s)`);
    }

    this.logInfo('GP batch award completed', getStackTrace(), {
      matchId: matchState.matchId,
      count: awards.length,
    }, this.LOG_MATCH_INFO);
  }

  private buildAwardIdempotencyKey(matchId: string, playerIndex: number): string {
    return `earn-${matchId.replace(/-/g, '')}-${playerIndex}`;
  }

  private validateFinalizePayload(
    payload: MatchWSFinalizeMessage,
    matchState: MatchState
  ): { valid: true } | { valid: false; message: string } {
    if (payload.scores !== undefined) {
      if (!Array.isArray(payload.scores) || payload.scores.length !== matchState.players.length) {
        return { valid: false, message: 'Finalize scores must match player count' };
      }

      for (const score of payload.scores) {
        if (!Number.isFinite(score) || !Number.isInteger(score) || score < 0) {
          return { valid: false, message: 'Finalize scores must be non-negative integers' };
        }
      }
    }

    if (payload.winner !== undefined) {
      if (!matchState.players.includes(payload.winner)) {
        return { valid: false, message: 'Finalize winner must be a match participant' };
      }
      if (!payload.scores) {
        return { valid: false, message: 'Finalize winner requires scores' };
      }
      const maxScore = Math.max(...payload.scores);
      const winnerIndex = matchState.players.indexOf(payload.winner);
      if (winnerIndex < 0 || payload.scores[winnerIndex] !== maxScore) {
        return { valid: false, message: 'Finalize winner must have the highest score' };
      }
    }

    return { valid: true };
  }

  private async getOrLoadMatchState(matchId: string): Promise<MatchState | undefined> {
    if (await this.isMatchDeleted(matchId)) {
      this.matchStates.delete(matchId);
      return undefined;
    }

    const cached = this.matchStates.get(matchId);
    if (cached) {
      return cached;
    }
    const loaded = await this.loadMatchState(matchId);
    if (loaded) {
      this.matchStates.set(matchId, loaded);
    }
    return loaded;
  }

  private async loadMatchState(matchId: string): Promise<MatchState | undefined> {
    try {
      const stored = await this.ctx.storage.get<MatchState | (Omit<MatchState, 'pendingTransactions'> & { pendingTransactions?: unknown })>(
        `${MatchCoordinatorDOStoragePrefix.Match}${matchId}`
      );
      if (!stored) {
        return undefined;
      }
      const pendingTransactions = stored.pendingTransactions instanceof Map
        ? stored.pendingTransactions
        : new Map<string, PendingTransaction>();
      return {
        ...stored,
        pendingTransactions,
      } as MatchState;
    } catch (error) {
      this.logError('Failed to load match state', getStackTrace(), error);
      return undefined;
    }
  }

  private async saveMatchState(matchState: MatchState): Promise<void> {
    try {
      await this.ctx.storage.put(`${MatchCoordinatorDOStoragePrefix.Match}${matchState.matchId}`, matchState);
      this.matchStates.set(matchState.matchId, matchState);
      this.broadcastMatchMessage(matchState.matchId, {
        type: MatchWSMessageType.StateUpdate,
        matchId: matchState.matchId,
        matchState: this.serializeMatchState(matchState),
      });
    } catch (error) {
      this.logError('Failed to save match state', getStackTrace(), error);
    }
  }

  private serializeMatchState(matchState: MatchState): Record<string, unknown> {
    return {
      ...matchState,
      pendingTransactions: Array.from(matchState.pendingTransactions.values()).map(tx => ({
        txSignature: tx.txSignature,
        moveIndex: tx.moveIndex,
        timestamp: tx.timestamp,
      })),
    };
  }

  private cloneMatchState(matchState: MatchState): MatchState {
    return {
      ...matchState,
      players: [...matchState.players],
      pendingTransactions: new Map(matchState.pendingTransactions),
      lastCheckpoint: matchState.lastCheckpoint ? { ...matchState.lastCheckpoint } : undefined,
    };
  }

  private validateMove(move: unknown): boolean {
    return !!move && typeof move === 'object';
  }

  private compareStates(offChain: MatchState, onChain: unknown): boolean {
    if (!onChain || typeof onChain !== 'object') {
      return true;
    }
    const onChainState = onChain as { moveCount?: number; currentPlayer?: number; phase?: number };
    return (
      offChain.moveCount !== onChainState.moveCount ||
      offChain.currentPlayer !== onChainState.currentPlayer ||
      offChain.phase !== onChainState.phase
    );
  }

  private async hashMatchState(matchState: MatchState): Promise<string> {
    const stateJson = JSON.stringify({
      ...matchState,
      pendingTransactions: Array.from(matchState.pendingTransactions.keys()).sort(),
    });
    return computeSha256(stateJson, false);
  }

  private getMatchTag(matchId: string): string {
    return `${this.MATCH_WS_TAG_PREFIX}${matchId}`;
  }

  private broadcastMatchMessage(matchId: string, message: Record<string, unknown>): void {
    const payload = JSON.stringify(message);
    for (const ws of this.ctx.getWebSockets(this.getMatchTag(matchId))) {
      this.sendRaw(ws, payload);
    }
  }

  private sendToSocket(ws: WebSocket, message: Record<string, unknown>): void {
    this.sendRaw(ws, JSON.stringify(message));
  }

  private sendRaw(ws: WebSocket, payload: string): void {
    try {
      if (ws.readyState === WebSocket.READY_STATE_OPEN) {
        ws.send(payload);
      }
    } catch (error) {
      this.logError('Failed to send WebSocket message', getStackTrace(), error);
    }
  }

  private sendError(ws: WebSocket, message: string, matchId?: string): void {
    this.sendToSocket(ws, {
      type: MatchWSMessageType.Error,
      matchId,
      message,
    });
  }

  private closeMatchSockets(matchId: string, code: number, reason: string): void {
    for (const ws of this.ctx.getWebSockets(this.getMatchTag(matchId))) {
      try {
        ws.close(code, reason);
      } catch (error) {
        this.logDebug('Failed to close WebSocket', getStackTrace(), { error }, this.LOG_MATCH_WARNINGS);
      }
    }
  }

  private async loadChatHistory(matchId: string): Promise<MatchChatMessage[]> {
    const stored = await this.ctx.storage.get<MatchChatMessage[]>(`${MatchCoordinatorDOStoragePrefix.ChatHistory}${matchId}`);
    return Array.isArray(stored) ? stored : [];
  }

  private async saveChatHistory(matchId: string, history: MatchChatMessage[]): Promise<void> {
    await this.ctx.storage.put(`${MatchCoordinatorDOStoragePrefix.ChatHistory}${matchId}`, history);
  }

  private async loadAIDump(matchId: string): Promise<StoredAIDump | null> {
    const stored = await this.ctx.storage.get<StoredAIDump>(`${MatchCoordinatorDOStoragePrefix.AiDump}${matchId}`);
    return stored || null;
  }

  private validateWebSocketOrigin(requestOrigin: string | null): boolean {
    const allowedOrigin = this.env.CORS_ORIGIN || CorsOrigin.Wildcard;

    if (allowedOrigin === CorsOrigin.Wildcard) {
      if (this.env.CORS_ALLOWED_ORIGINS) {
        const allowedOrigins = this.env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
        return !!requestOrigin && allowedOrigins.includes(requestOrigin);
      }
      this.logError('CORS origin cannot be wildcard for WebSocket connections', getStackTrace(), { requestOrigin, allowedOrigin });
      return false;
    }

    if (!requestOrigin || requestOrigin.trim() === '') {
      return false;
    }

    return requestOrigin === allowedOrigin;
  }
}
