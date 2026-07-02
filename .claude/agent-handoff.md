# Agent Handoff — Hermes điều phối Claude Code/ClaudeKit

Mục tiêu: Hermes thay dev giao việc cho Claude Code với đủ ngữ cảnh dự án, để Claude Code không hỏi lại những thứ repo đã trả lời được.

Dùng file này khi Hermes spawn/giao Claude Code cho task UI / feature / bug / refactor.

---

## 1. Nguyên tắc điều phối

Hermes là người điều phối, không phải người chuyển tiếp câu hỏi máy móc.

- Tra repo trước, hỏi dev sau.
- Câu hỏi nào grep/đọc-code/docs trả lời được với độ chắc >=85% thì Hermes tự quyết.
- Chỉ hỏi dev khi quyết định ảnh hưởng business, UX quan trọng, architecture, breaking shared API, data/deploy, hoặc git side effect lớn.
- Nếu Claude Code hỏi câu triển khai nhỏ, Hermes tự trả lời dựa trên `CLAUDE.md`, `.claude/playbook.md`, feature docs, component catalog, lessons và code thật.
- Nếu ngữ cảnh bị thiếu do docs chưa đủ, bổ sung docs sau task để lần sau không thiếu nữa.

---

## 2. Context bắt buộc trước khi giao việc

Trước khi gửi task cho Claude Code, Hermes phải đọc tối thiểu:

1. `CLAUDE.md` — ràng buộc kiến trúc, shared/package rules, remote layer convention.
2. `.claude/playbook.md` — workflow scout-first, ask-second.
3. `.claude/features/README.md` — map task về feature doc.
4. Feature doc liên quan trong `.claude/features/<slug>.md` nếu có.
5. `.claude/lessons/README.md` + lesson liên quan nếu task không tầm thường.
6. `.claude/components-catalog.md` nếu task có UI.
7. `docs/code-standards.md` trước khi viết code.

Nếu không tìm thấy feature doc phù hợp:
- Hermes tự scout code để định vị feature.
- Nếu task tạo/sửa luồng nghiệp vụ chính, yêu cầu Claude Code tạo feature doc mới theo `_TEMPLATE.md`.

---

## 3. Handoff template gửi cho Claude Code

Copy format này vào prompt/task cho Claude Code.

```md
## Goal
<kết quả cần đạt, viết theo hành vi người dùng / bug cần hết / refactor cần xong>

## Project context already checked
- CLAUDE.md: <đã đọc / rule quan trọng>
- Playbook: <đã đọc>
- Feature doc: `.claude/features/<slug>.md` hoặc `not found — scout required`
- Lessons: <lesson liên quan hoặc none>
- Component catalog: <component phải dùng nếu UI hoặc n/a>
- Code standards: `docs/code-standards.md`

## Likely files / entry points
- `<path>` — <vai trò>
- `<path>` — <vai trò>

## Constraints
- Follow remote layer convention: `api/ components/ composables/ pages/ stores/ router/ types/`.
- Components/pages must not call `fetch`/`api_get` directly; use remote `api/` wrappers.
- Reuse `@mf2/shared-ui`; do not hand-roll existing UI components.
- Shared packages are additive only. Do not rename/remove/retype public API.
- Do not mix `packages/shared-*` changes with `apps/*` changes unless explicitly asked; if needed, stop and report split recommendation.
- Code/comments in English; docs may be Vietnamese where existing `.claude` docs are Vietnamese.

## Decisions Hermes already makes
- <file placement / component choice / naming / default behavior>

## Decisions that must be escalated to user
- Business scope/pricing/priority changes.
- Major UX trade-off not implied by current pattern.
- Breaking shared API or shared singleton behavior.
- Data deletion/migration/deploy impact.
- git commit/push/merge.

## Expected implementation workflow
1. Use strict TDD when there is a testable behavior. If no test runner covers this area, create a deterministic probe first, then implement.
2. Implement the smallest surgical change.
3. Update feature doc if logic/files/routes/APIs/flow changed.
4. Add/update lesson if a memorable footgun/root cause was found.
5. Update component catalog if shared-ui component surface changed.
6. Run relevant verification commands.

## Verification commands
- `pnpm verify:all`
- `<app/package-specific typecheck/build/test command>`

## Final report required
- Changed files.
- Behavior changed.
- Docs/lessons updated.
- Verification command output summary.
- Risks / follow-ups.
```

---

## 4. How Hermes handles Claude Code questions

When Claude Code asks a question:

1. Classify it:
   - `implementation-detail`: answer directly.
   - `missing-doc`: scout code, answer, then update docs after task.
   - `product/UX/architecture`: ask dev.
   - `git-side-effect`: ask dev.
2. For implementation-detail, answer with evidence:
   - cite `file:line` or feature doc section when possible.
   - include the decision, not just options.
3. Do not forward low-value questions to dev.

Examples Hermes should answer itself:
- “Where should this composable live?”
- “Should this component use shared-ui Button?”
- “Which route owns this page?”
- “Should component call API directly?”
- “What build command should I run for this app?”

Examples Hermes should ask dev:
- “Should this destructive operation be allowed?”
- “Should we change this business rule?”
- “Should we commit/push/merge now?”
- “Should we break a shared package API?”

---

## 5. Handoff quality bar

A handoff is incomplete if Claude Code must ask for:

- what feature this belongs to,
- where the main files are,
- whether to reuse shared-ui,
- whether to update `.claude/features`,
- what verification command to run,
- whether shared changes can be mixed with app changes.

If any of those questions happen, fix the handoff and/or docs before ending the task.
