# Haya Commerce Workflow Sources

These `.mmd` files are the editable source of truth for the diagrams in [Commerce Workflows](../04-commerce-workflows.html). The HTML page fetches and renders the sources with Mermaid; it does not embed a second copy of the diagram syntax.

## Files

| File | Diagram |
| --- | --- |
| `01-commerce-overview.mmd` | Commerce domains and their boundaries |
| `02-store-integration.mmd` | Store onboarding and readiness |
| `03-inventory-synchronization.mmd` | Catalog and inventory-data synchronization |
| `04-sales-models.mmd` | Catalog Only, Haya Checkout, Store Referral, and Assisted Lead / Order |
| `05-checkout-payment.mmd` | Checkout and current mock-payment sequence |
| `06-supplier-procurement.mmd` | Supplier response and procurement states |
| `07-fulfillment-shipping.mmd` | Direct and warehouse fulfillment routes |
| `08-returns-refunds.mmd` | Returns, refunds, and recovery |
| `09-financial-settlement.mmd` | Supplier settlement and commission ledgers |
| `10-exception-handling.mmd` | Buyer-safe exception handling |

## Status language

- **Implemented**: behavior described by the commerce guide and current implementation-plan evidence.
- **Simulated**: the mock payment or demo carrier path; it does not move money or ship real parcels.
- **Reported Implemented**: product-owner progress not independently established by the repository documents.
- **Awaiting Credentials**: an account, API key, or commercial approval is still required.
- **Awaiting Verification**: configuration or an adapter exists, but a store/provider sandbox or live test is still required.
- **Planned**: future operational capability.
- **Live Verified**: use only when evidence explicitly confirms live operation.

## Edit and preview

1. Edit the relevant `.mmd` file.
2. Run `npm install` once, then `npm run validate:mermaid` from the repository root.
3. Serve the repository over HTTP, for example `python3 -m http.server 8000`, and open `http://localhost:8000/demo/docs/04-commerce-workflows.html`.

Opening the HTML file directly with `file://` is not supported because browsers block the page from fetching neighboring `.mmd` source files.
