# Payment Plan

## Summary

This is the active working plan for `/shop` and payments. It replaces loose notes and does not extend the older shop E2E plan. The older `.cursor/plans/shop-and-cloudflare-e2e-testing-plan.md` remains historical context for the old app-to-worker test gap only.

The branch now has the payment spine in place: `/shop` still calls one purchase endpoint, Cloudflare routes by provider, Stripe Checkout is hardened for real price IDs and subscriptions, and PayPal/Razorpay/Solana have concrete start plus settlement-proof endpoints. Secrets, real provider dashboard setup, live sandbox runs, and final UX polish remain.

## Current State

- `/shop` is a real shared page surface, not a throwaway mock. The route is bridged by `src/ui/pages/Shop/ShopPage.tsx`, uses `src/ui/pages/Shop/shopApi.ts`, loads `packages/asset-editor/Resources/Pages/ShopPageLayout.asset`, and renders through `@ocentra/core-ui` shop SVG surfaces.
- Product listing is wired to Cloudflare through `ApiEndpoint.Shop.Products` and `PRODUCT_KV`. Product data is KV-backed; `infra/cloudflare/src/config/products.ts` has no hardcoded fallback.
- Purchase start is wired through `ApiEndpoint.Shop.Purchase`. The frontend sends `productId`, `productType`, `quantity`, `provider`, `returnUrl`, and `cancelUrl`.
- Cloudflare has the money state backbone: `PaymentDO`, `CreditsDO`, `InventoryDO`, product admin/KV plumbing, Stripe webhook verification, payment reconciliation, purchase history storage, and provider-independent fulfillment.
- `/api/v1/shop/purchase` now delegates to `infra/cloudflare/src/payments/shop-payment-provider-router.ts`. Stripe, PayPal, Razorpay, and Solana Pay share the same provider entrypoint instead of shop-handler branches.
- Stripe Checkout now requires real `stripePriceId` / `providerRefs.stripe.priceId`, rejects `price_placeholder_*`, supports one-time and subscription modes, maps Stripe customers in `PaymentDO`, exposes `ApiEndpoint.Payment.CustomerPortal`, can enable Stripe Tax through env, and settles webhooks through the common fulfillment flow.
- PayPal is no longer just UI text. Configured PayPal creates an Orders v2 order and returns the approval URL. `ApiEndpoint.Payment.PayPalCapture` captures the approved order server-side, then fulfills through the common entitlement flow.
- Razorpay is no longer just UI text. Configured Razorpay creates an order and returns Checkout provider data. `ApiEndpoint.Payment.RazorpayVerify` verifies the backend HMAC signature and requires captured payment status before fulfillment.
- Solana Pay is no longer just UI text. Configured Solana Pay creates a USDC payment URL with a unique reference. `ApiEndpoint.Payment.SolanaConfirm` verifies the reference and USDC delta through RPC before fulfillment.
- Entitlement fulfillment is provider-independent for `credits`, `pass`, `cosmetic`, `play_access`, and `event_ticket`. Credits go through `CreditsDO.Purchase`, passes through `CreditsDO.PlanStateSet`, and the other kinds go through `InventoryDO.AddItem`.
- The visible first-paint bug is fixed in code: raw SEO fallback is hidden before first paint while preserving raw HTML fallback content for SEO audits.
- Dev/test port ownership is fixed in code: `playwright.config.ts` supports `PLAYWRIGHT_PORT`, `E2E_PORT`, `VITE_PREVIEW_PORT`, and `PLAYWRIGHT_BASE_URL`; the dev launcher supports `--port`, `--preview-port`, and `--use`. Example: `npm run dev -- --quick=web-preview-local --use 3050`.
- Remaining fake/unwired surfaces are mostly account-state UI consumption: recent purchases, active pass, owned item count, ticket state, Solana QR display, provider availability by country, and richer checkout status.

## Target Architecture

- Keep `/api/v1/shop/purchase` as the frontend entrypoint. Internally route by provider through the payment orchestration layer.
- Use Stripe hosted Checkout first for cards, wallets, local methods, one-time packs, and subscriptions. Do not build custom card forms for v1.
- Use Stripe payment method settings from the Dashboard by default. Only set `payment_method_types` manually when product or country routing requires it.
- Keep PayPal as its own provider, not hidden behind Stripe for v1. Capture must happen server-side before fulfillment.
- Use Razorpay as the India-ready candidate for UPI, cards, netbanking, and wallets. Stripe alone is not the India plan.
- Use Solana Pay as optional crypto checkout. Start with USDC, unique references, QR/deep links, and no grant before confirmed settlement.
- Keep one fulfillment flow after settlement regardless of provider.

## Secrets And Setup To Punch In

- Local worker: copy `infra/cloudflare/.dev.vars.example` to `infra/cloudflare/.dev.vars` and fill the payment values.
- Cloudflare Worker: use `wrangler secret put <NAME> --env development` and later production for real launch.
- Stripe:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - optional `STRIPE_AUTOMATIC_TAX_ENABLED=true`
  - optional dev bootstrap `STRIPE_AUTO_MATERIALIZE_PRODUCTS=true`
  - configure webhook endpoint `/api/v1/stripe/webhook`
  - enable Dashboard dynamic payment methods
  - configure Customer Portal in Stripe Billing settings
  - products need real `stripePriceId` or `providerRefs.stripe.priceId`; placeholders now fail by design
- PayPal:
  - `PAYPAL_CLIENT_ID`
  - `PAYPAL_CLIENT_SECRET`
  - optional `PAYPAL_API_BASE_URL` only when overriding default sandbox/dev or live/prod API base
- Razorpay:
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`
  - Dashboard must auto-capture or the verify endpoint will refuse fulfillment until captured
- Solana Pay:
  - `SOLANA_RPC_URL`
  - `SOLANA_PAY_RECIPIENT`
  - `SOLANA_PAY_USDC_MINT`

## Active Checklist

1. [x] Create this new active plan doc at `.cursor/plans/payment-plan.md`.
2. [x] Fix visible shop load bug.
   - Hide SEO fallback before first paint without breaking SEO raw HTML audits.
   - Verify `/shop` first load shows the app loading/shop surface, not public fallback copy.
3. [x] Repair tests around current shop.
   - Update stale E2E expectations from old "Power your AI game" and `create-checkout-session` assumptions to current Marketplace UI and `/api/v1/shop/purchase`.
   - Keep the explicit app-path API test proving `localhost:3000/api/v1/shop/products` reaches the worker through Vite/proxy.
4. [x] Add provider-common routing and frontend provider coverage.
   - Keep `/api/v1/shop/purchase` as the only frontend purchase entrypoint.
   - Add a Cloudflare provider router for Stripe, PayPal, Razorpay, and Solana Pay.
   - Add Razorpay to `ShopPaymentProviderSchema` and the shop provider modal copy.
5. [x] Harden Stripe v1 code path.
   - Real price ID requirement and placeholder rejection.
   - `mode: "payment"` for AC/founder one-time products and `mode: "subscription"` for pass products.
   - Customer mapping, Customer Portal entrypoint, dynamic payment-method stance, Stripe Tax env switch, webhook idempotency, and real `payment_intent.succeeded` metadata settlement.
   - AC/pass/inventory fulfillment routes through the common flow.
6. [x] Add provider-independent fulfillment.
   - Grant by `entitlementKind`: credits, pass, cosmetic, play_access, event_ticket.
   - Record purchase history in `PaymentDO`.
7. [x] Add PayPal backend path.
   - Create PayPal order server-side.
   - Return approval URL.
   - Capture server-side and fulfill only after capture is completed.
8. [x] Add Razorpay backend path for India candidate.
   - Create Razorpay order server-side.
   - Return Checkout provider data.
   - Verify signature and captured payment status before fulfillment.
9. [x] Add Solana Pay backend path.
   - Generate USDC Solana Pay URL with unique reference.
   - Confirm transaction reference and USDC delta by RPC before fulfillment.
10. [ ] Add country/currency/provider capability routing.
    - Keep Stripe for supported global card/wallet/local-method checkout.
    - Route India to Razorpay when UPI/netbanking/wallet coverage is needed.
    - Keep Adyen/Checkout.com as later enterprise/global fallback candidates.
11. [ ] Clean up UI.
    - [x] Launch Razorpay Checkout from `providerData` and verify through the backend callback.
    - [x] Continue PayPal redirect approval intentionally and capture on return with `paymentId` plus PayPal `token`.
    - [x] Open Solana wallet deep link from `providerData`.
    - [ ] Render Solana QR and confirmation state from backend data.
    - Disable unavailable providers per product/country/account state.
    - Show checkout status, recent purchases, active pass, inventory count, tickets, and wallet/payment state from backend data.
12. [ ] Live validation after secrets.
    - Stripe sandbox Checkout redirect, webhook, Customer Portal, subscription pass.
    - PayPal sandbox order approval and capture.
    - Razorpay test checkout, backend signature verify, captured-status gate.
    - Solana devnet/mainnet-beta policy decision, USDC mint, wallet QR/deep-link UX, RPC confirmation.
    - Security: webhook/signature rejection, replay/idempotency, auth required for purchase, no raw secrets/log leakage.

## Validation Run

- `cmd /c npm --prefix packages\endpoint-domain run lint:exec`
- `cmd /c npm --prefix infra\cloudflare run lint`
- `cmd /c npm --prefix infra\cloudflare run test -- tests\unit\flows\flow-plumbing.test.ts tests\integration\stripe-webhooks.test.ts tests\integration\admin-products-shop.test.ts`

## Public Interfaces

- Keep `ShopPurchaseRequest` provider-based. Extend provider enums only when the provider has a Cloudflare route owner and explicit configured/not-configured behavior.
- `ShopPurchaseResponse` now supports `providerData` for provider-specific UI handoff without inventing separate purchase entrypoints.
- Add product provider refs/capabilities to product storage rather than UI-only hardcoded availability.
- Use endpoint-domain, boundary-domain, logging-domain, and existing DO constants. Do not add raw API paths, bucket names, collection names, headers, or DO strings.

## Source Links

- Stripe Checkout: https://docs.stripe.com/payments/checkout
- Stripe dynamic payment methods: https://docs.stripe.com/payments/checkout/payment-methods
- Stripe Tax with Checkout: https://docs.stripe.com/tax/checkout
- Stripe India international payments: https://docs.stripe.com/india-accept-international-payments?locale=en-GB
- PayPal Orders API: https://developer.paypal.com/api/rest/integration/orders-api/
- PayPal JavaScript SDK: https://developer.paypal.com/sdk/js/reference/
- Solana Pay: https://solana.com/docs/payments/accept-payments/solana-pay
- Razorpay payment methods: https://d6xcmfyh68wv8.cloudfront.net/docs/payments/payment-methods/
