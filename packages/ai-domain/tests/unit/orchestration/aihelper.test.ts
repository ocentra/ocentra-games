import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationResult } from '@ocentra/eventing-domain/core/OperationResult';
import { AIHelper } from '@/orchestration/AIHelper';
import { RequestPlayerHandDetailEvent } from '@ocentra/eventing-domain/events/game/RequestPlayerHandDetailEvent';
import { RequestScoreManagerDetailsEvent } from '@ocentra/eventing-domain/events/game/RequestScoreManagerDetailsEvent';
import { RequestRemainingCardsCountEvent } from '@ocentra/eventing-domain/events/game/RequestRemainingCardsCountEvent';
import { RequestFloorCardsDetailEvent } from '@ocentra/eventing-domain/events/game/RequestFloorCardsDetailEvent';
import { RequestAllPlayersDataEvent } from '@ocentra/eventing-domain/events/game/RequestAllPlayersDataEvent';

describe('AIHelper GetUserPrompt wiring', () => {
  const subscriptions: Array<() => void> = [];

  beforeEach(() => {
    const handHandler = (event: RequestPlayerHandDetailEvent) => {
      event.deferred.resolve(
        OperationResult.success([
          { id: 'a1', value: 14 as const, suit: 'spades' as const },
          { id: 'k1', value: 13 as const, suit: 'hearts' as const },
        ])
      );
    };
    EventBus.instance.subscribe(RequestPlayerHandDetailEvent, handHandler);
    subscriptions.push(() => EventBus.instance.unsubscribe(RequestPlayerHandDetailEvent, handHandler));

    const scoreHandler = (event: RequestScoreManagerDetailsEvent) => {
      event.deferred.resolve(
        OperationResult.success({
          totalRounds: 1,
          currentRound: 1,
          pot: 15,
          currentBet: 0,
          metadata: { scores: { p1: 10, p2: 5 } },
        })
      );
    };
    EventBus.instance.subscribe(RequestScoreManagerDetailsEvent, scoreHandler);
    subscriptions.push(() => EventBus.instance.unsubscribe(RequestScoreManagerDetailsEvent, scoreHandler));

    const remainingHandler = (event: RequestRemainingCardsCountEvent) => {
      event.deferred.resolve(OperationResult.success(24));
    };
    EventBus.instance.subscribe(RequestRemainingCardsCountEvent, remainingHandler);
    subscriptions.push(() => EventBus.instance.unsubscribe(RequestRemainingCardsCountEvent, remainingHandler));

    const floorHandler = (event: RequestFloorCardsDetailEvent) => {
      event.deferred.resolve(OperationResult.success([{ id: '7c', value: 7 as const, suit: 'clubs' as const }]));
    };
    EventBus.instance.subscribe(RequestFloorCardsDetailEvent, floorHandler);
    subscriptions.push(() => EventBus.instance.unsubscribe(RequestFloorCardsDetailEvent, floorHandler));

    const allPlayersHandler = (event: RequestAllPlayersDataEvent) => {
      event.deferred.resolve(
        OperationResult.success([
          {
            id: 'p1',
            displayName: 'Alice',
            metadata: { score: 10, declaredSuit: 'Spades', hand: [{ id: 'a1', value: 14, suit: 'spades' }] },
          },
          {
            id: 'p2',
            displayName: 'Bob',
            metadata: { score: 5, declaredSuit: null, hand: [{ id: 'q1', value: 12, suit: 'clubs' }] },
          },
        ])
      );
    };
    EventBus.instance.subscribe(RequestAllPlayersDataEvent, allPlayersHandler);
    subscriptions.push(() => EventBus.instance.unsubscribe(RequestAllPlayersDataEvent, allPlayersHandler));
  });

  afterEach(() => {
    subscriptions.splice(0).forEach((fn) => fn());
  });

  it('builds user prompt when all request events are satisfied', async () => {
    const helper = AIHelper.getInstance();
    const prompt = await helper.GetUserPrompt('p1');

    expect(prompt).toContain('YOUR HAND:');
    expect(prompt).toContain('14 of spades');
    expect(prompt).toContain('FLOOR CARD: 7 of clubs');
    expect(prompt).toContain('REMAINING CARDS IN DECK: 24');
    expect(prompt).toContain('OTHER PLAYERS:');
    expect(prompt).not.toContain('Alice');
    expect(prompt).toContain('Bob');
    expect(prompt.trim().endsWith('What is your decision?')).toBe(true);
  });
});
