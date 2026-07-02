# Component Catalog — shared-ui (đọc TRƯỚC khi code UI)

**Mục đích:** AI tra file này TRƯỚC khi viết bất kỳ UI nào. Quy tắc:

- **CẤM tự viết** `<button>`, modal, dropdown, table... bằng tay nếu đã có component ở đây.
- Import ưu tiên theo narrow entrypoint để tránh kéo dư bundle: `@mf2/shared-ui/icons`, `/table`, `/sonner`, `/form-controls`, `/card`, `/core`, `/remote`. Root `@mf2/shared-ui` chỉ dùng cho showcase/demo hoặc khi cố ý render nhiều nhóm component.
- Component theo chuẩn **shadcn-vue (reka-ui)** — đa số là **compound** (cha + nhiều part). Dùng đủ part, đừng tự ghép.
- Props/variants chi tiết là source-of-truth trong code + `vue-tsc` strict bắt sai. File này chỉ nêu **trục chính + khi nào dùng + anti-pattern** (không copy full props → tránh drift).
- Mỗi nhóm = 1 heading `### <ComponentChính>`. Script `verify:catalog` đảm bảo không nhóm nào bị bỏ sót.

---

## Form & Input

- **Import path:** dùng `@mf2/shared-ui/form-controls` cho form/control primitives trong app code (Input, Label, Button, Select, Checkbox, Switch, Textarea, Form*).

### Button
- **Khi nào dùng:** mọi nút bấm. KHÔNG tự viết `<button class="...">`.
- **Variants:** `variant` = default | destructive | outline | secondary | ghost | link. `default` là nút gradient xanh pill theo CTA style chung; `size` = default | sm | lg | icon | icon-sm | icon-lg.
- **Ví dụ:** `<Button variant="destructive" size="sm" @click="remove">Xoá</Button>`
- **Anti-pattern:** tự style button thuần; tự tô màu destructive bằng class thay vì `variant`.

### Input
- **Khi nào dùng:** ô nhập 1 dòng. Hỗ trợ `v-model`, 3 kiểu `type`: `text` (mặc định), `number`, `currency`.
- **Style:** hình viên thuốc (`rounded-[12999px]`), nền xám nhạt `rgba(0,0,0,0.05)`, padding `10px 12px`.
- **Currency:** `type="currency"` chỉ cho nhập số, tự format theo locale Việt Nam (VD: `12000` → `12.000 VND`). Mã tiền mặc định `VND`, có thể đổi qua prop `currency`. Khi chưa có giá trị hiển thị placeholder là mã tiền.
- **Ví dụ:**
  ```vue
  <Input v-model="keyword" placeholder="Tìm..." />
  <Input v-model="limit" type="currency" />
  <Input v-model="rate" type="currency" currency="USD" />
  ```
- **Anti-pattern:** dùng `<input>` thuần (mất style + focus ring chuẩn); tự ghép input + suffix tiền tệ.

### DateRangePicker
- **Khi nào dùng:** chọn khoảng ngày từ toolbar/filter. Import ưu tiên `@mf2/shared-ui/date-range-picker`; Table toolbar dùng component này khi `tools:['time']`.
- **API chính:** `v-model` nhận `{ start: Date | null, end: Date | null }`, emit `apply` với `{ value, preset }`, emit `cancel`; preset built-in gồm `Lifetime`, `Today`, `Yesterday`, `Last 7 days`, `Last 30 days`, `This month`, `Last month`, `Custom Range`.
- **Style:** trigger tái dùng `Button variant="secondary" size="icon"` + `.data-grid-toolbar-icon-button` để đồng bộ các icon toolbar. Popover compact theo hệ green/mint: panel `#F8FFFA`, border `#BFD8CC`, preset active gradient xanh, range background mint, endpoint xanh `#3C9944`, font-weight nhẹ (`500/600`) và width gọn khoảng `700px`.
- **Ví dụ:** `<DateRangePicker v-model="range" @apply="reload" />`
- **Anti-pattern:** tự dựng calendar/dropdown bằng `v-if` + click-outside; dùng string ISO timezone-sensitive cho hiển thị ngày local; phóng to trigger/panel lệch pattern toolbar hiện tại.

### Textarea
- **Khi nào dùng:** nhập nhiều dòng. `v-model`, tự giãn theo nội dung (field-sizing).
- **Ví dụ:** `<Textarea v-model="note" />`

### Label
- **Khi nào dùng:** nhãn cho input/checkbox. Gắn `for` để click-to-focus.
- **Ví dụ:** `<Label for="email">Email</Label>`

### Checkbox
- **Khi nào dùng:** chọn boolean. `v-model` (reka-ui CheckboxRoot props).
- **Style:** checked dùng nền xanh gradient `linear-gradient(270deg, #73C258 0%, #3C9944 100%)` với fallback `#4DFF7F`, bỏ hẳn viền (`border-0`) và shadow (`shadow-none`) để không lộ viền hai bên, dấu check trắng; unchecked/default dùng viền nhạt `#BFC5C2`, kích thước mặc định `size-4` để không lệch layout bảng.
- **Ví dụ:** `<Checkbox v-model="agree" />`

### Switch
- **Khi nào dùng:** bật/tắt tức thì (toggle). Khác Checkbox về ngữ nghĩa (áp dụng ngay, không cần submit).
- **Ví dụ:** `<Switch v-model="enabled" />`

### RadioGroup
- **Khi nào dùng:** chọn 1 trong nhiều. Compound: `RadioGroup` + `RadioGroupItem`.
- **Ví dụ:** `<RadioGroup v-model="mode"><RadioGroupItem value="basic" /></RadioGroup>`

### Select
- **Khi nào dùng:** dropdown chọn 1 giá trị. Compound: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectGroup`, `SelectLabel`, `SelectItem`, `SelectItemText`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`.
- **Style:** content/item dùng cùng soft green/gray palette với `DropdownMenu` (`#F3F7F5` surface, `#5E6360` text, `#D8E9E1` focus/hover, `#BFD8CC` border), content radius 12px, item radius 8px.
- **Ví dụ:**
  ```vue
  <Select v-model="v">
    <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
    <SelectContent><SelectItem value="a">A</SelectItem></SelectContent>
  </Select>
  ```
- **Anti-pattern:** dùng `<select>` thuần; quên `SelectValue` trong trigger.

### FormControl
- **Khi nào dùng:** wiring form validation (compound: `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`). Dùng khi cần hiển thị lỗi field theo chuẩn.
- **Anti-pattern:** tự viết logic hiển thị error message rời rạc.

## Overlay & Menu

### Dialog
- **Khi nào dùng:** modal trung tâm. Compound: `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`, `DialogOverlay`, `DialogScrollContent` (content dài cuộn được).
- **Animation:** `DialogContent` dùng spring/bounce nhẹ khi mở (~400ms) và fade+scale nhanh khi đóng (~150ms); overlay fade + blur nhẹ. CSS có `prefers-reduced-motion` fallback chỉ fade.
- **Ví dụ:**
  ```vue
  <Dialog><DialogTrigger>Mở</DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>Tiêu đề</DialogTitle></DialogHeader></DialogContent>
  </Dialog>
  ```
- **Anti-pattern:** tự dựng overlay + fixed div làm modal.

### Drawer
- **Khi nào dùng:** panel trượt từ cạnh (mobile-friendly). Compound tương tự Dialog: `Drawer`, `DrawerTrigger`, `DrawerContent`, `DrawerHeader`, `DrawerTitle`, `DrawerDescription`, `DrawerFooter`, `DrawerClose`, `DrawerOverlay`.
- **Anti-pattern:** dùng Dialog cho UX trượt cạnh.

### DropdownMenu
- **Khi nào dùng:** menu hành động ngữ cảnh (...). Compound nhiều part: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuGroup`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`.
- **Style:** shared soft green/gray palette (`#F3F7F5` surface, `#5E6360` text, `#D8E9E1` focus/hover, `#BFD8CC` border), menu radius 12px, item radius 8px.
- **Anti-pattern:** tự code popup menu bằng v-if + click-outside.

### Popover
- **Khi nào dùng:** nội dung nổi không phải menu (filter panel, picker). Compound: `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor`.

### Tooltip
- **Khi nào dùng:** gợi ý ngắn khi hover. Compound: `TooltipProvider` (bọc 1 lần ở gốc), `Tooltip`, `TooltipTrigger`, `TooltipContent`.
- **Anti-pattern:** dùng `title=""` HTML cho tooltip có style.

## Data & Display

### Table
- **Khi nào dùng:** lưới dữ liệu — đây là **DataGrid mạnh** của repo (sort, filter, resize, range-copy, pivot, paging, frozen cols, color highlight, export .txt/.csv/.xlsx qua `tools:['download']`). KHÔNG tự viết `<table>` cho dữ liệu nghiệp vụ.
- **Trục chính:** props `data*`, `columns*` (bắt buộc), + nhiều cờ bật/tắt tính năng (`showToolbar`, `showSorting`, `showCheckbox`, `enableRangeSelect`, `paging`, `pivotMode`...). Nhiều events (`row-select`, `sort-change`, `change-paging`...). Footer paging dùng Select `Hiển thị` với option 15/25/50/100/200/500/max, cụm prev/next dạng pill và tổng `selected / total` theo table_info. Xem doc: [shared-ui-data-grid-table](features/shared-ui-data-grid-table.md).
- **Toolbar icon buttons:** toolbar actions bên trong Table dùng shared `Button` primitive `variant="secondary" size="icon"` + class `.data-grid-toolbar-icon-button`: 36px, nền trắng, `rounded-full`, icon tối, shadow xanh rất nhẹ, không viền rõ, có hover/focus ring. Chỉ dùng cho icon trigger trong toolbar; không áp vào button full-width/dialog như download/save. Export/download popover vẫn dùng `Popover` primitive nhưng style cục bộ trong `ExportMenu.vue` (`.data-grid-export-menu`) để khớp palette dropdown header: surface `#F3F7F5`, border `#BFD8CC`, text `#5E6360`, radius 12px, shadow mềm; radio option là row hover/selected xanh nhạt và CTA giữ shared primary `Button`.
- **Anti-pattern:** tự dựng table HTML rồi tự code sort/filter (đã có sẵn).

### Pagination
- **Khi nào dùng:** điều hướng trang. Compound: `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationFirst`, `PaginationPrevious`, `PaginationNext`, `PaginationLast`, `PaginationEllipsis`. (Table đã có paging riêng — dùng cái này cho list ngoài Table.)

### Tabs
- **Khi nào dùng:** chuyển panel cùng cấp. Compound: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.
- **Ví dụ:** `<Tabs v-model="tab"><TabsList><TabsTrigger value="a">A</TabsTrigger></TabsList><TabsContent value="a">...</TabsContent></Tabs>`

### Card
- **Khi nào dùng:** khối nội dung có khung. Compound: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`.
- **Anti-pattern:** tự bo viền + shadow bằng class lặp lại.

### Badge
- **Khi nào dùng:** nhãn trạng thái nhỏ. `variant` = default | secondary | destructive | outline.
- **Ví dụ:** `<Badge variant="destructive">Lỗi</Badge>`

### Avatar
- **Khi nào dùng:** ảnh đại diện có fallback. Compound: `Avatar`, `AvatarImage`, `AvatarFallback`.

### Separator
- **Khi nào dùng:** đường kẻ phân cách (ngang/dọc). `<Separator />`.

### Skeleton
- **Khi nào dùng:** placeholder loading. `<Skeleton class="h-4 w-32" />`. KHÔNG tự làm div xám nhấp nháy.

## Layout & Feedback

### ResizablePanelGroup
- **Khi nào dùng:** chia panel kéo giãn được. Compound: `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle`.

### WorkspacePathFrame
- **Khi nào dùng:** khung workspace dạng SVG path có tab rail + toolbar + vùng main + 2 function panel kéo giãn. Hai function panel có sẵn surface gradient bo 16px giống vùng content chính. Dùng cho remote/app cần giữ tab/business state bên ngoài nhưng muốn tái dùng frame visual chung.
- **Import path:** `import { WorkspacePathFrame } from '@mf2/shared-ui/workspace-path-frame'`.
- **Slots:** `tabs`, `toolbar`, `main`, `panel-one`, `panel-two`. Caller tự render `Tabs`/`TabsList`/`TabsTrigger` và nội dung nghiệp vụ.
- **Yêu cầu đo tab:** trigger trong slot `tabs` phải có `data-tab-value="<value>"` trùng `activeTab`; wrapper list nên có `data-tabs-list` để frame đo rail width chính xác.
- **Anti-pattern:** để component shared biết label TKQC/BM/Page/Pixel, gọi API, hoặc sở hữu active-tab store; những phần đó thuộc app adapter.


### Toaster
- **Khi nào dùng:** thông báo toast (vue-sonner). Đặt `<Toaster />` 1 lần ở gốc app; gọi `toast()` để bắn. Import app code qua `@mf2/shared-ui/sonner` để không kéo root barrel. (Root export vẫn giữ để tương thích.)
- **Anti-pattern:** tự dựng toast container.

## Remote / App-shell (root components)

### RemoteErrorBoundary
- **Khi nào dùng:** bọc remote MF để bắt lỗi JS + cho retry. Host (shell) dùng qua `RemoteHost`. Xem [remote-loading-recovery](features/remote-loading-recovery.md).

### RemoteLoadingFallback
- **Khi nào dùng:** fallback Suspense khi remote đang tải. Đi kèm RemoteErrorBoundary.

### SmitLogo
- **Khi nào dùng:** logo SMIT chuẩn. KHÔNG nhúng SVG logo rời.

### SmitLoading
- **Khi nào dùng:** spinner loading thương hiệu (full-screen/section).

---

## Icon (không phải component default — lưu ý)

Icon dùng qua `import { Icon } from '@mf2/shared-ui/icons'` + `<Icon name="search" />` (90 icon sprite). Tên hợp lệ kiểm bằng type `IconName` / `ICON_NAMES`. Bọc app bằng `SpriteProvider` 1 lần ở gốc. KHÔNG import lucide rời.
