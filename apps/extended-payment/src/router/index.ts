import type { RouteRecordRaw } from 'vue-router';

const ExtendedPaymentPage = () => import('../pages/ExtendedPaymentPage.vue');

const routes: RouteRecordRaw[] = [
  { path: '', name: 'extended-payment', component: ExtendedPaymentPage },
  { path: ':pathMatch(.*)*', redirect: '/extended-payment' },
];

export default routes;
