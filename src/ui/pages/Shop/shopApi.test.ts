import { describe, expect, it } from 'vitest';
import { HttpContentType, HttpHeader, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { readShopPlayerStatsResponse, readShopProductsResponse } from '@/ui/pages/Shop/shopApi';

describe('readShopProductsResponse', () => {
  it('reads the products array from JSON responses', async () => {
    const products = await readShopProductsResponse(new Response(JSON.stringify({
      products: [
        {
          productId: 'ac-100',
          productType: 'AC_CREDITS',
          displayName: '100 Arena Credits',
          acAmount: 100,
          unitPriceCents: 99,
          currency: 'usd',
          active: true,
        },
      ],
    }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    }));

    expect(products).toHaveLength(1);
    expect(products[0]?.productId).toBe('ac-100');
  });

  it('rejects the Pages HTML fallback instead of treating it as a shop payload', async () => {
    await expect(readShopProductsResponse(new Response('<!doctype html><html></html>', {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.TextHtml },
    }))).rejects.toThrow('Shop API returned a non-JSON response');
  });

  it('rejects invalid product payloads at the app boundary', async () => {
    await expect(readShopProductsResponse(new Response(JSON.stringify({
      products: [
        {
          productId: 'bad',
          productType: 'UNKNOWN',
          displayName: '',
          currency: 'usd',
          active: true,
        },
      ],
    }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    }))).rejects.toThrow('Shop API returned an invalid product payload');
  });
});

describe('readShopPlayerStatsResponse', () => {
  it('reads account state only after the player stats payload validates', async () => {
    const stats = await readShopPlayerStatsResponse(new Response(JSON.stringify({
      user_id: 'ocentra_ai',
      display_name: 'ocentra ai',
      joined_at: '2026-05-19T00:00:00.000Z',
      stats: {
        total_games: 12,
        wins: 7,
        losses: 5,
        win_rate: 0.5833,
        by_game_type: {},
      },
      credits: {
        gp_balance: 0,
        ac_balance: 1499,
        total_gp_earned: 0,
        total_ac_purchased: 1500,
        total_ac_spent: 1,
      },
    }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    }));

    expect(stats.credits.ac_balance).toBe(1499);
    expect(stats.stats.total_games).toBe(12);
  });

  it('rejects invalid account state at the app boundary', async () => {
    await expect(readShopPlayerStatsResponse(new Response(JSON.stringify({
      user_id: 'ocentra_ai',
      display_name: 'ocentra ai',
      joined_at: '2026-05-19T00:00:00.000Z',
      stats: {
        total_games: 12,
        wins: 7,
        losses: 5,
        win_rate: 2,
        by_game_type: {},
      },
      credits: {
        gp_balance: 0,
        ac_balance: 1499,
        total_gp_earned: 0,
        total_ac_purchased: 1500,
        total_ac_spent: 1,
      },
    }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    }))).rejects.toThrow('Player stats API returned an invalid payload');
  });
});
