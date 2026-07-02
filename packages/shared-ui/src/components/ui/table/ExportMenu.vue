<script setup lang="ts">
// Download menu for the data-grid toolbar: a Popover with a format picker
// (.xlsx default / .csv / .txt) + a "Tải xuống" button. It only emits the chosen
// format — Table.vue owns the actual export (gathering rows/columns). Closes after
// triggering so a repeat download re-opens cleanly.
import { ref } from "vue"
import { Button } from "../button"
import { Icon } from "../../../icons"
import { Popover, PopoverContent, PopoverTrigger } from "../popover"
import { RadioGroup, RadioGroupItem } from "../radio-group"
import { Label } from "../label"
import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip"
import type { ExportFormat } from "./composables/use-table-export"

const emit = defineEmits<{ (e: "export", format: ExportFormat): void }>()

const open = ref(false)
const format = ref<ExportFormat>("xlsx")

function onDownload() {
    emit("export", format.value)
    open.value = false
}

const options: { value: ExportFormat; label: string }[] = [
    { value: "xlsx", label: ".xlsx" },
    { value: "csv", label: ".csv" },
    { value: "txt", label: ".txt" }
]
</script>

<template>
    <Popover v-model:open="open">
        <PopoverTrigger as-child>
            <span class="inline-flex">
                <Tooltip>
                    <TooltipTrigger as-child>
                        <Button variant="secondary" size="icon" class="data-grid-toolbar-icon-button" aria-label="Tải xuống"><Icon name="download" size="18" /></Button>
                    </TooltipTrigger>
                    <TooltipContent>Tải xuống</TooltipContent>
                </Tooltip>
            </span>
        </PopoverTrigger>
        <PopoverContent
            align="end"
            class="data-grid-export-menu w-64 rounded-[12px] border-[#BFD8CC] bg-[#F3F7F5] p-3 text-[#5E6360] shadow-[0_18px_42px_rgba(94,99,96,0.18)]"
        >
            <div class="flex flex-col gap-3">
                <RadioGroup v-model="format" class="flex flex-col gap-1">
                    <Label
                        v-for="opt in options"
                        :key="opt.value"
                        :for="`export-fmt-${opt.value}`"
                        class="flex cursor-pointer items-center gap-2 rounded-[8px] px-2.5 py-2 text-sm font-medium text-[#3F4742] transition-colors hover:bg-[#D8E9E1]"
                        :class="format === opt.value && 'bg-[#E8F7EE] text-[#1F2A24]'"
                    >
                        <RadioGroupItem
                            :id="`export-fmt-${opt.value}`"
                            :value="opt.value"
                            class="border-[#9DBEAD] text-[#3C9944] shadow-none data-[state=checked]:border-[#3C9944] data-[state=checked]:bg-[#E8F7EE]"
                        />
                        <span>{{ opt.label }}</span>
                    </Label>
                </RadioGroup>
                <p class="text-xs leading-5 text-[#5E6360]">Khi tích chọn tkqc cụ thể thì sẽ tải những tkqc đó, mặc định không chọn sẽ tải hết trong bảng.</p>
                <Button class="w-full" @click="onDownload"><Icon name="download" size="16" /> Tải xuống </Button>
            </div>
        </PopoverContent>
    </Popover>
</template>
