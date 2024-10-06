// src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './assets/main.css';
import './assets/tailwind.css';

const app = createApp(App).use(router);
app.mount('#app');

// Exporta o app para ser reconhecido no build da Azion
export default app;
