import { listBags, deleteBag } from '../../../../api/tools/bm/bag-list-delete';
import { listBmAdmins, removeBmAdmin, setBmAdminRole } from '../../../../api/tools/bm/bm-admins';

// Config driving the generic BmManagerDialog (viewer functions). Each viewer
// function id maps to: the Table columns, a loader for one BM, and the inline
// actions that run a mutation per selected row. Keeps the dialog dumb — it only
// renders columns, collects checked row ids, and dispatches the chosen action.

// One Table column (subset of shared-ui Table's Column — only what we set).
export interface ViewerColumn {
  field: string;
  name: string;
  width: number;
}

// A row is a flat record; it MUST carry an `id` (Table keys + checkbox use it).
export type ViewerRow = Record<string, string | number> & { id: string };

export interface ViewerAction {
  label: string;
  // visual hint for the button; maps to shared-ui Button variants.
  variant?: 'default' | 'destructive' | 'outline';
  // Run the mutation for one selected row id. Returns the tool's {ok,message}.
  run: (bmId: string, id: string) => Promise<{ ok: boolean; message: string }>;
}

export interface ViewerConfig {
  title: string;
  columns: ViewerColumn[];
  // Load rows for one BM. Mirrors the tool return: ok+rows or ok:false+message.
  load: (bmId: string) => Promise<{ ok: true; rows: ViewerRow[] } | { ok: false; message: string }>;
  actions: ViewerAction[];
}

export const VIEWER_CONFIGS: Record<string, ViewerConfig> = {
  'manage-bag': {
    title: 'Quản lý nhóm tài sản (BAG)',
    columns: [
      { field: 'id', name: 'ID nhóm', width: 200 },
      { field: 'name', name: 'Tên nhóm', width: 240 },
      { field: 'assetCount', name: 'Số tài sản', width: 120 },
    ],
    load: (bmId) => listBags(bmId),
    actions: [{ label: 'Xóa nhóm', variant: 'destructive', run: deleteBag }],
  },
  'manage-bm-admins': {
    title: 'Quản lý quyền QTV',
    columns: [
      { field: 'name', name: 'Tên', width: 200 },
      { field: 'email', name: 'Email', width: 240 },
      { field: 'role', name: 'Vai trò', width: 140 },
    ],
    load: (bmId) => listBmAdmins(bmId),
    actions: [
      { label: 'Xóa', variant: 'destructive', run: removeBmAdmin },
      { label: 'Nâng QTV', variant: 'default', run: (bmId, id) => setBmAdminRole(bmId, id, 'admin') },
      { label: 'Hạ NV', variant: 'outline', run: (bmId, id) => setBmAdminRole(bmId, id, 'employee') },
    ],
  },
};
