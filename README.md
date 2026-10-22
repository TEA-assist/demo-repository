# TEA — AI Product Finder — Demo & User Guides

Demo portal for the TEA (AI Product Finder) platform. Live stack runs on `asktea.ai`; this repo hosts the full documentation, the stakeholder presentation, the demo script, and role-based user guides (web + mobile).

**Live URLs:** App `https://app.asktea.ai` · Dashboard `https://asktea.ai` · API `https://app.asktea.ai/api/v1/health`

## Contents

| Section | Path |
|---------|------|
| Full Documentation — Master | [demo/docs/00-full-documentation.html](demo/docs/00-full-documentation.html) |
| Full Documentation — Technical Manual | [demo/docs/01-technical-manual.html](demo/docs/01-technical-manual.html) |
| Roadmap — Haya AI Future Features & Product Roadmap | [demo/docs/02-product-roadmap.html](demo/docs/02-product-roadmap.html) |
| Presentation — Executive Summary | [demo/presentation/00-executive-summary.html](demo/presentation/00-executive-summary.html) |
| Presentation — Overview | [demo/presentation/01-overview.html](demo/presentation/01-overview.html) |
| Presentation — Architecture | [demo/presentation/02-architecture.html](demo/presentation/02-architecture.html) |
| Presentation — AI Pipeline | [demo/presentation/03-ai-pipeline.html](demo/presentation/03-ai-pipeline.html) |
| Presentation — Roles & Roadmap | [demo/presentation/04-roles-and-roadmap.html](demo/presentation/04-roles-and-roadmap.html) |
| Presentation — Investor: Business Model | [demo/presentation/05-investor-business-model.html](demo/presentation/05-investor-business-model.html) |
| Prototype — Demo Script | [demo/prototype/demo-script.html](demo/prototype/demo-script.html) |
| User Guides | [demo/user-guides/](demo/user-guides/) |
| └ Admin (dash) | [web-admin.html](demo/user-guides/web-admin.html) |
| └ Store Owner (dash) | [web-store-owner.html](demo/user-guides/web-store-owner.html) |
| └ Shopper (web) | [web-user.html](demo/user-guides/web-user.html) |
| └ Shopper (mobile) | [demo/user-guides/mobile-app.html](demo/user-guides/mobile-app.html) |

All pages are plain HTML under `demo/` — open directly or via the portal [`index.html`](index.html).

## How to demo

1. Smoke check: `curl -s https://app.asktea.ai/api/v1/health | jq` (expect `status ok` + `git_sha`).
2. Present the deck in order 00 → 04, starting at [00-executive-summary.html](demo/presentation/00-executive-summary.html).
3. Drive the live click-paths (admin → seller → shopper web → shopper mobile) from [demo/prototype/demo-script.html](demo/prototype/demo-script.html).
4. Hand over role guides + [Full Documentation](demo/docs/00-full-documentation.html).

Screenshots live in [`demo/assets/screenshots/`](demo/assets/screenshots/) — captured against production with Playwright (1280×800, checked against `/api/v1/health` git_sha).
