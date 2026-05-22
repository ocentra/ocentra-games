import { test, expect } from '@playwright/test';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';

async function goToShop(page: import('@playwright/test').Page) {
  await page.goto('/shop');
  await expect(page.locator('.screen-loading-fallback')).toHaveCount(0, { timeout: 60000 });
  await expect(page.getByRole('img', { name: 'Arena Marketplace page layout' })).toBeVisible({ timeout: 25000 });
}

test.describe('Shop UI - Plan A monetization', () => {
  test('shop API through app: GET /api/v1/shop/products returns 200 and subscription products', async ({ request }) => {
    const response = await request.get(ApiEndpoint.Shop.Products);
    expect(response.status()).toBe(200);
    const data = (await response.json()) as { products?: { productType: string; productId: string }[] };
    expect(Array.isArray(data.products)).toBe(true);
    const subs = (data.products ?? []).filter((p) => p.productType === 'SUBSCRIPTION');
    expect(subs.length).toBeGreaterThanOrEqual(1);
    const ids = subs.map((p) => p.productId);
    expect(ids).toContain('sub-arena-pass');
    expect(ids).toContain('sub-champions-pass');
    expect(ids).toContain('sub-founder');
  });

  test('shop API through app: POST /api/v1/shop/purchase requires auth', async ({ request }) => {
    const response = await request.post(ApiEndpoint.Shop.Purchase, {
      data: {
        productId: 'ac-100',
        productType: 'AC_CREDITS',
        quantity: 1,
        provider: 'stripe',
        returnUrl: 'http://localhost:3000/shop?checkout=success',
        cancelUrl: 'http://localhost:3000/shop?checkout=cancel',
      },
    });
    expect(response.status()).toBe(401);
  });

  test('shop Elite tab shows Arena Pass, Champion Pass, and Founder when products loaded', async ({ page }) => {
    await goToShop(page);
    await page.getByRole('button', { name: /^ELITE\s+Premium Passes$/i }).click();
    await expect(page.getByRole('button', { name: /^Select Plan\s+Arena Pass/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /^Select Plan\s+Champion Pass/i })).toBeVisible();
    await expect(page.getByText('Founder Lifetime').first()).toBeVisible();
  });

  test('shop page shows Arena Credits and AC packages', async ({ page }) => {
    await goToShop(page);
    await expect(page.getByRole('img', { name: 'Arena Marketplace page layout' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /^TREASURY\s+Buy Arena Credits$/i })).toBeVisible();
    await expect(page.getByText(/100|500|1500|3000/).first()).toBeVisible({ timeout: 10000 });
  });

  test('shop page has Buy buttons for each package', async ({ page }) => {
    await goToShop(page);
    const buyButtons = page.getByRole('button', { name: /purchase \d+ ac|select plan|claim founder|buy digital/i });
    await expect(buyButtons.first()).toBeVisible({ timeout: 15000 });
    expect(await buyButtons.count()).toBeGreaterThanOrEqual(1);
  });

  test('clicking Buy without a real account opens account gate before checkout', async ({ page }) => {
    await goToShop(page);
    await page.getByRole('button', { name: /purchase 100 ac/i }).click({ timeout: 15000 });
    await page.getByRole('button', { name: /^Purchase$/ }).click();
    await expect(page.getByText(/real account required/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/sign in with a real account/i)).toBeVisible();
  });
});
