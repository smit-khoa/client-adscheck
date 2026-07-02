import type { ExtendedPaymentField, ExtendedPaymentSettings } from '../types';

export const EXTENDED_PAYMENT_STORAGE_KEYS = {
  settings: 'v8.extended-payment.settings',
  selected: 'v8.extended-payment.selected-fields',
  order: 'v8.extended-payment.field-order',
} as const;

export const EXTENDED_PAYMENT_FIELDS: ExtendedPaymentField[] = [
  {
    key: 'account_name',
    label: 'Tên tài khoản',
    iconName: 'user',
    sampleValue: 'Tài khoản 123',
    defaultSelected: false,
  },
  {
    key: 'account_aid',
    label: 'ID tài khoản',
    iconName: 'hash',
    sampleValue: '912309128309',
    defaultSelected: false,
  },
  {
    key: 'account_status',
    label: 'Trạng thái tài khoản',
    iconName: 'circle-check',
    sampleValue: 'Hoạt động',
    defaultSelected: true,
  },
  {
    key: 'limited',
    label: 'Giới hạn chi tiêu',
    iconName: 'trending-up',
    sampleValue: '12.090.090',
    defaultSelected: false,
  },
  {
    key: 'limited2',
    label: 'Limit ẩn (Mới)',
    iconName: 'shield-check',
    sampleValue: 'Limit ẩn',
    defaultSelected: true,
  },
  {
    key: 'threshold',
    label: 'Ngưỡng hiện tại',
    iconName: 'zap',
    sampleValue: '12.090.090',
    defaultSelected: true,
  },
  {
    key: 'balance',
    label: 'Số dư',
    iconName: 'credit-card',
    sampleValue: '12.090.090',
    defaultSelected: true,
  },
  {
    key: 'amount_spend',
    label: 'Tổng chi tiêu',
    iconName: 'bar-chart-2',
    sampleValue: '12.090.090',
    defaultSelected: true,
  },
  {
    key: 'created_at',
    label: 'Ngày tạo tài khoản',
    iconName: 'calendar',
    sampleValue: '09-07-2022',
    defaultSelected: true,
  },
  {
    key: 'billing_at',
    label: 'Ngày lập hóa đơn',
    iconName: 'calendar',
    sampleValue: '29-07-2022',
    defaultSelected: true,
  },
  {
    key: 'admin_hidden',
    label: 'Số admin ẩn',
    iconName: 'users',
    sampleValue: '0',
    defaultSelected: true,
  },
  {
    key: 'account_type',
    label: 'Loại tài khoản',
    iconName: 'check-circle',
    sampleValue: 'Tài khoản cá nhân',
    badge: true,
    defaultSelected: true,
  },
  {
    key: 'timezone',
    label: 'Múi giờ',
    iconName: 'clock',
    sampleValue: 'Asia/Ho_Chi_Minh | +7',
    defaultSelected: true,
  },
  {
    key: 'screen_shot_at',
    label: 'Thời gian chụp',
    iconName: 'camera',
    sampleValue: '14:08 27-06-2026',
    defaultSelected: false,
  },
  {
    key: 'business',
    label: 'BM sở hữu',
    iconName: 'building-2',
    sampleValue: 'SMIT Business',
    defaultSelected: false,
  },
  {
    key: 'payment_card',
    label: 'PT thanh toán',
    iconName: 'credit-card',
    sampleValue: '90-123-1232',
    defaultSelected: true,
  },
  {
    key: 'role',
    label: 'Quyền sở hữu',
    iconName: 'shield',
    sampleValue: 'Quản trị viên',
    badge: true,
    defaultSelected: true,
  },
];

export const DEFAULT_EXTENDED_PAYMENT_SETTINGS: ExtendedPaymentSettings = {
  language: 'auto',
  bubble_display: true,
  currency_mode: 'auto',
  display_currency: 'default',
  signature: '',
};
