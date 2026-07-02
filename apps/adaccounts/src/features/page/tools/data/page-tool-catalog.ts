import type { ToolFunction } from '@/types/tool-action.types';

// Page tool catalog — the 19 Page actions from the feature docs
// (doc-final/futures/page). UI-only for now: every tool shows in the flat list +
// opens its schema-driven config form, but running a workflow warns that no real
// Page action runner exists in this codebase yet. Page row-loading APIs live in
// page-fetch.ts and are intentionally separate from action runners.
//
// Per the docs' rule 2.3b: each tool lists ALL its UI modes (no mode dropped),
// and its mandatory preconditions go in the first field's `hint` (shown as helper
// text / future tooltip). Modes whose real values aren't captured yet are marked.
// All icons must exist in shared-ui ICON_NAMES.
export const PAGE_TOOL_FUNCTIONS: ToolFunction[] = [
  {
    id: 'them-admin-qtv',
    label: 'Thêm Admin/QTV Page',
    icon: 'users',
    fields: [
      {
        key: 'uidList',
        label: 'Danh sách UID',
        type: 'textarea',
        placeholder: 'Mỗi dòng 1 UID người (không phải Page)',
        hint: 'Cần switch profile sang Page → reauth password → mời. admin_id phải là UID người thật.',
      },
      {
        key: 'role',
        label: 'Quyền',
        type: 'select',
        default: 'admin',
        options: [
          { value: 'admin', label: 'Quản trị viên (full control)' },
          { value: 'staff', label: 'Nhân viên (staff)' },
        ],
      },
      {
        key: 'password',
        label: 'Password Via',
        type: 'text',
        sensitive: true,
        placeholder: 'Mật khẩu Via để xác thực lại',
      },
    ],
  },
  {
    id: 'xoa-qtv',
    label: 'Xóa QTV Page',
    icon: 'shield',
    fields: [
      {
        key: 'mode',
        label: 'Chế độ xóa',
        type: 'select',
        default: 'byUid',
        options: [
          { value: 'byUid', label: 'Xóa theo danh sách UID' },
          { value: 'allExceptMe', label: 'Xóa tất cả trừ tôi' },
          { value: 'all', label: 'Xóa tất cả admin' },
        ],
        hint: 'Nhánh "Không BM" cần password Via; nhánh "Có BM" thì không. Hành động khó hồi.',
      },
      {
        key: 'uidList',
        label: 'Danh sách UID',
        type: 'textarea',
        placeholder: 'Mỗi dòng 1 UID',
        showWhen: { key: 'mode', equals: 'byUid' },
      },
      {
        key: 'password',
        label: 'Password Via (nhánh không BM)',
        type: 'text',
        sensitive: true,
        placeholder: 'Mật khẩu Via',
      },
    ],
  },
  {
    id: 'chi-dinh-quyen',
    label: 'Chỉ định & cập nhật quyền',
    icon: 'shield-check',
    fields: [
      {
        key: 'permission',
        label: 'Lựa chọn quyền',
        type: 'select',
        default: 'all',
        options: [
          { value: 'all', label: 'Mọi thứ' },
          { value: 'admin', label: 'Quản trị viên' },
          { value: 'editor', label: 'Người chỉnh sửa' },
          { value: 'moderator', label: 'Người kiểm duyệt' },
          { value: 'advertiser', label: 'Nhà quảng cáo' },
          { value: 'analyst', label: 'Nhà phân tích' },
          { value: 'remove', label: 'Xóa quyền' },
        ],
        hint: 'Chỉ áp dụng cho Page đã nằm trong Business Manager (owner_business ≠ null).',
      },
      {
        key: 'userSource',
        label: 'Nguồn user',
        type: 'select',
        default: 'byId',
        options: [
          { value: 'self', label: 'Chính bản thân' },
          { value: 'loadList', label: 'Load danh sách' },
          { value: 'byId', label: 'Nhập theo ID' },
        ],
      },
      {
        key: 'userIdList',
        label: 'Danh sách User ID',
        type: 'textarea',
        placeholder: 'Mỗi dòng 1 User ID',
        showWhen: { key: 'userSource', equals: 'byId' },
      },
    ],
  },
  {
    id: 'chap-nhan-loi-moi',
    label: 'Chấp nhận / xem lời mời QTV',
    icon: 'mail',
    fields: [
      {
        key: 'action',
        label: 'Hành động',
        type: 'select',
        default: 'accept',
        options: [
          { value: 'accept', label: 'Chấp nhận lời mời' },
          { value: 'decline', label: 'Từ chối lời mời' },
        ],
        hint: 'Chạy với tư cách Via đang đăng nhập, không cần password. Phải có lời mời đang chờ.',
      },
    ],
  },
  {
    id: 'tao-page',
    label: 'Tạo Page',
    icon: 'plus',
    fields: [
      {
        key: 'apiMode',
        label: 'Lựa chọn API',
        type: 'select',
        default: 'api1',
        options: [
          { value: 'api1', label: 'API 1 — Ads Manager' },
          { value: 'api2', label: 'API 2 — GraphQL (rủi ro CP 282)' },
        ],
        hint: 'Chạy tư cách Via, không cần password. API 2 có rủi ro checkpoint 282.',
      },
      {
        key: 'nameList',
        label: 'Danh sách tên Page',
        type: 'textarea',
        placeholder: 'Mỗi dòng 1 tên Page',
      },
      {
        key: 'bio',
        label: 'Mô tả / Bio (tùy chọn)',
        type: 'textarea',
        placeholder: 'Để trống nếu không cần',
      },
      {
        key: 'categoryId',
        label: 'Category ID (tùy chọn)',
        type: 'text',
        placeholder: 'Để trống → dùng mặc định',
      },
    ],
  },
  {
    id: 'doi-ten',
    label: 'Đổi tên Page',
    icon: 'pencil',
    fields: [
      {
        key: 'mode',
        label: 'Chế độ',
        type: 'select',
        default: 'list',
        options: [
          { value: 'list', label: 'Theo danh sách (mỗi Page 1 tên)' },
          { value: 'fixed', label: 'Tên chung cho mọi Page' },
        ],
        hint: 'Cần password Via + switch profile sang Page. Tên Page không bắt buộc duy nhất.',
      },
      {
        key: 'nameList',
        label: 'Danh sách tên mới',
        type: 'textarea',
        placeholder: 'Mỗi dòng 1 tên (chế độ danh sách) hoặc 1 tên chung',
      },
      {
        key: 'password',
        label: 'Password Via',
        type: 'text',
        sensitive: true,
        placeholder: 'Mật khẩu Via',
      },
    ],
  },
  {
    id: 'doi-anh',
    label: 'Đổi ảnh AVT / ảnh bìa',
    icon: 'image',
    fields: [
      {
        key: 'doAvatar',
        label: 'Đổi avatar',
        type: 'switch',
        default: false,
        hint: 'Chạy dưới ngữ cảnh Page, cần file ảnh, không cần password.',
      },
      {
        key: 'avatarFile',
        label: 'Ảnh avatar',
        type: 'file',
        accept: 'image/*',
        showWhen: { key: 'doAvatar', equals: 'true' },
      },
      {
        key: 'doCover',
        label: 'Đổi ảnh bìa',
        type: 'switch',
        default: false,
      },
      {
        key: 'coverFile',
        label: 'Ảnh bìa',
        type: 'file',
        accept: 'image/*',
        showWhen: { key: 'doCover', equals: 'true' },
      },
    ],
  },
  {
    id: 'doi-thong-tin',
    label: 'Đổi thông tin Page',
    icon: 'file-text',
    fields: [
      {
        key: 'bio',
        label: 'Bio (tùy chọn)',
        type: 'textarea',
        placeholder: 'Để trống → bỏ qua',
        hint: 'Mỗi trường là 1 thao tác riêng — chỉ trường có nhập mới được đổi. Đổi địa chỉ cần resolve city_id.',
      },
      {
        key: 'address',
        label: 'Địa chỉ (tùy chọn)',
        type: 'text',
        placeholder: 'street | city | zip | neighborhood',
      },
      {
        key: 'category',
        label: 'Hạng mục — category ID (tùy chọn)',
        type: 'text',
        placeholder: 'Là ID, không phải tên',
      },
      {
        key: 'phone',
        label: 'Số điện thoại (tùy chọn)',
        type: 'text',
      },
      {
        key: 'email',
        label: 'Email (tùy chọn)',
        type: 'text',
      },
    ],
  },
  {
    id: 'nhet-vao-bm',
    label: 'Nhét Page vào BM',
    icon: 'building-2',
    fields: [
      {
        key: 'bmId',
        label: 'BM đích (ID)',
        type: 'text',
        placeholder: 'ID Business Manager Via sở hữu',
        hint: 'Via phải sở hữu BM đích + có token quyền BM. Page chưa thuộc BM khác.',
      },
    ],
  },
  {
    id: 'go-khoi-bm',
    label: 'Gỡ / xóa Page khỏi BM',
    icon: 'x-circle',
    fields: [
      {
        key: 'bmId',
        label: 'BM chứa Page (ID)',
        type: 'text',
        placeholder: 'ID Business Manager đang chứa Page',
        hint: 'Hành động khó hồi. Có thể đòi password khi Facebook yêu cầu xác thực lại.',
      },
      {
        key: 'password',
        label: 'Password (nếu bị challenge)',
        type: 'text',
        sensitive: true,
        placeholder: 'Chỉ nhập khi FB yêu cầu reauth',
      },
      {
        key: 'confirm',
        label: 'Tôi xác nhận gỡ Page khỏi BM',
        type: 'switch',
        default: false,
      },
    ],
  },
  {
    id: 'quan-ly-nhom-tai-san',
    label: 'Quản lý nhóm tài sản',
    icon: 'folder',
    fields: [
      {
        key: 'mode',
        label: 'Chế độ',
        type: 'select',
        default: 'add',
        options: [
          { value: 'add', label: 'Thêm vào nhóm' },
          { value: 'remove', label: 'Gỡ khỏi nhóm' },
        ],
        hint: 'Page phải thuộc BM + có asset group. Cần token Business Manager.',
      },
      {
        key: 'bmId',
        label: 'BM (ID)',
        type: 'text',
        placeholder: 'ID Business Manager',
      },
      {
        key: 'bagId',
        label: 'Nhóm tài sản (ID)',
        type: 'text',
        placeholder: 'ID asset group',
      },
    ],
  },
  {
    id: 'quan-ly-doi-tac',
    label: 'Quản lý đối tác',
    icon: 'share-2',
    fields: [
      {
        key: 'mode',
        label: 'Chế độ',
        type: 'select',
        default: 'add',
        options: [
          { value: 'add', label: 'Thêm đối tác' },
          { value: 'remove', label: 'Gỡ đối tác' },
        ],
        hint: 'Cần partner_bm_id + token quyền Page. Mode "gỡ" khó hồi.',
      },
      {
        key: 'partnerBmId',
        label: 'BM đối tác (ID)',
        type: 'text',
        placeholder: 'ID BM đối tác',
      },
      {
        key: 'permittedTasks',
        label: 'Quyền cấp (permitted_tasks)',
        type: 'text',
        placeholder: 'Bộ giá trị tasks — cần capture',
        hint: 'Giá trị tasks thật chưa rõ — cần capture từ tool gốc.',
        showWhen: { key: 'mode', equals: 'add' },
      },
      {
        key: 'confirm',
        label: 'Tôi xác nhận gỡ đối tác',
        type: 'switch',
        default: false,
        showWhen: { key: 'mode', equals: 'remove' },
      },
    ],
  },
  {
    id: 'xoa-bai-viet',
    label: 'Xóa / quản lý bài viết',
    icon: 'trash-2',
    fields: [
      {
        key: 'mode',
        label: 'Chế độ',
        type: 'select',
        default: 'limit',
        options: [
          { value: 'all', label: 'Xóa tất cả bài' },
          { value: 'limit', label: 'Giới hạn số bài' },
        ],
        hint: 'Cần Page access token. Hành động khó hồi — chế độ "tất cả" phải xác nhận.',
      },
      {
        key: 'limit',
        label: 'Số bài giới hạn',
        type: 'number',
        default: 20,
        showWhen: { key: 'mode', equals: 'limit' },
      },
      {
        key: 'confirm',
        label: 'Tôi xác nhận xóa tất cả bài',
        type: 'switch',
        default: false,
        showWhen: { key: 'mode', equals: 'all' },
      },
    ],
  },
  {
    id: 'bat-tat-nhan-tin',
    label: 'Bật / Tắt nhắn tin',
    icon: 'message-circle',
    fields: [
      {
        key: 'enabled',
        label: 'Bật nhắn tin',
        type: 'switch',
        default: true,
        hint: 'Chạy dưới ngữ cảnh Page (actor_id = page). Có thể cần switch profile (cần verify).',
      },
    ],
  },
  {
    id: 'kich-hoat-huy-dang',
    label: 'Kích hoạt Page hủy đăng',
    icon: 'rotate-cw',
    fields: [
      {
        key: 'mode',
        label: 'Nguồn Page',
        type: 'select',
        default: 'personal',
        options: [
          { value: 'personal', label: 'Page cá nhân hủy đăng' },
          { value: 'bm', label: 'Page hủy đăng trong BM' },
        ],
        hint: 'Page phải đang chờ xóa/đã hủy đăng. Mode "BM" cần BM Via sở hữu. List lấy tự động.',
      },
    ],
  },
  {
    id: 'quan-ly-page-vi-tri',
    label: 'Quản lý Page vị trí',
    icon: 'map-pin',
    fields: [
      {
        key: 'mode',
        label: 'Chế độ',
        type: 'select',
        default: 'attach',
        options: [
          { value: 'attach', label: 'Gắn vị trí' },
          { value: 'detach', label: 'Xóa vị trí' },
        ],
        hint: 'Page mẹ (Page đang chọn) phải đã bật Store Locations. Thiếu quyền → lỗi (#200).',
      },
      {
        key: 'childPageId',
        label: 'Page vị trí (ID page con)',
        type: 'text',
        placeholder: 'ID Page con',
      },
      {
        key: 'storeNumber',
        label: 'Store number',
        type: 'number',
        default: 1001,
        showWhen: { key: 'mode', equals: 'attach' },
      },
    ],
  },
  {
    id: 'huy-lien-ket-ig',
    label: 'Hủy liên kết IG khỏi Page',
    icon: 'unlink',
    fields: [
      {
        key: 'confirm',
        label: 'Tôi xác nhận gỡ liên kết Instagram',
        type: 'switch',
        default: false,
        hint: 'Chạy với actor_id = page. Hành động khó hồi.',
      },
    ],
  },
  {
    id: 'check-boots-livestream',
    label: 'Check Boots Livestream',
    icon: 'video',
    // Read-only: applies directly to the selected Pages, no config.
  },
  {
    id: 'check-earning',
    label: 'Check Earning',
    icon: 'bar-chart-2',
    // Read-only: applies directly to the selected Pages, no config.
  },
];
