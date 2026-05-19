import { describe, expect, it } from 'vitest';
import { HttpContentType, HttpHeader, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { readShopProductsResponse } from '@/ui/pages/Shop/shopApi';

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
