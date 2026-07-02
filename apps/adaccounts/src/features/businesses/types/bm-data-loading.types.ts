export type BmLoadSource = 'all' | 'byId';

export type BmAdvancedGroup =
  | 'status'
  | 'page'
  | 'limit'
  | 'bmAccount'
  | 'partner'
  | 'admin'
  | 'instagram'
  | 'whatsapp'
  | 'share'
  | 'legacyType'
  | 'legacyQuality';

export type BmPatchGroup = BmAdvancedGroup;

export type BmAdvancedOptions = Record<BmAdvancedGroup, boolean>;

export interface BmLoadConfig {
  source: BmLoadSource;
  ids: string[];
  advEnabled: boolean;
  adv: BmAdvancedOptions;
  concurrency: number;
}

export interface BmRow {
  id: string;
  bmId: string;
  name: string;
  status: string;
  disabled: boolean;
  type: string;
  tier: string;
  role: string;
  notify: string;
  partnerCount?: number;
  appCount?: number;
  createdDate: string;
  appealStatus?: string;
  appealLabel?: string;
  appealDaysLeft?: string;
  pageCount?: number;
  assetSummary?: string;
  limit?: string;
  currency?: string;
  spend?: string;
  accountBm?: string;
  accountShare?: string;
  admin?: string;
  legacyType?: string;
  legacyQuality?: string;
  legacyStatus?: string;
  instagramCount?: number;
  whatsappCount?: number;
  loadingGroups: Partial<Record<BmPatchGroup, boolean>>;
  errorGroups: Partial<Record<BmPatchGroup, string>>;
}

export type BmRowPatch = Partial<Omit<BmRow, 'id' | 'bmId' | 'loadingGroups' | 'errorGroups'>> & {
  bmId: string;
};

export interface BmBaseFetchConfig {
  source: BmLoadSource;
  ids: string[];
  includePartner: boolean;
  pageSize: number;
}

export const BM_ADVANCED_GROUPS: BmAdvancedGroup[] = [
  'status',
  'page',
  'limit',
  'bmAccount',
  'partner',
  'admin',
  'instagram',
  'whatsapp',
  'share',
  'legacyType',
  'legacyQuality',
];

export const DEFAULT_BM_ADVANCED_OPTIONS: BmAdvancedOptions = {
  status: true,
  page: true,
  limit: true,
  bmAccount: true,
  partner: true,
  admin: true,
  instagram: true,
  whatsapp: true,
  share: true,
  legacyType: false,
  legacyQuality: false,
};

export const DEFAULT_BM_LOAD_CONFIG: BmLoadConfig = {
  source: 'all',
  ids: [],
  advEnabled: true,
  adv: { ...DEFAULT_BM_ADVANCED_OPTIONS },
  concurrency: 50,
};
