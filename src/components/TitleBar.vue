<template>
  <div class="titlebar">
    <div class="titlebar-title" data-tauri-drag-region>VibeBill</div>
    <div class="titlebar-controls">
      <button class="titlebar-btn" @click="minimize" title="Minimieren">
        <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1.5" rx="0.75" fill="currentColor"/></svg>
      </button>
      <button class="titlebar-btn" @click="toggleMaximize" :title="isMaximized ? 'Wiederherstellen' : 'Maximieren'">
        <svg v-if="!isMaximized" width="10" height="10" viewBox="0 0 10 10"><rect x="0.75" y="0.75" width="8.5" height="8.5" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
        <svg v-else width="10" height="10" viewBox="0 0 10 10">
          <rect x="2" y="0.75" width="7.25" height="7.25" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
          <path d="M0.75 2.5 L0.75 9.25 L7.5 9.25" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
      <button class="titlebar-btn titlebar-btn-close" @click="close" title="Schließen">
        <svg width="10" height="10" viewBox="0 0 10 10"><line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';

const appWindow = getCurrentWindow();
const isMaximized = ref(false);

let unlisten: (() => void) | null = null;

onMounted(async () => {
  isMaximized.value = await appWindow.isMaximized();
  unlisten = await appWindow.onResized(async () => {
    isMaximized.value = await appWindow.isMaximized();
  });
});

onUnmounted(() => unlisten?.());

function minimize() { appWindow.minimize(); }
function toggleMaximize() { appWindow.toggleMaximize(); }
function close() { appWindow.close(); }
</script>
