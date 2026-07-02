export type WorkspaceTab = 'adaccounts' | 'businesses' | 'page' | 'pixel';

export interface WorkspaceTabMeta {
  value: WorkspaceTab;
  label: string;
  description: string;
  countLabel: string;
  tablePlaceholder: string;
  functionPanelTitle: string;
  functionPanelDescription: string;
}
