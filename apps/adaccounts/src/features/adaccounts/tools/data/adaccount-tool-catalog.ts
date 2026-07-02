import type { ToolFunction, ToolGroup } from '@/types/tool-action.types';

// Static config driving the tool panel (group -> functions -> config fields).
// Modeled on the TKQC tab of the reference FB-automation tools: each function
// opens an inline config form built from its `fields`. UI-only for now — the
// run handler is a demo; real FB API wiring is swapped in later.
//
// All icons must exist in shared-ui ICON_NAMES. Field schemas describe the
// panel; a single generic form renders them (no hand-written panel per button).
export const TOOL_GROUPS: ToolGroup[] = [
  {
    id: 'status',
    label: 'Trạng thái',
    icon: 'zap',
    functions: [
      {
        id: 'open-close-account',
        label: 'Mở / Đóng TK',
        icon: 'refresh-cw',
        fields: [
          {
            key: 'mode',
            label: 'Thao tác',
            type: 'select',
            default: 'close',
            options: [
              { value: 'open', label: 'Mở tài khoản (kích hoạt lại)' },
              { value: 'close', label: 'Đóng tài khoản' },
            ],
          },
          {
            key: 'api',
            label: 'Phương thức API',
            type: 'select',
            default: 'auto',
            options: [
              { value: 'auto', label: 'Tự động (thử lần lượt)' },
              { value: 'v1', label: 'API v1' },
              { value: 'v2', label: 'API v2' },
            ],
          },
        ],
      },
      {
        id: 'activate-prepay',
        label: 'Kích hoạt trả trước',
        icon: 'bolt',
        // No config — applies directly to selected accounts.
      },
      {
        id: 'exit-account',
        label: 'Thoát tài khoản',
        icon: 'log-out',
        fields: [
          {
            key: 'confirm',
            label: 'Tự xóa mình khỏi các TKQC đã chọn',
            type: 'switch',
            default: false,
            hint: 'Bật để xác nhận. Hành động không thể hoàn tác.',
          },
        ],
      },
    ],
  },
  {
    id: 'info',
    label: 'Thông tin',
    icon: 'file-text',
    functions: [
      {
        id: 'rename',
        label: 'Đổi tên',
        icon: 'pencil',
        fields: [
          {
            key: 'newName',
            label: 'Tên mới',
            type: 'text',
            placeholder: 'Ví dụ: Shop hoặc Shop * VN',
            hint: 'Có dấu * thì số chèn vào vị trí *, không thì nối vào cuối. Để trống = chỉ số.',
          },
          {
            key: 'mode',
            label: 'Kiểu đánh số',
            type: 'select',
            default: 'random',
            options: [
              { value: 'random', label: 'Ngẫu nhiên' },
              { value: 'sequential', label: 'Tuần tự' },
            ],
          },
          {
            key: 'startNum',
            label: 'Số bắt đầu (tuần tự)',
            type: 'number',
            default: '1',
            placeholder: '1',
            showWhen: { key: 'mode', equals: 'sequential' },
          },
        ],
      },
      {
        id: 'change-info',
        label: 'Đổi thông tin',
        icon: 'edit',
        fields: [
          { key: 'businessName', label: 'Tên doanh nghiệp', type: 'text', placeholder: 'Business name' },
          { key: 'country', label: 'Quốc gia', type: 'text', placeholder: 'VN' },
          { key: 'currency', label: 'Tiền tệ', type: 'text', placeholder: 'VND' },
          { key: 'timezone', label: 'Múi giờ', type: 'text', placeholder: 'Asia/Ho_Chi_Minh' },
          { key: 'taxId', label: 'Mã số thuế', type: 'text', placeholder: 'Tax ID' },
        ],
      },
    ],
  },
  {
    id: 'spend',
    label: 'Chi tiêu',
    icon: 'pie-chart',
    functions: [
      {
        id: 'spend-limit',
        label: 'Giới hạn chi tiêu',
        icon: 'bar-chart-2',
        fields: [
          {
            key: 'mode',
            label: 'Thao tác',
            type: 'select',
            default: 'set',
            options: [
              { value: 'set', label: 'Đặt giới hạn' },
              { value: 'remove', label: 'Gỡ giới hạn' },
              { value: 'reset', label: 'Reset số đã chi' },
            ],
          },
          {
            key: 'amount',
            label: 'Số tiền',
            type: 'number',
            placeholder: '1000000',
            hint: 'Theo đơn vị tiền tệ của tài khoản.',
          },
        ],
      },
      {
        id: 'pay-debt',
        label: 'Thanh toán dư nợ',
        icon: 'credit-card',
        // No config — settles current outstanding balance on selected accounts.
      },
    ],
  },
  {
    id: 'users',
    label: 'Người dùng',
    icon: 'users',
    functions: [
      {
        id: 'add-user',
        label: 'Thêm admin',
        icon: 'user',
        fields: [
          {
            key: 'uidList',
            label: 'Danh sách UID',
            type: 'textarea',
            placeholder: 'Mỗi dòng 1 UID hoặc link Facebook',
            hint: 'Mỗi UID một dòng.',
          },
          {
            key: 'role',
            label: 'Vai trò',
            type: 'select',
            default: 'admin',
            options: [
              { value: 'admin', label: 'Quản trị viên' },
              { value: 'advertiser', label: 'Nhà quảng cáo' },
              { value: 'analyst', label: 'Người phân tích' },
            ],
          },
        ],
      },
      {
        id: 'remove-user',
        label: 'Xóa admin',
        icon: 'unlink',
        fields: [
          {
            key: 'mode',
            label: 'Chế độ',
            type: 'select',
            default: 'allExceptMe',
            options: [
              { value: 'hiddenOnly', label: 'Chỉ xóa admin ẩn' },
              { value: 'allExceptMe', label: 'Xóa tất cả trừ mình' },
              { value: 'allExceptIdsAndMe', label: 'Xóa tất cả trừ UID nhập' },
              { value: 'byIdExceptMe', label: 'Xóa theo UID nhập' },
              { value: 'selfRemove', label: 'Xóa chính mình' },
            ],
          },
          {
            key: 'uidList',
            label: 'UID cần xóa',
            type: 'textarea',
            placeholder: 'Mỗi dòng 1 UID',
            hint: 'Luôn bỏ qua UID của chính mình và owner TKQC.',
            showWhen: { key: 'mode', equals: 'byIdExceptMe' },
          },
          {
            key: 'uidListKeep',
            label: 'UID giữ lại',
            type: 'textarea',
            placeholder: 'Mỗi dòng 1 UID cần giữ lại',
            hint: 'Luôn giữ chính mình + owner TKQC, kể cả khi không nhập ở đây.',
            showWhen: { key: 'mode', equals: 'allExceptIdsAndMe' },
          },
        ],
      },
      {
        id: 'assign-permission',
        label: 'Chỉ định quyền',
        icon: 'shield-check',
        fields: [
          {
            key: 'businessUserId',
            label: 'Business User ID',
            type: 'text',
            placeholder: 'ID người dùng trong BM',
          },
          {
            key: 'role',
            label: 'Vai trò',
            type: 'select',
            default: 'advertiser',
            options: [
              { value: 'admin', label: 'Quản trị viên' },
              { value: 'advertiser', label: 'Nhà quảng cáo' },
              { value: 'analyst', label: 'Người phân tích' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'partner',
    label: 'Đối tác',
    icon: 'share-2',
    functions: [
      {
        id: 'share-partner',
        label: 'Share đối tác',
        icon: 'share-2',
        fields: [
          {
            key: 'bmIds',
            label: 'BM đích',
            type: 'textarea',
            placeholder: 'Mỗi dòng 1 ID Business Manager',
          },
          {
            key: 'role',
            label: 'Vai trò',
            type: 'select',
            default: 'admin',
            options: [
              { value: 'admin', label: 'Quản trị viên' },
              { value: 'advertiser', label: 'Nhà quảng cáo' },
              { value: 'analyst', label: 'Người phân tích' },
            ],
          },
        ],
      },
      {
        id: 'remove-partner',
        label: 'Xóa đối tác',
        icon: 'circle-x',
        fields: [
          {
            key: 'mode',
            label: 'Chế độ',
            type: 'select',
            default: 'select',
            options: [
              { value: 'select', label: 'Chọn từ danh sách' },
              { value: 'all', label: 'Xóa tất cả' },
              { value: 'manual', label: 'Nhập thủ công' },
            ],
          },
          {
            key: 'bmIds',
            label: 'ID đối tác (chế độ thủ công)',
            type: 'textarea',
            placeholder: 'Mỗi dòng 1 ID',
          },
        ],
      },
      {
        id: 'share-pixel',
        label: 'Share Pixel',
        icon: 'link',
        fields: [
          { key: 'pixelId', label: 'Pixel ID', type: 'text', placeholder: 'ID Pixel' },
          {
            key: 'bmId',
            label: 'BM ID',
            type: 'text',
            placeholder: 'Để trống để tự dò',
            hint: 'Bỏ trống nếu muốn tự động tìm BM.',
          },
        ],
      },
    ],
  },
  {
    id: 'campaign',
    label: 'Chiến dịch',
    icon: 'megaphone',
    functions: [
      {
        id: 'seed-camp',
        label: 'Lên camp mồi',
        icon: 'megaphone',
        fields: [
          { key: 'pageId', label: 'Page ID', type: 'text', placeholder: 'ID Page' },
          { key: 'postId', label: 'Post ID', type: 'text', placeholder: 'ID bài viết' },
          { key: 'pixelId', label: 'Pixel ID', type: 'text', placeholder: 'ID Pixel (tùy chọn)' },
          { key: 'budget', label: 'Ngân sách', type: 'number', placeholder: '50000' },
        ],
      },
      {
        id: 'campaign-manager',
        label: 'Quản lý chiến dịch',
        icon: 'settings',
        fields: [
          {
            key: 'action',
            label: 'Hành động',
            type: 'select',
            default: 'PAUSED',
            options: [
              { value: 'ACTIVE', label: 'Bật (ACTIVE)' },
              { value: 'PAUSED', label: 'Tạm dừng (PAUSED)' },
              { value: 'DELETE', label: 'Xóa (DELETE)' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'card',
    label: 'Thẻ',
    icon: 'credit-card',
    functions: [
      {
        id: 'add-card',
        label: 'Thêm thẻ',
        icon: 'plus',
        fields: [
          { key: 'cardNumber', label: 'Số thẻ', type: 'text', placeholder: '0000 0000 0000 0000' },
          { key: 'expiry', label: 'Hết hạn (MM/YY)', type: 'text', placeholder: '12/28' },
          { key: 'cvv', label: 'CVV', type: 'text', placeholder: '000' },
          {
            key: 'mode',
            label: 'Phạm vi',
            type: 'select',
            default: 'single',
            options: [
              { value: 'single', label: '1 thẻ / 1 TKQC' },
              { value: 'multi', label: '1 thẻ cho nhiều TKQC' },
            ],
          },
        ],
      },
      {
        id: 'delete-card',
        label: 'Xóa thẻ',
        icon: 'trash-2',
        // No config — scans cards on selected accounts, then user picks to remove.
      },
    ],
  },
  {
    id: 'asset-group',
    label: 'Nhóm tài sản',
    icon: 'folder',
    functions: [
      {
        id: 'manage-asset-group',
        label: 'Quản lý nhóm tài sản',
        icon: 'folder-open',
        fields: [
          {
            key: 'mode',
            label: 'Thao tác',
            type: 'select',
            default: 'add',
            options: [
              { value: 'add', label: 'Thêm TKQC vào nhóm' },
              { value: 'remove', label: 'Gỡ TKQC khỏi nhóm' },
            ],
          },
          {
            key: 'groupId',
            label: 'ID nhóm tài sản',
            type: 'text',
            placeholder: 'ID Business Asset Group',
          },
        ],
      },
    ],
  },
];

// Flat list of all TKQC functions, derived from TOOL_GROUPS (DRY — single source).
// Current and legacy views can keep consuming this flat order; the redesigned
// catalog below is only a temporary product grouping for Panel 1.
export const TOOL_FUNCTIONS: ToolFunction[] = TOOL_GROUPS.flatMap((g) => g.functions);

const TOOL_FUNCTION_BY_ID = new Map(TOOL_FUNCTIONS.map((fn) => [fn.id, fn]));

function groupFunctions(ids: string[]): ToolFunction[] {
  return ids.map((id) => TOOL_FUNCTION_BY_ID.get(id)).filter((fn): fn is ToolFunction => Boolean(fn));
}

// Temporary 4-group UI taxonomy approved for the TKQC redesign. The product
// owner will reorder/remap tools later, so keep this mapping obvious to edit.
export const TOOL_UI_GROUPS: ToolGroup[] = [
  {
    id: 'super-share',
    label: 'Super Share',
    icon: 'send',
    functions: groupFunctions([
      'share-partner',
      'share-pixel',
      'assign-permission',
      'add-user',
    ]),
  },
  {
    id: 'appeal-tkqc',
    label: 'Kháng TKQC',
    icon: 'star',
    functions: groupFunctions([
      'open-close-account',
      'activate-prepay',
      'exit-account',
      'spend-limit',
      'pay-debt',
    ]),
  },
  {
    id: 'change-info',
    label: 'Đổi Info',
    icon: 'file-text',
    functions: groupFunctions([
      'rename',
      'change-info',
      'seed-camp',
      'campaign-manager',
      'manage-asset-group',
    ]),
  },
  {
    id: 'remove-hidden-admin',
    label: 'Xoá QTV ẩn',
    icon: 'users',
    functions: groupFunctions([
      'remove-user',
      'remove-partner',
      'add-card',
      'delete-card',
    ]),
  },
];
