import type { LoadAdAccountsConfig, LoadAdAccountsOptions } from '../types/account-list.types';

const BASE_FIELDS = ['account_id', 'name', 'account_status', 'owner_business'];

const BASIC_FIELDS = [
  'agencies{id,name,access_status,permitted_roles}',
  'created_time',
  'timezone_name',
  'timezone_offset_hours_utc',
  'disable_reason',
  'business_country_code',
  'is_prepay_account',
  'owner',
  'currency',
];

const FINANCE_FIELDS = [
  'next_bill_date',
  'balance',
  'adtrust_dsl',
  'spend_cap',
  'amount_spent',
  'adspaymentcycle{threshold_amount}',
];

const SPEND_INSIGHTS_FIELDS = [
  'insights.date_preset(maximum){spend}',
];

const PAYMENT_FIELDS = [
  'funding_source_details{display_string,type}',
  'all_payment_methods{pm_credit_card{credential_id,display_string},payment_method_direct_debits{display_string},payment_method_paypal{email_address},payment_method_tokens{type}}',
];

export const DEFAULT_LOAD_ADACCOUNTS_CONFIG: LoadAdAccountsConfig = {
  source: 'all',
  bmIds: '',
  advanced: true,
  options: {
    basic: true,
    payment: true,
    finance: true,
    spendInsights: true,
    admin: true,
    checkHold: false,
    hiddenBm: false,
  },
  permission: 'all',
  accountType: 'all',
  pageLimit: 100,
};

function normalizeOptions(options?: Partial<LoadAdAccountsOptions>): LoadAdAccountsOptions {
  return {
    ...DEFAULT_LOAD_ADACCOUNTS_CONFIG.options,
    ...(options ?? {}),
  };
}

export function normalizeLoadConfig(
  config: Partial<LoadAdAccountsConfig> = {}
): LoadAdAccountsConfig {
  const pageLimit = Math.min(500, Math.max(1, Math.floor(config.pageLimit ?? DEFAULT_LOAD_ADACCOUNTS_CONFIG.pageLimit)));

  return {
    ...DEFAULT_LOAD_ADACCOUNTS_CONFIG,
    ...config,
    bmIds: config.bmIds ?? DEFAULT_LOAD_ADACCOUNTS_CONFIG.bmIds,
    options: normalizeOptions(config.options),
    pageLimit,
  };
}

export function buildDetailFields(config: LoadAdAccountsConfig, uid: string): string[] {
  const fields = new Set(BASE_FIELDS);
  if (!config.advanced) return [...fields];

  if (config.options.basic) BASIC_FIELDS.forEach((field) => fields.add(field));
  if (config.options.finance) FINANCE_FIELDS.forEach((field) => fields.add(field));
  if (config.options.spendInsights) SPEND_INSIGHTS_FIELDS.forEach((field) => fields.add(field));
  if (config.options.admin) {
    fields.add('users{id,is_active,name,permissions,role,roles}');
    if (uid) fields.add(`userpermissions.user(${uid}){role}`);
  }

  return [...fields];
}

export function buildPaymentFields(config: LoadAdAccountsConfig): string[] {
  if (!config.advanced || !config.options.payment) return [];
  return PAYMENT_FIELDS;
}
