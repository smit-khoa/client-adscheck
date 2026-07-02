import { ref, watch } from 'vue';

// Run-control settings shown in the tool panel header: concurrency ("Luồng")
// and per-request delay ("Delay ms"). Persisted to localStorage; UI-only for
// now (no run loop consumes them yet — swap point for the real runner later).
const SETTINGS_KEY = 'adaccounts.tool-runner-settings.v1';

interface RunnerSettings {
  threads: number;
  delayMs: number;
}

const DEFAULTS: RunnerSettings = { threads: 2, delayMs: 200 };

function load(): RunnerSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<RunnerSettings>;
    const t = Number(parsed.threads);
    const d = Number(parsed.delayMs);
    return {
      threads: Number.isFinite(t) && t > 0 ? t : DEFAULTS.threads,
      delayMs: Number.isFinite(d) && d >= 0 ? d : DEFAULTS.delayMs,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

const initial = load();
const threads = ref<number>(initial.threads);
const delayMs = ref<number>(initial.delayMs);

// Persist on any change (module-scoped watcher registered once). Clearing a
// number input yields NaN via v-model.number — only persist valid values so a
// transient empty field never writes null to storage.
watch([threads, delayMs], ([t, d]) => {
  if (!Number.isFinite(t) || t < 1 || !Number.isFinite(d) || d < 0) return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ threads: t, delayMs: d }));
  } catch {
    // ignore quota / unavailable storage
  }
});

export function useToolRunnerSettings() {
  return { threads, delayMs };
}
