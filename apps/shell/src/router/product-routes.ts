import type { RouteRecordRaw } from 'vue-router';

export const HOME_PATH = '/home';
export const ADSCHECK_PRO_PATH = '/adscheck-pro';
export const ADSCHECK_PRO_DEFAULT_PATH = `${ADSCHECK_PRO_PATH}/adaccounts`;
export const EXTENDED_PAYMENT_PATH = '/extended-payment';

export interface ProductPlaceholderRoute {
  path: string;
  name: string;
  title: string;
  description: string;
}

export const PRODUCT_PLACEHOLDER_ROUTES: ProductPlaceholderRoute[] = [
  {
    path: HOME_PATH,
    name: 'home',
    title: 'Trang chính',
    description: 'Không gian tổng quan đang được chuẩn bị.',
  },
  {
    path: '/ads-save',
    name: 'ads-save',
    title: 'Ads Save',
    description: 'Tính năng Ads Save chưa được triển khai trong đợt này.',
  },
  {
    path: '/super-target',
    name: 'super-target',
    title: 'Super Target',
    description: 'Tính năng Super Target chưa được triển khai trong đợt này.',
  },
  {
    path: '/support',
    name: 'support',
    title: 'Hỗ trợ',
    description: 'Khu vực hỗ trợ đang được chuẩn bị.',
  },
  {
    path: '/settings',
    name: 'settings',
    title: 'Cài đặt',
    description: 'Khu vực cài đặt đang được chuẩn bị.',
  },
  {
    path: '/account',
    name: 'account',
    title: 'Tài khoản',
    description: 'Khu vực tài khoản đang được chuẩn bị.',
  },
];

export function createPlaceholderRoute(route: ProductPlaceholderRoute): RouteRecordRaw {
  return {
    path: route.path,
    name: route.name,
    component: () => import('../pages/ShellPlaceholderPage.vue'),
    meta: {
      isShellPlaceholder: true,
      title: route.title,
      description: route.description,
    },
  };
}
