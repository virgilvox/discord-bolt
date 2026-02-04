import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';

import './assets/styles/variables.css';
import './assets/styles/typography.css';
import './assets/styles/components.css';
import './assets/styles/markdown.css';
import './assets/styles/responsive.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');
