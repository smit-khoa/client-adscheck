import type { RouteLocationNormalizedLoaded } from 'vue-router';
import type { WorkspaceTab } from './types/workspace.types';

export const WORKSPACE_TAB_ROUTE_NAMES: Record<WorkspaceTab, string> = {
  adaccounts: 'adscheck-pro-adaccounts',
  businesses: 'adscheck-pro-businesses',
  page: 'adscheck-pro-page',
  pixel: 'adscheck-pro-pixel',
};

export const WORKSPACE_TAB_ROUTE_PATHS: Record<WorkspaceTab, string> = {
  adaccounts: '/adscheck-pro/adaccounts',
  businesses: '/adscheck-pro/businesses',
  page: '/adscheck-pro/page',
  pixel: '/adscheck-pro/pixel',
};

const WORKSPACE_TABS = Object.keys(WORKSPACE_TAB_ROUTE_NAMES) as WorkspaceTab[];

export function workspaceTabFromRoute(route: RouteLocationNormalizedLoaded): WorkspaceTab | null {
  const routeName = typeof route.name === 'string' ? route.name : '';
  return WORKSPACE_TABS.find((tab) => WORKSPACE_TAB_ROUTE_NAMES[tab] === routeName) ?? null;
}

export function workspaceTabPath(tab: WorkspaceTab): string {
  return WORKSPACE_TAB_ROUTE_PATHS[tab];
}
