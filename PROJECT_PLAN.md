# Portfolio-Tracker — Roadmap

## Phase 1 — Foundation ✅

## Phase 2 — Data, Visualization & Backend
- Step 1: Backend foundation (Moralis behind serverless function) ✅
- Step 2: CoinGecko integration ✅
- Step 2.5: Skip hidden tokens in refresh + fix summary totals ✅
- Step 3: Blank on startup ✅
- Step 4: Cost basis & P&L (enter what I paid, see unrealized gains/losses, total P&L in summary cards)
- Step 5: Sparkline charts (7-day price trend per row, via CoinGecko historical w/ server-side caching)

## Phase 3 — Portfolio Intelligence
- Multiple labeled wallets ("cold wallet", "trading wallet")
- Multi-chain support: Bitcoin, all EVM chains, Solana
- Portfolio value history chart (total worth over time)
- Weekly/monthly volume (replaces 1h+6h columns; needs new data source)
- Price alerts (notify when token moves X%)

## Phase 4 — Full Web App
- Backend persistence (replace localStorage with a real database)
- User accounts
- Push notifications for alerts
- Share portfolio as public link
- Progressive Web App (installable on phone)

---

## Polish & Deferred

Small UX/cosmetic items that don't block any phase. Burn down between phases or in low-stakes sessions.

- **Hidden tokens display `—` for price/value/24h cells.** Currently they show last-known stale values from cached `t._data`. In `render()`, if `t.hidden`, force the price/value/change cells to em-dash.
- **Custom delete-confirmation modal.** Replace the browser `confirm()` dialog with a styled modal matching the app's design. Cosmetic only — existing `confirm()` works.
- **Auto-hide dust tokens on wallet import.** When a wallet import returns tokens with zero value or no metadata, mark them hidden by default so they don't enter the refresh loop until the user explicitly unhides.
- **Mobile responsive layout.** Touch-friendly controls, fluid table on narrow widths. Was originally in Phase 3 but reclassified as polish.

---

## Pending Design Discussion

Open questions that need a conversation before implementation.

- **Blacklist on delete.** When a token is permanently deleted, should its address go to a blocklist that prevents re-import on wallet sync? Pros: scam tokens stay gone after syncs. Cons: adds state (blocklist array), needs an "unblock" UI, risk of accidentally blocklisting legit tokens. A `// TODO: blacklist on delete` comment exists in `deleteToken()` as a placeholder.
