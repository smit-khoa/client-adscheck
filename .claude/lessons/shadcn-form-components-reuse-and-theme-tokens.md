---
slug: shadcn-form-components-reuse-and-theme-tokens
scope: ui
status: active
---

## Symptom
Khi dựng form/UI trong một remote (`apps/<remote>`), dễ hand-roll native `<input>/<select>/<textarea>/<button>` + Tailwind thuần thay vì dùng `@mf2/shared-ui`. Hai dấu hiệu vấp:
1. Code review báo "tại sao không dùng component có sẵn?" — vi phạm rule reuse shared-ui.
2. Nếu thử dùng shadcn-vue (`Input/Select/Switch/...`) trong remote mà **chạy standalone** (vd adaccounts :3010), component **mất màu / trông nhạt** (border/nền/text không lên đúng).

## Root cause
- **Vì sao hay hand-roll:** khung UI cũ trong remote (vd `tool-actions`) viết bằng native + Tailwind hardcode (`white/10`, `emerald-500`). Agent "bám theo style xung quanh" nên chép tiếp native → bỏ qua shared-ui. Đây là cái bẫy neo theo code hiện có, mạnh hơn cả rule text trong CLAUDE.md.
- **Vì sao shadcn mất màu standalone:** component shadcn-vue tiêu thụ CSS theme token (`--input`, `--foreground`, `--primary`, `--ring`, `--border`, `--muted-foreground`, `--accent`...). Các token này CHỈ được định nghĩa trong `apps/shell/src/styles.css`. Remote khi nạp trong shell thì thừa hưởng token; nhưng khi chạy **standalone** thì remote `styles.css` KHÔNG có token → shadcn render trống màu. Đây là lý do ẩn khiến khung cũ né shadcn và xài native.

## How to avoid
1. **Mặc định reuse `@mf2/shared-ui`** cho mọi input/form/button: `Input, Textarea, Select(+SelectTrigger/Content/Item/Value), Switch, Label, Button`. KHÔNG hand-roll native chỉ vì code cũ xung quanh dùng native.
2. **Trước khi dùng shadcn trong một remote, kiểm tra remote đó đã có theme-token block chưa:** grep `--input` / `@theme inline` trong `apps/<remote>/src/styles.css`. Nếu CHƯA có → copy nguyên block `:root{...}` + `@theme inline{...}` từ `apps/shell/src/styles.css` sang (đã làm cho `apps/adaccounts/src/styles.css`).
3. Token giữa các app phải **đồng bộ** với shell. Nếu sửa palette ở shell, sửa luôn ở remote (hoặc tách block ra `packages/shared-ui` cho 2 app `@import` — cần PR shared riêng theo rule isolation).
4. Style riêng vẫn được, nhưng đặt qua prop `class` của component shared-ui (chúng dùng `cn()` merge), đừng thay bằng native element.

## Related
[[adaccounts-tool-actions]] [[shared-ui-subpath-injection-key]] [[tw-animate-css-missing-dead-overlay-animations]]
