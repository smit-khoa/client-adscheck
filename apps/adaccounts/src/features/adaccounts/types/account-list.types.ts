// Account-list owns the ad-account domain shape. Local to the adaccounts remote;
// promote to @mf2/shared-types only when a second app needs it (repo convention).

export type LoadAdAccountsSource = 'all' | 'tkqcIds' | 'bmIds';
export type LoadAdAccountsPermission = 'all' | 'hasRole';
export type LoadAdAccountsAccountType = 'all' | 'personal' | 'bm';
export type PaymentStatus = 'loaded' | 'unavailable' | 'error' | 'skipped';

export interface LoadAdAccountsOptions {
  basic: boolean;
  payment: boolean;
  finance: boolean;
  spendInsights: boolean;
  admin: boolean;
  checkHold: boolean;
  hiddenBm: boolean;
}

export interface LoadAdAccountsConfig {
  source: LoadAdAccountsSource;
  /** Textarea input. For compatibility with bmmanager, this holds BM ids or TKQC ids. */
  bmIds: string;
  advanced: boolean;
  options: LoadAdAccountsOptions;
  permission: LoadAdAccountsPermission;
  accountType: LoadAdAccountsAccountType;
  /** Concurrency/worker count for detail/payment queues, not UI page size. */
  pageLimit: number;
}

export interface BusinessManagerRow {
  id: string;
  name: string;
  is_disabled_for_integrity_reasons?: boolean;
  sharing_eligibility_status?: string;
  created_time?: string;
  verification_status?: string;
  permitted_roles?: string[];
  agencies?: Array<{ id?: string; name?: string }>;
}

export interface LoadBusinessManagersConfig {
  /** Optional textarea/list of BM ids. Empty means load all visible BMs. */
  idsText?: string;
  /** Used as businesses.limit(...) for all-BM mode; clamp 1..200. */
  pageLimit?: number;
  /** Worker count for explicit-id mode; clamp 1..100. */
  concurrency?: number;
}

export interface OwnerBusiness {
  id?: string;
  name?: string;
}

export interface AdAccount {
  /** `act_<id>` — the act_-prefixed id used by Graph API and the tools. */
  id: string;
  /** Raw numeric id without the act_ prefix. */
  account_id?: string;
  name: string;
  /** Facebook numeric account_status (1=active, 2=disabled, 7=review, 9=pending, 101=closed, ...). */
  status: number;
  /** Account currency (e.g. VND, USD), from the list/detail calls. */
  currency: string;
  /** Owning Business Manager id, when the account belongs to a BM. Some FB tools need it. */
  bm?: string;
  owner_business?: OwnerBusiness;
  bmName?: string;
  type?: 'Business' | 'Cá nhân';
  balance?: number;
  threshold?: number;
  remainThreshold?: number;
  limit?: number;
  spent?: number;
  spendLimit?: number;
  payment?: string;
  paymentStatus?: PaymentStatus;
  billDate?: string;
  daysToDue?: number;
  country?: string;
  created?: string;
  line2Bm?: string;
  note?: string;
  hiddenLimit?: number;
  ownerId?: string;
  ownerName?: string;
  timezone?: string;
  lockReason?: string;
  adminCount?: number;
  ownership?: string;
  hasRole?: boolean;
  priskRestrictions?: unknown[];
  billingFlags?: string[];
  requiredWizardName?: string;
  billingAccountStatus?: string;
  isReauthRestricted?: boolean;
  isSdcRestricted?: boolean;
  holdNeed?: string;
}
