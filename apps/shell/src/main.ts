import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import { useStartupGate } from './composables/use-startup-gate';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);
app.mount(container);

void useStartupGate().runStartupChecks();
