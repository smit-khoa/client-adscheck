import type { CheckHoldResult } from './adaccount-check-hold';
import type { AdAccount, OwnerBusiness, PaymentStatus } from '../types/account-list.types';

export interface AdAccountSeed {
  account_id: string;
  name?: string;
  account_status?: number;
  currency?: string;
  owner_business?: OwnerBusiness;
}

interface GraphConnection<T> {
  data?: T[];
}

interface AdAccountDetail extends AdAccountSeed {
  owner?: { id?: string; name?: string } | string;
  agencies?: GraphConnection<{ id?: string; name?: string; access_status?: string; permitted_roles?: string[] }>;
  created_time?: string;
  timezone_name?: string;
  timezone_offset_hours_utc?: number;
  disable_reason?: string | number;
  business_country_code?: string;
  is_prepay_account?: boolean;
  next_bill_date?: string;
  balance?: string | number;
  adtrust_dsl?: string | number;
  spend_cap?: string | number;
  amount_spent?: string | number;
  adspaymentcycle?: GraphConnection<{ threshold_amount?: string | number }>;
  insights?: GraphConnection<{ spend?: string | number }>;
  users?: GraphConnection<{ id?: string; role?: string }>;
  userpermissions?: GraphConnection<{ role?: string }>;
}

interface PaymentDetail {
  funding_source_details?: { display_string?: string; type?: string };
  all_payment_methods?: Record<string, unknown>;
  paymentError?: string;
}

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeAccountId(value: string | number | undefined): string {
  if (value === undefined) return '';
  const match = String(value).match(/\d{5,}/);
  return match?.[0] ?? '';
}

export function toActId(accountId: string): string {
  return accountId.startsWith('act_') ? accountId : `act_${accountId}`;
}

export function parseIdsText(value: string): string[] {
  const ids = value.match(/\d{5,}/g) ?? [];
  return [...new Set(ids)];
}

export function isBusinessAccount(seed: AdAccountSeed): boolean {
  return Boolean(seed.owner_business?.id);
}

export function matchesAccountType(seed: AdAccountSeed, accountType: 'all' | 'personal' | 'bm'): boolean {
  if (accountType === 'all') return true;
  if (accountType === 'personal') return !isBusinessAccount(seed);
  return isBusinessAccount(seed);
}

function formatTimezone(detail?: AdAccountDetail): string | undefined {
  if (!detail?.timezone_name) return undefined;
  const offset = detail.timezone_offset_hours_utc;
  return offset === undefined ? detail.timezone_name : `${detail.timezone_name} (UTC${offset >= 0 ? '+' : ''}${offset})`;
}

function daysToDue(nextBillDate?: string): number | undefined {
  if (!nextBillDate) return undefined;
  const due = new Date(nextBillDate).getTime();
  if (!Number.isFinite(due)) return undefined;
  return Math.ceil((due - Date.now()) / 86_400_000);
}

function ownerIdentity(owner?: { id?: string; name?: string } | string): { id?: string; name?: string } {
  if (!owner) return {};
  if (typeof owner === 'string') return { id: owner, name: owner };
  return { id: owner.id, name: owner.name ?? owner.id };
}

function adminCount(detail: AdAccountDetail): number | undefined {
  const roleCount = detail.userpermissions?.data?.filter((permission) =>
    ['ADMIN', 'ADVERTISER', 'ANALYST'].includes(String(permission.role ?? '').toUpperCase())
  ).length;
  if (roleCount !== undefined) return roleCount;
  return detail.users?.data?.length;
}

function paymentDisplay(payment?: PaymentDetail): { value?: string; status: PaymentStatus } {
  if (!payment) return { status: 'skipped' };
  if (payment.paymentError) return { status: 'error' };

  const funding = payment.funding_source_details;
  if (funding?.display_string) return { value: funding.display_string, status: 'loaded' };

  const rawMethods = payment.all_payment_methods;
  if (!rawMethods) return { status: 'unavailable' };
  const text = JSON.stringify(rawMethods);
  if (!text || text === '{}') return { status: 'unavailable' };
  return { value: text, status: 'loaded' };
}

export function mapAdAccountRow(
  seed: AdAccountSeed,
  detail?: unknown,
  payment?: unknown,
  hiddenLimit?: number,
  checkHold?: CheckHoldResult
): AdAccount {
  const d = (detail ?? {}) as AdAccountDetail;
  const p = payment as PaymentDetail | undefined;
  const account_id = normalizeAccountId(d.account_id ?? seed.account_id);
  const owner_business = d.owner_business ?? seed.owner_business;
  const threshold = toNumber(d.adspaymentcycle?.data?.[0]?.threshold_amount);
  const balance = toNumber(d.balance);
  const spent = toNumber(d.insights?.data?.[0]?.spend) ?? toNumber(d.amount_spent);
  const paymentInfo = paymentDisplay(p);
  const owner = ownerIdentity(d.owner);
  const ownership = d.userpermissions?.data?.[0]?.role;

  return {
    id: toActId(account_id),
    account_id,
    name: d.name ?? seed.name ?? account_id,
    status: d.account_status ?? seed.account_status ?? 0,
    currency: d.currency ?? seed.currency ?? '',
    bm: owner_business?.id,
    owner_business,
    bmName: owner_business?.name,
    type: owner_business?.id ? 'Business' : 'Cá nhân',
    balance,
    threshold,
    remainThreshold: threshold !== undefined && balance !== undefined ? threshold - balance : undefined,
    limit: toNumber(d.adtrust_dsl),
    spent,
    spendLimit: toNumber(d.spend_cap),
    payment: paymentInfo.value,
    paymentStatus: paymentInfo.status,
    billDate: d.next_bill_date,
    daysToDue: daysToDue(d.next_bill_date),
    country: d.business_country_code,
    created: d.created_time,
    line2Bm: d.agencies?.data?.map((agency) => agency.name || agency.id).filter(Boolean).join(', '),
    hiddenLimit,
    ownerId: owner.id,
    ownerName: owner.name,
    timezone: formatTimezone(d),
    lockReason: d.disable_reason === undefined ? undefined : String(d.disable_reason),
    adminCount: adminCount(d),
    ownership,
    hasRole: Boolean(ownership),
    priskRestrictions: checkHold?.priskRestrictions,
    billingFlags: checkHold?.billingFlags,
    requiredWizardName: checkHold?.requiredWizardName,
    billingAccountStatus: checkHold?.billingAccountStatus,
    isReauthRestricted: checkHold?.isReauthRestricted,
    isSdcRestricted: checkHold?.isSdcRestricted,
    holdNeed: checkHold?.holdNeed,
  };
}
