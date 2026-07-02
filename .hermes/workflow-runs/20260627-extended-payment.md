# Extended Payment workflow run

User request:
- Thêm tính năng "Extended Payment" cho bản v8.
- Thiết kế theo ảnh: /var/folders/6m/n0g6hlt56rvb7p8d3rztkv6w0000gn/T/orca-paste-1782552022673-5e32e57f-2acc-4bd1-9e37-98dcab0b0062.png
- Tham khảo UI/codebase v6: /Volumes/Workspace/smit/adscheck/client-adscheck-v6/client-adscheck-extended-payment
- Tham khảo logic nhúng FB: /Volumes/Workspace/smit/adscheck/client-adscheck-v6/smit-connect-lite
- Thêm 1 app mới và menu item sidebar, path '/extended-payment'
- Chia phase: phase viết giao diện trước, logic hoạt động sau.

Setup checks:
- claude: /usr/local/bin/claude
- claude version: 2.1.159 (Claude Code)
- auth: ANTHROPIC_AUTH_TOKEN, base URL http://100.67.68.69:3333
- tmux: /Users/khoafunnky/.local/bin/tmux
- claudekit binary: not found
- .claude command files: not found; repo has .claude project memory/docs.
- ClaudeKit mode: emulated.

Worktree:
- Path: /Volumes/Workspace/smit/worktree/client/feat-dev-extended-payment
- Branch: smit-khoa/feat-dev-extended-payment
- Base observed: 06fccc6, from main worktree.

Design analysis:
- Image resized/read via sips to /tmp/hermes-extended-payment/design.png; vision analysis succeeded.
- UI is a white SaaS dashboard page with title Extended Payment, left config panel, field selection grid, right extension preview. Accent emerald/mint.

Assumptions:
- This run implements Phase 1 (UI shell/app/menu/route/docs) only; FB runtime injection and live Facebook data logic are deferred to Phase 2.
- Create a new MF remote app `extended_payment` with URL segment/package folder `extended-payment`.
- Avoid packages/shared-* changes; use existing shared-ui primitives and local app code only.
- No commit/push without user approval.

Runtime banner:
Workflow Runtime:
- Claude Code: /usr/local/bin/claude, 2.1.159 (Claude Code)
- ClaudeKit: emulated
- ClaudeKit evidence: no claudekit binary or .claude/commands discovered; workflow phases will be explicitly emulated in Claude prompt
- Worktree: /Volumes/Workspace/smit/worktree/client/feat-dev-extended-payment
- Orca: pending/not launched yet
- Audit log: /Volumes/Workspace/smit/worktree/client/feat-dev-extended-payment/.hermes/workflow-runs/20260627-extended-payment.md


## Claude Code blocker
- Attempted Phase 1 delegation with Claude Code print mode.
- Result: API Error 426 client cli version 2.1.159 < required 2.1.170.
- Recovery: Hermes implements Phase 1 directly and verifies with real commands.

## Runtime dev-server check
- Extended Payment dev server emitted: Project is running at; Rspack compiled successfully in 732 ms.
- Shell dev server start was blocked by port 8301 already in use.

## UI breakage fix
- Reproduced standalone at http://localhost:3012: DOM had text but Tailwind utility styles were not applied.
- Evidence: computed h1 font-size was 16px, main border/padding/radius were 0, CSS bundle lacked utility classes such as text-[24px], rounded-xl, border-[#54d9ae].
- Root cause: new app missed apps/extended-payment/postcss.config.cjs, so postcss-loader did not run @tailwindcss/postcss for the remote.
- Fix: added postcss.config.cjs matching existing remotes.
- Verification after fix: dist CSS contains app utilities; browser computed h1 font-size 24px, main border 1px #54d9ae, padding 32px/36px, grid display=grid; visual screenshot shows card/layout/preview restored.

## UI alignment refactor
- User rejected dashboard-style implementation as not matching the supplied design.
- Re-read v6 client-adscheck-extended-payment/src/App.vue template and SCSS. Key source structure: .header height 60, .body flex, .body_left max-width 1300 width 80 padding 30 overflow, .settings_header_child height 50, .body_main margin-top 47 padding 40 dashed separators, .body_main_option grid repeat(auto-fit,minmax(185px,1fr)) gap 20 with 90px cards, .body_right width 395, .modal width 340 bottom/right, modal header 50, rows 14px.
- Refactored v8 ExtendedPaymentPage/DataFieldCard/PaymentPreview to follow v6 structure/scale instead of the earlier oversized dashboard interpretation.
