// Selection is its own capability so tool-actions, bulk ops, advanced mode,
// export, and history can all reuse it without depending on account-list.
//
// `mode`/`excludedIds` describe a future "select all matching the current filter"
// behavior. Only explicit selection is implemented today; the extra fields are a
// type-level boundary so adding all-filtered later does not reshape the store.
export type AccountSelectionMode = 'explicit' | 'all-filtered';

export interface AccountSelectionState {
  selectedIds: Set<string>;
  mode: AccountSelectionMode;
  excludedIds: Set<string>;
}
