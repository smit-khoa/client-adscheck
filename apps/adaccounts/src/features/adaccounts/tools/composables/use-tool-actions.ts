import { TOOL_FUNCTIONS } from '../data/adaccount-tool-catalog';
import { createToolActions, type ToolActionsInstance } from '@/composables/tool-actions/create-tool-actions';

// TKQC tool-actions instance. Built once (module-scoped) so list, cards, form and
// the shared run button all share one state — and it survives navigation like
// before. Page (and any future panel) build their own instance via
// createToolActions with a different catalog + storage keys.
const tkqcInstance = createToolActions({
  functions: TOOL_FUNCTIONS,
  orderKey: 'adaccounts.tool-order.v1',
  enabledKey: 'adaccounts.tool-enabled.v1',
});

export function useToolActions(): ToolActionsInstance {
  return tkqcInstance;
}
