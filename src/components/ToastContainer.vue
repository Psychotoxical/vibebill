<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div v-for="toast in toasts" :key="toast.id" :class="['toast', 'toast-' + toast.type]">
          <span class="toast-icon"><Check v-if="toast.type === 'success'" :size="16" /><X v-else-if="toast.type === 'error'" :size="16" /><Info v-else :size="16" /></span>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '../composables/useToast';
import { Check, X, Info } from 'lucide-vue-next';
const { toasts } = useToast();
</script>
