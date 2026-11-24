# Haya Commerce, Orders, and Fulfillment — Implementation Plan

**Status:** M1, shared M2 referrals, the mock-payment slice, M3 Assisted Lead / Order, and the non-PSP M4 mock/operator order lifecycle are implemented. Mock payment is enabled for the current investor-demo production; live PSP, supplier API, settlement, and warehouse rollout decisions remain open.
**Updated:** 2026-11-23
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

Verify the cart → quote → mock order → supplier accept/reject → buyer decision →
fulfillment path in the investor-demo environment, then exercise the assisted
lead queue and conversion reporting. After that, complete M0 provider sandbox,
shipping/tax/returns policy, supplier API pilot, and live PSP work. The mock
continues to use server-resolved catalog/variant prices only; live Haya retail
pricing and the real PSP remain separate later decisions.

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


### M3 — Assisted Lead / Order (code implemented)

Buyer requests now persist with an immutable product/variant snapshot, contact
and delivery details, explicit consent, a store-specific commission rate
snapshot, and a status timeline. Store members and admins use in-app lead
queues to progress `new → contacted → quoted/accepted → converted/declined/expired`.
Conversion requires an accepted lead and a merchant order reference, is
deduplicated per store, and writes an approved commission entry to the unified
commission ledger. Public product eligibility now supports `assisted_lead`.
No external email/SMS/WhatsApp notification provider is used.

### M4 — Mock/operator Haya Checkout lifecycle (code implemented)

Added an expiring server-priced multi-store quote endpoint and buyer cart/
checkout UI. Orders snapshot retail prices and protected supplier costs.
Supplier orders are handled through store-member and admin operator queues:
accept/reject, operator references, buyer continue/cancel decisions after a
rejection, mock refunds, order events, and store-direct shipment/tracking.
Buyer order history/detail and seller/admin order operations are available.
Readiness now treats the operator queue, store-direct fulfillment, assisted
lead in-app queue, and supplier-cost configuration as implemented code while
keeping live PSP, supplier API, settlement, tax/shipping/returns, and Haya
warehouse rollout blocked. Public sales-model labels remain Planned.

Alembic revision `e8f9a0b1c2d3_add_commerce_order_lifecycle_and_leads` is applied
to dev and adds quotes, supplier costs, order events, shipments, refunds,
assisted leads, and the generalized commission ledger.

## 14. Next commerce coverage plan — shipping, tax, policies, settlement, and automation

This section is an implementation attachment to the approved plan. The current
mock/operator MVP is not yet a complete live-commerce financial or delivery
system. Do not hardcode tax rates, legal invoice rules, shipping prices,
settlement terms, or consumer-policy terms before product/legal/finance approves
them. Keep these settings configurable and block a live checkout where required
configuration is missing.

### 14.1 Current gaps

Some gaps below are intentionally historical; delivery address and shipping gaps are now partially closed by section 14.11.

- Checkout quotes currently contain item subtotals only. There are no shipping,
  tax, discount, or grand-total snapshots.
- `StoreOrder.total_minor` represents the current item subtotal. Order items
  snapshot retail and supplier cost, but not taxes, discounts, or delivery costs.
- Buyer address is read from the user profile when an order is displayed; it is
  not a structured, immutable recipient/address snapshot on the order.
- `Shipment` stores carrier/tracking/status only. It has no service level,
  package, shipping-price, or promised-delivery information.
- There is no tax jurisdiction/rate model, invoice/receipt, credit note, return
  request, settlement, or supplier payout model.
- Refunds currently refund a complete mock store-order transaction; partial
  refunds and return-linked refund calculations are not supported.
- `Order.buyer_decision` has no deadline. `StoreOrder.supplier_response_deadline`
  exists but is not populated or processed.
- `AssistedLead.expires_at` exists but is not populated or processed.

### 14.2 Shipping methods, price rules, and snapshots

Support per-store shipping methods, with a separate method/rate set for Haya
warehouse fulfillment when Phase 2 begins. Initial configurable price models:

- Flat rate.
- Free shipping above a threshold.
- Order-value bands.
- Weight bands or per-weight increments.
- Destination-zone pricing by country/region/city/remote area.
- Store pickup where the store enables it.
- Standard, express, and same-day service levels when the store supports them.
- Live carrier-calculated rates and label purchase are later integrations.

Recommended records:

- `shipping_methods`: store/platform owner, code, localized display name,
  fulfillment method, service level, active flag, estimated transit days,
  cutoff time, and currency.
- `shipping_rate_rules`: method, destination zone, order-value/weight bounds,
  base amount, per-item/per-weight increment, free-shipping threshold, currency,
  priority, and effective dates.
- `shipping_quotes` or quote snapshots: selected method, matched rule/version,
  destination zone, shipping amount, and delivery estimate.
- `packages` and `shipment_packages`: package weight/dimensions, included item
  quantities, and associated shipment. Carrier scan history can be a later
  `shipping_events` table.

Add per-store-order monetary snapshots for item subtotal, discount, customer
shipping charge, supplier shipping cost, taxable amount, tax, and grand total.
The parent order should retain per-currency totals rather than inventing an FX
conversion. One store sub-order may select one shipping method initially; split
packages can still share that method. All rates are calculated by the server;
the browser may select a method but never supplies its price. Missing applicable
shipping rules block checkout instead of silently returning a guessed price.

Add a structured recipient snapshot to each store sub-order: name, phone,
country, city, district, street/building, postal/national-address fields where
required, delivery notes, and optional coordinates. Keep the snapshot immutable
after order placement. The current free-text user address is insufficient for
zone pricing and delivery handoff. Product/variant weight exists in the catalog;
unit normalization and optional dimensions still need defining.

Checkout UI must show a shipping choice, price, delivery estimate, and per-store
subtotal. Admin/seller UI must show the chosen service, dispatch deadline, and
delivery exceptions. Refund rules must separately state whether customer-paid
shipping is refundable. Keep customer shipping revenue and supplier shipping
cost separate for margin and settlement calculations. Shipping is not part of
referral commissionable item subtotal.

### 14.3 Tax, receipts, invoices, and credit notes

Tax must be configurable by jurisdiction, not embedded as country constants.
Coverage should include country/region, rate in basis points, effective dates,
inclusive/exclusive display, product tax category (standard/zero-rated/exempt),
tax registration details, and tax-on-shipping behavior. Tax is calculated
server-side after discounts and snapshotted with the applicable rate,
jurisdiction, taxable base, and rounding result. Define whether rounding occurs
per line or at invoice total and how order-level discounts are allocated.

For Haya Checkout, Haya is the seller of record and must issue the buyer's
receipt/tax invoice. Store Referral and Assisted Lead remain merchant sales; the
merchant issues the buyer receipt, while Haya records only attribution,
conversion, and commission evidence.

Add immutable invoice/receipt records with a unique sequence scoped to legal
entity/country/year, seller and buyer tax details, item/discount/shipping/tax
lines, currency, payment reference, issue time, and snapshot data. Generate a
localized PDF and store it in MinIO for buyer download. Refunds require linked
credit notes; void/reissue operations must be audited and must not rewrite an
issued document. Arabic/bilingual requirements and invoice entity details need
legal confirmation before enabling tax invoices in a market.

Decisions required: legal invoice entity and registration per market, applicable
tax rates/categories, inclusive/exclusive display, tax treatment of shipping,
mandatory invoice fields, invoice language/sequence rules, and owner of tax
filing/accounting review.

The API now seeds a separate reference-only profile and currency mapping for all
22 Arab League countries. It contains source links, research dates, and explicit
partial/conflicting statuses where public information is incomplete. This
catalog does not activate store tax rules or replace the legal approvals above;
checkout tax remains zero until a store has an active, reviewed tax profile.

### 14.4 Delivery policy and service levels

Create a versioned delivery policy per store/country or platform default. Cover
dispatch/handling SLA, cutoff time, business days and holidays, estimated versus
promised delivery windows, remote-area restrictions, address changes, failed
delivery/reattempt rules, split shipments, proof of delivery, lost/damaged/missing
items, buyer notifications, liability, and support/escalation ownership.

Snapshot the policy version and delivery promise on the order. Add fields such as
`dispatch_due_at`, `delivery_promise_from`, `delivery_promise_to`,
`delivery_policy_version`, and buyer acceptance time. Admin/seller queues should
surface overdue dispatches and delivery exceptions. The store/Haya responsibility
matrix must differ by sales model: Haya Checkout is Haya's buyer-facing support
responsibility; Store Referral and Assisted Lead remain the merchant's sale and
delivery responsibility.

### 14.5 Returns and partial refunds

Add versioned return policies with return window, return-shipping payer,
condition requirements, non-returnable categories, exchange/final-sale rules,
restocking fee, RMA requirement, refund method/timing, original-shipping refund
rule, and return address.

Add `return_requests` (RMA, order/store order, reason, status, policy snapshot),
`return_items` (item/quantity/condition/resolution), return-shipment tracking,
and an append-only return event timeline. Proposed states:

`requested → approved/rejected → in_transit → received → inspected →
refunded/replaced/declined → closed`.

Extend the refund model/service to support multiple partial refunds per payment
transaction, linked to return items and credit notes, with a hard invariant that
cumulative refunds cannot exceed the captured amount. Record restocking fees and
shipping refunds independently. Supplier recovery for a returned item must be a
settlement adjustment, not a mutation of historical supplier cost. Return label
purchase and warehouse reverse logistics can follow later. Store Referral and
Assisted Lead returns remain merchant-owned; Haya only adjusts commission when
the merchant/network reports the reversal.

### 14.6 Supplier settlement ledger

Keep supplier settlement separate from referral/lead commission entries. Add
store settlement accounts, settlement periods, immutable settlement lines,
settlement headers, adjustment entries, and supplier invoice references.
Settlement lines should link to source order/store-order/items and distinguish
item cost, supplier shipping, refund recovery, penalty, bonus, and manual
adjustment. Snapshot supplier cost and currency; never recompute it from current
catalog settings.

Proposed states: `draft → pending_approval → approved → scheduled → paid →
closed`. Require audited, preferably dual-approved, manual adjustments. Store
statements should show period, currency, source orders, deductions, payable
amount, payment reference, and paid date. Do not net different currencies or
delete financial entries; use reversal/adjustment lines. Negative balances need
an approved carry-forward or recovery policy.

Product/finance decisions required: settlement trigger (acceptance, dispatch,
delivery, or after the return window), payout cycle, reserve/holdback, payout
rail/KYC, supplier invoice/self-billing process, tax treatment, FX policy, and
recovery of refunds/chargebacks. Recommended initial approach is to accrue on
acceptance and release after delivery plus the approved return window, but this
must be commercially approved before activation.

### 14.7 Buyer-decision timeout automation

Add `buyer_decision_deadline`, reminder timestamp, expiry timestamp, and expiry
reason to the parent order. Start the deadline when the first supplier rejection
places the order into `buyer_decision_required`. Recommended configurable default
is 48 hours. If the buyer does not respond, cancel the entire order and refund or
void all store sub-orders; do not auto-continue without explicit buyer consent.
Record a system order event and notify buyer, store operations, and admins. Allow
admin extension only with an audited reason. Use UTC and row locking so a buyer
decision racing the expiry job cannot be applied twice.

Implement as a commerce automation cron using the API's existing asyncio
lifespan-task and Redis distributed-lock pattern. Run in bounded batches, use
`FOR UPDATE SKIP LOCKED`, and make retries idempotent. Suggested settings:
`commerce_automation_cron`, `buyer_decision_timeout_hours`, and
`buyer_decision_reminder_hours`. The mock path records a mock refund; the future
PSP path must void/refund according to provider capabilities.

### 14.8 Assisted-lead expiry automation

Populate `AssistedLead.expires_at` at creation from a configurable policy;
recommended initial default is 30 days. Expire active `new`, `contacted`,
`quoted`, or `accepted` leads that pass the deadline, append a system event, and
never create commission for expired leads. Converted and declined leads are
terminal. Prevent conversion after expiry unless an authorized user extends the
lead with an audited reason. A conversion racing expiry must lock and recheck the
lead state.

Use a bounded, idempotent cron batch every 15–60 minutes, with pre-expiry and
expiry notifications. Add expiry/reminder timestamps and optionally
`assisted_lead_expiry_days` to store commerce configuration or platform settings. Lead
notification delivery can initially be in-app; email/SMS/WhatsApp requires a
separate provider decision.

### 14.9 Recommended implementation sequence

1. Buyer-decision timeout and lead expiry automation. These can be implemented
   without deciding tax rates or supplier settlement terms.
2. Structured checkout address, per-store shipping methods/rules, and shipping
   amounts/estimates in quote and order snapshots.
3. Configurable tax calculation and tax snapshots; keep live checkout blocked
   where jurisdiction configuration is absent.
4. Immutable receipts/invoices and credit notes after legal entity/tax rules are
   confirmed.
5. Return policy, RMA workflow, and partial refunds.
6. Supplier settlement ledger and statements after finance approves terms.
7. Live carrier rates/labels, warehouse returns, and M5 inventory flows later.

Each slice requires additive migrations, typed APIs, authorization, localized
buyer/seller/admin UI, audit events, and tests for currency rounding,
multi-store/currency behavior, authorization, idempotency, and race conditions.

### 14.10 Initial automation implementation status (2026-11-23)

- Added migration `f1a2b3c4d5e6_add_commerce_automation_deadlines.py`; dev is
  verified at `f1a2b3c4d5e6` head.
- Parent orders now store buyer-decision deadline/expiry metadata. A supplier
  rejection starts the configured deadline (48-hour default); an expired mock
  order is cancelled and all remaining mock payments are refunded. The expiry is
  idempotent and recorded in the order timeline.
- New assisted leads store an expiry date (30-day default). Due active leads are
  expired by the job, recorded in their event timeline, and cannot be converted
  or earn commission after expiry. Existing active leads are backfilled using
  their creation time plus 30 days; no active leads existed in dev at upgrade.
- The commerce automation job runs every five minutes under the API's Redis
  distributed-lock pattern. Admin System Settings now exposes the automation
  toggle and timeout/expiry durations; accepted ranges are 1–720 hours and
  1–3650 days.
- The job currently processes mock-provider refunds only. Buyer/store reminder
  delivery, push/email/SMS notifications, admin deadline extensions, and
  provider-specific live void/refund behavior are still pending.
- Automated supplier response deadlines remain separate work; the existing
  `supplier_response_deadline` field is not yet populated or processed.

### 14.11 Initial delivery address and shipping status (2026-11-23)

- Added migration `a2b3c4d5e6f7_add_addresses_and_shipping.py`; dev is verified
  at `a2b3c4d5e6f7` head.
- Buyers now have reusable structured addresses with recipient/contact,
  country/city/region/district, street/building/floor/apartment, postal code,
  landmark, delivery notes, coordinates, arbitrary metadata, and one default
  address per buyer. `GET/POST /addresses` and `PUT/DELETE /addresses/{id}` are
  available.
- Stores now have configurable shipping methods and rate rules. Methods include
  type, carrier, default/active/sort state, delivery-day range, and config JSON;
  rates support country/region/city zones, subtotal/weight/quantity bounds,
  fixed or free amount, currency, priority, delivery days, and metadata.
- Admin and store member APIs are available for shipping-method CRUD. The
  quote/checkout flow captures an inline address or saved address ID, snapshots
  the address, returns all applicable shipping options, prices the selected
  option server-side, and snapshots the method/rate on each store sub-order.
- Quotes, parent orders, and store sub-orders now store separate subtotal,
  shipping, tax, discount, and payable totals. Tax is fixed at zero for now.
  Mock payments and refunds use the store sub-order total including shipping.
- Missing address or no matching rate blocks order creation when a store has
  active shipping methods; stores with no shipping methods retain zero-shipping
  behavior for compatibility.
- Web checkout now includes the address form, shipping option selection, and
  per-store shipping/subtotal display.
- Still pending: seller/admin shipping-management UI, tax and receipts,
  package/label integration, carrier-calculated rates, effective dates/cutoffs,
  pickup scheduling, supplier shipping costs, split packages, return-shipping
  policy, and live-carrier sandbox verification.

### 14.12 Tax, returns, settlement, delivery, and notification foundations (2026-11-23)

- Added migrations `c4d5e6f7a8b9` (tax profiles, tax snapshots, commerce documents), `d5e6f7a8b9c0` (return policies, RMA workflow, partial refunds), `e6f7a8b9c0d1` (supplier settlement), and `f8b9c0d1e2f3` (delivery policies, exceptions, notifications, promised delivery). Dev is at `f8b9c0d1e2f3`.
- Tax: configurable multi-jurisdiction profiles with issuer details, inclusive/exclusive pricing, stacked/compound components, effective dates, product tax categories, shipping taxability, tax snapshots, receipts/invoices, and credit-note issuance. Tax remains zero unless an active profile exists.
- Returns: versioned policies, buyer RMA requests, seller/admin approval/rejection/receipt/completion, item-level partial mock refunds with tax/shipping/restocking calculations, and credit notes.
- Settlement: after-delivery supplier settlement policy, idempotent supplier payable/fee/reserve ledger entries, available holdings, payout creation, and manual paid reconciliation.
- Delivery: dispatch cutoff and promised-delivery snapshots, delivery-exception records, and admin/seller APIs.
- Notifications: in-app notifications for order, supplier, shipment, return, expiry, and settlement-adjacent events; email/SMS/WhatsApp providers remain pending.
- Provider-neutral payment/supplier/carrier interfaces and mock/operator/manual adapters are defined; live integrations remain blocked on provider selection.
- Shipping, tax, return-policy, return-queue, and settlement management UI is implemented in the admin store detail; seller store edit includes shipping, returns, and settlement panels. Buyer order details include return-request UI and return status. Automatic credit notes now follow completed refunds. Remaining frontend work: notification preferences.

### 14.13 Commerce document PDF delivery (2026-11-24)

- Added snapshot-based PDF rendering for receipts, tax invoices, and credit notes. The renderer uses bundled Noto Sans and Noto Naskh Arabic fonts, supports English, Arabic, and Persian layouts with RTL direction, and never recalculates order totals or tax.
- Buyers, store members, and admins can download issued documents through authenticated API endpoints. PDFs are cached in the private `commerce-documents` MinIO bucket and are not exposed through public object URLs.
- Issuance attempts a best-effort cache write; missing or failed PDFs are regenerated on download, so document issuance remains independent of renderer/storage availability.
- Buyer order details, seller order cards, and admin order details now list issued documents, allow seller/admin receipt or invoice issuance, and expose PDF download actions.
- Legal invoice entity, mandatory fields, and market-specific language requirements still require sign-off before enabling tax invoices in a market. The renderer only presents the approved issuer/profile snapshot and does not activate tax.

### 14.14 Settlement recovery and statements (2026-11-24)

- Added migration `a3b4c5d6e7f8_add_settlement_recovery_and_shipping.py` with reserve-release delay and refund-recovery policy fields, per-order supplier shipping cost, and a refund link on supplier ledger entries. Dev is at `a3b4c5d6e7f8`.
- Completed returns now create idempotent, refund-linked supplier recovery entries using per-item supplier cost (with proportional fallback), capped at the remaining payable. Historical supplier cost is never changed.
- Reserve holds are released as separate positive ledger entries after the configured delay. Payouts enforce the minimum payout, mark entries `assigned`, and support voiding unpaid drafts back to available.
- Supplier shipping cost is captured during supplier acceptance and settled as its own ledger line.
- Added settlement statements with opening/closing balances, period entries, paid payouts, and totals by entry type, plus the admin/seller statement and payout-void UI.
- Finance approval is still required before activating settlement terms, payout rails, or reserve/recovery policy values. Automated bank reconciliation and dual-approved manual adjustments remain pending.
