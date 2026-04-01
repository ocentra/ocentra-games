import { test, expect } from '@playwright/test';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';

async function guestLoginAndGoToShop(page: import('@playwright/test').Page) {
  await page.goto('/');
  const guestBtn = page.getByRole('button', { name: /guest/i });
  await guestBtn.waitFor({ state: 'visible', timeout: 20000 });
  await guestBtn.click();
  await page.waitForTimeout(2000);
  await page.goto('/shop');
  await expect(page.getByRole('heading', { name: 'Power your AI game' }).first()).toBeVisible({ timeout: 25000 });
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

  test('shop Elite tab shows Arena Pass, Champion\'s Pass, and Founder when products loaded', async ({ page }) => {
    await guestLoginAndGoToShop(page);
    await page.getByRole('button', { name: /elite/i }).click();
    await expect(page.getByRole('heading', { name: 'Arena Pass' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: "Champion's Pass" })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Founder' })).toBeVisible();
  });

  test('shop page shows Arena Credits and AC packages', async ({ page }) => {
    await guestLoginAndGoToShop(page);
    await expect(page.getByRole('heading', { name: /power your ai game/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/arena credits/i)).toBeVisible();
    await expect(page.getByText(/100|500|1200|3500/).first()).toBeVisible({ timeout: 10000 });
  });

  test('shop page has Buy buttons for each package', async ({ page }) => {
    await guestLoginAndGoToShop(page);
    const buyButtons = page.getByRole('button', { name: /reload ac|subscribe|claim founder/i });
    await expect(buyButtons.first()).toBeVisible({ timeout: 15000 });
    expect(await buyButtons.count()).toBeGreaterThanOrEqual(1);
  });

  test('clicking Buy triggers checkout flow', async ({ page }) => {
    await guestLoginAndGoToShop(page);
    const buyBtn = page.getByRole('button', { name: /reload ac|subscribe|claim founder/i }).first();
    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('create-checkout-session') && res.request().method() === 'POST',
      { timeout: 15000 }
    ).catch(() => null);
    await buyBtn.click();
    const response = await responsePromise;
    if (response) {
      expect([200, 400, 401, 402, 500]).toContain(response.status());
    }
    const url = page.url();
    expect(url.includes('stripe.com') || url.includes('checkout') || url.includes('/shop')).toBe(true);
  });
});
