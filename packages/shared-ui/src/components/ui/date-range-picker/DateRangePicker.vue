<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Button } from "../button";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { Icon } from "../../../icons";
import { cn } from "../../../lib/utils";
import {
  DATE_RANGE_PRESETS,
  WEEKDAY_LABELS,
  type CalendarDay,
  type DateRangeApplyPayload,
  type DateRangePreset,
  type DateRangeValue,
  addMonths,
  buildCalendarMonth,
  formatRange,
  normalizeRange,
  presetRange,
  sameDay,
  startOfDay,
} from "./date-range-picker";

interface Props {
  modelValue?: DateRangeValue;
  defaultPreset?: DateRangePreset;
  lifetimeStart?: Date;
  today?: Date;
  disabled?: boolean;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  triggerLabel?: string;
}

interface Emits {
  (event: "update:modelValue", value: DateRangeValue): void;
  (event: "apply", payload: DateRangeApplyPayload): void;
  (event: "cancel"): void;
  (event: "update:open", value: boolean): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({ start: null, end: null }),
  defaultPreset: "lifetime",
  lifetimeStart: () => new Date(2010, 0, 1),
  today: () => new Date(),
  disabled: false,
  align: "end",
  sideOffset: 12,
  triggerLabel: "Select date range",
});

const emit = defineEmits<Emits>();

const open = ref(false);
const activePreset = ref<DateRangePreset>(props.defaultPreset);
const draftRange = ref<DateRangeValue>(initialRange());
const visibleMonth = ref(monthAnchor(draftRange.value.end ?? startOfDay(props.today)));

const calendarMonths = computed(() => [
  buildCalendarMonth(visibleMonth.value),
  buildCalendarMonth(addMonths(visibleMonth.value, 1)),
]);

const rangeLabel = computed(() => formatRange(draftRange.value));

watch(
  () => props.modelValue,
  (value) => {
    if (open.value) return;
    const next = normalizeRange(value ?? { start: null, end: null });
    draftRange.value = next;
    if (next.end) visibleMonth.value = monthAnchor(addMonths(next.end, -1));
  },
  { deep: true },
);

watch(open, (value) => {
  emit("update:open", value);
  if (value) {
    draftRange.value = normalizeRange(props.modelValue ?? initialRange());
    const anchor = draftRange.value.end ?? startOfDay(props.today);
    visibleMonth.value = monthAnchor(addMonths(anchor, -1));
  }
});

function initialRange(): DateRangeValue {
  if (props.modelValue?.start || props.modelValue?.end) {
    return normalizeRange(props.modelValue);
  }

  return presetRange(props.defaultPreset, props.today, props.lifetimeStart);
}

function monthAnchor(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isInRange(day: CalendarDay): boolean {
  const range = normalizeRange(draftRange.value);
  if (!range.start || !range.end) return false;
  const time = startOfDay(day.date).getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
}

function isRangeStart(day: CalendarDay): boolean {
  return sameDay(day.date, draftRange.value.start);
}

function isRangeEnd(day: CalendarDay): boolean {
  return sameDay(day.date, draftRange.value.end);
}

function moveMonths(amount: number): void {
  visibleMonth.value = addMonths(visibleMonth.value, amount);
}

function selectPreset(preset: DateRangePreset): void {
  activePreset.value = preset;

  if (preset === "custom") return;

  const nextRange = presetRange(preset, props.today, props.lifetimeStart);
  draftRange.value = normalizeRange(nextRange);
  if (nextRange.end) visibleMonth.value = monthAnchor(addMonths(nextRange.end, -1));
}

function selectDay(day: CalendarDay): void {
  activePreset.value = "custom";
  const selected = startOfDay(day.date);
  const current = draftRange.value;

  if (!current.start || current.end) {
    draftRange.value = { start: selected, end: null };
    return;
  }

  draftRange.value = normalizeRange({ start: current.start, end: selected });
}

function cancelSelection(): void {
  draftRange.value = normalizeRange(props.modelValue ?? initialRange());
  emit("cancel");
  open.value = false;
}

function applySelection(): void {
  const value = normalizeRange(draftRange.value);
  draftRange.value = value;
  emit("update:modelValue", value);
  emit("apply", { value, preset: activePreset.value });
  open.value = false;
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        :disabled="disabled"
        :aria-label="triggerLabel"
        :aria-expanded="open"
        :class="cn(
          'data-grid-toolbar-icon-button date-range-picker-trigger',
          open ? 'date-range-picker-trigger-active' : '',
        )"
      >
        <Icon name="calendar" size="18" />
      </Button>
    </PopoverTrigger>

    <PopoverContent
      :align="align"
      :side-offset="sideOffset"
      class="date-range-picker-panel relative z-50 w-[min(92vw,700px)] overflow-visible rounded-[20px] border border-[#BFD8CC] bg-[#F8FFFA] p-0 text-[#1F2A24] shadow-[0_22px_54px_rgba(0,102,34,0.16)]"
    >
      <span class="date-range-picker-caret" aria-hidden="true" />

      <div class="date-range-picker-body">
        <aside class="date-range-picker-presets" aria-label="Date range presets">
          <button
            v-for="preset in DATE_RANGE_PRESETS"
            :key="preset.value"
            type="button"
            class="date-range-picker-preset"
            :class="preset.value === activePreset ? 'date-range-picker-preset-active' : ''"
            @click="selectPreset(preset.value)"
          >
            {{ preset.label }}
          </button>
        </aside>

        <section class="date-range-picker-calendars" aria-label="Calendar months">
          <div class="date-range-picker-month-nav">
            <button type="button" class="date-range-picker-nav-button" aria-label="Previous month" @click="moveMonths(-1)">
              ‹
            </button>
            <button type="button" class="date-range-picker-nav-button" aria-label="Next month" @click="moveMonths(1)">
              ›
            </button>
          </div>

          <div class="date-range-picker-months">
            <div v-for="month in calendarMonths" :key="month.key" class="date-range-picker-month">
              <h3 class="date-range-picker-month-title">{{ month.label }}</h3>

              <div class="date-range-picker-weekdays" aria-hidden="true">
                <span v-for="weekday in WEEKDAY_LABELS" :key="weekday">{{ weekday }}</span>
              </div>

              <div class="date-range-picker-grid" role="grid" :aria-label="month.label">
                <button
                  v-for="day in month.days"
                  :key="day.key"
                  type="button"
                  class="date-range-picker-day"
                  :class="{
                    'date-range-picker-day-muted': !day.in_current_month,
                    'date-range-picker-day-in-range': isInRange(day),
                    'date-range-picker-day-start': isRangeStart(day),
                    'date-range-picker-day-end': isRangeEnd(day),
                  }"
                  role="gridcell"
                  @click="selectDay(day)"
                >
                  <span>{{ day.day }}</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer class="date-range-picker-footer">
        <p class="date-range-picker-selected-label">{{ rangeLabel }}</p>
        <div class="date-range-picker-actions">
          <button type="button" class="date-range-picker-cancel" @click="cancelSelection">Cancel</button>
          <Button type="button" class="date-range-picker-apply" @click="applySelection">Apply</Button>
        </div>
      </footer>
    </PopoverContent>
  </Popover>
</template>

<style scoped>
.date-range-picker-trigger {
  flex: 0 0 auto;
}

.date-range-picker-trigger-active {
  color: #062 !important;
  box-shadow:
    0 0 0 2px rgba(60, 153, 68, 0.18),
    0 12px 26px rgba(0, 177, 115, 0.16) !important;
}

.date-range-picker-caret {
  position: absolute;
  top: -7px;
  right: 18px;
  width: 14px;
  height: 14px;
  transform: rotate(45deg);
  border-top: 1px solid #bfd8cc;
  border-left: 1px solid #bfd8cc;
  background: #f8fffa;
}

.date-range-picker-body {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  min-height: 328px;
}

.date-range-picker-presets {
  display: flex;
  max-height: 328px;
  flex-direction: column;
  overflow-y: auto;
  border-right: 1px solid #d8e9e1;
  padding: 8px;
}

.date-range-picker-preset {
  min-height: 38px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  padding: 0 12px;
  color: #3f4742;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  transition: background 120ms ease, color 120ms ease, box-shadow 120ms ease;
}

.date-range-picker-preset:hover {
  background: #e8f7ee;
  color: #1f2a24;
}

.date-range-picker-preset-active,
.date-range-picker-preset-active:hover {
  background: linear-gradient(270deg, #7cd249 0%, #339d36 100%);
  color: #ffffff;
  box-shadow: 0 8px 18px rgba(0, 102, 34, 0.16);
}

.date-range-picker-calendars {
  position: relative;
  min-width: 0;
  padding: 16px 16px 14px;
}

.date-range-picker-month-nav {
  pointer-events: none;
  position: absolute;
  inset: 14px 10px auto;
  z-index: 1;
  display: flex;
  justify-content: space-between;
}

.date-range-picker-nav-button {
  pointer-events: auto;
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #3f4742;
  font-size: 26px;
  font-weight: 600;
  line-height: 1;
}

.date-range-picker-nav-button:hover {
  background: #d8e9e1;
  color: #062;
}

.date-range-picker-months {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.date-range-picker-month-title {
  margin: 0 0 12px;
  color: #1f2a24;
  font-size: 15px;
  font-weight: 600;
  text-align: center;
}

.date-range-picker-weekdays,
.date-range-picker-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(24px, 1fr));
}

.date-range-picker-weekdays {
  margin-bottom: 4px;
  color: #5e6360;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
}

.date-range-picker-weekdays span {
  padding: 4px 0;
}

.date-range-picker-day {
  position: relative;
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: #1f2a24;
  font-size: 12px;
  font-weight: 500;
}

.date-range-picker-day:hover {
  background: #e8f7ee;
}

.date-range-picker-day-muted {
  color: #a5aca7;
}

.date-range-picker-day-in-range {
  background: #e1faf2;
}

.date-range-picker-day-start,
.date-range-picker-day-end,
.date-range-picker-day-start:hover,
.date-range-picker-day-end:hover {
  background: #3c9944;
  color: #ffffff;
  font-weight: 600;
}

.date-range-picker-day-start {
  border-radius: 8px 0 0 8px;
}

.date-range-picker-day-end {
  border-radius: 0 8px 8px 0;
}

.date-range-picker-day-start.date-range-picker-day-end {
  border-radius: 8px;
}

.date-range-picker-footer {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid #d8e9e1;
  padding: 10px 14px;
}

.date-range-picker-selected-label {
  margin: 0;
  border-radius: 999px;
  background: #f3f7f5;
  padding: 8px 12px;
  color: #3f4742;
  font-size: 13px;
  font-weight: 500;
}

.date-range-picker-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.date-range-picker-cancel {
  min-height: 34px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  padding: 0 14px;
  color: #3f4742;
  font-size: 13px;
  font-weight: 600;
}

.date-range-picker-cancel:hover {
  background: #d8e9e1;
  color: #062;
}

.date-range-picker-apply {
  min-width: 76px;
  min-height: 34px;
  border: 0 !important;
  border-radius: 999px !important;
  background: linear-gradient(270deg, #7cd249 0%, #339d36 100%) !important;
  padding: 8px 16px !important;
  color: #ffffff !important;
  box-shadow: 0 10px 22px rgba(0, 102, 34, 0.16) !important;
  font-size: 13px;
  font-weight: 600;
}

@media (max-width: 760px) {
  .date-range-picker-body {
    grid-template-columns: 1fr;
  }

  .date-range-picker-presets {
    max-height: none;
    flex-direction: row;
    overflow-x: auto;
    border-right: 0;
    border-bottom: 1px solid #d8e9e1;
  }

  .date-range-picker-preset {
    min-width: max-content;
  }

  .date-range-picker-months {
    grid-template-columns: 1fr;
  }

  .date-range-picker-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
