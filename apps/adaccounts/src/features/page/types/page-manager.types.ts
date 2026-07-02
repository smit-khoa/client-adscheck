export type PageSource = 'all' | 'mine' | 'bmIds' | 'pageIds';

export interface PageFetchOptions {
  status: boolean;
  tick: boolean;
  follow: boolean;
  post: boolean;
  pageLive: boolean;
  monetize: boolean;
}

export interface PageFetchConfig {
  source: PageSource;
  ids: string;
  pageLimit: number;
  options: PageFetchOptions;
}

export interface PageRow {
  id: string;
  rowKey: string;
  pageId: string;
  name: string;
  avatar: string;
  status: string;
  live: boolean | null;
  role: string;
  bm: string;
  bmName: string;
  adminCount: number | null;
  createdDate: string;
  likes: number | null;
  follows: number | null;
  type: string;
  postCount: number | null;
  pageTick: string;
  pageLive: string;
  monetize: string;
  profileId: string;
  error: string;
}

export interface ResolvedPageRef {
  id: string;
  role?: string;
}

export interface PageLoadProgress {
  total: number;
  loaded: number;
  step: string;
}
