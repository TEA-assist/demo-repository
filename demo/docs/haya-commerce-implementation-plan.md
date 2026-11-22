# Haya Commerce, Orders, and Fulfillment — Implementation Plan

**Status:** M1, shared M2 referrals, and the mock-payment demo slice are implemented. Mock payment is enabled for the current investor-demo production; live PSP and fulfillment rollout decisions remain open.
**Updated:** 2026-11-22
**Repositories:** `product-graph-api`, `product-graph-web-ui`
**Plan owner:** Haya product team

This plan separates catalog connectivity from commercial transactions. The
current Connection Hub connects product catalogs; this plan adds the systems
needed to sell, source, account for, and deliver products through Haya.

## 1. Language and domain boundaries

Use these terms consistently:

| Term | Meaning |
|---|---|
| **Catalog connection** | How product data enters Haya: manual, platform API, custom feed, or scraper. This is the current Connection Hub's responsibility. |
| **Sales / checkout model** | Where the buyer's purchase is made and which party is the seller. |
| **Supplier order / procurement** | How Haya requests or purchases goods from the source store after a Haya Checkout sale. |
| **Fulfillment** | Which party receives, packs, and ships the item to the buyer. |
| **Payment gateway / PSP** | Payment provider that authorizes, captures, refunds, and reports buyer payments. It is not a sales model. |
| **Referral attribution** | Evidence connecting a Haya outbound click to a merchant's later order. UTM tags identify marketing campaigns; a unique click ID plus merchant conversion event identifies an order. |

Keep `store_connections.kind` (`manual|api|scraper|custom_api`) as catalog
source configuration. Do not overload it with sales, payment, procurement, or
fulfillment modes.

## 2. Approved business decisions

These decisions were confirmed by the product owner:

1. **Haya Checkout:** Haya is the seller/merchant of record, collects buyer
   payment, sets the Haya retail price, and pays the store its agreed supplier
   cost. Haya owns the buyer-facing order and support experience.
2. **Payment timing:** authorize at checkout and capture after supplier
   acceptance, subject to gateway capabilities. If the supplier cannot supply,
   release or refund the buyer's payment.
3. **Supplier ordering:** support both order-write APIs and an operator-assisted
   order queue, selected/configured for each store.
4. **Multi-store cart:** one customer order can contain items from multiple
   stores. Create one sub-order per store. If any store rejects/cannot supply,
   pause the order and ask the buyer whether to continue with available
   sub-orders or cancel the entire order. Never silently partial-fulfill.
5. **Store Referral:** support both affiliate-network tracking and direct
   merchant callbacks. Select the method separately for each store; track a
   unique click ID and UTM campaign data, and use per-store commission and
   attribution-window settings (default attribution window: 30 days).
6. **Referral commission base:** net item subtotal after discounts, excluding
   tax and shipping. Cancellations/refunds reverse or adjust the commission.
7. **Assisted Lead / Order:** Haya passes a buyer request to the store; the
   store completes payment and delivery. Confirmed sales use the same per-store
   percentage commission as Store Referral.
8. **Fulfillment selection:** each store has a default fulfillment method with
   an override for a specific order.
9. **Fulfillment rollout:** store-direct shipping is the initial release.
   Haya receiving, warehousing, packing, and shipping is Phase 2.
10. **Public messaging:** catalog connection methods may be shown as current
    supported/assisted paths. Checkout, referral tracking, lead reporting, and
    fulfillment models must remain labeled **Planned** until their backend
    workflows are live.
11. **Referral provider catalog:** allow per-store selection among ArabClicks,
    Awin, Rakuten Advertising, impact.com, Admitad, and CJ Affiliate; merchants
    among Zara, Namshi, Ounass, 6thStreet, SHEIN, Vogacloset, H&M, Centrepoint,
    Max Fashion, Mango, Adidas, NEXT, Riva Fashion, Modanisa, and Bloomingdale's.
    Direct merchant callback platform choices include Shopify and WooCommerce.
  12. **Mock payment for the current demo:** use an internal Haya payment page in
      development and investor-demo production before a real PSP is selected. A
      successful mock transaction records a `mock` payment attempt, marks the
      order's payment state paid, and redirects to the localized success page.
      It is idempotent and never represents real funds. `MOCK_PAYMENTS_ENABLED`
      controls availability and can be turned off when live payments launch.
13. **Initial market scope:** target Arabic-speaking countries. Country and
    currency remain explicit order/store data; do not assume one currency for
    the whole region.
14. **Mock price source:** development mock checkout uses the existing catalog
    product/selected variant price, applying an active sale price when present.
    Its total is the item-price subtotal only; it does not add shipping or tax.
    The browser never supplies the charged amount.

## 3. Decisions still open

These are explicit blockers for a live-payment launch; they do not block the
mock-payment demo flow. Implementation must not silently select a live
provider or commercial term:

- Payment gateway/provider and supported countries/currencies.
- The live PSP and exact supported Arabic countries/currencies (the mock flow
  remains simulated and moves no funds).
- Gateway support for authorization holds, capture after supplier acceptance,
  partial capture, cancellation/void, partial refunds, disputes, webhooks, and
  reconciliation.
- Supplier settlement timing and process (at supplier acceptance, dispatch,
  delivery, or another contractual event).
- Per-store commission percentage/rate; it is configurable per store, but the
  actual rate is commercial configuration, not a code default.
- Per-store attribution windows and commission rates are configurable; use a
  30-day attribution window as the initial default.
- Which affiliate-network callback/sub-ID contract each selected provider will
  use, and the provider-specific sandbox credentials/webhook setup.
- Shipping price calculation, tax/receipt rules, delivery promises, and return
  policy for Haya Checkout.
- Buyer decision timeout after a supplier rejection. Recommended default:
  expire the revised offer and cancel/release the affected checkout if the
  buyer does not respond before the payment authorization or reservation
  expires.
- Lead notification/acceptance path and lead expiry. The lead's conversion
  commission is approved, but the store's confirmation workflow needs an owner.
- Which provider is the first order-write API pilot and its exact permissions,
  sandbox, and cancellation behavior.

Until these are resolved, provider adapters must be gateway-neutral and the UI
must keep incomplete models in draft/Planned status.

## 4. Current repository capability baseline

### Existing catalog capabilities

The API and admin Connection Hub currently support:

- Manual Haya catalog management.
- Shopify Admin REST catalog reads (token-based).
- WooCommerce REST catalog reads (consumer key/secret; variable products,
  variants, attributes, images, and MinIO caching).
- Custom TEA Product Feed v1 catalog pull and inbound product push.
- Zara-specific scraper catalog ingestion through the `web_scrape_jobs`
  worker.
- Shared product staging, draft imports, source IDs, image caching, retries,
  sync cursors, and admin sync history.

### At-plan-baseline capabilities

At plan approval there were no commerce order, checkout, payment, refund,
commission, shipment, or fulfillment models or endpoints. The M1/M2 additions
below now provide draft store profiles, referral clicks, normalized signed
conversion callbacks, and a commission ledger. They do not add Haya Checkout or
supplier ordering. Shopify and WooCommerce catalog connections remain
read-oriented; they do not place orders. The custom product feed handles
products, not supplier orders. The scraper extracts catalog data; it does not
purchase goods. Do not treat product price/quantity in the current catalog as
an immutable checkout quote or supplier cost.

The current public page is `/{locale}/connection-hub`. It includes catalog
connection methods and displays the three sales models and fulfillment choices
as Planned.

## 5. Sales-model user flows

### 5.1 Haya Checkout

Haya owns the buyer transaction. Store supplier cost and Haya retail price must
be represented separately; store catalog synchronization must never overwrite
an order snapshot or silently reset Haya pricing.

1. The shopper selects products, variants, quantities, delivery address, and
   any supported fulfillment choice.
2. The API revalidates product status, variant selection, current availability,
   supplier cost, retail price, currency, shipping, and tax. It returns a
   server-calculated, versioned, expiring quote. Client-provided amounts are
   ignored.
3. Create a parent buyer order and one store sub-order per store in a multi-
   store cart. Snapshot product/variant details and monetary amounts on the
   order items.
4. When `MOCK_PAYMENTS_ENABLED` is true, send the shopper to Haya's internal
   mock payment page. It records a mock transaction against the server-created
   order, idempotently marks the payment state paid, and redirects to the
   payment-success page. This does not mark suppliers as accepted and does not
   simulate real funds.
   For live payment, create a gateway authorization using an idempotency key;
   never trust a browser redirect as proof of payment—verify a gateway webhook
   or query the provider's server API.
5. Place each supplier order through an authorized order-write adapter or
   create an operator task. Supplier requests include the required item,
   variant, quantity, price/cost, recipient, and delivery information.
6. When all suppliers accept, capture the authorized buyer amount and release
   accepted supplier orders to fulfillment. If a supplier rejects, the order
   enters **Buyer decision required** with accepted/unavailable sub-orders,
   revised amounts, and explicit **Continue with available items** / **Cancel
   entire order** actions.
7. On continuation, capture only the approved revised total if the gateway
   supports it; otherwise obtain fresh buyer approval. Release accepted
   supplier orders only after capture succeeds. On cancel/timeout, cancel
   supplier work and void/refund the authorization according to provider
   capabilities.
8. Settle each store's supplier cost according to the approved commercial
   terms. Haya's revenue is the difference between retail receipts and
   supplier costs, payment costs, taxes, shipping, and adjustments.
9. Keep refunds, returns, chargebacks, and supplier disputes attached to the
   relevant order/sub-order and preserve an auditable event timeline.

The first Haya Checkout pilot should support only verified order-write
capabilities. Unsupported stores use an operator queue; they must not be shown
as automatically orderable just because catalog sync works.

### 5.2 Store Referral

The store remains the checkout/payment/fulfillment party. Haya earns commission
only from a confirmed, eligible conversion.

Each store selects one reporting method in its own Sales & Fulfillment settings:

- **Affiliate network:** ArabClicks, Awin, Rakuten Advertising, impact.com,
  Admitad, or CJ Affiliate. Configure that store's network tracking URL template
  with the `{click_id}` placeholder.
- **Direct merchant callback:** Shopify or WooCommerce, with a verified merchant
  destination URL and a store-specific callback secret.

The merchant selector is also per store and includes Zara, Namshi, Ounass,
6thStreet, SHEIN, Vogacloset, H&M, Centrepoint, Max Fashion, Mango, Adidas,
NEXT, Riva Fashion, Modanisa, and Bloomingdale's. These are selectable merchant
configurations; selecting one does not assert that the merchant has authorized
Haya or that its callback is connected.

1. Shopper chooses **Buy on store website**.
2. Haya records an opaque click ID, store/product references, campaign UTMs,
   locale, and timestamp using the attribution window configured for that store.
   Redirect only to a previously verified store URL or its configured network
   tracking URL; do not accept arbitrary destinations from the request.
3. The destination carries UTMs for campaign analytics and a stable `haya_click_id`
   (sub-ID) that the store preserves through checkout. UTM values alone are not
   sufficient purchase attribution.
4. The store/network reports a conversion via a signed server-to-server
   webhook/postback with an event ID, merchant order ID, click ID, order status,
   event time, currency, eligible item subtotal, discounts, and refund data.
5. Verify the configured callback signature, deduplicate event ID/order ID,
   apply the store's attribution window, and ledger a pending commission.
6. Approve the commission after the agreed confirmation point; reverse/adjust
   on cancellation, full or partial refund, chargeback, or returned items.
7. Report clicks, conversions, pending/approved/reversed commission, and
   settlement status by store and period.

For WooCommerce/Shopify, order callbacks may require merchant webhooks, a
checkout extension/plugin, or an affiliate platform. A product-read API key by
itself cannot preserve/return a Haya click ID or report sales.

### 5.3 Assisted Lead / Order

This is a request/lead, not a Haya payment or confirmed order.

1. Shopper chooses **Request this item** and selects product/variant/quantity.
2. Collect only the contact and delivery details needed for the request; show
   explicit consent before sharing them with the store.
3. Persist a lead with a reference, store, customer, product snapshot, and
   status; notify the store via the selected notification/work queue.
4. Store or Haya operations updates **New → Contacted → Quoted/Accepted →
   Converted / Declined / Expired**. The store completes checkout, payment,
   and delivery outside Haya.
5. For a confirmed conversion, record the merchant order reference and amounts
   and apply the same per-store commission policy. Lead expiry or no response
   earns no commission.

## 6. Fulfillment flows

Fulfillment is independent of the sales model. Store default is configured on
the commerce profile; an eligible order can override it. Any price, delivery
charge, address, or promise change requires a revised quote and buyer approval.

### Phase 1 — Merchant / store fulfilled

- The store ships each accepted supplier sub-order directly to the customer.
- Track sub-order accepted, processing, shipped, delivered, failed, cancelled,
  and returned states independently from buyer payment state.
- Store supplies carrier, tracking number/URL, and shipment timestamps through
  an API webhook or the merchant/admin UI.
- Haya remains the buyer-facing seller for Haya Checkout, so the policy must
  define how Haya coordinates delivery issues, refunds, and returns with the
  supplier. For Store Referral and Assisted Lead, the merchant remains the
  buyer's seller and handles delivery/support.

### Phase 2 — Haya warehouse fulfilled

- Supplier sends goods to an approved Haya receiving location.
- Create an inbound transfer linked to the supplier sub-order; record expected
  versus received quantity, inspection, missing/damaged exceptions, and
  inventory ownership.
- Haya picks, packs, ships, and records carrier/tracking events. Keep the
  inbound shipment and buyer shipment as separate records.
- Add warehouse inventory/reservation, shipping-label/carrier integration,
  storage/handling costs, split parcels, returns intake, restocking/write-off,
  and reconciliation before enabling the option.

## 7. API and data design (`product-graph-api`)

Keep commerce configuration separate from the one-per-store `StoreConnection`
catalog source. Suggested records and responsibilities:

| Record | Core responsibilities |
|---|---|
| `store_commerce_profiles` | One per store: selected sales model(s), fulfillment default, enabled overrides, procurement mode, commission rate, attribution window, readiness and version. Start with Catalog Only and draft configurations. |
| `commerce_offers` / `supplier_item_refs` | Haya retail price, agreed supplier cost, source store/product/variant reference, effective dates, and provider capability. Protect costs from public APIs and seller roles that should not see them. |
| `carts` / `checkout_quotes` | Cart ownership, quantities, delivery choices, exact currency amounts, expiration, configuration version, and server-calculated total. |
| `orders` / `order_items` | Parent buyer order and immutable snapshots of product/variant, quantity, retail amount, tax, discount, delivery, and payment amount. |
| `store_orders` / `supplier_order_requests` | One child order per store, supplier cost, order-write adapter/operator state, supplier reference, accept/reject, deadlines, retry/idempotency. |
| `payment_attempts` / `payment_events` / `refunds` | Provider auth/capture/void/refund/dispute IDs, amounts, status, signatures, and reconciliation state. Never store card numbers or raw payment credentials. |
| `fulfillments` / `shipments` | Method, recipient, split packages, tracking, timestamps, exceptions, return and refund linkage. |
| `referral_clicks` / `merchant_conversions` | Opaque click IDs, UTMs, attribution timestamps, merchant order/event IDs, confirmed/refunded status, idempotency. |
| `assisted_leads` | Buyer consent/contact snapshot, product request, store notification, status history, conversion order reference. |
| `commission_entries` | Append-only pending/approved/reversed store commission ledger with rate/base snapshot and reason. |
| `outbox_events` / `inbound_events` | Reliable jobs and webhook/event deduplication across restarts. |

Use integer currency minor units for money and basis points for commission rates;
respect currency decimal scales (including KWD). Snapshot commercial terms so
later catalog/commission changes cannot rewrite historical orders. Store
provider/API capability separately (`catalog_read`, `inventory_read`,
`order_write`, `order_status_events`, `fulfillment_updates`) and only enable an
action when its capability has been verified.

Suggested API areas:

- Shopper: cart/quote, checkout session, buyer orders, order decisions, leads.
- Merchant: store-scoped supplier orders, accept/reject, fulfillment/tracking,
  leads, conversion confirmation.
- Admin: commerce profile/readiness, orders/sub-orders, operator sourcing queue,
  payment/refund reconciliation, referral/conversion/commission reports.
- Webhooks: payment provider signed callbacks and store-scoped order,
  fulfillment, referral conversion events. Durable event intake, signature
  verification, idempotency, replay protection, and safe retries are required.
- Public: allowlisted outbound referral redirect that records the click ID and
  rejects arbitrary redirect URLs.

Do not expose supplier cost, commission configuration, customer PII, or payment
details from public product or public settings endpoints. Enforce store-member
and role checks on every merchant action. Use localized typed errors and keep
all order state changes auditable.

## 8. Web UI design (`product-graph-web-ui`)

### Admin store pages

- `/admin/stores` remains an overview. Add catalog, sales, and fulfillment
  status badges/summary columns; don’t fetch a separate commerce record per row.
- `/admin/stores/{storeId}` adds a **Sales & Fulfillment** tab beside the
  existing Connection, Mapping, and Sync History tabs.
- Sales model cards show Catalog Only, Haya Checkout, Store Referral, and
  Assisted Lead / Order with readiness status. Conditional forms show supplier
  ordering capability, per-store commission, and attribution settings only
  when relevant.
- Fulfillment form sets the store default and whether order overrides are
  allowed. Haya warehouse appears as Phase 2 until receiving/inventory/shipping
  support is deployed.
- Readiness lists blockers (payment provider missing, supplier order-write not
  verified, missing cost, no conversion callback) instead of silently saving
  an active but unusable sales model.

### Shopper pages

- Product detail shows exactly one relevant action: **Add to Haya Checkout**,
  **Buy on store website**, or **Request this item**, based on server-provided
  eligibility and product/variant status.
- Add localized cart and checkout, with products grouped by store and shipping
  amounts displayed per fulfillment/sub-order.
- Login preserves a validated internal return path so OTP/Google auth resumes
  the intended cart/checkout/lead action.
- Order history/detail shows buyer-level order, per-store sub-orders, payment,
  fulfillment/tracking, revised availability offer, refunds, and next action.
- Seller views provide order/lead work queues, acceptance, shipment tracking,
  and conversion reporting with store-member authorization.

### Admin operations

Add `/admin/orders`, `/admin/leads`, and `/admin/commissions` for Haya staff.
Include search/filter, event timeline, pending manual supplier purchases,
stuck authorizations, conversion mismatches, refunds, and export/reconciliation.
Keep these operational workspaces separate from store configuration.

Use small typed RTK Query modules, Zod response schemas, translations in
`messages/{en,ar,fa}.json`, and RTL-compatible components. Keep checkout and
order screens mostly server-derived; use client state only for shopper
interaction. Payment actions must be idempotent and show pending/failed states
without trusting browser redirects.

## 9. Public Connection Hub page

The current public page is `/{locale}/connection-hub`. Keep its catalog section
separate from its commerce section. Present Haya Checkout, Store Referral,
Assisted Lead / Order, Store Fulfillment (Phase 1), and Haya Fulfillment
(Phase 2) as **Planned** until their backend paths are usable. Do not advertise
Haya Checkout as live merely because a store has Shopify/WooCommerce catalog
sync. When a capability is shipped, change its label/status and link to the
appropriate onboarding flow.

## 10. Milestones and exit criteria

| Milestone | Deliverable | Exit criteria |
|---|---|---|
| **M0 — Business and provider review** | Gateway shortlist and provider sandbox verification; pilot market/store; seller-of-record, supplier settlement, shipping, tax, returns, timeout policy. | Provider supports the required auth/capture/void/refund/webhook and reconciliation flows; open commercial terms have owners. Gateway provider is intentionally not selected yet. |
| **M1 — Commerce foundation** | Migrations, store commerce profile, capabilities/readiness, money/currency utilities, order state machine, API authorization, admin store configuration tab and badges. | Existing stores remain Catalog Only; commerce config can be saved as draft; no public API leaks supplier cost or order data. |
| **M2 — Store Referral** | Outbound click ID + UTMs, conversion webhook/postback, 30-day attribution, commission ledger, refund reversals and report. | Sandbox store checkout returns the ID; duplicate/out-of-order callbacks are safe; refunds adjust the same ledger. |
| **M3 — Assisted Lead / Order** | Buyer request with consent, store notification/work queue, status timeline, conversion and commission. | Lead is never shown as a paid order; merchant conversion must be confirmed and deduplicated. |
| **M4 — Haya Checkout / store-direct launch** | PSP adapter, cart/quote, parent+store orders, buyer decision on store rejection, API order-write adapters and operator queue, store-direct shipping. | Sandbox multi-store case works: supplier rejection pauses the checkout, buyer chooses continue/cancel, payments and supplier orders reconcile, shipments/returns are trackable. |
| **M5 — Haya warehouse fulfillment** | Inbound transfers, receiving/inspection, inventory, pick/pack, shipping labels/tracking, returns. | Order can be reconciled from supplier dispatch through Haya receiving to buyer delivery, including exceptions. |
| **M6 — Gradual rollout** | Pilot enablement and public page status updates. | One store at a time passes capability checks, support runbook exists, and existing orders/refunds can finish after a store is disabled. |

Recommended delivery order: M0, M1, M2, M3, M4, M5, M6. The lower-payment-risk
referral and assisted-lead flows can be piloted after M1 while the PSP review
continues; Haya Checkout must wait for the PSP and order-write/operations plan.

## 11. Test and release requirements

### API

- Unit/integration tests for quotes, currency rounding, tax/shipping snapshots,
  commission calculations, refund reversals, click attribution, and all state
  transitions.
- Provider tests via mock transports: order creation, authentication/scopes,
  stock changes, timeout after successful supplier order, order lookup,
  cancellation, webhook signature/idempotency, and capability verification.
- Auth tests: cross-store access denied; buyer sees only own order/lead; seller
  sees only their store's sub-orders; admin/operator permissions are explicit.
- Payment tests: capture success/failure, authorization expiry, store rejection,
  buyer timeout, partial refunds, duplicate/replayed events, and reconciliation.
- Run `ruff check app/ tests/ scripts/`, `ruff format ... --check`, `mypy app/`,
  full pytest and coverage gates.

### Web UI

- Tests for cart/checkout, return-from-login, buyer decisions, order/lead states,
  admin readiness, store scoping, commission displays, and RTL translations.
- Playwright sandbox journeys for Store Referral and Assisted Lead, then Haya
  Checkout with two stores and one supplier rejection.
- Run `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`,
  and `npm run build`.

### Operations and release

- Deploy additive migrations before pages call new endpoints.
- Use feature flags/configuration so only tested stores and models are enabled.
- Define rollback behavior without deleting pending orders or financial records.
- Monitor payment webhooks, operator queues, stuck supplier orders, unmatched
  conversions, commission adjustments, and fulfillment exceptions.
- Never log raw payment credentials, card data, Haya click tokens, or unnecessary
  buyer contact data.

## 12. Immediate next step

Deploy the mock-payment code and migration to the investor-demo environment,
then verify the checkout/pay/success path there. After that proceed with
supplier-order handling, shipping/tax policy, and provider sandbox work. The
mock uses server-resolved catalog/variant prices only; live Haya retail pricing
and the real PSP remain separate later decisions.

## 13. Implementation progress

### M1 — Commerce foundation (code complete; migration applied to dev)

Implemented on 2026-11-22:

- Added `store_commerce_profiles` as a separate one-per-store table. Stores with
  no profile continue to resolve as Catalog Only, and profile reads do not
  create records.
- Added admin-only GET/PUT profile APIs, computed readiness blockers, and
  sales/fulfillment summaries on the paginated admin store list.
- Added the Sales & Fulfillment admin tab with draft configuration, verified
  capability fields, readiness blockers, and English/Arabic/Farsi copy. The
  existing catalog Connection Hub remains separate.
- Added integer minor-unit currency conversion and a gateway-neutral buyer-order
  transition map, including the supplier-rejection buyer-decision state.
- Live Haya Checkout, Assisted Lead, and fulfillment remain draft or blocked.
  The development/demo mock path is separate; referral shopper actions remain
  Planned until provider verification and shopper UI integration are complete.

Alembic revision `b6c3d9e2f104_add_store_commerce_profiles.py` was applied to
the local dev database and verified at head on 2026-11-22. M0 remains open:
provider/market, settlement terms, supplier cost, shipping/tax/returns, and live
workflow ownership still require confirmation.

### M2 — Store Referral shared workflow (code implemented; provider sandbox verification pending)

The per-store profile supports both reporting methods, the requested
affiliate-network and fashion-merchant catalogs, Shopify/WooCommerce direct
callback selection, encrypted callback-secret storage, a per-store commission
rate, and a customizable per-store attribution window (30-day default). The API
records clicks and UTMs, performs saved-destination redirects, accepts signed
normalized conversion events, deduplicates source events, enforces attribution
windows, and writes pending/approved/reversal/adjustment ledger entries. Clicks
snapshot the store's settings and encrypted callback secret to preserve
in-flight attribution after configuration changes. Awin (`clickref`),
impact.com (`subId1`), and Admitad (`subid`) have documented click-reference and
event normalizers; Rakuten, CJ, and ArabClicks use the per-store custom template
and normalized Haya event contract until their account-specific fields are
configured. Native Shopify (`orders/paid`, `orders/updated`,
`orders/cancelled`) and WooCommerce (`order.created`, `order.updated`,
`order.deleted`) webhook normalizers read `haya_click_id` from order note
attributes/meta data, verify each platform's HMAC, handle cumulative refunds,
and deduplicate delivery IDs. Alias-mapped networks require the
`affiliate_callback_mapping_verified` capability before referral readiness; the
documented Awin/impact.com/Admitad mappings do not. The product page obtains one
server-selected commerce action and shows **Buy on store website** only when
Store Referral is ready. Provider sandbox verification remains pending; method
selection alone does not mark a store live.

### M4 demo path — mock payment (code implemented; migration applied to dev)

An authenticated buyer can start mock checkout from an active eligible product
in the investor-demo UI. The API resolves product/variant and active sale prices,
groups items by store, snapshots amounts, and creates idempotent per-store mock payment
transactions. The internal payment page completes the mock attempts, marks the
parent payment paid, leaves each supplier sub-order pending, then redirects to a
localized success page. Shipping and tax are excluded. `MOCK_PAYMENTS_ENABLED`
is true for the current investor demo and can be set false when a real PSP goes
live. No real gateway is selected and no funds move. Alembic revision
`c7d8e9f0a123_add_mock_checkout_orders.py` is applied to dev.
