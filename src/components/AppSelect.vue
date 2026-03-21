<template>
  <div class="app-select" :class="{ 'app-select--open': isOpen, 'app-select--sm': size === 'sm', 'app-select--disabled': disabled }" ref="triggerRef">
    <button type="button" class="app-select-trigger" @click="toggle" :disabled="disabled">
      <span :class="hasValue ? 'app-select-value' : 'app-select-placeholder'">{{ displayLabel }}</span>
      <ChevronDown :size="size === 'sm' ? 12 : 14" class="app-select-chevron" />
    </button>
    <Teleport to="body">
      <div v-if="isOpen" class="app-select-dropdown" :style="dropdownStyle" ref="dropdownRef">
        <div
          v-for="opt in options"
          :key="String(opt.value)"
          class="app-select-option"
          :class="{
            'app-select-option--selected': opt.value === modelValue,
            'app-select-option--accent': opt.accent,
            'app-select-option--disabled': opt.disabled,
          }"
          @click="!opt.disabled && select(opt.value)"
        >{{ opt.label }}</div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { ChevronDown } from 'lucide-vue-next';

export interface SelectOption {
  value: string | number;
  label: string;
  accent?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<{
  modelValue: string | number | null | undefined;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  size?: 'default' | 'sm';
}>(), {
  placeholder: '—',
  size: 'default',
});

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
  'change': [value: string | number];
}>();

const isOpen = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({});

const hasValue = computed(() =>
  props.modelValue !== null &&
  props.modelValue !== undefined &&
  props.modelValue !== '' &&
  props.modelValue !== 0 &&
  props.options.some(o => o.value === props.modelValue)
);

const displayLabel = computed(() => {
  if (!hasValue.value) return props.placeholder;
  return props.options.find(o => o.value === props.modelValue)?.label ?? props.placeholder;
});

function position() {
  const trigger = triggerRef.value;
  if (!trigger) return;
  const rect = trigger.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - rect.bottom;
  const dropdownHeight = Math.min(props.options.length * 36, 280);
  const showAbove = spaceBelow < dropdownHeight + 8 && rect.top > dropdownHeight;
  dropdownStyle.value = {
    position: 'fixed',
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    minWidth: '120px',
    zIndex: '9999',
    ...(showAbove
      ? { bottom: `${viewportHeight - rect.top + 4}px` }
      : { top: `${rect.bottom + 4}px` }),
  };
}

async function toggle() {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    await nextTick();
    position();
  }
}

function select(value: string | number) {
  emit('update:modelValue', value);
  emit('change', value);
  isOpen.value = false;
}

function onClickOutside(e: MouseEvent) {
  if (!isOpen.value) return;
  const target = e.target as Node;
  if (triggerRef.value?.contains(target) || dropdownRef.value?.contains(target)) return;
  isOpen.value = false;
}

onMounted(() => document.addEventListener('mousedown', onClickOutside));
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside));
</script>
