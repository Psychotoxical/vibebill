<template>
  <div>
    <div class="topbar">
      <div class="topbar-title">{{ $t('settings.title') }}</div>
    </div>
    <div class="page-content">

      <!-- Language -->
      <div class="card mb-4">
        <div class="card-header"><h2>{{ $t('settings.language') }}</h2></div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">{{ $t('settings.languageHint') }}</label>
            <AppSelect
              v-model="language"
              :options="[{ value: 'de', label: 'Deutsch' }, { value: 'en', label: 'English (UK)' }]"
              style="max-width: 200px"
              @change="() => changeLanguage()"
            />
          </div>
        </div>
      </div>

      <!-- PDF / Download -->
      <div class="card mb-4">
        <div class="card-header"><h2>{{ $t('settings.pdfExport') }}</h2></div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">{{ $t('settings.downloadFolder') }}</label>
            <div class="flex gap-2 items-center">
              <input class="form-input" v-model="downloadFolder" readonly :placeholder="$t('settings.folderPlaceholder')" style="flex: 1" />
              <button class="btn btn-secondary btn-sm" @click="pickFolder">{{ $t('settings.chooseFolder') }}</button>
              <button class="btn btn-ghost btn-sm" v-if="downloadFolder" @click="downloadFolder = ''; saveSetting('download_folder', '')"><X :size="14" /></button>
            </div>
            <div class="form-hint">{{ $t('settings.folderHint') }}</div>
          </div>
        </div>
      </div>



      <!-- Datenbank -->
      <div class="card mb-4">
        <div class="card-header"><h2>{{ $t('settings.database') }}</h2></div>
        <div class="card-body">
          <div class="flex gap-2">
            <button class="btn btn-secondary" @click="exportDb">{{ $t('settings.exportBackup') }}</button>
            <button class="btn btn-secondary" @click="importDb">{{ $t('settings.importBackup') }}</button>
          </div>
          <div class="form-hint" style="margin-top: 8px">{{ $t('settings.backupHint') }}</div>
          <div class="form-hint" style="margin-top: 4px">{{ $t('settings.importHint') }}</div>
          <div v-if="backupMessage" class="form-hint" style="margin-top: 8px; color: var(--success)">{{ backupMessage }}</div>
        </div>
      </div>

      <!-- App Info -->
      <div class="card mb-4">
        <div class="card-header"><h2>{{ $t('settings.about') }}</h2></div>
        <div class="card-body">
          <div style="display: flex; flex-direction: column; gap: 12px; font-size: var(--font-size-sm); color: var(--text-secondary)">
            <div><strong style="color: var(--text-primary); font-size: var(--font-size-base)">{{ $t('app.title') }}</strong> – {{ $t('app.subtitle') }}</div>
            <div>
              {{ $t('settings.aboutDescription1') }}<br>
              {{ $t('settings.aboutDescription2') }}
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <strong style="color: var(--text-primary)">{{ $t('settings.techStack') }}</strong>
              <div>Tauri v2 &middot; Vue 3 &middot; TypeScript &middot; Vite &middot; SQLite &middot; decimal.js &middot; Lucide Icons &middot; Plus Jakarta Sans</div>
            </div>
            <div style="color: var(--accent); font-weight: 500">{{ $t('settings.madeWith') }}</div>
            <div>
              {{ $t('settings.copyright') }}<br>
              {{ $t('settings.version') }}: {{ appVersion }}
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getSetting, setSetting } from '../services/database';
import { open, save } from '@tauri-apps/plugin-dialog';
import { copyFile } from '@tauri-apps/plugin-fs';
import { X } from 'lucide-vue-next';
import AppSelect from '../components/AppSelect.vue';
import { appConfigDir, join } from '@tauri-apps/api/path';
import { getVersion } from '@tauri-apps/api/app';

const { locale, t } = useI18n({ useScope: 'global' });

const language = ref('en');
const downloadFolder = ref('');
const backupMessage = ref('');
const appVersion = ref('');

onMounted(async () => {
  try {
    const lang = localStorage.getItem('language') || await getSetting('language');
    if (lang) {
      language.value = lang;
      localStorage.setItem('language', lang); // sync back
    }
    downloadFolder.value = await getSetting('download_folder');
    
    try {
      appVersion.value = await getVersion();
    } catch {
      appVersion.value = '1.0.20';
    }
  } catch (e) { console.error(e); }
});

async function changeLanguage() {
  locale.value = language.value;
  localStorage.setItem('language', language.value);
  await saveSetting('language', language.value);
}

async function saveSetting(key: string, value: string) {
  try { await setSetting(key, value); } catch (e) { console.error(e); }
}

async function pickFolder() {
  try {
    const selected = await open({ directory: true, multiple: false, title: 'Download-Ordner wählen' });
    if (selected && typeof selected === 'string') {
      downloadFolder.value = selected;
      await saveSetting('download_folder', selected);
    }
  } catch (e) { console.error(e); }
}

async function exportDb() {
  try {
    const dataDir = await appConfigDir();
    const dbPath = await join(dataDir, 'vibebill.db');
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const defaultName = `vibebill_backup_${ts}.db`;

    const dest = await save({
      defaultPath: defaultName,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    });
    if (dest) {
      await copyFile(dbPath, dest);
      backupMessage.value = `✓ Backup gespeichert: ${dest}`;
      setTimeout(() => backupMessage.value = '', 5000);
    }
  } catch (e) {
    console.error('Backup error:', e);
    backupMessage.value = t('settings.backupError') + String(e);
  }
}

async function importDb() {
  try {
    const selected = await open({
      multiple: false,
      title: t('settings.importBackup'),
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    });
    if (selected && typeof selected === 'string') {
      const dataDir = await appConfigDir();
      const dbPath = await join(dataDir, 'vibebill.db');
      await copyFile(selected, dbPath);
      backupMessage.value = t('settings.importSuccess');
    }
  } catch (e) {
    console.error('Import error:', e);
    backupMessage.value = String(e);
  }
}
</script>
