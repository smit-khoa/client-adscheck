export interface DateRangeValue {
  start: Date | null;
  end: Date | null;
}

export type DateRangePreset =
  | "lifetime"
  | "today"
  | "yesterday"
  | "last-7-days"
  | "last-30-days"
  | "this-month"
  | "last-month"
  | "custom";

export interface DateRangePresetOption {
  value: DateRangePreset;
  label: string;
}

export interface DateRangeApplyPayload {
  value: DateRangeValue;
  preset: DateRangePreset;
}

export const DATE_RANGE_PRESETS: DateRangePresetOption[] = [
  { value: "lifetime", label: "Lifetime" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last-7-days", label: "Last 7 days" },
  { value: "last-30-days", label: "Last 30 days" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "custom", label: "Custom Range" },
];

export const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export interface CalendarDay {
  date: Date;
  key: string;
  day: number;
  in_current_month: boolean;
}

export interface CalendarMonth {
  key: string;
  label: string;
  days: CalendarDay[];
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return startOfDay(next);
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function sameDay(left: Date | null, right: Date | null): boolean {
  if (!left || !right) return false;
  return dateKey(left) === dateKey(right);
}

export function normalizeRange(value: DateRangeValue): DateRangeValue {
  if (!value.start || !value.end) {
    return {
      start: value.start ? startOfDay(value.start) : null,
      end: value.end ? startOfDay(value.end) : null,
    };
  }

  const start = startOfDay(value.start);
  const end = startOfDay(value.end);

  if (start.getTime() <= end.getTime()) {
    return { start, end };
  }

  return { start: end, end: start };
}

export function formatDate(date: Date | null): string {
  if (!date) return "--/--/----";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatRange(value: DateRangeValue): string {
  const range = normalizeRange(value);
  return `${formatDate(range.start)} - ${formatDate(range.end)}`;
}

export function buildCalendarMonth(monthDate: Date): CalendarMonth {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    return {
      date,
      key: dateKey(date),
      day: date.getDate(),
      in_current_month: date.getMonth() === monthStart.getMonth(),
    } satisfies CalendarDay;
  });

  return {
    key: `${monthStart.getFullYear()}-${monthStart.getMonth()}`,
    label: `${MONTH_LABELS[monthStart.getMonth()]} ${monthStart.getFullYear()}`,
    days,
  };
}

export function presetRange(
  preset: DateRangePreset,
  today: Date,
  lifetimeStart: Date,
): DateRangeValue {
  const current = startOfDay(today);
  const lifetime = startOfDay(lifetimeStart);

  if (preset === "lifetime") return { start: lifetime, end: current };
  if (preset === "today") return { start: current, end: current };
  if (preset === "yesterday") {
    const yesterday = addDays(current, -1);
    return { start: yesterday, end: yesterday };
  }
  if (preset === "last-7-days") return { start: addDays(current, -6), end: current };
  if (preset === "last-30-days") return { start: addDays(current, -29), end: current };
  if (preset === "this-month") {
    return { start: new Date(current.getFullYear(), current.getMonth(), 1), end: current };
  }
  if (preset === "last-month") {
    const start = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    const end = new Date(current.getFullYear(), current.getMonth(), 0);
    return { start, end };
  }

  return { start: null, end: null };
}
