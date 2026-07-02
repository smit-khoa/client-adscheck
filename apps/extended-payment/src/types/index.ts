import type { IconName } from '@mf2/shared-ui/icons';

export interface ExtendedPaymentField {
  key: string;
  label: string;
  iconName: IconName;
  sampleValue: string;
  badge?: boolean;
  defaultSelected: boolean;
}

export interface ExtendedPaymentSettings {
  language: 'auto' | 'vi' | 'en';
  bubble_display: boolean;
  currency_mode: 'auto' | 'custom';
  display_currency: 'default' | 'VND' | 'USD';
  signature: string;
}
