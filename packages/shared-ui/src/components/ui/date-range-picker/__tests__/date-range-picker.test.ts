import { describe, expect, it } from "vitest";
import {
  addDays,
  buildCalendarMonth,
  formatRange,
  normalizeRange,
  presetRange,
} from "../date-range-picker";

describe("date range picker helpers", () => {
  it("normalizes reversed ranges", () => {
    const normalized = normalizeRange({
      start: new Date(2026, 5, 27),
      end: new Date(2026, 0, 1),
    });

    expect(formatRange(normalized)).toBe("01/01/2026 - 27/06/2026");
  });

  it("uses local date formatting without ISO timezone conversion", () => {
    const range = {
      start: new Date(2010, 0, 1),
      end: new Date(2026, 5, 27),
    };

    expect(formatRange(range)).toBe("01/01/2010 - 27/06/2026");
  });

  it("builds a fixed six-week month grid starting on Sunday", () => {
    const may2026 = buildCalendarMonth(new Date(2026, 4, 1));

    expect(may2026.label).toBe("May 2026");
    expect(may2026.days).toHaveLength(42);
    expect(may2026.days[0]?.day).toBe(26);
    expect(may2026.days[0]?.in_current_month).toBe(false);
    expect(may2026.days[5]?.day).toBe(1);
    expect(may2026.days[5]?.in_current_month).toBe(true);
  });

  it("calculates preset ranges from local calendar dates", () => {
    const today = new Date(2026, 5, 27);
    const lifetimeStart = new Date(2010, 0, 1);

    expect(formatRange(presetRange("lifetime", today, lifetimeStart))).toBe("01/01/2010 - 27/06/2026");
    expect(formatRange(presetRange("last-7-days", today, lifetimeStart))).toBe("21/06/2026 - 27/06/2026");
    expect(formatRange(presetRange("last-month", today, lifetimeStart))).toBe("01/05/2026 - 31/05/2026");
  });

  it("adds days across month boundaries", () => {
    expect(formatRange({ start: addDays(new Date(2026, 5, 1), -1), end: null })).toBe("31/05/2026 - --/--/----");
  });
});
