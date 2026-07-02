import type { RouteRecordRaw } from 'vue-router';
import { WORKSPACE_TAB_ROUTE_NAMES } from '../features/workspace/workspace-tab-routes';

const AdAccountsPage = () => import('../pages/AdAccountsPage.vue');

// Child routes mounted by the shell under `/adscheck-pro`.
// Paths are relative to that parent. Components are lazy so the shell's
// RemoteErrorBoundary + Suspense can show fallbacks while the chunk loads.
const routes: RouteRecordRaw[] = [
  { path: 'adaccounts', name: WORKSPACE_TAB_ROUTE_NAMES.adaccounts, component: AdAccountsPage },
  { path: 'businesses', name: WORKSPACE_TAB_ROUTE_NAMES.businesses, component: AdAccountsPage },
  { path: 'page', name: WORKSPACE_TAB_ROUTE_NAMES.page, component: AdAccountsPage },
  { path: 'pixel', name: WORKSPACE_TAB_ROUTE_NAMES.pixel, component: AdAccountsPage },
  { path: ':pathMatch(.*)*', redirect: '/home' },
];

export default routes;
