<script setup lang="ts">
// Showcase page: renders every shared shadcn-vue component group so the design
// system can be eyeballed in one place. Standalone-only demo (imported by App.vue).
import { ref, computed } from 'vue';
import {
  // Layout / display
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction,
  Badge, Separator, Skeleton,
  Avatar, AvatarImage, AvatarFallback,
  // Actions
  Button,
  // Form controls
  Input, Textarea, Label, Checkbox, Switch,
  RadioGroup, RadioGroupItem,
  Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem,
  // Overlays
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
  Popover, PopoverTrigger, PopoverContent,
  Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose,
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuItem, DropdownMenuCheckboxItem,
  // Navigation / data
  Tabs, TabsList, TabsTrigger, TabsContent,
  // ui/table now ships the data-grid Table (virtualization, frozen cols, resize,
  // custom-column, sort, pagination, row-select, totals). Demo'd below.
  Table,
  Pagination, PaginationContent, PaginationFirst, PaginationPrevious,
  PaginationItem, PaginationEllipsis, PaginationNext, PaginationLast,
  // Feedback
  Toaster, toast,
  // Icons
  Icon, ICON_NAMES,
} from '@mf2/shared-ui';

// --- reactive state for interactive demos ---
const inputValue = ref('Xin chào SMIT');
const textareaValue = ref('');
const checkbox1 = ref(true);
const switch1 = ref(false);
const radioValue = ref('comfortable');
const selectValue = ref('');
const dropdownChecked = ref(true);
const currentPage = ref(1);

const buttonVariants = ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] as const;
const buttonSizes = ['sm', 'default', 'lg'] as const;
const badgeVariants = ['default', 'secondary', 'destructive', 'outline'] as const;

// --- Data-grid (ui/table) demo -------------------------------------------------
// Stress test: 10,000 rows × 100 columns to exercise row + column virtualization.
// Column defs: width required; `frozen` pins to the left, `position` aligns content.
const FIXED_COLUMNS = [
  { field: 'id', name: 'Mã', width: 90, frozen: true },
  { field: 'name', name: 'Tên chiến dịch', width: 220, frozen: true },
  { field: 'status', name: 'Trạng thái', width: 130, position: 'center' as const },
  { field: 'platform', name: 'Nền tảng', width: 140 },
  { field: 'manager', name: 'Phụ trách', width: 160 },
  { field: 'budget', name: 'Ngân sách', width: 150, position: 'right' as const },
  { field: 'spent', name: 'Đã chi', width: 150, position: 'right' as const },
];

// 93 generated metric columns -> 100 columns total.
const METRIC_COUNT = 100 - FIXED_COLUMNS.length;
const metricColumns = Array.from({ length: METRIC_COUNT }, (_, i) => ({
  field: `metric_${i + 1}`,
  name: `Chỉ số ${i + 1}`,
  width: 120,
  position: 'right' as const,
}));
const gridColumns = [...FIXED_COLUMNS, ...metricColumns];

const statusPool = ['Đang chạy', 'Tạm dừng', 'Hoàn thành', 'Nháp'];
const platformPool = ['Facebook', 'Google', 'TikTok', 'Zalo'];
const managerPool = ['Lê An', 'Trần Bình', 'Nguyễn Cường', 'Phạm Dung', 'Vũ Em'];

// 10,000 rows. Built once (not reactive) — heavy fixture for virtualization stress test.
const gridData = Array.from({ length: 10_000 }, (_, i) => {
  const budget = (50 + (i % 20) * 10) * 1_000_000;
  const row: { id: string; [key: string]: any } = {
    id: `CMP-${String(i + 1).padStart(5, '0')}`,
    name: `Chiến dịch quảng cáo #${i + 1}`,
    status: statusPool[i % statusPool.length],
    platform: platformPool[i % platformPool.length],
    manager: managerPool[i % managerPool.length],
    budget,
    spent: Math.round(budget * (0.3 + (i % 7) / 10)),
  };
  for (let m = 1; m <= METRIC_COUNT; m++) {
    row[`metric_${m}`] = (i * 7 + m * 13) % 100000;
  }
  return row;
});

// Row selection: Table mutates this object's `selected` array by reference.
const gridChecked = ref<{ selected: string[]; is_select_all: boolean }>({
  selected: [],
  is_select_all: false,
});

// Pagination state (client-side slice for the demo).
const gridPaging = ref({ page: 1, limit: 25, total: gridData.length, has_next_page: gridData.length > 25 });
const gridLoading = ref(false);

const gridPageData = computed(() => {
  const start = (gridPaging.value.page - 1) * gridPaging.value.limit;
  return gridData.slice(start, start + gridPaging.value.limit);
});

function onGridChangePaging(e: { page: number; limit: number }) {
  gridPaging.value.page = e.page;
  gridPaging.value.limit = e.limit;
  gridPaging.value.has_next_page = e.page * e.limit < gridData.length;
}

function onGridRefresh() {
  gridLoading.value = true;
  setTimeout(() => (gridLoading.value = false), 800);
}

const vndFormatter = new Intl.NumberFormat('vi-VN');
const fmtVnd = (n: number) => `${vndFormatter.format(n)}đ`;
</script>

<template>
  <div class="min-h-screen bg-background p-6 text-foreground md:p-10">
    <!-- Toaster mount point (renders fixed-position toasts) -->
    <Toaster rich-colors position="top-right" />

    <header class="mx-auto mb-10 max-w-5xl">
      <h1 class="text-3xl font-bold">Shared UI — Component Showcase</h1>
      <p class="mt-1 text-muted-foreground">
        Toàn bộ component dùng chung (shadcn-vue / reka-ui) trong <code>@mf2/shared-ui</code>.
      </p>
    </header>

    <div class="mx-auto flex max-w-5xl flex-col gap-10">
      <!-- ============ BUTTON ============ -->
      <section>
        <h2 class="mb-3 text-xl font-semibold">Button</h2>
        <div class="flex flex-wrap items-center gap-3">
          <Button v-for="v in buttonVariants" :key="v" :variant="v">{{ v }}</Button>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <Button v-for="s in buttonSizes" :key="s" :size="s">size: {{ s }}</Button>
          <Button size="icon"><Icon name="plus" :size="16" /></Button>
          <Button disabled>disabled</Button>
          <Button><Icon name="download" :size="16" /> Có icon</Button>
        </div>
      </section>

      <!-- ============ BADGE ============ -->
      <section>
        <h2 class="mb-3 text-xl font-semibold">Badge</h2>
        <div class="flex flex-wrap items-center gap-3">
          <Badge v-for="v in badgeVariants" :key="v" :variant="v">{{ v }}</Badge>
          <Badge><Icon name="check" :size="12" /> Có icon</Badge>
        </div>
      </section>

      <!-- ============ CARD ============ -->
      <section>
        <h2 class="mb-3 text-xl font-semibold">Card</h2>
        <Card class="max-w-sm">
          <CardHeader>
            <CardTitle>Tổng chi tiêu</CardTitle>
            <CardDescription>30 ngày gần nhất</CardDescription>
            <CardAction>
              <Button variant="ghost" size="icon-sm"><Icon name="more-horizontal" :size="16" /></Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p class="text-3xl font-bold">245.000.000đ</p>
            <p class="text-sm text-muted-foreground">+12% so với kỳ trước</p>
          </CardContent>
          <CardFooter>
            <Button class="w-full">Xem chi tiết</Button>
          </CardFooter>
        </Card>
      </section>

      <!-- ============ INPUT / TEXTAREA / LABEL ============ -->
      <section>
        <h2 class="mb-3 text-xl font-semibold">Input / Textarea / Label</h2>
        <div class="grid max-w-md gap-4">
          <div class="grid gap-2">
            <Label for="demo-input">Tên chiến dịch</Label>
            <Input id="demo-input" v-model="inputValue" placeholder="Nhập tên..." />
            <p class="text-sm text-muted-foreground">Giá trị: {{ inputValue }}</p>
          </div>
          <div class="grid gap-2">
            <Label for="demo-input-disabled">Disabled</Label>
            <Input id="demo-input-disabled" disabled placeholder="Không sửa được" />
          </div>
          <div class="grid gap-2">
            <Label for="demo-textarea">Ghi chú</Label>
            <Textarea id="demo-textarea" v-model="textareaValue" placeholder="Nhập ghi chú..." />
          </div>
        </div>
      </section>

      <!-- ============ CHECKBOX / SWITCH / RADIO ============ -->
      <section>
        <h2 class="mb-3 text-xl font-semibold">Checkbox / Switch / Radio Group</h2>
        <div class="flex flex-col gap-6 md:flex-row md:gap-12">
          <div class="flex items-center gap-2">
            <Checkbox id="demo-cb" v-model="checkbox1" />
            <Label for="demo-cb">Đồng ý điều khoản ({{ checkbox1 ? 'on' : 'off' }})</Label>
          </div>
          <div class="flex items-center gap-2">
            <Switch id="demo-sw" v-model="switch1" />
            <Label for="demo-sw">Bật tự động ({{ switch1 ? 'on' : 'off' }})</Label>
          </div>
          <RadioGroup v-model="radioValue">
            <div class="flex items-center gap-2">
              <RadioGroupItem id="r1" value="default" />
              <Label for="r1">Mặc định</Label>
            </div>
            <div class="flex items-center gap-2">
              <RadioGroupItem id="r2" value="comfortable" />
              <Label for="r2">Thoải mái</Label>
            </div>
            <div class="flex items-center gap-2">
              <RadioGroupItem id="r3" value="compact" />
              <Label for="r3">Gọn</Label>
            </div>
          </RadioGroup>
        </div>
      </section>

      <!-- ============ SELECT ============ -->
      <section>
        <h2 class="mb-3 text-xl font-semibold">Select</h2>
        <Select v-model="selectValue">
          <SelectTrigger class="w-[240px]">
            <SelectValue placeholder="Chọn nền tảng" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Nền tảng quảng cáo</SelectLabel>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="google">Google Ads</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="zalo">Zalo</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <p class="mt-2 text-sm text-muted-foreground">Đã chọn: {{ selectValue || '(chưa chọn)' }}</p>
      </section>

      <!-- ============ OVERLAYS: Dialog / Popover / Tooltip / Dropdown ============ -->
      <section>
        <h2 class="mb-3 text-xl font-semibold">Dialog / Popover / Tooltip / Dropdown Menu</h2>
        <div class="flex flex-wrap items-center gap-3">
          <!-- Dialog -->
          <Dialog>
            <DialogTrigger as-child>
              <Button variant="outline">Mở Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Xác nhận xoá chiến dịch</DialogTitle>
                <DialogDescription>
                  Hành động này không thể hoàn tác. Chiến dịch sẽ bị xoá vĩnh viễn.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose as-child><Button variant="outline">Huỷ</Button></DialogClose>
                <DialogClose as-child><Button variant="destructive">Xoá</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <!-- Popover -->
          <Popover>
            <PopoverTrigger as-child>
              <Button variant="outline">Mở Popover</Button>
            </PopoverTrigger>
            <PopoverContent class="w-64">
              <p class="text-sm font-medium">Bộ lọc nhanh</p>
              <p class="mt-1 text-sm text-muted-foreground">Nội dung tuỳ ý đặt trong popover.</p>
            </PopoverContent>
          </Popover>

          <!-- Tooltip -->
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <Button variant="outline">Hover xem Tooltip</Button>
              </TooltipTrigger>
              <TooltipContent>Đây là tooltip</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <!-- Dropdown Menu -->
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="outline">Mở Dropdown</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem><Icon name="user" :size="16" /> Hồ sơ</DropdownMenuItem>
              <DropdownMenuItem><Icon name="settings" :size="16" /> Cài đặt</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem v-model:checked="dropdownChecked">
                Hiện thông báo
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      <!-- ============ DRAWER ============ -->
      <section>
        <h2 class="mb-3 text-xl font-semibold">Drawer</h2>
        <div class="flex flex-wrap items-center gap-3">
          <!-- Drawer mặc định (trượt từ dưới lên) -->
          <Drawer>
            <DrawerTrigger as-child>
              <Button variant="outline">Drawer (dưới)</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Bộ lọc chiến dịch</DrawerTitle>
                <DrawerDescription>Chọn tiêu chí để lọc danh sách.</DrawerDescription>
              </DrawerHeader>
              <div class="px-4 pb-2 text-sm text-muted-foreground">
                Nội dung tuỳ ý đặt trong drawer.
              </div>
              <DrawerFooter>
                <Button>Áp dụng</Button>
                <DrawerClose as-child><Button variant="outline">Đóng</Button></DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>

          <!-- Drawer trượt từ phải sang -->
          <Drawer direction="right">
            <DrawerTrigger as-child>
              <Button variant="outline">Drawer (phải)</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Chi tiết chiến dịch</DrawerTitle>
                <DrawerDescription>Trượt từ cạnh phải màn hình.</DrawerDescription>
              </DrawerHeader>
              <div class="px-4 pb-2 text-sm text-muted-foreground">
                Phù hợp cho panel chi tiết / chỉnh sửa nhanh.
              </div>
              <DrawerFooter>
                <DrawerClose as-child><Button variant="outline">Đóng</Button></DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
      </section>

      <!-- ============ TABS ============ -->
      <section>
        <h2 class="mb-3 text-xl font-semibold">Tabs</h2>
        <Tabs default-value="overview" class="max-w-md">
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="metrics">Chỉ số</TabsTrigger>
            <TabsTrigger value="settings">Cài đặt</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" class="pt-3 text-sm text-muted-foreground">
            Nội dung tab Tổng quan.
          </TabsContent>
          <TabsContent value="metrics" class="pt-3 text-sm text-muted-foreground">
            Nội dung tab Chỉ số.
          </TabsContent>
          <TabsContent value="settings" class="pt-3 text-sm text-muted-foreground">
            Nội dung tab Cài đặt.
          </TabsContent>
        </Tabs>
      </section>

      <!-- ============ DATA-GRID TABLE ============ -->
      <section>
        <h2 class="mb-3 text-xl font-semibold">Data-grid Table</h2>
        <p class="mb-3 text-sm text-muted-foreground">
          Stress test <strong>10.000 dòng × 100 cột</strong> — row + column virtualization,
          cột đóng băng (Mã + Tên), kéo giãn cột, tùy chỉnh cột, sắp xếp, chọn dòng, dòng tổng,
          phân trang. Đã chọn:
          <strong>{{ gridChecked.selected.length }}</strong> dòng · trang
          <strong>{{ gridPaging.page }}</strong> / {{ Math.ceil(gridData.length / gridPaging.limit) }}.
        </p>
        <p class="mb-3 text-sm text-muted-foreground">
          <strong>Sao chép kiểu Excel:</strong> kéo chọn vùng ô (hoặc click vào tiêu đề cột để chọn cả cột),
          giữ Ctrl/Cmd để chọn nhiều vùng, rồi nhấn <kbd>Cmd/Ctrl + C</kbd> để sao chép sang Excel/Sheets.
        </p>
        <div class="h-[460px]">
          <Table
            :data="gridPageData"
            :columns="gridColumns"
            :paging="gridPaging"
            :checked-config="gridChecked"
            :loading="gridLoading"
            :table_info="{ name: 'campaigns', key_id: 'id' }"
            :tools="['refresh', 'custom-column', 'zoom']"
            show-checkbox
            show-total
            is-border
            stripe
            enable-range-select
            @change-paging="onGridChangePaging"
            @refresh="onGridRefresh"
          >
            <!-- Custom cell: status badge -->
            <template #status="{ value }">
              <Badge :variant="value === 'Đang chạy' ? 'default' : value === 'Tạm dừng' ? 'secondary' : value === 'Hoàn thành' ? 'outline' : 'destructive'">
                {{ value }}
              </Badge>
            </template>
            <!-- Custom cell: money formatting -->
            <template #budget="{ value }">{{ fmtVnd(value) }}</template>
            <template #spent="{ value }">{{ fmtVnd(value) }}</template>
          </Table>
        </div>
      </section>


      <!-- ============ PAGINATION ============ -->
      <section>
        <h2 class="mb-3 text-xl font-semibold">Pagination</h2>
        <Pagination
          v-slot="{ page }"
          v-model:page="currentPage"
          :total="100"
          :items-per-page="10"
          :sibling-count="1"
          show-edges
        >
          <PaginationContent v-slot="{ items }">
            <PaginationFirst />
            <PaginationPrevious />
            <template v-for="(item, index) in items" :key="index">
              <PaginationItem
                v-if="item.type === 'page'"
                :value="item.value"
                :is-active="item.value === page"
              >
                {{ item.value }}
              </PaginationItem>
              <PaginationEllipsis v-else :index="index" />
            </template>
            <PaginationNext />
            <PaginationLast />
          </PaginationContent>
        </Pagination>
        <p class="mt-2 text-sm text-muted-foreground">Trang hiện tại: {{ currentPage }}</p>
      </section>

      <!-- ============ AVATAR / SEPARATOR / SKELETON ============ -->
      <section>
        <h2 class="mb-3 text-xl font-semibold">Avatar / Separator / Skeleton</h2>
        <div class="flex flex-wrap items-center gap-6">
          <Avatar>
            <AvatarImage src="https://github.com/vuejs.png" alt="Vue" />
            <AvatarFallback>VU</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarImage src="" alt="fallback" />
            <AvatarFallback>SM</AvatarFallback>
          </Avatar>
          <Separator orientation="vertical" class="h-10" />
          <div class="flex flex-col gap-2">
            <Skeleton class="h-4 w-48" />
            <Skeleton class="h-4 w-32" />
            <Skeleton class="h-8 w-24" />
          </div>
        </div>
        <Separator class="my-4" />
        <p class="text-sm text-muted-foreground">Separator ngang ở trên.</p>
      </section>

      <!-- ============ SONNER (toast) ============ -->
      <section>
        <h2 class="mb-3 text-xl font-semibold">Sonner (Toast)</h2>
        <div class="flex flex-wrap gap-3">
          <Button variant="outline" @click="toast('Thông báo cơ bản')">Toast thường</Button>
          <Button variant="outline" @click="toast.success('Lưu thành công!')">Success</Button>
          <Button variant="outline" @click="toast.error('Đã có lỗi xảy ra')">Error</Button>
          <Button variant="outline" @click="toast.info('Thông tin cập nhật')">Info</Button>
          <Button variant="outline" @click="toast.warning('Cảnh báo ngân sách')">Warning</Button>
        </div>
      </section>

      <!-- ============ ICONS ============ -->
      <section>
        <h2 class="mb-3 text-xl font-semibold">Icons ({{ ICON_NAMES.length }})</h2>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-3">
          <div
            v-for="name in ICON_NAMES"
            :key="name"
            class="flex flex-col items-center gap-1 rounded-md border p-2 text-center"
          >
            <Icon :name="name" :size="20" />
            <span class="truncate text-[10px] text-muted-foreground" :title="name">{{ name }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
