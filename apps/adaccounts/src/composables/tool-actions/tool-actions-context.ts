import { inject, provide, type InjectionKey } from 'vue';
import type { ToolActionsInstance } from './create-tool-actions';

// The flat list + the inline form are shared between panels (TKQC, Page, …). They
// read their state through this injection key, so each panel provides its OWN
// tool-actions instance (own catalog + own localStorage keys). This is what lets
// ToolList/ToolFunctionForm stay DRY across panels without per-panel copies.
export const TOOL_ACTIONS_KEY: InjectionKey<ToolActionsInstance> = Symbol('tool-actions');

export function provideToolActions(instance: ToolActionsInstance): void {
  provide(TOOL_ACTIONS_KEY, instance);
}

// Consume the panel-provided instance. Throws if a ToolList/ToolFunctionForm is
// mounted outside a panel that called provideToolActions (developer error).
export function useToolActionsContext(): ToolActionsInstance {
  const instance = inject(TOOL_ACTIONS_KEY);
  if (!instance) {
    throw new Error('useToolActionsContext must be used inside a panel that provides tool-actions');
  }
  return instance;
}
