---
slug: extended-payment
remote: extended-payment
route: /extended-payment
roles: []
feature_flag: n/a
status: in-progress
---

## Purpose
Extended Payment lets users configure which Facebook ad-account payment fields appear in the Ads Check bubble, preview the bubble order, and later sync those settings to the Facebook-injected extension runtime.

## Flow
1. User opens the shell sidebar item `Extended Payment`.
2. Shell mounts the `extended_payment` Module Federation remote at `/extended-payment` and lazy-registers the remote's `./routes` under `remote-extended-payment`.
3. The remote renders a local configuration page based on the v6 Extended Payment structure:
   - 60px white header with the `Extended Payment` title;
   - left settings body (`body-left`) with general settings, dashed section separators, and a compact field grid;
   - right preview body (`body-right`) with a 340px Ads Check modal anchored bottom/right;
   - general settings for display language, bubble visibility, currency conversion, and display currency;
   - draggable/toggleable payment data field cards;
   - signature textarea;
   - preview rows that reflect selected fields and order using sample data.
4. Current implementation persists UI-only settings to `localStorage` under `v8.extended-payment.*` keys so refreshes preserve the draft configuration.
5. Runtime Facebook injection and live account data sync are intentionally deferred: the page documents/keeps a clean boundary for Phase 2 rather than faking live FB data.

## Entry points / Routes
- Sidebar primary nav: `Extended Payment` -> `/extended-payment`.
- Shell parent route: `/extended-payment`, name `remote-extended-payment`.
- Remote child route: `''`, name `extended-payment`.

## Files (MANDATORY — real paths, verified to exist)
- `apps/extended-payment/package.json` — workspace package and scripts for the new remote.
- `apps/extended-payment/rspack.config.ts` — Module Federation remote config (`extended_payment`, exposes `./App` and `./routes`).
- `apps/extended-payment/tsconfig.json` — app TypeScript config.
- `apps/extended-payment/public/index.html` — standalone dev HTML root.
- `apps/extended-payment/src/bootstrap.ts` — async bootstrap entry for Rspack.
- `apps/extended-payment/src/main.ts` — standalone Vue mount with `SpriteProvider` and Pinia.
- `apps/extended-payment/src/App.vue` — standalone app root.
- `apps/extended-payment/src/styles.css` — Tailwind/shared-ui theme imports and app base CSS.
- `apps/extended-payment/src/router/index.ts` — child routes exposed to shell.
- `apps/extended-payment/src/types/index.ts` — typed settings/field contracts.
- `apps/extended-payment/src/components/extended-payment-data.ts` — field catalog, defaults, and storage keys.
- `apps/extended-payment/src/components/DataFieldCard.vue` — selectable field card matching the design card states.
- `apps/extended-payment/src/components/PaymentPreview.vue` — right-side Ads Check bubble preview using selected sample fields.
- `apps/extended-payment/src/pages/ExtendedPaymentPage.vue` — page layout, local state, settings controls, draggable grid, signature editor.
- `apps/shell/src/components/AppLayout.vue` — sidebar menu item and layout side-cutout participation for this route.
- `apps/shell/src/router/index.ts` — shell parent route for `/extended-payment`.
- `apps/shell/src/router/remote-routes.ts` — lazy `extended_payment/routes` registration.
- `apps/shell/src/router/product-routes.ts` — exported `EXTENDED_PAYMENT_PATH`.
- `apps/shell/src/remotes.d.ts` — offline host type declarations for `extended_payment/App` and `extended_payment/routes`.
- `owners.example.json` — example dev port for `extended_payment`.
- `turbo.json` — `EXTENDED_PAYMENT_REMOTE_URL` build env cache key.
- `package.json` — `dev:extended-payment` script.

## APIs used
- None in the current UI phase.
- Planned FB runtime references for the logic phase:
  - `/Volumes/Workspace/smit/adscheck/client-adscheck-v6/smit-connect-lite/src/content-scripts/components/Body.vue` for live payment/account fields loaded inside Facebook.
  - `/Volumes/Workspace/smit/adscheck/client-adscheck-v6/smit-connect-lite/src/content-scripts/components/Convert.vue` for currency display persistence and reload flow.
  - `/Volumes/Workspace/smit/adscheck/client-adscheck-v6/client-adscheck-extended-payment/src/App.vue` for the old settings/preview shape.

## State
- Local Vue refs in `ExtendedPaymentPage.vue`:
  - `settings` for language, bubble display, currency mode, display currency, signature.
  - `selectedFields` for enabled data fields.
  - `orderedFields` for preview/card order.
- Browser `localStorage` keys:
  - `v8.extended-payment.settings`
  - `v8.extended-payment.selected-fields`
  - `v8.extended-payment.field-order`

## Permissions / Flags
- None currently. The route is visible from the shell primary sidebar without role/feature gating.

## Verification
- `pnpm --filter @mf2/extended-payment typecheck`
- `pnpm --filter @mf2/extended-payment build`
- `pnpm --filter @mf2/shell typecheck`
- `pnpm verify:features`
- Manual: run shell + extended-payment dev servers, open `/extended-payment`, verify the sidebar item loads the remote and selected/reordered fields update the preview.

## Related
[[remote-loading-recovery]] [[mf-remote-naming]] [[shadcn-form-components-reuse-and-theme-tokens]]

## Decisions / Gotchas
- The MF container name is `extended_payment` while the folder/URL segment/package uses `extended-payment`, matching the repo's underscore-to-hyphen remote naming rule.
- The UI intentionally follows the v6 `client-adscheck-extended-payment/src/App.vue` structure and scale instead of a generic dashboard layout. Important constants are: header 60px, `body_left` max-width 1300 / padding 30, setting cards height 50, field cards 90px, preview column 395px, preview modal 340px anchored bottom/right.
- Phase 1 intentionally uses sample data in the preview. Live Facebook page injection is not simulated in the dashboard UI because that would hide the integration boundary and produce a misleading pass.
- UI state uses `v8.extended-payment.*` keys so it does not collide with v6 keys such as `SMIT_extended_payment_display` or extension runtime keys used by `smit-connect-lite`.
