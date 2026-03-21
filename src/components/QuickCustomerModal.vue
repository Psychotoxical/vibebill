<template>
  <div v-if="open" class="modal-overlay" @click.self="confirmClose">
    <div class="modal modal-wide" @click.stop>
      <div class="modal-header">
        <h2>{{ $t('invoiceForm.quickCustomerTitle') }}</h2>
        <button class="btn btn-ghost btn-icon" @click="confirmClose"><X :size="16" /></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">{{ $t('common.name') }} *</label>
          <input class="form-input" v-model="form.name" :placeholder="$t('customers.namePlaceholder')" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('common.street') }}</label>
          <input class="form-input" v-model="form.street" :placeholder="$t('customers.streetPlaceholder')" />
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label class="form-label">{{ $t('common.zip') }}</label>
            <input class="form-input" v-model="form.zip" :placeholder="$t('customers.zipPlaceholder')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('common.city') }}</label>
            <input class="form-input" v-model="form.city" :placeholder="$t('customers.cityPlaceholder')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('common.country') }}</label>
            <input class="form-input" v-model="form.country" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">{{ $t('common.phone') }}</label>
            <input class="form-input" v-model="form.phone" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('common.email') }}</label>
            <input class="form-input" v-model="form.email" type="email" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('common.notes') }}</label>
          <textarea class="form-textarea" v-model="form.notes" :placeholder="$t('customers.notesPlaceholder')"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="confirmClose">{{ $t('common.cancel') }}</button>
        <button class="btn btn-primary" @click="save" :disabled="!form.name">{{ $t('common.save') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { createCustomer, type Customer } from '../services/database';
import { useToast } from '../composables/useToast';
import { confirm } from '@tauri-apps/plugin-dialog';
import { X } from 'lucide-vue-next';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{
  'update:open': [value: boolean];
  'saved': [id: number];
}>();

const { t } = useI18n({ useScope: 'global' });
const toast = useToast();

const empty = (): Customer => ({
  name: '', street: '', city: '', zip: '', country: 'Deutschland',
  phone: '', email: '', notes: ''
});

const form = ref<Customer>(empty());
const original = ref<Customer>(empty());

watch(() => props.open, (val) => {
  if (val) {
    form.value = empty();
    original.value = empty();
  }
});

async function save() {
  if (!form.value.name) return;
  try {
    const id = await createCustomer(form.value);
    emit('saved', id);
    emit('update:open', false);
    toast.success(t('toast.customerSaved'));
  } catch (e) {
    console.error('QuickCustomerModal save error:', e);
    toast.error(t('toast.error'));
  }
}

async function confirmClose() {
  const hasChanges = JSON.stringify(form.value) !== JSON.stringify(original.value);
  if (hasChanges) {
    const agreed = await confirm(t('common.unsavedChanges'), { title: 'VibeBill', kind: 'warning' });
    if (!agreed) return;
  }
  emit('update:open', false);
}
</script>
