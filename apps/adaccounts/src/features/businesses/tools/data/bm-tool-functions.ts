import type { ToolFunction } from '../types';

// Catalog driving the BM action panel — same data-driven shape as TKQC
// tool-actions, so one generic form renders each function from its `fields`.
// Each function maps to a runner in use-bm-runner; the panel only dispatches by
// id. Add more BM actions here as they're implemented (no hand-written panel).
export const BM_TOOL_FUNCTIONS: ToolFunction[] = [
  {
    id: 'share-bm-users',
    label: 'Share quyền QTV/NV',
    icon: 'share-2',
    requiresBm: true,
    fields: [
      {
        key: 'emails',
        label: 'Danh sách email',
        type: 'textarea',
        placeholder: 'Mỗi dòng 1 email',
        hint: 'Mỗi email một dòng. Email tự thêm tag chống trùng lời mời.',
      },
      {
        key: 'role',
        label: 'Vai trò',
        type: 'select',
        default: 'admin',
        options: [
          { value: 'admin', label: 'QTV (Quản trị viên)' },
          { value: 'employee', label: 'NV (Nhân viên)' },
        ],
      },
    ],
  },
  {
    id: 'cancel-pending-invites',
    label: 'Hủy lời mời đang chờ',
    icon: 'circle-x',
    requiresBm: true,
    fields: [
      {
        key: 'mode',
        label: 'Chế độ',
        type: 'select',
        default: 'all',
        options: [
          { value: 'all', label: 'Hủy tất cả' },
          { value: 'by-email', label: 'Theo email' },
        ],
      },
      {
        key: 'emails',
        label: 'Danh sách email',
        type: 'textarea',
        placeholder: 'Mỗi dòng 1 email',
        showWhen: { key: 'mode', equals: 'by-email' },
      },
    ],
  },
  {
    id: 'create-bm',
    label: 'Tạo BM mới',
    icon: 'building-2',
    requiresBm: false,
    fields: [
      { key: 'bmName', label: 'Tên BM', type: 'text', placeholder: 'Tên BM' },
      { key: 'bmCount', label: 'Số lượng', type: 'number', default: 1 },
      {
        key: 'createBmMode',
        label: 'Chế độ tạo',
        type: 'select',
        default: 'over',
        options: [
          { value: 'over', label: 'Over (REST)' },
          { value: '350', label: 'BM350' },
          { value: '50', label: 'BM50' },
          { value: 'api1', label: 'API1' },
          { value: 'api2', label: 'API2' },
          { value: 'api3', label: 'API3' },
        ],
      },
    ],
  },
  {
    id: 'leave-bm',
    label: 'Thoát BM',
    icon: 'log-out',
    requiresBm: true,
    fields: [],
  },
  {
    id: 'delete-bm',
    label: 'Xóa BM vĩnh viễn',
    icon: 'trash-2',
    requiresBm: true,
    fields: [
      {
        key: 'confirm',
        label: 'Gõ XOA để xác nhận',
        type: 'text',
        placeholder: 'XOA',
        hint: 'Thao tác KHÔNG hoàn tác. BM sẽ bị lên lịch xóa vĩnh viễn.',
      },
    ],
  },
  {
    id: 'create-adaccount',
    label: 'Tạo TKQC trong BM',
    icon: 'credit-card',
    requiresBm: true,
    fields: [
      { key: 'accName', label: 'Tên TKQC', type: 'text', placeholder: 'Tên TKQC' },
      { key: 'count', label: 'Số lượng / BM', type: 'number', default: 1 },
      {
        key: 'currency',
        label: 'Tiền tệ',
        type: 'select',
        default: 'USD',
        options: [
          { value: 'USD', label: 'USD' },
          { value: 'VND', label: 'VND' },
        ],
      },
      {
        key: 'timezoneId',
        label: 'Múi giờ',
        type: 'select',
        default: '140',
        options: [
          { value: '140', label: 'Asia/Ho_Chi_Minh' },
          { value: '1', label: 'America/Los_Angeles' },
        ],
      },
      {
        key: 'mode',
        label: 'Nguồn API',
        type: 'select',
        default: 'meofb',
        options: [
          { value: 'meofb', label: 'MeoFB (v23.0)' },
          { value: 'xmeta', label: 'Xmeta (v17.0)' },
        ],
      },
    ],
  },
  {
    id: 'claim-adaccount',
    label: 'Nhét TKQC vào BM',
    icon: 'log-in',
    requiresBm: true,
    fields: [
      {
        key: 'adAccountIds',
        label: 'Danh sách TKQC',
        type: 'textarea',
        placeholder: 'Mỗi dòng 1 ID TKQC',
        hint: 'Mỗi ID một dòng.',
      },
      {
        key: 'mode',
        label: 'Nguồn API',
        type: 'select',
        default: 'meofb',
        options: [
          { value: 'meofb', label: 'MeoFB (REST form)' },
          { value: 'xmeta-single', label: 'Xmeta (từng cái)' },
          { value: 'xmeta-batch', label: 'Xmeta (batch)' },
        ],
      },
    ],
  },
  {
    id: 'remove-shared-adaccount',
    label: 'Xóa TK Share',
    icon: 'minus',
    requiresBm: true,
    fields: [
      {
        key: 'mode',
        label: 'Chế độ',
        type: 'select',
        default: 'all',
        options: [
          { value: 'all', label: 'Tất cả' },
          { value: 'die', label: 'Chỉ TK die' },
          { value: 'live', label: 'Chỉ TK live' },
          { value: 'id', label: 'Theo ID' },
        ],
      },
      {
        key: 'adAccountIds',
        label: 'Danh sách TKQC',
        type: 'textarea',
        placeholder: 'Mỗi dòng 1 ID TKQC',
        showWhen: { key: 'mode', equals: 'id' },
      },
    ],
  },
  {
    id: 'remove-partner',
    label: 'Xóa đối tác khỏi BM',
    icon: 'trash',
    requiresBm: true,
    fields: [
      {
        key: 'mode',
        label: 'Chế độ',
        type: 'select',
        default: 'all',
        options: [
          { value: 'all', label: 'Tất cả' },
          { value: 'id', label: 'Theo ID' },
        ],
      },
      {
        key: 'partnerIds',
        label: 'Danh sách Partner BM ID',
        type: 'textarea',
        placeholder: 'Mỗi dòng 1 ID',
        showWhen: { key: 'mode', equals: 'id' },
      },
    ],
  },
  {
    id: 'request-adaccount-access',
    label: 'Yêu cầu quyền QC',
    icon: 'megaphone',
    requiresBm: true,
    fields: [
      {
        key: 'adAccountIds',
        label: 'Danh sách TKQC',
        type: 'textarea',
        placeholder: 'Mỗi dòng 1 ID TKQC',
        hint: 'BM đang chọn xin quyền QC trên các TKQC này.',
      },
    ],
  },
  {
    id: 'create-page-bm',
    label: 'Tạo Page trong BM',
    icon: 'file-text',
    requiresBm: true,
    fields: [
      {
        key: 'pageNames',
        label: 'Danh sách tên Page',
        type: 'textarea',
        placeholder: 'Mỗi dòng 1 tên Page',
        hint: 'Mỗi BM × mỗi tên → 1 Page mới.',
      },
    ],
  },
  {
    id: 'add-bm-domain',
    label: 'Thêm Miền vào BM',
    icon: 'globe',
    requiresBm: true,
    fields: [
      {
        key: 'domains',
        label: 'Danh sách miền',
        type: 'textarea',
        placeholder: 'Mỗi dòng 1 miền (vd: example.com)',
        hint: 'Mỗi BM × mỗi miền → 1 lần thêm. Dòng không hợp lệ bị bỏ qua.',
      },
    ],
  },
  {
    id: 'claim-page',
    label: 'Nhét Page vào BM',
    // 'file-input' not in IconName sprite → reuse 'log-in' (same claim intent).
    icon: 'log-in',
    requiresBm: true,
    fields: [
      {
        key: 'pageIds',
        label: 'Danh sách Page ID',
        type: 'textarea',
        placeholder: 'Mỗi dòng 1 Page ID',
        hint: 'Mỗi BM × mỗi Page ID → 1 lần nhét.',
      },
      {
        key: 'mode',
        label: 'Nguồn API',
        type: 'select',
        default: 'meofb',
        options: [
          { value: 'meofb', label: 'MeoFB (v23.0)' },
          { value: 'xmeta', label: 'Xmeta (GraphQL)' },
        ],
      },
    ],
  },
  {
    id: 'reactivate-page',
    label: 'Kích hoạt Page',
    // 'power' not in IconName sprite → reuse 'refresh-cw' (reactivate intent).
    icon: 'refresh-cw',
    requiresBm: true,
    fields: [],
  },
  {
    id: 'remove-page',
    label: 'Xóa Page khỏi BM',
    // 'file-x' not in IconName sprite → reuse 'trash' (remove intent).
    icon: 'trash',
    requiresBm: true,
    fields: [
      {
        key: 'mode',
        label: 'Chế độ',
        type: 'select',
        default: 'all',
        options: [
          { value: 'all', label: 'Tất cả' },
          { value: 'id', label: 'Theo ID' },
        ],
      },
      {
        key: 'pageIds',
        label: 'Danh sách Page ID',
        type: 'textarea',
        placeholder: 'Mỗi dòng 1 Page ID',
        showWhen: { key: 'mode', equals: 'id' },
      },
    ],
  },
  {
    id: 'rename-bm',
    label: 'Đổi tên BM',
    icon: 'pencil',
    requiresBm: true,
    fields: [
      {
        key: 'bmName',
        label: 'Tên BM mới',
        type: 'text',
        placeholder: 'Tên BM mới',
        hint: 'Áp cho mọi BM đang chọn.',
      },
      {
        key: 'mode',
        label: 'Nguồn API',
        type: 'select',
        default: 'meofb',
        options: [
          { value: 'meofb', label: 'MeoFB (v18.0)' },
          { value: 'xmeta', label: 'Xmeta (v17.0)' },
        ],
      },
    ],
  },
  {
    id: 'update-bm-legal',
    label: 'Đổi thông tin pháp lý BM',
    icon: 'file-text',
    requiresBm: true,
    fields: [
      { key: 'legalName', label: 'Tên pháp lý', type: 'text' },
      { key: 'street', label: 'Địa chỉ (đường)', type: 'text' },
      { key: 'city', label: 'Thành phố', type: 'text' },
      { key: 'state', label: 'Tỉnh/Bang', type: 'text' },
      { key: 'postal', label: 'Mã bưu chính', type: 'text' },
      {
        key: 'country',
        label: 'Quốc gia',
        type: 'text',
        hint: 'Mã ISO-2 (vd VN, US) — test-live xác nhận.',
      },
      { key: 'phone', label: 'Số điện thoại', type: 'text' },
      { key: 'website', label: 'Website', type: 'text' },
      { key: 'taxId', label: 'Mã số thuế', type: 'text' },
    ],
  },
  {
    id: 'remove-ig-account',
    label: 'Xóa TK IG khỏi BM',
    // 'instagram' not in IconName sprite → reuse 'trash' (remove intent).
    icon: 'trash',
    requiresBm: true,
    fields: [],
  },
  {
    id: 'enable-monthly-invoicing',
    label: 'Kích Info BM (Monthly Invoicing)',
    icon: 'credit-card',
    requiresBm: true,
    fields: [],
  },
  {
    id: 'create-bag',
    label: 'Tạo nhóm tài sản (BAG)',
    icon: 'folder',
    requiresBm: true,
    fields: [
      {
        key: 'bagName',
        label: 'Tên nhóm tài sản',
        type: 'text',
        placeholder: 'Tên nhóm',
        hint: 'Mỗi BM đang chọn tạo 1 nhóm cùng tên.',
      },
    ],
  },
  {
    id: 'bag-add-assets',
    label: 'Thêm tài sản vào nhóm',
    icon: 'folder-open',
    requiresBm: true,
    fields: [
      {
        key: 'bagId',
        label: 'ID nhóm tài sản',
        type: 'text',
        placeholder: 'business_asset_group_id',
      },
      {
        key: 'assetType',
        label: 'Loại tài sản',
        type: 'select',
        default: 'ad-account',
        options: [
          { value: 'ad-account', label: 'TKQC (Ad Account)' },
          { value: 'page', label: 'Page' },
          { value: 'pixel', label: 'Pixel' },
        ],
      },
      {
        key: 'assetIds',
        label: 'Danh sách ID tài sản',
        type: 'textarea',
        placeholder: 'Mỗi dòng 1 ID',
        hint: 'Mỗi BM gom hết ID vào 1 lần thêm.',
      },
    ],
  },
  {
    id: 'assign-assets-to-user',
    label: 'Thêm tài sản cho User',
    // 'user-plus' not in IconName sprite → reuse 'user' (assign-to-user intent).
    icon: 'user',
    requiresBm: true,
    fields: [
      {
        key: 'userId',
        label: 'UID người nhận quyền',
        type: 'text',
        placeholder: 'user_id',
      },
      {
        key: 'assetType',
        label: 'Loại tài sản',
        type: 'select',
        default: 'ad-account',
        options: [
          { value: 'ad-account', label: 'TKQC (Ad Account)' },
          { value: 'page', label: 'Page' },
          { value: 'pixel', label: 'Pixel' },
        ],
      },
      {
        key: 'assetIds',
        label: 'Danh sách ID tài sản',
        type: 'textarea',
        placeholder: 'Mỗi dòng 1 ID',
        hint: 'Mỗi BM gom hết ID vào 1 lần cấp cho user.',
      },
      {
        key: 'role',
        label: 'Quyền',
        type: 'select',
        default: 'manage',
        options: [
          { value: 'manage', label: 'Quản lý' },
          { value: 'analyze', label: 'Xem (Analyze)' },
        ],
      },
    ],
  },
  {
    id: 'get-appeal-link',
    label: 'Lấy link kháng BM',
    icon: 'link',
    kind: 'appeal',
    requiresBm: true,
    fields: [],
  },
  {
    id: 'manage-bag',
    label: 'Quản lý nhóm tài sản (BAG)',
    icon: 'settings',
    kind: 'viewer',
    requiresBm: true,
    fields: [],
  },
  {
    id: 'manage-bm-admins',
    label: 'Quản lý quyền QTV',
    icon: 'users',
    kind: 'viewer',
    requiresBm: true,
    fields: [],
  },
  {
    id: 'optout-bm-console',
    label: 'Xem BM giao diện cũ',
    icon: 'eye',
    requiresBm: false, // per-user opt-out, no BM selection
    fields: [],
  },
  {
    id: 'create-waba',
    label: 'Tạo WABA',
    icon: 'message-circle',
    requiresBm: true,
    fields: [
      { key: 'wabaName', label: 'Tên WABA', type: 'text', placeholder: 'Tên WABA' },
      { key: 'wabaCount', label: 'Số lượng / BM', type: 'number', default: 1 },
      {
        key: 'mode',
        label: 'Nguồn API',
        type: 'select',
        default: '4',
        options: [
          { value: '4', label: 'API4 (adsmanager)' },
          { value: '2', label: 'API2 (graph v17 batch)' },
          { value: '0', label: 'API0' },
          { value: '3', label: 'API3' },
        ],
      },
    ],
  },
  {
    id: 'show-readonly-adaccount',
    label: 'Hiện TKQC Read-Only',
    icon: 'eye',
    requiresBm: true,
    fields: [],
  },
];
