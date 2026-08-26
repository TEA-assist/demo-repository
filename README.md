# TEA — AI Product Finder — Demo & User Guides

Demo portal for the TEA (AI Product Finder) platform. Live stack runs on `asktea.ai`; this repo hosts the presentation, demo script, and role-based user guides (web + mobile).

**Live URLs:** App `https://app.asktea.ai` · Dashboard `https://dash.asktea.ai` · API `https://app.asktea.ai/api/v1/health`

## Contents

| Section | Path |
|---------|------|
| Presentation — Overview | [demo/presentation/01-overview.html](demo/presentation/01-overview.html) |
| Presentation — Architecture | [demo/presentation/02-architecture.html](demo/presentation/02-architecture.html) |
| Presentation — AI Pipeline | [demo/presentation/03-ai-pipeline.html](demo/presentation/03-ai-pipeline.html) |
| Prototype — Demo Script | [demo/prototype/demo-script.html](demo/prototype/demo-script.html) |
| User Guides | [demo/user-guides/](demo/user-guides/) |
| └ Admin (dash) | [web-admin.html](demo/user-guides/web-admin.html) |
| └ Store Owner (dash) | [web-store-owner.html](demo/user-guides/web-store-owner.html) |
| └ Shopper (web) | [web-user.html](demo/user-guides/web-user.html) |
| └ Shopper (mobile) | [demo/user-guides/mobile-app.html](demo/user-guides/mobile-app.html) |

All pages are plain HTML under `demo/` — open directly or via the portal [`index.html`](index.html).

## How to demo

See [demo/prototype/demo-script.html](demo/prototype/demo-script.html) for the 4 role-by-role click-paths (admin → seller → shopper web → shopper mobile), and [demo/presentation/01-overview.html](demo/presentation/01-overview.html) for the narrative deck.

Screenshots live in [`demo/assets/screenshots/`](demo/assets/screenshots/) — captured against production with Playwright (1280×800, checked against `/api/v1/health` git_sha).
