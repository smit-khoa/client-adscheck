import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import AppLayout from '../components/AppLayout.vue';
import RemoteHost from '../components/RemoteHost.vue';
import { installRemoteRoutes } from './remote-routes';
import { ADSCHECK_PRO_DEFAULT_PATH, ADSCHECK_PRO_PATH, EXTENDED_PAYMENT_PATH, HOME_PATH, PRODUCT_PLACEHOLDER_ROUTES, createPlaceholderRoute } from './product-routes';

// Build-time define (rspack DefinePlugin). Sub-path host (e.g. GitHub Pages /MF-2-vue/)
// needs the router history rooted at that prefix; defaults to '/' for root deploys/dev.
declare const __BASE_PATH__: string;

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: HOME_PATH },
  { path: '/app/:pathMatch(.*)*', redirect: HOME_PATH },
  {
    path: '/',
    component: AppLayout,
    children: [
      ...PRODUCT_PLACEHOLDER_ROUTES.map(createPlaceholderRoute),
      {
        path: ADSCHECK_PRO_PATH.slice(1),
        name: 'remote-adaccounts',
        component: RemoteHost,
        props: { name: 'adaccounts' },
        children: [
          { path: '', redirect: ADSCHECK_PRO_DEFAULT_PATH },
          { path: ':pathMatch(.*)*', component: RemoteHost, props: { name: 'adaccounts' } },
        ],
      },
      {
        path: EXTENDED_PAYMENT_PATH.slice(1),
        name: 'remote-extended-payment',
        component: RemoteHost,
        props: { name: 'extended_payment' },
        children: [
          { path: ':pathMatch(.*)*', component: RemoteHost, props: { name: 'extended_payment' } },
        ],
      },
      { path: ':pathMatch(.*)*', redirect: HOME_PATH },
    ],
  },
];

export const router = createRouter({
  history: createWebHistory(
    typeof __BASE_PATH__ !== 'undefined' ? __BASE_PATH__ : '/'
  ),
  routes,
});

installRemoteRoutes(router);
