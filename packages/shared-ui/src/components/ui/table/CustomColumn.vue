<template>
    <Tooltip>
        <TooltipTrigger as-child>
            <Button variant="secondary" size="icon" class="data-grid-toolbar-icon-button" aria-label="Tùy chỉnh cột" @click="openCustomColumn"><Icon name="settings" size="18" /></Button>
        </TooltipTrigger>
        <TooltipContent>Tùy chỉnh cột</TooltipContent>
    </Tooltip>
    <Dialog v-model:open="is_show">
        <DialogContent class="w-[750px] h-[700px] max-w-none flex flex-col p-0">
        <DialogHeader class="sr-only">
            <DialogTitle>Tùy chỉnh cột</DialogTitle>
        </DialogHeader>
        <div class="p-[20px] flex flex-col flex-1 overflow-hidden">
            <div class="flex items-center justify-between mb-[20px]">
                <h1 class="fs-16 fw-7">Tùy chỉnh cột</h1>
                <div class="flex gap-2">
                    <button @click="activeTab = 'columns'" :class="['tab-button', activeTab === 'columns' && 'active']">Cột</button>
                    <button @click="activeTab = 'groups'" :class="['tab-button', activeTab === 'groups' && 'active']">Nhóm dữ liệu</button>
                </div>
            </div>
            <div class="max-h-[calc(100%-76px)] mb-[12px]">
                <div v-if="activeTab === 'columns'" class="flex max-h-full pt-[20px]">
                    <div class="pr-[20px] overflow-auto left">
                        <div class="left-title sticky top-0 bg-background">Tất cả cột</div>
                        <div class="column-list-scroll">
                            <div v-for="col in props.allColumns" :key="col.field" class="mb-[16px]">
                                <div class="checkbox-label">
                                    <Checkbox :id="`${col.field}-checkbox`" :modelValue="selectedColumns.includes(col.field)" @update:modelValue="onColumnCheckboxChange(Boolean($event), col)" />
                                    <Label :for="`${col.field}-checkbox`">{{ col.name }}</Label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="right pl-[20px]">
                        <div class="right-title">Đã chọn {{ selectedColumns.length }} cột</div>
                        <div class="flex flex-col gap-[12px] overflow-auto">
                            <div class="frozen-list-wrap">
                                <div class="frozen-title">Cột đóng băng</div>
                                <draggable v-model="frozenColumnsOrder" :group="'columns'" item-key="field" class="frozen-columns-list p-[12px] flex flex-col gap-[12px]">
                                    <template #item="{ element, index }">
                                        <div class="selected-column-item">
                                            <span class="drag-handle">☰</span>
                                            <span>{{ props.allColumns.find(c => c.field === element)?.name }}</span>
                                            <button
                                                class="remove-btn"
                                                @click="
                                                    () => {
                                                        // Loại khỏi frozen và khỏi selected
                                                        frozenColumnsOrder.splice(index, 1)
                                                        if (selectedColumns.includes(element)) {
                                                            const idx = selectedColumns.indexOf(element)
                                                            if (idx !== -1) selectedColumns.splice(idx, 1)
                                                        }
                                                    }
                                                ">
                                                ×
                                            </button>
                                        </div>
                                    </template>
                                </draggable>
                            </div>
                            <div class="nonfrozen-list-wrap">
                                <div class="nonfrozen-title">Cột không đóng băng</div>
                                <draggable v-model="nonFrozenColumnsOrderDraft" :group="'columns'" item-key="field" class="nonfrozen-columns-list p-[12px] flex flex-col gap-[12px]">
                                    <template #item="{ element, index }">
                                        <div class="selected-column-item">
                                            <span class="drag-handle">☰</span>
                                            <span>{{ props.allColumns.find(c => c.field === element)?.name }}</span>
                                            <button
                                                class="remove-btn"
                                                @click="
                                                    () => {
                                                        if (selectedColumns.includes(element)) {
                                                            const idx = selectedColumns.indexOf(element)
                                                            if (idx !== -1) selectedColumns.splice(idx, 1)
                                                        }
                                                        nonFrozenColumnsOrderDraft.splice(index, 1)
                                                    }
                                                ">
                                                ×
                                            </button>
                                        </div>
                                    </template>
                                </draggable>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Groups Tab Content -->
                <div v-if="activeTab === 'groups'" class="flex max-h-full pt-[20px]">
                    <div class="w-full">
                        <div class="mb-[20px]">
                            <h3 class="text-sm font-medium mb-2">Nhóm dữ liệu theo cột</h3>
                            <p class="text-sm text-muted-foreground">Kéo thả các cột vào đây để nhóm dữ liệu</p>
                        </div>

                        <div class="grid grid-cols-2 gap-[20px]">
                            <!-- Row Groups -->
                            <div class="flex flex-col">
                                <div class="font-medium mb-2">Nhóm theo</div>
                                <draggable v-model="rowGroupsOrder" :group="{ name: 'group-columns', pull: false, put: true }" item-key="field" class="group-drop-zone min-h-[120px] p-[12px] bg-muted border-2 border-dashed border-border rounded-lg flex-1" @add="handleAddToGroups">
                                    <template #item="{ element, index }">
                                        <div class="group-item">
                                            <span class="drag-handle">☰</span>
                                            <span>{{ getColumnName(element) }}</span>
                                            <button class="remove-btn" @click="removeFromGroups(index)">×</button>
                                        </div>
                                    </template>
                                    <div v-if="rowGroupsOrder.length === 0" class="text-center text-muted-foreground py-8">Kéo cột vào đây để nhóm</div>
                                </draggable>
                                <div v-if="rowGroupsOrder.length > 0" class="mt-2 text-xs text-muted-foreground">Thứ tự nhóm: {{ rowGroupsOrder.map(f => getColumnName(f)).join(" → ") }}</div>
                            </div>

                            <!-- Available Columns for Grouping -->
                            <div>
                                <div class="font-medium mb-2">Cột có thể nhóm</div>
                                <div class="bg-background border border-border rounded-lg p-3 max-h-[300px] overflow-y-auto">
                                    <draggable :list="availableGroupColumns" :group="{ name: 'group-columns', pull: 'clone', put: false }" :clone="cloneColumn" item-key="field" :sort="false">
                                        <template #item="{ element }">
                                            <div class="group-available-item">
                                                <span class="drag-handle">☰</span>
                                                <span>{{ element.name }}</span>
                                            </div>
                                        </template>
                                    </draggable>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- <div class="flex justify-end gap-8">
        <Button variant="outline">Hủy</Button>
        <Button variant="primary" @click="applyColumnSettings">Lưu</Button>
      </div> -->
        </div>

        <DialogFooter class="px-[20px] pb-[20px]">
            <div class="flex gap-2 justify-end">
                <Button variant="outline" @click="is_show = false">Hủy</Button>
                <Button variant="default" @click="applyColumnSettings">Lưu</Button>
            </div>
        </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
// import
import { ref, computed } from "vue"
import draggable from "vuedraggable"
import { Checkbox } from "../checkbox"
import { Label } from "../label"
import { Button } from "../button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip"
import { Icon } from "../../../icons"

// interface
interface Column {
    field: string
    name: string
}

// emit
const emit = defineEmits<{
    (e: "apply-column-settings", columns: string[], frozen_columns: string[], row_groups?: string[]): void
}>()

// props
interface Props {
    allColumns: Column[]
    frozenOrder: string[]
    visibleColumns: Column[]
    rowGroups?: string[]
}

const props = withDefaults(defineProps<Props>(), {
    allColumns: () => [],
    frozenOrder: () => [],
    visibleColumns: () => [],
    rowGroups: () => []
})

// data
const is_show = ref(false)
const selectedColumns = ref<string[]>([])
const frozenColumnsOrder = ref<string[]>(props.frozenOrder.filter(f => selectedColumns.value.includes(f)))
const nonFrozenColumnsOrderDraft = ref<string[]>([])
const rowGroupsOrder = ref<string[]>([...props.rowGroups])
const activeTab = ref<"columns" | "groups">("columns")

// methods
// const image = (file: string) => {
//     return require(`@/assets/images/table/${file}`)
// }

function onColumnCheckboxChange(e: boolean, col: any) {
    handleColumnCheckboxChange(col, e)
}
function handleColumnCheckboxChange(col: any, checked: boolean) {
    if (checked && !selectedColumns.value.includes(col.field)) {
        selectedColumns.value.push(col.field)
        nonFrozenColumnsOrderDraft.value.push(col.field)
    } else if (!checked) {
        selectedColumns.value = selectedColumns.value.filter(c => c !== col.field)
        frozenColumnsOrder.value = frozenColumnsOrder.value.filter(c => c !== col.field)
        nonFrozenColumnsOrderDraft.value = nonFrozenColumnsOrderDraft.value.filter(c => c !== col.field)
    }
}

// computed
const availableGroupColumns = computed(() => {
    return props.allColumns.filter(col => !rowGroupsOrder.value.includes(col.field))
})

const getColumnName = (field: string): string => {
    const column = props.allColumns.find(col => col.field === field)
    return column ? column.name : field
}

// methods for groups
const handleAddToGroups = (event: any) => {
    // draggable will handle the add automatically
}

const removeFromGroups = (index: number) => {
    rowGroupsOrder.value.splice(index, 1)
}

const cloneColumn = (column: Column) => {
    return column.field
}

const openCustomColumn = () => {
    is_show.value = true
    // emit("open-custom-column")
    const visibleFields = props.visibleColumns.map(col => col.field)
    // Cập nhật selectedColumns đúng thứ tự hiển thị
    selectedColumns.value = [...visibleFields]
    // Cập nhật frozenColumnsOrder đúng thứ tự đóng băng hiện tại
    frozenColumnsOrder.value = props.frozenOrder.filter(f => selectedColumns.value.includes(f))
    // Cập nhật nonFrozenColumnsOrderDraft đúng thứ tự hiển thị
    nonFrozenColumnsOrderDraft.value = selectedColumns.value.filter(field => !frozenColumnsOrder.value.includes(field))
    // Cập nhật rowGroups
    rowGroupsOrder.value = [...props.rowGroups]
}

const applyColumnSettings = () => {
    selectedColumns.value = [...frozenColumnsOrder.value, ...nonFrozenColumnsOrderDraft.value]

    emit("apply-column-settings", selectedColumns.value, frozenColumnsOrder.value, rowGroupsOrder.value)
    is_show.value = false
}
</script>

<style scoped>
.left {
    border-right: 1px solid var(--border);
    flex: 1.2;
}
.left-title {
    font-weight: 600;
    margin-bottom: 12px;
    font-size: 15px;
}
.column-list-scroll {
    overflow-y: auto;
    flex: 1;
    padding-right: 8px;
}
.column-checkbox-item {
    margin-bottom: 10px;
}
.checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    cursor: pointer;
}
.right {
    display: flex;
    flex-direction: column;
    flex: 1.8;
}
.right-title {
    font-weight: 600;
    margin-bottom: 12px;
    font-size: 15px;
}
.frozen-nonfrozen-wrap {
    display: flex;
    gap: 24px;
    height: 340px;
}
.frozen-list-wrap,
.nonfrozen-list-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
}
.frozen-title,
.nonfrozen-title {
    font-weight: 500;
    font-size: 14px;
    margin-bottom: 8px;
}
.frozen-columns-list,
.nonfrozen-columns-list {
    background: var(--muted);
    border-radius: 8px;
    border: 1px solid var(--border);
}
.selected-column-item {
    display: flex;
    align-items: center;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 4px 8px;
    font-size: 14px;
    gap: 10px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    position: relative;
}
.drag-handle {
    cursor: grab;
    font-size: 18px;
    color: var(--muted-foreground);
    margin-right: 6px;
}
.remove-btn {
    background: none;
    border: none;
    color: var(--destructive);
    font-size: 18px;
    margin-left: auto;
    cursor: pointer;
    padding: 0 4px;
}
.column-settings-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 18px 32px 18px 0;
    border-top: 1px solid var(--border);
    background: var(--muted);
}
.apply-btn {
    background: var(--primary);
    color: var(--primary-foreground);
    border: none;
    border-radius: 4px;
    padding: 8px 20px;
    font-weight: 500;
    cursor: pointer;
}
.cancel-btn {
    background: var(--muted);
    color: var(--foreground);
    border: none;
    border-radius: 4px;
    padding: 8px 20px;
    cursor: pointer;
}
.grid-footer-sum {
    display: flex;
    align-items: center;
    background: var(--muted);
    border-top: 1px solid var(--border);
    font-weight: 600;
    color: var(--foreground);
    position: sticky;
    bottom: 0;
    z-index: 10;
    min-height: 60px;
}
.footer-cell {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 12px;
    height: 100%;
    font-size: 14px;
    border-right: 1px solid var(--border);
    background: var(--muted);
}

.footer-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.group-footer {
    font-weight: 700;
    color: var(--primary);
    justify-content: flex-start;
}
.footer-cell.frozen-column {
    position: sticky;
    background: var(--muted);
    z-index: 100;
    left: 0;
    /* Có thể thêm border hoặc shadow nếu muốn nổi bật */
}
.header-cell,
.row-cell {
    /* border-top: 1px solid var(--border); */
}
.grid-header-container {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--background);
    /* KHÔNG sticky theo chiều ngang, KHÔNG left/right */
}
.header-cell.frozen-column,
.row-cell.frozen-column {
    position: sticky;
    /* sticky chỉ theo left, không top */
    z-index: 100;
    /* box-shadow: 2px 0 4px -2px #e0e0e0; */
}
.header-cell.checkbox-cell.frozen-column,
.row-cell.checkbox-cell.frozen-column {
    position: sticky;
    left: 0;
    z-index: 110;
}
.cell-align-left {
    justify-content: flex-start !important;
    text-align: left !important;
}
.cell-align-center {
    justify-content: center !important;
    text-align: center !important;
}
.cell-align-right {
    justify-content: flex-end !important;
    text-align: right !important;
}

/* --- Virtual Non-Frozen Cells --- */
.non-frozen-cell {
    position: absolute !important;
    height: 100% !important;
    /* background: inherit !important; */
}

/* --- Resize Preview Line --- */
.resize-preview-line {
    position: absolute;
    top: 0;
    width: 1px;
    height: 100%;
    background: linear-gradient(to bottom, var(--primary), var(--primary));
    z-index: 1000;
    pointer-events: none;
}

.resize-preview-line::before {
    /* content: "";
    position: absolute;
    top: 0;
    left: -1px;
    right: -1px;
    height: 100%;
    background: rgba(51, 10, 255, 0.1); */
    /* border-left: 1px solid var(--primary);
    border-right: 1px solid var(--primary); */
}

/* --- Column Resizer Cursor --- */
.column-resizer {
    cursor: col-resize;
}

.column-resizer:hover {
    /* background-color: rgba(24, 144, 255, 0.1); */
}

/* Tab styles */
.tab-button {
    padding: 8px 16px;
    background-color: var(--muted);
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.tab-button:hover {
    background-color: var(--border);
}

.tab-button.active {
    background-color: var(--primary);
    color: white;
    border-color: var(--primary);
}

/* Group styles */
.group-drop-zone {
    transition: all 0.2s;
}

.group-drop-zone.drag-over {
    background-color: var(--accent);
    border-color: var(--primary);
}

.group-item {
    display: flex;
    align-items: center;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 8px;
    font-size: 14px;
    gap: 10px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.group-available-item {
    display: flex;
    align-items: center;
    background: var(--muted);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 6px;
    font-size: 14px;
    gap: 10px;
    cursor: move;
    transition: all 0.2s;
}

.group-available-item:hover {
    background: var(--muted);
    border-color: var(--border);
}

/* Body cursor during resize */
body.resizing-column {
    cursor: col-resize !important;
    user-select: none;
}

.pivot-cell-content {
    display: flex;
    align-items: center;
    width: 100%;
    height: 100%;
}

.pivot-indent {
    display: inline-block;
    height: 100%;
    flex-shrink: 0;
}

.pivot-toggle-icon {
    display: inline-block;
    width: 20px;
    cursor: pointer;
    transition: transform 0.2s ease-in-out;
    user-select: none;
    flex-shrink: 0;
    text-align: center;
    color: var(--muted-foreground);
}

.pivot-toggle-icon.expanded {
    transform: rotate(90deg);
}

.pivot-summary-row .row-cell {
    /* font-weight: 600; */
    background-color: #f8f9fa; /* Màu nền cho hàng tổng hợp */
}

/* Pivot Column Settings Styles */
.pivot-section {
    margin-bottom: 20px;
}

.pivot-section-title {
    font-weight: 600;
    font-size: 14px;
    color: var(--foreground);
    margin-bottom: 8px;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
}

.pivot-selected-wrap {
    display: flex;
    flex-direction: column;
    gap: 20px;
    height: 340px;
}

.pivot-selected-section {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.pivot-selected-title {
    font-weight: 500;
    font-size: 14px;
    margin-bottom: 8px;
    color: var(--foreground);
}

.pivot-selected-list {
    background: var(--muted);
    border-radius: 8px;
    border: 1px solid var(--border);
    min-height: 120px;
    max-height: 150px;
    overflow-y: auto;
    padding: 12px 0;
    flex: 1;
}

.selected-pivot-item {
    display: flex;
    align-items: center;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: 6px;
    margin: 0 16px 8px 16px;
    padding: 8px 12px;
    font-size: 14px;
    gap: 10px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    position: relative;
}

.selected-pivot-item .remove-btn {
    background: none;
    border: none;
    color: var(--destructive);
    font-size: 18px;
    margin-left: auto;
    cursor: pointer;
    padding: 0 4px;
}

.empty-space-cell {
    /* border: none !important; */
    pointer-events: none;
    flex-shrink: 0;
    border-top: 1px solid var(--border);
}

.header-empty-absolute {
    position: absolute !important;
    top: 0;
    bottom: 0;
    z-index: 1;
}

.zoom-icon {
    font-size: 16px;
}

/* Fullscreen styles */
.data-grid-container.fullscreen-mode {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
    background: white;
    margin: 0;
    border: 0;
}

.data-grid-container.fullscreen-mode .data-grid-content {
    height: 100%;
}
</style>
