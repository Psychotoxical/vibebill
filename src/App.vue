<template>
  <div class="app-layout" :data-theme="theme">
    <aside class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-header">
        <div class="sidebar-brand">
          <h1><Receipt :size="18" /> <span class="nav-text">{{ $t('app.title') }}</span></h1>
          <div class="subtitle nav-text">{{ $t('app.subtitle') }}</div>
        </div>
        <div class="sidebar-header-actions">
          <button class="sidebar-icon-btn" @click="toggleTheme" :data-tooltip="theme === 'dark' ? $t('app.lightTheme') : $t('app.darkTheme')">
            <Sun v-if="theme === 'dark'" :size="16" />
            <Moon v-else :size="16" />
          </button>
          <router-link to="/help" class="sidebar-icon-btn" :data-tooltip="$t('app.help')">
            <HelpCircle :size="16" />
          </router-link>
        </div>
      </div>
      <nav class="sidebar-nav">
        <router-link to="/" class="nav-item" :class="{ active: $route.path === '/' }" :data-tooltip="isCollapsed ? $t('nav.dashboard') : undefined">
          <span class="nav-icon"><LayoutDashboard :size="18" /></span> <span class="nav-text">{{ $t('nav.dashboard') }}</span>
        </router-link>
        <router-link to="/sellers" class="nav-item" :class="{ active: $route.path === '/sellers' }" :data-tooltip="isCollapsed ? $t('nav.sellers') : undefined">
          <span class="nav-icon"><Building2 :size="18" /></span> <span class="nav-text">{{ $t('nav.sellers') }}</span>
        </router-link>
        <router-link to="/products" class="nav-item" :class="{ active: $route.path === '/products' }" :data-tooltip="isCollapsed ? $t('nav.products') : undefined">
          <span class="nav-icon"><Package :size="18" /></span> <span class="nav-text">{{ $t('nav.products') }}</span>
        </router-link>
        <router-link to="/customers" class="nav-item" :class="{ active: $route.path === '/customers' }" :data-tooltip="isCollapsed ? $t('nav.customers') : undefined">
          <span class="nav-icon"><Users :size="18" /></span> <span class="nav-text">{{ $t('nav.customers') }}</span>
        </router-link>
        <router-link to="/invoices" class="nav-item" :class="{ active: $route.path.startsWith('/invoices') }" :data-tooltip="isCollapsed ? $t('nav.invoices') : undefined">
          <span class="nav-icon"><FileText :size="18" /></span> <span class="nav-text">{{ $t('nav.invoices') }}</span>
        </router-link>
        <router-link to="/settings" class="nav-item" :class="{ active: $route.path === '/settings' }" :data-tooltip="isCollapsed ? $t('nav.settings') : undefined">
          <span class="nav-icon"><Settings :size="18" /></span> <span class="nav-text">{{ $t('nav.settings') }}</span>
        </router-link>
      </nav>
      <div class="sidebar-footer">
        <button class="nav-item toggle-btn" @click="toggleSidebar" :data-tooltip="isCollapsed ? $t('app.expandMenu') : undefined">
          <span class="nav-icon"><ChevronRight v-if="isCollapsed" :size="18" /><ChevronLeft v-else :size="18" /></span>
          <span class="nav-text">{{ isCollapsed ? '' : $t('app.collapseMenu') }}</span>
        </button>
      </div>
    </aside>
    <main class="main-content">
      <router-view />
    </main>
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getSetting, setSetting } from './services/database';
import ToastContainer from './components/ToastContainer.vue';
import {
  Receipt, LayoutDashboard, Building2, Package, Users, FileText,
  Settings, HelpCircle, Sun, Moon, ChevronLeft, ChevronRight
} from 'lucide-vue-next';

const theme = ref('light');
const isCollapsed = ref(false);

onMounted(async () => {
  try {
    const savedTheme = await getSetting('theme');
    if (savedTheme) theme.value = savedTheme;
    
    const savedSidebar = await getSetting('sidebarCollapsed');
    if (savedSidebar === 'true') isCollapsed.value = true;
  } catch (e) {
    console.warn("Could not load settings on startup", e);
  }
});

async function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
  try {
    await setSetting('theme', theme.value);
  } catch {
    // ignore in browser dev
  }
}

async function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value;
  try {
    await setSetting('sidebarCollapsed', String(isCollapsed.value));
  } catch {
    // ignore in browser dev
  }
}
</script>