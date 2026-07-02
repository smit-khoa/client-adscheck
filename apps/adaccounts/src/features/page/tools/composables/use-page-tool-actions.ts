import { createToolActions, type ToolActionsInstance } from '@/composables/tool-actions/create-tool-actions';
import { PAGE_TOOL_FUNCTIONS } from '../data/page-tool-catalog';

// Page tool-actions instance — same shape/behaviour as the TKQC one, but its own
// catalog + its own localStorage keys (.page.v1) so Page ordering/enable state
// never collides with TKQC. Module-scoped so it survives navigation.
const pageInstance = createToolActions({
  functions: PAGE_TOOL_FUNCTIONS,
  orderKey: 'adaccounts.page-tool-order.v1',
  enabledKey: 'adaccounts.page-tool-enabled.v1',
});

export function usePageToolActions(): ToolActionsInstance {
  return pageInstance;
}
