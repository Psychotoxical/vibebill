<template>
  <div>
    <div class="topbar">
      <div class="topbar-title">{{ $t('help.title') }}</div>
    </div>

    <div class="page-content">
      <div class="card help-card">
        <div class="accordion">
          <div 
            v-for="(item, index) in helpItems" 
            :key="index"
            class="accordion-item"
            :class="{ 'is-active': activeIndex === index }"
          >
            <div class="accordion-header" @click="toggle(index)">
              <h3>{{ $t(item.titleKey) }}</h3>
              <span class="accordion-icon">{{ activeIndex === index ? '−' : '+' }}</span>
            </div>
            <div class="accordion-content" v-show="activeIndex === index">
              <p>{{ $t(item.contentKey) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const activeIndex = ref<number>(0);

const helpItems = [
  { titleKey: 'nav.dashboard', contentKey: 'help.dashboard' },
  { titleKey: 'nav.sellers', contentKey: 'help.sellers' },
  { titleKey: 'nav.products', contentKey: 'help.products' },
  { titleKey: 'nav.customers', contentKey: 'help.customers' },
  { titleKey: 'nav.invoices', contentKey: 'help.invoices' },
  { titleKey: 'nav.settings', contentKey: 'help.settings' }
];

function toggle(index: number) {
  if (activeIndex.value === index) {
    activeIndex.value = -1;
  } else {
    activeIndex.value = index;
  }
}
</script>

<style scoped>
.help-card {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.accordion {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.accordion-item {
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--bg-card);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.accordion-item.is-active {
  border-color: var(--accent);
  box-shadow: var(--shadow-md);
}

.accordion-header {
  padding: 1.25rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
  background: transparent;
  transition: background 0.2s;
}

.accordion-header:hover {
  background: var(--accent-light);
}

.accordion-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.2s;
}

.accordion-item.is-active .accordion-header h3 {
  color: var(--accent);
}

.accordion-icon {
  font-weight: bold;
  font-size: 1.5rem;
  color: var(--text-secondary);
  line-height: 1;
  transition: color 0.2s;
}

.accordion-item.is-active .accordion-icon {
  color: var(--accent);
}

.accordion-content {
  padding: 0 1.25rem 1.25rem 1.25rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.accordion-content p {
  margin: 0;
}
</style>
