import { ref, watch } from 'vue';

const STORAGE_KEY = 'adaccounts.workspace-panels.v1';
const MIN_PANEL_SIZE = 10;
const MAX_PANEL_SIZE = 28;

interface WorkspacePanelSettings {
  panelOneOpen: boolean;
  panelTwoOpen: boolean;
  panelOneSize: number;
  panelTwoSize: number;
}

const DEFAULTS: WorkspacePanelSettings = {
  panelOneOpen: true,
  panelTwoOpen: true,
  panelOneSize: 15,
  panelTwoSize: 15,
};

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readPanelSize(value: unknown, fallback: number): number {
  const size = Number(value);
  return Number.isFinite(size) && size >= MIN_PANEL_SIZE && size <= MAX_PANEL_SIZE ? size : fallback;
}

function load(): WorkspacePanelSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };

    const parsed = JSON.parse(raw) as Partial<WorkspacePanelSettings>;

    return {
      panelOneOpen: readBoolean(parsed.panelOneOpen, DEFAULTS.panelOneOpen),
      panelTwoOpen: readBoolean(parsed.panelTwoOpen, DEFAULTS.panelTwoOpen),
      panelOneSize: readPanelSize(parsed.panelOneSize, DEFAULTS.panelOneSize),
      panelTwoSize: readPanelSize(parsed.panelTwoSize, DEFAULTS.panelTwoSize),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

const initial = load();
const panelOneOpen = ref(initial.panelOneOpen);
const panelTwoOpen = ref(initial.panelTwoOpen);
const panelOneSize = ref(initial.panelOneSize);
const panelTwoSize = ref(initial.panelTwoSize);

watch([panelOneOpen, panelTwoOpen, panelOneSize, panelTwoSize], ([oneOpen, twoOpen, oneSize, twoSize]) => {
  if (
    !Number.isFinite(oneSize) ||
    oneSize < MIN_PANEL_SIZE ||
    oneSize > MAX_PANEL_SIZE ||
    !Number.isFinite(twoSize) ||
    twoSize < MIN_PANEL_SIZE ||
    twoSize > MAX_PANEL_SIZE
  ) {
    return;
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        panelOneOpen: oneOpen,
        panelTwoOpen: twoOpen,
        panelOneSize: oneSize,
        panelTwoSize: twoSize,
      })
    );
  } catch {
    // ignore quota / unavailable storage
  }
});

export function useWorkspacePanels() {
  return { panelOneOpen, panelTwoOpen, panelOneSize, panelTwoSize };
}
