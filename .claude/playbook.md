# Playbook — AI tự quyết (đọc khi nhận task UI / feature / bug)

Mục tiêu: AI là TRỢ LÝ tự đề xuất + tự làm, KHÔNG bắt dev mô tả lại hệ thống từng bước. Tra trí nhớ trước, hỏi sau.

5 nguồn trí nhớ/quy trình:
- [components-catalog.md](components-catalog.md) — component dùng lại + cách dùng đúng.
- [features/README.md](features/README.md) — bản đồ tính năng → file/flow/API thật.
- [lessons/README.md](lessons/README.md) — footgun đã vấp.
- [agent-handoff.md](agent-handoff.md) — template Hermes giao việc cho Claude Code/ClaudeKit.
- [definition-of-done.md](definition-of-done.md) — checklist task xong: code + docs + verification.

---

## A) Thêm UI / feature mới

1. Đọc `components-catalog.md` → CHỌN component có sẵn. **Cấm tự viết** nếu đã có.
2. Đọc `features/README.md` → mở feature gần giống đã làm → copy pattern (layer convention, cách đặt file).
3. Liếc `lessons/` → tránh footgun liên quan.
4. **ĐỀ XUẤT phương án** (component nào, file đặt đâu theo layer `api/ components/ composables/ pages/ stores/ router/ types/`) — không hỏi dev thứ tự mình tra được.
5. Làm → update feature doc; nếu thêm component vào shared-ui → update catalog (nếu không, `verify:catalog` fail).
6. Trước khi kết thúc, đối chiếu [definition-of-done.md](definition-of-done.md) và báo verification thật.

## A2) Giao việc cho Claude Code/ClaudeKit

1. Đọc [agent-handoff.md](agent-handoff.md).
2. Tạo brief có Goal / Project context checked / Likely files / Constraints / Decisions Hermes tự quyết / Decisions cần escalate / Verification.
3. Nếu Claude Code hỏi câu implementation-detail mà docs/code trả lời được → Hermes tự trả lời, không chuyển cho dev.
4. Nếu Claude Code phát hiện docs thiếu → yêu cầu bổ sung feature doc/lesson trong cùng task.
5. Git commit/push/merge luôn hỏi dev trước.

## B) Bug / case khách / lỗi UI-tính năng

1. Map triệu chứng → `features/README.md` tìm feature liên quan → mở doc lấy `## Files` + `## Flow` + `## APIs`.
2. Check `lessons/` xem đã gặp dạng này chưa.
3. Tự suy root cause từ Flow trong doc — KHÔNG bắt dev mô tả lại hệ thống.
4. Đề xuất fix + blast radius (doc đã liệt kê file liên quan).
5. Sau khi fix: footgun đáng nhớ → ghi `lessons/<slug>.md` (bắt buộc); đổi logic/route/API → update feature doc.

## C) Task trên feature có sẵn

1. Mở thẳng feature doc tương ứng (đã có Files/Flow/APIs) → đủ context, không cần dev brief lại.
2. Thêm code theo layer convention của remote (xem CLAUDE.md "Remote layer convention").
3. Update doc sau khi xong.

---

## Nguyên tắc tự quyết (scout-first, ask-second)

- Việc gì grep/đọc-code trả lời được với độ chắc ≥85% → **tự quyết + tự làm**, nêu rõ "đã verify ở `file:line`".
- Khi điều phối Claude Code, Hermes tự trả lời câu hỏi triển khai nhỏ dựa trên repo docs/code; chỉ chuyển câu hỏi lên dev nếu thuộc nhóm escalate.
- CHỈ hỏi dev khi: quyết định kinh doanh (giá, phạm vi, ưu tiên), đánh đổi UX quan trọng, thao tác khó đảo ngược (xoá data, breaking change, ảnh hưởng deploy), git commit/push/merge, hoặc thật sự thiếu dữ liệu / có mâu thuẫn nguồn chưa giải được.
- KHÔNG hỏi thứ grep trả lời được trong 5 giây.
- Task chưa DONE nếu chưa đối chiếu [definition-of-done.md](definition-of-done.md).

## Ràng buộc luôn nhớ (chi tiết ở CLAUDE.md — không lặp ở đây)

Shared `packages/*` chỉ ADDITIVE · PR-split shared vs apps · component/page không gọi `fetch`/`api_get` trực tiếp (qua `api/` layer) · code/comment tiếng Anh, không nhắc số phase/plan trong code.
