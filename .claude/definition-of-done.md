# Definition of Done — AI/agent code tasks

Mục tiêu: một task không được coi là xong chỉ vì “đã sửa code”. Task xong khi code, docs trí nhớ dự án, và verification cùng nhất quán.

Áp dụng cho Hermes, Claude Code, ClaudeKit và mọi agent làm việc trong repo này.

---

## 1. Checklist bắt buộc

Một task được coi là DONE khi:

- [ ] Code/change giải quyết đúng goal đã nhận.
- [ ] Không vi phạm `CLAUDE.md` architecture rules.
- [ ] Nếu đổi logic/files/routes/APIs/flow của feature: đã update `.claude/features/<slug>.md`.
- [ ] Nếu thêm feature chính: đã tạo feature doc từ `.claude/features/_TEMPLATE.md` và thêm row vào `.claude/features/README.md`.
- [ ] Nếu gặp bug/footgun đáng nhớ: đã thêm/update `.claude/lessons/<slug>.md` và index trong `.claude/lessons/README.md`.
- [ ] Nếu thay đổi shared-ui component surface: đã update `.claude/components-catalog.md`.
- [ ] Nếu chạm `packages/shared-*`: thay đổi là additive; nếu không additive thì phải dừng và đề xuất expand → migrate → contract.
- [ ] Không trộn `packages/shared-*` với `apps/*` trong cùng commit/PR trừ khi dev explicitly override.
- [ ] Đã chạy verification phù hợp và lưu kết quả trong final report.

---

## 2. Verification tối thiểu

Luôn chạy:

```bash
pnpm verify:all
```

Sau đó chạy command hẹp nhất chứng minh thay đổi hoạt động:

- Shell:
  ```bash
  pnpm --filter @mf2/shell typecheck
  pnpm --filter @mf2/shell build
  ```
- AdAccounts:
  ```bash
  pnpm --filter @mf2/adaccounts typecheck
  pnpm --filter @mf2/adaccounts build
  ```
- Ads Manager:
  ```bash
  pnpm --filter @mf2/ads-manager typecheck
  pnpm --filter @mf2/ads-manager build
  ```
- Shared UI:
  ```bash
  pnpm --filter @mf2/shared-ui typecheck
  pnpm --filter @mf2/shared-ui test
  pnpm --filter @mf2/shared-ui build
  ```

Nếu package không có một script ở trên, không được giả vờ đã chạy. Ghi rõ script thiếu và chạy alternative gần nhất (`pnpm typecheck`, affected build, hoặc package build thật).

---

## 3. TDD / regression rule

Với bug fix hoặc behavior change:

1. Viết test/probe thể hiện behavior trước khi sửa.
2. Chạy để thấy fail đúng lý do.
3. Sửa nhỏ nhất.
4. Chạy lại để thấy pass.

Nếu khu vực chưa có test runner:
- dùng deterministic probe tạm thời trước khi sửa, ví dụ script kiểm tra export, route record, config, hoặc pure function behavior;
- sau đó chạy typecheck/build/verify docs;
- không biến task nhỏ thành migration test framework nếu không được yêu cầu.

---

## 4. Final report format

Agent phải báo cáo theo format này:

```md
## Summary
- <1-3 bullet về thay đổi chính>

## Files changed
- `<path>` — <vai trò thay đổi>

## Project memory updated
- Feature doc: `<path>` hoặc `n/a — no feature logic/API/route/file change`
- Lesson: `<path>` hoặc `n/a — no memorable footgun`
- Component catalog: `<path>` hoặc `n/a`

## Verification
- `<command>` → pass/fail + tóm tắt output thật
- `<command>` → pass/fail + tóm tắt output thật

## Risks / follow-ups
- <rủi ro còn lại hoặc `none`>
```

Không được ghi “passed” nếu command chưa chạy thật.

---

## 5. Stop conditions

Agent phải dừng và hỏi dev trước khi làm tiếp nếu gặp:

- cần commit/push/merge;
- cần xoá dữ liệu hoặc migration irreversible;
- cần đổi business rule không được mô tả trong task;
- cần breaking change ở `packages/shared-*`;
- cần thay đổi deploy/CI/secrets;
- docs/code mâu thuẫn và scout không đủ xác định nguồn đúng.
