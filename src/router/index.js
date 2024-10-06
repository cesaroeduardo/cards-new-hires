// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../components/HomeView.vue';
import SessionView from '../components/SessionView.vue';

const routes = [
  {
    path: '/',
    name: 'HomeView',
    component: HomeView,
  },
  {
    path: '/session/:sessionCode',
    name: 'SessionView',
    component: SessionView,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
