# Cập nhật nút "Đổi tên" TKQC theo spec mới

**Ngày:** 2026-06-17 · **Branch:** feat-dev-bm-features · **Feature:** adaccounts-tool-actions
**Nguồn spec:** `/Users/smit_hai/Desktop/meofb-xmeta/plans/reports/so_sanh_tinh_nang_tkqc.md` (Section 1 — đã đính chính C.1/C.2)

## Scope (đã chốt với Sếp)

Nâng cấp nút Đổi tên TKQC: bộ sinh tên (common + wildcard + sequential dò số) + thêm chế độ Batch `id | tên`. Thao tác thuần TKQC, KHÔNG đụng BM.

| Hạng mục | Quyết định |
|---|---|
| 3 chế độ đặt tên | `random` / `sequential` / **`batch`** (gộp 1 select `mode`) |
| baseName default | Bỏ `'Xmeta'` → **để trống** (tránh lộ brand) |
| Wildcard `*` | `*` trong tên → thay bằng số; không có `*` → nối số ở cuối |
| Random range | Giữ 110599–999999 |
| Sequential | Dò số trống kế tiếp từ list trong app (regex `^<base> (\d+)$`, max+1) + pre-assign theo index → chống trùng khi chạy song song |
| **Batch `id\|tên`** | Textarea mỗi dòng `id \| tên mới`; tra theo `account.id` (khớp cả `act_` lẫn id trần); dòng thiếu tên → row fail. Dùng nguyên tên, KHÔNG nối số |
| Nguồn tên sequential | `accounts` của use-account-list (KHÔNG gọi thêm API) |
| Rename fail (thiếu quyền BM) | **Báo lỗi luôn** vào message (cột reason), KHÔNG self-grant (spec C.1) |

## Out of scope (hoãn — spec C.2 đánh dấu ⏸️)
- **Self-grant** fallback (doc_id 6600383160000030) + fetch `owner_business`.
- **Retry loop 1..3 ở runner**: bỏ self-grant ⇒ retry chỉ còn nghĩa cho token-dead, mà `graph()` ĐÃ tự refresh+retry 1 lần (`fb-graph.ts:43`). Thêm vòng for = trùng logic + tới 6 call/TK khi token chết thật. → Dùng `graph()` sẵn có (Sếp chốt).
- **Đụng settings Luồng/Delay**: giữ nguyên 2/200 dùng chung, user tự chỉnh trên UI (Sếp chốt).

## Thay đổi file (7)

1. **`types/tool-action.types.ts`** — `ToolFieldSchema.showWhen.equals`: `string` → `string | string[]` (field hiện với nhiều mode).

2. **`components/ToolFunctionForm.vue`** — `isVisible()` hỗ trợ `equals` mảng: `Array.isArray(eq) ? eq.includes(cur) : cur === eq`. Generic, áp mọi tool.

3. **`data/mock-tool-groups.ts`** (catalog rename):
   - `mode` select 3 options: `random` (Ngẫu nhiên) / `sequential` (Tuần tự) / `batch` (Danh sách id | tên), default `random`.
   - `newName` text: bỏ `default:'Xmeta'`; `showWhen:{ key:'mode', equals:['random','sequential'] }`; placeholder/hint nhắc wildcard `*`.
   - `startNum` number: giữ `showWhen mode='sequential'`.
   - `batchList` textarea (mới): `showWhen mode='batch'`, placeholder `act_123456 | Tên mới`.

4. **`api/tools/index.ts`** — `ToolRunner` thêm tham số 4 tùy chọn `ctx?: { allAccounts: AdAccount[] }` (rename dùng dò số; tool khác bỏ qua như `index`).

5. **`api/tools/rename-account.ts`** (rewrite logic):
   - `buildName(base, num)`: `*` → `base.replaceAll('*', String(num))`; else `base ? \`${base} ${num}\` : String(num)`.
   - `parseBatch(text)` → `Map<idTrần, tên>` (split `|`, trim, bỏ `act_`).
   - `batch`: tra theo `account.id`; thiếu → fail `'Không có tên trong danh sách'`; có → tên nguyên.
   - `sequential`: `start = max(số trích ctx.allAccounts khớp regex) + 1`, fallback `startNum`; `num = start + index`.
   - `random`: `num = randomNumber()`.
   - Guard: base rỗng & không `*` & không batch → fail `'Chưa nhập tên mới'`.
   - Giữ `patch:{ name }`. KHÔNG retry/self-grant — 1 POST, `graph()` lo token.

6. **`components/ToolPanel.vue`** — lấy `accounts` từ `useAccountList()`; truyền `{ allAccounts: accounts.value }` làm tham số 4 cho runner trong closure `runBatch`. KHÔNG đổi `run-batch.ts`.

7. **`.claude/features/adaccounts-tool-actions.md`** — cập nhật mô tả rename (3 chế độ, wildcard, dò số từ ctx.allAccounts, baseName trống, batch, không self-grant).

## Verify
- `pnpm --filter @mf2/adaccounts typecheck` + `build` xanh.
- `pnpm verify:all` (đụng ranh giới feature).
- `code-reviewer` subagent: không regression open-close (ctx optional → open-close không đổi); contract `patch` không đổi; `showWhen` mảng không vỡ tool khác.
- Logic tay: random / sequential dò-số / batch khớp-id / base rỗng / wildcard giữa tên → tên đúng.

## Ẩn số (không chặn build)
- Mã lỗi Meta khi token POWER_EDITOR hết hạn / thiếu quyền rename: spec gốc cũng không phân loại → giữ hành vi `graph()` + báo message thẳng cho user.
