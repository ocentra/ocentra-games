import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { PartyDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

import { PartyDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
const MAX_MEMBERS = 8;
const MAX_INVITES = 32;

interface PartyState {
  partyId: string;
  leaderId: string;
  members: string[];
  invites: string[];
  createdAt: number;
}

export class PartyDO implements DurableObject {
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

      if (request.method === HttpMethod.Post && pathname.endsWith(`/${PartyDOSegment.Create}`)) {
        const body = (await request.json().catch(() => ({}))) as { userId?: string; partyId?: string };
        const result = await this.create({ userId: body.userId ?? '', partyId: body.partyId });
        return result.error
          ? this.json({ error: result.error }, result.status)
          : this.json({ partyId: result.partyId });
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${PartyDOSegment.Join}`)) {
        const body = (await request.json().catch(() => ({}))) as { userId?: string };
        const result = await this.join(body.userId ?? '');
        return result.error
          ? this.json({ error: result.error }, result.status)
          : this.json({ joined: true });
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${PartyDOSegment.Leave}`)) {
        const body = (await request.json().catch(() => ({}))) as { userId?: string };
        const result = await this.leave(body.userId ?? '');
        return result.error
          ? this.json({ error: result.error }, result.status)
          : this.json({ left: true });
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${PartyDOSegment.Invite}`)) {
        const body = (await request.json().catch(() => ({}))) as { userId?: string; inviteeId?: string };
        const result = await this.invite(body.userId ?? '', body.inviteeId ?? '');
        return result.error
          ? this.json({ error: result.error }, result.status)
          : this.json({ invited: true });
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${PartyDOSegment.Kick}`)) {
        const body = (await request.json().catch(() => ({}))) as { userId?: string; targetId?: string };
        const result = await this.kick(body.userId ?? '', body.targetId ?? '');
        return result.error
          ? this.json({ error: result.error }, result.status)
          : this.json({ kicked: true });
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${PartyDOSegment.TransferLeader}`)) {
        const body = (await request.json().catch(() => ({}))) as { userId?: string; newLeaderId?: string };
        const result = await this.transferLeader(body.userId ?? '', body.newLeaderId ?? '');
        return result.error
          ? this.json({ error: result.error }, result.status)
          : this.json({ transferred: true });
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${PartyDOSegment.State}`)) {
        const state = await this.getState();
        if (!state) return this.json({ partyId: '', members: [], leaderId: '' });
        return this.json({
          partyId: state.partyId,
          leaderId: state.leaderId,
          members: [...state.members],
          invites: [...state.invites],
        });
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('PartyDO fetch error', getStackTrace(), { error, url: request.url });
      return this.json({ error: 'Internal Server Error' }, HttpStatus.InternalServerError);
    }
  }

  private async getState(): Promise<PartyState | null> {
    const value = await this.ctx.storage.get<PartyState>(PartyDOStoragePrefix.State);
    return value ?? null;
  }

  private async create(payload: { userId: string; partyId?: string }): Promise<{ error?: string; status?: number; partyId?: string }> {
    const userId = payload?.userId ?? '';
    if (!userId) return { error: 'Missing userId', status: HttpStatus.BadRequest };
    const existing = await this.getState();
    if (existing) return { error: 'Party already exists', status: HttpStatus.Conflict };
    const partyId = (typeof payload.partyId === 'string' && payload.partyId) ? payload.partyId.slice(0, 128) : crypto.randomUUID();
    const state: PartyState = {
      partyId,
      leaderId: userId.slice(0, 128),
      members: [userId.slice(0, 128)],
      invites: [],
      createdAt: Date.now(),
    };
    await this.ctx.storage.put(PartyDOStoragePrefix.State, state);
    return { partyId };
  }

  private async join(userId: string): Promise<{ error?: string; status?: number }> {
    if (!userId) return { error: 'Missing userId', status: HttpStatus.BadRequest };
    const state = await this.getState();
    if (!state) return { error: 'No party', status: HttpStatus.NotFound };
    if (state.members.includes(userId)) return {};
    if (state.members.length >= MAX_MEMBERS) return { error: 'Party full', status: HttpStatus.BadRequest };
    const inInvites = state.invites.includes(userId);
    if (!inInvites) return { error: 'Not invited', status: HttpStatus.Forbidden };
    state.members.push(userId.slice(0, 128));
    state.invites = state.invites.filter((id) => id !== userId);
    await this.ctx.storage.put(PartyDOStoragePrefix.State, state);
    return {};
  }

  private async leave(userId: string): Promise<{ error?: string; status?: number }> {
    if (!userId) return { error: 'Missing userId', status: HttpStatus.BadRequest };
    const state = await this.getState();
    if (!state) return { error: 'No party', status: HttpStatus.NotFound };
    state.members = state.members.filter((id) => id !== userId);
    if (state.leaderId === userId && state.members.length > 0) {
      state.leaderId = state.members[0];
    }
    if (state.members.length === 0) {
      await this.ctx.storage.delete(PartyDOStoragePrefix.State);
    } else {
      await this.ctx.storage.put(PartyDOStoragePrefix.State, state);
    }
    return {};
  }

  private async invite(userId: string, inviteeId: string): Promise<{ error?: string; status?: number }> {
    if (!userId || !inviteeId) return { error: 'Missing userId or inviteeId', status: HttpStatus.BadRequest };
    const state = await this.getState();
    if (!state) return { error: 'No party', status: HttpStatus.NotFound };
    if (state.leaderId !== userId && !state.members.includes(userId)) {
      return { error: 'Not a member', status: HttpStatus.Forbidden };
    }
    if (state.members.includes(inviteeId)) return {};
    if (state.invites.includes(inviteeId)) return {};
    if (state.invites.length >= MAX_INVITES) return { error: 'Too many invites', status: HttpStatus.BadRequest };
    state.invites.push(inviteeId.slice(0, 128));
    await this.ctx.storage.put(PartyDOStoragePrefix.State, state);
    return {};
  }

  private async kick(actorId: string, targetId: string): Promise<{ error?: string; status?: number }> {
    if (!targetId) return { error: 'Missing targetId', status: HttpStatus.BadRequest };
    const state = await this.getState();
    if (!state) return { error: 'No party', status: HttpStatus.NotFound };
    const isLeader = state.leaderId === actorId;
    const canKickSelf = actorId === targetId && state.members.includes(targetId);
    if (!isLeader && !canKickSelf) return { error: 'Only leader can kick others', status: HttpStatus.Forbidden };
    if (!state.members.includes(targetId)) return { error: 'Target not in party', status: HttpStatus.NotFound };
    state.members = state.members.filter((id) => id !== targetId);
    if (state.leaderId === targetId && state.members.length > 0) state.leaderId = state.members[0];
    if (state.members.length === 0) await this.ctx.storage.delete(PartyDOStoragePrefix.State);
    else await this.ctx.storage.put(PartyDOStoragePrefix.State, state);
    return {};
  }

  private async transferLeader(actorId: string, newLeaderId: string): Promise<{ error?: string; status?: number }> {
    if (!newLeaderId) return { error: 'Missing newLeaderId', status: HttpStatus.BadRequest };
    const state = await this.getState();
    if (!state) return { error: 'No party', status: HttpStatus.NotFound };
    if (state.leaderId !== actorId) return { error: 'Only leader can transfer', status: HttpStatus.Forbidden };
    if (!state.members.includes(newLeaderId)) return { error: 'New leader must be a member', status: HttpStatus.BadRequest };
    state.leaderId = newLeaderId.slice(0, 128);
    await this.ctx.storage.put(PartyDOStoragePrefix.State, state);
    return {};
  }

  private json(data: unknown, status: number = HttpStatus.Ok): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
