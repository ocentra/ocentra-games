import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { CreditLedgerType, CreditLedgerSource, Currency, TransactionType } from '@ocentra/endpoint-domain/constants/credits';
import { CreditsDO as CreditsDOEndpoints } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { CreditsDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { validateIdempotencyKey } from '@ocentra/endpoint-domain/validators/idempotency-validators';
import { MetadataField } from '@ocentra/endpoint-domain/constants/idempotency';
import type { CreditTransaction } from '@/logic/credits';
import {
  DEFAULT_PLAN_TIERS,
  isPeriodExpired,
  getAllowanceRemaining,
  type UserPlanState,
  type PlanTierId,
} from '@/config/plan-tiers';

interface CreditLedgerEntry {
  id: string;
  amount: number;
  currency?: Currency;
  type: CreditLedgerType;
  source: CreditLedgerSource;
  timestamp: number;
  description: string;
  metadata?: Record<string, unknown>;
}

interface CreditsDOState {
  gp_balance: number;
  ac_balance: number;
  total_gp_earned: number;
  total_ac_purchased: number;
  total_ac_spent: number;
  processed: Record<string, number>;
  ledger: CreditLedgerEntry[];
  mutationsSinceFlush: number;
}

interface EscrowRecord {
  escrowId: string;
  userId: string;
  reservedAmount: number;
  reservedAt: number;
  expiresAt: number;
  modelVersion: string;
  promptHash: string;
  status: 'RESERVED' | 'SETTLED' | 'EXPIRED' | 'FAILED';
  actualCost?: number;
  chargedAmount?: number;
  refundedAmount?: number;
  settledAt?: number;
  allowance?: boolean;
}

export class CreditsDO implements DurableObject {
  private state: CreditsDOState = {
    gp_balance: 0,
    ac_balance: 0,
    total_gp_earned: 0,
    total_ac_purchased: 0,
    total_ac_spent: 0,
    processed: {},
    ledger: [],
    mutationsSinceFlush: 0,
  };

  private initialized = false;
  private readonly BATCH_FLUSH_SIZE = 5;
  private readonly LEDGER_RETENTION_DAYS = 30;
  private readonly log = Logger.instance;

  constructor(
    private ctx: DurableObjectState,
    private env: Env
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
      if (!this.initialized) {
        await this.loadState();
        this.initialized = true;
      }

      let url: URL;
      try {
        url = new URL(request.url, 'http://dummy');
      } catch (error) {
        this.log.logError('Invalid request URL', getStackTrace(), { url: request.url, error });
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request URL',
        }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
      }

      if (request.method === HttpMethod.Post && url.pathname === CreditsDOEndpoints.Award) {
        return await this.handleAward(request);
      }

      if (request.method === HttpMethod.Post && url.pathname === CreditsDOEndpoints.BatchAward) {
        return await this.handleBatchAward(request);
      }

      if (request.method === HttpMethod.Post && url.pathname === CreditsDOEndpoints.Purchase) {
        return await this.handlePurchase(request);
      }

      if (request.method === HttpMethod.Post && url.pathname === CreditsDOEndpoints.Consume) {
        return await this.handleConsume(request);
      }

      if (request.method === HttpMethod.Get && url.pathname === CreditsDOEndpoints.Balance) {
        return this.handleGetBalance();
      }

      if (request.method === HttpMethod.Get && url.pathname === CreditsDOEndpoints.Transactions) {
        return this.handleGetTransactions(request);
      }

      if (request.method === HttpMethod.Post && url.pathname === CreditsDOEndpoints.EscrowReserve) {
        return await this.handleEscrowReserve(request);
      }
      if (request.method === HttpMethod.Get && url.pathname === CreditsDOEndpoints.EscrowGetBase) {
        return await this.handleEscrowGet(url.searchParams.get('escrowId'));
      }
      if (request.method === HttpMethod.Post && url.pathname === CreditsDOEndpoints.EscrowSettle) {
        return await this.handleEscrowSettle(request);
      }

      if (request.method === HttpMethod.Get && url.pathname === CreditsDOEndpoints.PlanStateGet) {
        return await this.handlePlanStateGet();
      }
      if (request.method === HttpMethod.Post && url.pathname === CreditsDOEndpoints.PlanStateSet) {
        return await this.handlePlanStateSet(request);
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('CreditsDO fetch error', getStackTrace(), { error, method: request.method, url: request.url });
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal Server Error',
      }), { status: HttpStatus.InternalServerError, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }
  }

  private async loadState(): Promise<void> {
    try {
      const stored = await this.ctx.storage.get<CreditsDOState>(CreditsDOStoragePrefix.State);
      if (stored) {
        this.state = stored;
        if (this.state.total_gp_earned === undefined) {
          this.state.total_gp_earned = this.calculateTotalGPEarned();
        }
        if (this.state.total_ac_purchased === undefined) {
          this.state.total_ac_purchased = this.calculateTotalACPurchased();
        }
        if (this.state.total_ac_spent === undefined) {
          this.state.total_ac_spent = this.calculateTotalACSpent();
        }
        this.pruneProcessedIds();
        this.pruneLedger();
        this.log.logInfo('CreditsDO state loaded', getStackTrace(), { gpBalance: this.state.gp_balance, acBalance: this.state.ac_balance, ledgerSize: this.state.ledger.length });
      } else {
        this.log.logInfo('CreditsDO initialized with default state', getStackTrace());
      }
    } catch (error) {
      this.log.logError('Failed to load CreditsDO state, using defaults', getStackTrace(), { error });
      this.state = {
        gp_balance: 0,
        ac_balance: 0,
        total_gp_earned: 0,
        total_ac_purchased: 0,
        total_ac_spent: 0,
        processed: {},
        ledger: [],
        mutationsSinceFlush: 0,
      };
    }
  }

  private calculateTotalGPEarned(): number {
    return this.state.ledger
      .filter(entry => entry.type === CreditLedgerType.Earn && entry.amount > 0 && (entry.currency ?? Currency.GP) === Currency.GP)
      .reduce((sum, entry) => sum + entry.amount, 0);
  }

  private calculateTotalACPurchased(): number {
    return this.state.ledger
      .filter(entry => entry.type === CreditLedgerType.Purchase && entry.amount > 0 && (entry.currency ?? Currency.AC) === Currency.AC)
      .reduce((sum, entry) => sum + entry.amount, 0);
  }

  private calculateTotalACSpent(): number {
    return this.state.ledger
      .filter(entry => entry.type === CreditLedgerType.Consume && entry.amount < 0 && (entry.currency ?? Currency.AC) === Currency.AC)
      .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
  }

  private async persistState(force: boolean = false): Promise<void> {
    if (!force && this.state.mutationsSinceFlush < this.BATCH_FLUSH_SIZE) {
      this.state.mutationsSinceFlush++;
      this.ctx.waitUntil(this.flushWhenReady());
      return;
    }

    this.state.mutationsSinceFlush = 0;
    await this.ctx.storage.put(CreditsDOStoragePrefix.State, this.state);
  }

  private async flushWhenReady(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (this.state.mutationsSinceFlush >= this.BATCH_FLUSH_SIZE) {
      await this.persistState(true);
    }
  }

  private pruneProcessedIds(): void {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const pruned: Record<string, number> = {};
    for (const [id, timestamp] of Object.entries(this.state.processed)) {
      if (timestamp > thirtyDaysAgo) {
        pruned[id] = timestamp;
      }
    }
    this.state.processed = pruned;
  }

  private pruneLedger(): void {
    const retentionCutoff = Date.now() - (this.LEDGER_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const toKeep: CreditLedgerEntry[] = [];
    const toArchive: CreditLedgerEntry[] = [];

    for (const entry of this.state.ledger) {
      if (entry.timestamp > retentionCutoff) {
        toKeep.push(entry);
      } else {
        toArchive.push(entry);
      }
    }

    if (toArchive.length > 0) {
      this.ctx.waitUntil(this.archiveLedgerEntries(toArchive));
      this.state.ledger = toKeep;
    }
  }

  private async archiveLedgerEntries(entries: CreditLedgerEntry[]): Promise<void> {
    if (this.env.CREDITS_LEDGER_ARCHIVE && entries.length > 0) {
      try {
        const archiveKey = `ledger-archive-${Date.now()}.json`;
        await this.env.CREDITS_LEDGER_ARCHIVE.put(archiveKey, JSON.stringify(entries));
      } catch (error) {
        this.log.logError('Failed to archive ledger entries', getStackTrace(), { error });
      }
    }
  }

  private async handleAward(request: Request): Promise<Response> {
    let body: {
      awardId: string;
      amount: number;
      currency?: Currency;
      description: string;
      source?: CreditLedgerSource;
      metadata?: Record<string, unknown>;
    };

    try {
      body = await request.json() as {
        awardId: string;
        amount: number;
        currency?: Currency;
        description: string;
        source?: CreditLedgerSource;
        metadata?: Record<string, unknown>;
      };
    } catch (error) {
      this.log.logError('Failed to parse award request body', getStackTrace(), { error });
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON payload',
      }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }

    const awardKeyValidation = validateIdempotencyKey(body.awardId);
    if (!awardKeyValidation.valid) {
      this.log.logError('Invalid idempotency key format for award', getStackTrace(), { awardId: body.awardId, error: awardKeyValidation.error });
      return new Response(JSON.stringify({
        success: false,
        error: awardKeyValidation.error || 'Invalid idempotency key format',
      }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }

    if (body.currency && body.currency !== Currency.GP && body.currency !== Currency.AC) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unsupported award currency',
      }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }

    const currency = body.currency ?? Currency.GP;
    if (this.state.processed[body.awardId]) {
      const currentBalance = currency === Currency.AC ? this.state.ac_balance : this.state.gp_balance;
      this.log.logInfo('Award already processed (idempotent)', getStackTrace(), { awardId: body.awardId, currency, balance: currentBalance });
      return new Response(JSON.stringify({
        success: true,
        already_processed: true,
        new_balance: currentBalance,
      }), { status: HttpStatus.Ok, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }

    const previousBalance = currency === Currency.AC ? this.state.ac_balance : this.state.gp_balance;
    this.log.logInfo('Processing award', getStackTrace(), { awardId: body.awardId, currency, amount: body.amount, previousBalance });
    if (currency === Currency.AC) {
      this.state.ac_balance += body.amount;
    } else {
      this.state.gp_balance += body.amount;
      this.state.total_gp_earned += body.amount;
    }
    this.state.processed[body.awardId] = Date.now();

    this.state.ledger.push({
      id: body.awardId,
      amount: body.amount,
      currency,
      type: CreditLedgerType.Earn,
      source: body.source || CreditLedgerSource.Other,
      timestamp: Date.now(),
      description: body.description,
      metadata: body.metadata,
    });

    this.pruneLedger();
    await this.persistState();

    const newBalance = currency === Currency.AC ? this.state.ac_balance : this.state.gp_balance;
    this.log.logInfo('Award processed successfully', getStackTrace(), { awardId: body.awardId, currency, newBalance });
    return new Response(JSON.stringify({
      success: true,
      new_balance: newBalance,
      transaction_id: body.awardId,
    }), { status: HttpStatus.Ok, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
  }

  private async handleBatchAward(request: Request): Promise<Response> {
    let body: {
      awards?: Array<{
        userId: string;
        amount: number;
        reason: string;
        metadata?: Record<string, unknown>;
      }>;
    };

    try {
      body = await request.json() as typeof body;
    } catch {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON payload',
      }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }

    if (!Array.isArray(body.awards) || body.awards.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'awards array is required',
      }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }

    if (!this.env.CREDITS_DO) {
      return new Response(JSON.stringify({
        success: false,
        error: 'CREDITS_DO binding not configured',
      }), { status: HttpStatus.ServiceUnavailable, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }

    const results: Array<{
      userId: string;
      success: boolean;
      error?: string;
      already_processed?: boolean;
      new_balance?: number;
      transaction_id?: string;
    }> = [];

    for (const award of body.awards) {
      const userId = typeof award.userId === 'string' ? award.userId.trim() : '';
      const amount = award.amount;
      const reason = typeof award.reason === 'string' ? award.reason.trim() : '';

      if (!userId || !Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0 || !reason) {
        results.push({
          userId: userId || 'unknown',
          success: false,
          error: 'Invalid award entry',
        });
        continue;
      }

      const metadata = award.metadata || {};
      const providedKey = metadata[MetadataField.IdempotencyKey];
      const fallbackKey = crypto.randomUUID();
      const awardId = typeof providedKey === 'string' && providedKey.trim().length > 0
        ? providedKey.trim()
        : fallbackKey;

      const keyValidation = validateIdempotencyKey(awardId);
      if (!keyValidation.valid) {
        results.push({
          userId,
          success: false,
          error: keyValidation.error || 'Invalid idempotency key',
        });
        continue;
      }

      const awardMetadata: Record<string, unknown> = {
        ...metadata,
        [MetadataField.IdempotencyKey]: awardId,
      };

      try {
        const result = await this.applyAward({
          awardId,
      amount,
      currency: Currency.GP,
      description: reason,
      source: CreditLedgerSource.Match,
      metadata: awardMetadata,
        });
        results.push({
          userId,
          success: true,
          ...result,
        });
      } catch (error) {
        results.push({
          userId,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      results,
    }), { status: HttpStatus.Ok, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
  }

  private async applyAward(body: {
    awardId: string;
    amount: number;
    currency?: Currency;
    description: string;
    source?: CreditLedgerSource;
    metadata?: Record<string, unknown>;
  }): Promise<{
    already_processed?: boolean;
    new_balance?: number;
    transaction_id?: string;
  }> {
    const awardKeyValidation = validateIdempotencyKey(body.awardId);
    if (!awardKeyValidation.valid) {
      throw new Error(awardKeyValidation.error || 'Invalid idempotency key format');
    }

    if (this.state.processed[body.awardId]) {
      const currentBalance = body.currency === Currency.AC ? this.state.ac_balance : this.state.gp_balance;
      return {
        already_processed: true,
        new_balance: currentBalance,
      };
    }

    const currency = body.currency ?? Currency.GP;
    const previousBalance = currency === Currency.AC ? this.state.ac_balance : this.state.gp_balance;
    this.log.logInfo('Processing award', getStackTrace(), { awardId: body.awardId, currency, amount: body.amount, previousBalance });
    if (currency === Currency.AC) {
      this.state.ac_balance += body.amount;
    } else {
      this.state.gp_balance += body.amount;
      this.state.total_gp_earned += body.amount;
    }
    this.state.processed[body.awardId] = Date.now();

    this.state.ledger.push({
      id: body.awardId,
      amount: body.amount,
      currency,
      type: CreditLedgerType.Earn,
      source: body.source || CreditLedgerSource.Other,
      timestamp: Date.now(),
      description: body.description,
      metadata: body.metadata,
    });

    this.pruneLedger();
    await this.persistState();

    const newBalance = currency === Currency.AC ? this.state.ac_balance : this.state.gp_balance;
    this.log.logInfo('Award processed successfully', getStackTrace(), { awardId: body.awardId, currency, newBalance });
    return {
      new_balance: newBalance,
      transaction_id: body.awardId,
    };
  }

  private async handlePurchase(request: Request): Promise<Response> {
    let body: {
      purchaseId: string;
      amount: number;
      description: string;
      source?: CreditLedgerSource;
      metadata?: Record<string, unknown>;
    };

    try {
      body = await request.json() as {
        purchaseId: string;
        amount: number;
        description: string;
        source?: CreditLedgerSource;
        metadata?: Record<string, unknown>;
      };
    } catch (error) {
      this.log.logError('Failed to parse purchase request body', getStackTrace(), { error });
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON payload',
      }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }

    const purchaseKeyValidation = validateIdempotencyKey(body.purchaseId);
    if (!purchaseKeyValidation.valid) {
      this.log.logError('Invalid idempotency key format for purchase', getStackTrace(), { purchaseId: body.purchaseId, error: purchaseKeyValidation.error });
      return new Response(JSON.stringify({
        success: false,
        error: purchaseKeyValidation.error || 'Invalid idempotency key format',
      }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }

    if (this.state.processed[body.purchaseId]) {
      this.log.logInfo('Purchase already processed (idempotent)', getStackTrace(), { purchaseId: body.purchaseId, balance: this.state.ac_balance });
      return new Response(JSON.stringify({
        success: true,
        already_processed: true,
        new_balance: this.state.ac_balance,
      }), { status: HttpStatus.Ok, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }

    this.log.logInfo('Processing purchase', getStackTrace(), { purchaseId: body.purchaseId, amount: body.amount, previousBalance: this.state.ac_balance });
    this.state.ac_balance += body.amount;
    this.state.total_ac_purchased += body.amount;
    this.state.processed[body.purchaseId] = Date.now();

    this.state.ledger.push({
      id: body.purchaseId,
      amount: body.amount,
      currency: Currency.AC,
      type: CreditLedgerType.Purchase,
      source: body.source || CreditLedgerSource.Purchase,
      timestamp: Date.now(),
      description: body.description,
      metadata: body.metadata,
    });

    this.pruneLedger();
    await this.persistState();

    this.log.logInfo('Purchase processed successfully', getStackTrace(), { purchaseId: body.purchaseId, newBalance: this.state.ac_balance });
    return new Response(JSON.stringify({
      success: true,
      new_balance: this.state.ac_balance,
      transaction_id: body.purchaseId,
    }), { status: HttpStatus.Ok, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
  }

  private async handleConsume(request: Request): Promise<Response> {
    let body: {
      consumeId: string;
      amount: number;
      currency: Currency;
      description: string;
      metadata?: Record<string, unknown>;
    };

    try {
      body = await request.json() as {
        consumeId: string;
        amount: number;
        currency: Currency;
        description: string;
        metadata?: Record<string, unknown>;
      };
    } catch (error) {
      this.log.logError('Failed to parse consume request body', getStackTrace(), { error });
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON payload',
      }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }

    const consumeKeyValidation = validateIdempotencyKey(body.consumeId);
    if (!consumeKeyValidation.valid) {
      this.log.logError('Invalid idempotency key format for consume', getStackTrace(), { consumeId: body.consumeId, error: consumeKeyValidation.error });
      return new Response(JSON.stringify({
        success: false,
        error: consumeKeyValidation.error || 'Invalid idempotency key format',
      }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }

    if (this.state.processed[body.consumeId]) {
      const currentBalance = body.currency === Currency.GP ? this.state.gp_balance : this.state.ac_balance;
      this.log.logInfo('Consume already processed (idempotent)', getStackTrace(), { consumeId: body.consumeId, currency: body.currency, balance: currentBalance });
      return new Response(JSON.stringify({
        success: true,
        already_processed: true,
        new_balance: currentBalance,
      }), { status: HttpStatus.Ok, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }

    if (body.currency === Currency.GP && this.state.gp_balance < body.amount) {
      this.log.logWarn('Insufficient GP balance for consume', getStackTrace(), { consumeId: body.consumeId, amount: body.amount, balance: this.state.gp_balance });
      return new Response(JSON.stringify({
        success: false,
        error: 'Insufficient GP balance',
      }), { status: HttpStatus.Conflict, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }

    if (body.currency === Currency.AC && this.state.ac_balance < body.amount) {
      this.log.logWarn('Insufficient AC balance for consume', getStackTrace(), { consumeId: body.consumeId, amount: body.amount, balance: this.state.ac_balance });
      return new Response(JSON.stringify({
        success: false,
        error: 'Insufficient AC balance',
      }), { status: HttpStatus.Conflict, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }

    const previousBalance = body.currency === Currency.GP ? this.state.gp_balance : this.state.ac_balance;
    this.log.logInfo('Processing consume', getStackTrace(), { consumeId: body.consumeId, currency: body.currency, amount: body.amount, previousBalance });

    if (body.currency === Currency.GP) {
      this.state.gp_balance -= body.amount;
    } else {
      this.state.ac_balance -= body.amount;
      this.state.total_ac_spent += body.amount;
    }

    this.state.processed[body.consumeId] = Date.now();

    this.state.ledger.push({
      id: body.consumeId,
      amount: -body.amount,
      currency: body.currency,
      type: CreditLedgerType.Consume,
      source: CreditLedgerSource.Other,
      timestamp: Date.now(),
      description: body.description,
      metadata: body.metadata,
    });

    this.pruneLedger();
    await this.persistState();

    const newBalance = body.currency === Currency.GP ? this.state.gp_balance : this.state.ac_balance;
    this.log.logInfo('Consume processed successfully', getStackTrace(), { consumeId: body.consumeId, currency: body.currency, newBalance });
    return new Response(JSON.stringify({
      success: true,
      new_balance: newBalance,
    }), { status: HttpStatus.Ok, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
  }

  private async handleGetBalance(): Promise<Response> {
    return new Response(JSON.stringify({
      gp_balance: Math.round(this.state.gp_balance),
      ac_balance: Math.round(this.state.ac_balance),
      total_gp_earned: Math.round(this.state.total_gp_earned),
      total_ac_purchased: Math.round(this.state.total_ac_purchased),
      total_ac_spent: Math.round(this.state.total_ac_spent),
    }), { status: HttpStatus.Ok, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
  }

  private async handleGetTransactions(request: Request): Promise<Response> {
    const url = new URL(request.url, 'http://dummy');
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 50;

    const userId = request.headers.get(HttpHeader.XUserId);
    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        error: `${HttpHeader.XUserId} header required`,
      }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }

    const transactions: CreditTransaction[] = this.state.ledger
      .slice(-limit)
      .reverse()
      .map(entry => {
        let transactionType: TransactionType;
        let currency: Currency;

        if (entry.type === CreditLedgerType.Earn) {
          transactionType = TransactionType.Earned;
          currency = entry.currency ?? Currency.GP;
        } else if (entry.type === CreditLedgerType.Purchase) {
          transactionType = TransactionType.Purchase;
          currency = entry.currency ?? Currency.AC;
        } else if (entry.type === CreditLedgerType.Consume) {
          transactionType = TransactionType.Consumption;
          currency = entry.currency ?? (entry.amount < 0 ? Currency.AC : Currency.GP);
        } else {
          transactionType = TransactionType.Earned;
          currency = Currency.GP;
        }

        const amount =
          entry.type === CreditLedgerType.Consume ? entry.amount : Math.abs(entry.amount);
        return {
          transaction_id: entry.id,
          user_id: userId,
          type: transactionType,
          amount,
          currency,
          description: entry.description,
          timestamp: new Date(entry.timestamp).toISOString(),
          metadata: entry.metadata,
        };
      });

    return new Response(JSON.stringify({
      transactions,
      count: transactions.length,
    }), { status: HttpStatus.Ok, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
  }

  private async handlePlanStateGet(): Promise<Response> {
    const plan = await this.ctx.storage.get<UserPlanState>(CreditsDOStoragePrefix.PlanState);
    if (!plan) {
      return new Response(JSON.stringify({ tier: null, periodStart: 0, tokensUsedThisPeriod: 0 }), { status: HttpStatus.Ok, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }
    return new Response(JSON.stringify(plan), { status: HttpStatus.Ok, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
  }

  private async handlePlanStateSet(request: Request): Promise<Response> {
    let body: { tier: PlanTierId };
    try {
      body = await request.json() as typeof body;
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }
    const tier = body.tier;
    if (!tier || !DEFAULT_PLAN_TIERS[tier as PlanTierId]) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid tier' }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }
    const now = Date.now();
    const existing = await this.ctx.storage.get<UserPlanState>(CreditsDOStoragePrefix.PlanState);
    const periodStart = existing && !isPeriodExpired(existing.periodStart, now) ? existing.periodStart : now;
    const tokensUsedThisPeriod = existing && !isPeriodExpired(existing.periodStart, now) ? existing.tokensUsedThisPeriod : 0;
    const plan: UserPlanState = { tier: tier as PlanTierId, periodStart, tokensUsedThisPeriod };
    await this.ctx.storage.put(CreditsDOStoragePrefix.PlanState, plan);
    return new Response(JSON.stringify({ success: true, tier: plan.tier, periodStart: plan.periodStart, tokensUsedThisPeriod: plan.tokensUsedThisPeriod }), { status: HttpStatus.Ok, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
  }

  private async handleEscrowReserve(request: Request): Promise<Response> {
    let body: { userId: string; reservedAmount: number; modelVersion: string; expiresAt: number; idempotencyKey: string; promptHash?: string; useAllowance?: boolean; estimatedTokens?: number };
    try {
      body = await request.json() as typeof body;
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }
    const keyValidation = validateIdempotencyKey(body.idempotencyKey);
    if (!keyValidation.valid) {
      return new Response(JSON.stringify({ success: false, error: keyValidation.error }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }
    if (this.state.processed[body.idempotencyKey]) {
      const existing = await this.ctx.storage.get<EscrowRecord>(`${CreditsDOStoragePrefix.EscrowByKey}${body.idempotencyKey}`);
      if (existing) {
        return new Response(JSON.stringify({ success: true, escrowId: existing.escrowId, reservedAmount: existing.reservedAmount, expiresAt: existing.expiresAt, already_processed: true }), { status: HttpStatus.Ok, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
      }
    }
    const now = Date.now();
    if (body.useAllowance === true && typeof body.estimatedTokens === 'number' && body.estimatedTokens > 0) {
      const plan = await this.ctx.storage.get<UserPlanState>(CreditsDOStoragePrefix.PlanState);
      if (plan) {
        const tierConfig = DEFAULT_PLAN_TIERS[plan.tier];
        if (tierConfig) {
          let state = plan;
          if (isPeriodExpired(plan.periodStart, now)) {
            state = { tier: plan.tier, periodStart: now, tokensUsedThisPeriod: 0 };
          }
          const remaining = getAllowanceRemaining(state, tierConfig, now);
          if (remaining >= body.estimatedTokens) {
            state.tokensUsedThisPeriod += body.estimatedTokens;
            await this.ctx.storage.put(CreditsDOStoragePrefix.PlanState, state);
            const escrowId = crypto.randomUUID();
            const escrow: EscrowRecord = {
              escrowId,
              userId: body.userId,
              reservedAmount: 0,
              reservedAt: now,
              expiresAt: body.expiresAt,
              modelVersion: body.modelVersion,
              promptHash: body.promptHash ?? '',
              status: 'RESERVED',
              allowance: true,
            };
            this.state.processed[body.idempotencyKey] = now;
            await this.ctx.storage.put(`${CreditsDOStoragePrefix.Escrow}${escrowId}`, escrow);
            await this.ctx.storage.put(`${CreditsDOStoragePrefix.EscrowByKey}${body.idempotencyKey}`, escrow);
            await this.persistState(true);
            return new Response(JSON.stringify({ success: true, escrowId, reservedAmount: 0, expiresAt: body.expiresAt, useAllowance: true }), { status: HttpStatus.Ok, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
          }
        }
      }
    }
    if (body.reservedAmount <= 0 || this.state.ac_balance < body.reservedAmount) {
      return new Response(JSON.stringify({ success: false, error: 'Insufficient AC for escrow' }), { status: HttpStatus.PaymentRequired, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }
    const escrowId = crypto.randomUUID();
    const escrow: EscrowRecord = {
      escrowId,
      userId: body.userId,
      reservedAmount: body.reservedAmount,
      reservedAt: now,
      expiresAt: body.expiresAt,
      modelVersion: body.modelVersion,
      promptHash: body.promptHash ?? '',
      status: 'RESERVED',
    };
    this.state.ac_balance -= body.reservedAmount;
    this.state.processed[body.idempotencyKey] = now;
    await this.ctx.storage.put(`${CreditsDOStoragePrefix.Escrow}${escrowId}`, escrow);
    await this.ctx.storage.put(`${CreditsDOStoragePrefix.EscrowByKey}${body.idempotencyKey}`, escrow);
    await this.persistState(true);
    return new Response(JSON.stringify({ success: true, escrowId, reservedAmount: body.reservedAmount, expiresAt: body.expiresAt }), { status: HttpStatus.Ok, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
  }

  private async handleEscrowGet(escrowId: string | null): Promise<Response> {
    if (!escrowId) {
      return new Response(JSON.stringify({ error: 'Missing escrowId' }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }
    const escrow = await this.ctx.storage.get<EscrowRecord>(`${CreditsDOStoragePrefix.Escrow}${escrowId}`);
    if (!escrow) {
      return new Response(JSON.stringify({ error: 'Escrow not found' }), { status: HttpStatus.NotFound, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }
    return new Response(JSON.stringify(escrow), { status: HttpStatus.Ok, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
  }

  private async handleEscrowSettle(request: Request): Promise<Response> {
    let body: { escrowId: string; actualCost: number; promptHash?: string };
    try {
      body = await request.json() as typeof body;
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }
    const escrow = await this.ctx.storage.get<EscrowRecord>(`${CreditsDOStoragePrefix.Escrow}${body.escrowId}`);
    if (!escrow || escrow.status !== 'RESERVED') {
      return new Response(JSON.stringify({ success: false, error: 'Escrow not found or not reservable' }), { status: HttpStatus.NotFound, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }
    if (body.actualCost < 0) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid actualCost' }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }
    const now = Date.now();
    escrow.status = 'SETTLED';
    escrow.actualCost = body.actualCost;
    escrow.settledAt = now;
    escrow.promptHash = body.promptHash ?? escrow.promptHash;
    let charged: number;
    let refunded: number;
    if (escrow.allowance === true) {
      charged = 0;
      refunded = 0;
      escrow.chargedAmount = 0;
      escrow.refundedAmount = 0;
    } else {
      charged = Math.min(body.actualCost, escrow.reservedAmount);
      refunded = escrow.reservedAmount - charged;
      escrow.chargedAmount = charged;
      escrow.refundedAmount = refunded;
      this.state.ac_balance += refunded;
    }
    this.state.ac_balance = Math.round(this.state.ac_balance);
    await this.ctx.storage.put(`${CreditsDOStoragePrefix.Escrow}${body.escrowId}`, escrow);
    await this.persistState(true);
    return new Response(JSON.stringify({ success: true, charged, refunded, new_balance: this.state.ac_balance }), { status: HttpStatus.Ok, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
  }
}
