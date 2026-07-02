# Lessons — bài học đã vấp (đọc TRƯỚC khi sửa, ghi SAU khi vấp)

Kho bài học DÙNG CHUNG cho mọi agent/phiên (không riêng code-reviewer). Mục đích: gặp lại vấn đề tương tự thì KHÔNG tái phạm.

## Index

| Lesson | Scope | Hook | Doc |
|--------|-------|------|-----|
| Facebook session cache account switch | state | Probe live FB session before cache hydration; token memory can return old `user_id` after account switch | [facebook-session-cache-account-switch](facebook-session-cache-account-switch.md) |
| Shell placeholder masks remote | mf | Shell placeholder route must not hide `/app/<remote>` router-view | [shell-placeholder-masks-remote](shell-placeholder-masks-remote.md) |
| MF remote naming | mf | 4 định danh remote phải khớp + footgun gạch dưới/ngang + stale build cache | [mf-remote-naming](mf-remote-naming.md) |
| MF2 build/deploy coupling | build/deploy | `pnpm build` không được tự gom mọi app vào một deploy tree | [mf2-build-deploy-coupling](mf2-build-deploy-coupling.md) |
| Data-grid mutate props.columns | ui | Mutate `props.columns[i].frozen` (literal, không reactive) → cột frozen biến mất | [data-grid-mutate-props-columns](data-grid-mutate-props-columns.md) |
| Shared-ui subpath injection key | mf | `Symbol()` trong subpath không-singleton → InjectionKey khác nhau giữa shell và remote → mọi Icon biến mất | [shared-ui-subpath-injection-key](shared-ui-subpath-injection-key.md) |
| Missing tw-animate-css | ui | Tailwind v4 không có shadcn animation utilities nếu chưa cài/import `tw-animate-css` → overlay bật/tắt tức thì | [tw-animate-css-missing-dead-overlay-animations](tw-animate-css-missing-dead-overlay-animations.md) |
| shadcn form reuse + theme tokens | ui | Reuse `@mf2/shared-ui` form components (đừng hand-roll native); shadcn mất màu standalone nếu remote thiếu theme-token block trong `styles.css` | [shadcn-form-components-reuse-and-theme-tokens](shadcn-form-components-reuse-and-theme-tokens.md) |
| vue-sonner toast cần MF singleton | mf | `Toaster`+`toast()` chạy standalone OK nhưng qua shell 0 toast item — vue-sonner giữ queue trong module state, chưa khai báo MF singleton nên 2 emitter khác nhau; thêm `vue-sonner` vào `shared` singleton ở shell + remotes | [vue-sonner-toast-needs-mf-singleton](vue-sonner-toast-needs-mf-singleton.md) |
| Rspack native CSS order + MF splitChunks | build | Native CSS không dùng `CssExtractRspackPlugin.ignoreOrder`; root shared-ui barrel có thể kéo CSS không liên quan; splitChunks chỉ nhắm non-singleton deps | [rspack-native-css-order-and-mf-split-chunks](rspack-native-css-order-and-mf-split-chunks.md) |
| Google Sans Flex font loading | ui | Font asset/CSS trong shared-ui chưa đủ; app root CSS phải import exported font CSS; tránh Tailwind `--font-sans`/inline body override; dist phải có @font-face + .woff2 | [google-sans-flex-font-loading](google-sans-flex-font-loading.md) |
| New remote missing PostCSS Tailwind | ui | Remote mới thiếu `postcss.config.cjs` vẫn build pass nhưng Tailwind utilities không generate → UI wireframe/raw | [new-remote-missing-postcss-tailwind](new-remote-missing-postcss-tailwind.md) |

## Update discipline (MANDATORY)

Sau khi chẩn đoán 1 bug/footgun ĐÁNG NHỚ (mất thời gian, dễ tái phạm) → tạo `<slug>.md` từ `_TEMPLATE.md` + thêm 1 row vào bảng trên. Bắt buộc như feature-doc (xem CLAUDE.md "AI memory").

Rules:
- 1 file/lesson. Frontmatter + sections theo `_TEMPLATE.md` (Symptom / Root cause / How to avoid / Related).
- Check trùng trước khi tạo — cập nhật lesson cũ thay vì tạo bản sao.
- Lesson lưu tri thức KHÔNG suy ra được từ code (cơ chế, race, footgun, quyết định). Đừng chép lại code.
- Link feature/lesson liên quan bằng `[[slug]]`.
