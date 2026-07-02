import { createApp, h } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { SpriteProvider } from '@mf2/shared-ui/icons';
import './styles.css';

const container = document.getElementById('root');
if (container) {
  const app = createApp({ render: () => h(SpriteProvider, () => h(App)) });
  app.use(createPinia());
  app.mount(container);
}
