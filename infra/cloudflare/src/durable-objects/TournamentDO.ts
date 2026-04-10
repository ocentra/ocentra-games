import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { TournamentDOSegment, TournamentDO as TournamentDOPaths } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { TournamentDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

type TournamentStatus = 'registration' | 'running' | 'ended';

interface BracketSlot {
  matchId: string;
  round: number;
  position: number;
  playerA?: string;
  playerB?: string;
  winner?: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface TournamentState {
  tournamentId: string;
  status: TournamentStatus;
  participants: Array<{ userId: string; displayName?: string; elo?: number; registeredAt: number }>;
  bracket: BracketSlot[];
  createdAt: number;
  updatedAt: number;
  maxParticipants: number;
}

export class TournamentDO implements DurableObject {
  private readonly log = Logger.instance;

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
    try {
      const url = new URL(request.url, 'http://dummy');
      const pathname = url.pathname;

      if (request.method === HttpMethod.Post && pathname.endsWith(`/${TournamentDOSegment.Register}`)) {
        return this.register(request);
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${TournamentDOSegment.Bracket}`)) {
        return this.getBracket();
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${TournamentDOSegment.Start}`)) {
        return this.start(request);
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${TournamentDOSegment.Result}`)) {
        return this.recordResult(request);
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(TournamentDOPaths.Winners)) {
        return this.getWinners();
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('TournamentDO fetch error', getStackTrace(), { error, url: request.url });
      return this.json({ error: 'Internal Server Error' }, HttpStatus.InternalServerError);
    }
  }

  private async loadState(): Promise<TournamentState | null> {
    const value = await this.ctx.storage.get<TournamentState>(TournamentDOStoragePrefix.Tournament);
    return value ?? null;
  }

  private async register(request: Request): Promise<Response> {
    let body: { userId: string; displayName?: string; elo?: number };
    try {
      body = await request.json();
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const userId = body.userId ?? '';
    if (!userId) return this.json({ error: 'userId required' }, HttpStatus.BadRequest);
    let state = await this.loadState();
    if (!state) {
      state = {
        tournamentId: this.ctx.id.toString(),
        status: 'registration',
        participants: [],
        bracket: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        maxParticipants: 32,
      };
    }
    if (state.status !== 'registration') {
      return this.json({ error: 'Registration closed' }, HttpStatus.Conflict);
    }
    if (state.participants.some((p) => p.userId === userId)) {
      return this.json({ registered: true });
    }
    if (state.participants.length >= state.maxParticipants) {
      return this.json({ error: 'Tournament full' }, HttpStatus.Conflict);
    }
    state.participants.push({
      userId,
      displayName: body.displayName,
      elo: body.elo,
      registeredAt: Date.now(),
    });
    state.updatedAt = Date.now();
    await this.ctx.storage.put(TournamentDOStoragePrefix.Tournament, state);
    return this.json({ registered: true, position: state.participants.length });
  }

  private async getBracket(): Promise<Response> {
    const state = await this.loadState();
    if (!state || state.status === 'registration') {
      return this.json({ error: 'Tournament not found' }, HttpStatus.NotFound);
    }
    return this.json({
      bracket: state.bracket,
      status: state.status,
      participantsCount: state.participants.length,
    });
  }

  private async start(_request: Request): Promise<Response> {
    const state = await this.loadState();
    if (!state) return this.json({ error: 'Tournament not found' }, HttpStatus.NotFound);
    if (state.status !== 'registration') return this.json({ error: 'Already started or ended' }, HttpStatus.Conflict);
    const minPlayers = 2;
    if (state.participants.length < minPlayers) {
      return this.json({ error: `Need at least ${minPlayers} players` }, HttpStatus.Conflict);
    }
    const participants = [...state.participants];
    participants.sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0));
    let size = 2;
    while (size < participants.length) size *= 2;
    const numRounds = Math.log2(size);
    const bracket: BracketSlot[] = [];
    for (let round = 0; round < numRounds; round++) {
      const slotsInRound = size / Math.pow(2, round + 1);
      for (let pos = 0; pos < slotsInRound; pos++) {
        bracket.push({
          matchId: crypto.randomUUID(),
          round,
          position: pos,
          status: 'pending',
        });
      }
    }
    const firstRoundSlots = size / 2;
    for (let i = 0; i < participants.length && i / 2 < firstRoundSlots; i += 2) {
      const slotIdx = i / 2;
      bracket[slotIdx].playerA = participants[i]?.userId;
      bracket[slotIdx].playerB = participants[i + 1]?.userId;
    }
    state.bracket = bracket;
    state.status = 'running';
    state.updatedAt = Date.now();
    await this.ctx.storage.put(TournamentDOStoragePrefix.Tournament, state);
    return this.json({ started: true, bracket: state.bracket });
  }

  private async recordResult(request: Request): Promise<Response> {
    let body: { matchId: string; winnerId: string };
    try {
      body = await request.json();
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const { matchId, winnerId } = body;
    if (!matchId || !winnerId) return this.json({ error: 'matchId and winnerId required' }, HttpStatus.BadRequest);
    const state = await this.loadState();
    if (!state || state.status !== 'running') return this.json({ error: 'Tournament not running' }, HttpStatus.Conflict);
    const slot = state.bracket.find((s) => s.matchId === matchId);
    if (!slot) return this.json({ error: 'Match not found' }, HttpStatus.NotFound);
    if (slot.winner) return this.json({ recorded: true });
    if (winnerId !== slot.playerA && winnerId !== slot.playerB) {
      return this.json({ error: 'winnerId must be playerA or playerB' }, HttpStatus.BadRequest);
    }
    slot.winner = winnerId;
    slot.status = 'completed';
    const allCompleted = state.bracket.every((s) => s.status === 'completed');
    if (allCompleted) state.status = 'ended';
    state.updatedAt = Date.now();
    await this.ctx.storage.put(TournamentDOStoragePrefix.Tournament, state);
    return this.json({ recorded: true });
  }

  private async getWinners(): Promise<Response> {
    const state = await this.loadState();
    if (!state || state.status !== 'ended') {
      return this.json({ error: 'Tournament not ended', winners: [] }, state?.status === 'running' ? HttpStatus.Conflict : HttpStatus.NotFound);
    }
    const finalSlots = state.bracket.filter((s) => s.round === 0);
    const finalSlot = finalSlots.find((s) => s.winner);
    const winners: Array<{ userId: string; place: number; prizeAmount: number }> = [];
    const prizeByPlace: Record<number, number> = { 1: 100, 2: 50, 3: 25 };
    if (finalSlot?.winner) {
      winners.push({ userId: finalSlot.winner, place: 1, prizeAmount: prizeByPlace[1] ?? 100 });
      const runnerUp = finalSlot.playerA === finalSlot.winner ? finalSlot.playerB : finalSlot.playerA;
      if (runnerUp) winners.push({ userId: runnerUp, place: 2, prizeAmount: prizeByPlace[2] ?? 50 });
    }
    return this.json({ winners });
  }

  private json(data: unknown, status: number = HttpStatus.Ok): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
