<template>
  <div v-if="open" class="modal-overlay" @click.self="confirmClose">
    <div class="modal modal-wide" @click.stop style="max-height: 90vh; overflow-y: auto;">
      <div class="modal-header">
        <h2>{{ $t('invoiceForm.quickSellerTitle') }}</h2>
        <button class="btn btn-ghost btn-icon" @click="confirmClose"><X :size="16" /></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">{{ $t('common.name') }} (Firma) *</label>
          <input class="form-input" v-model="form.name" :placeholder="$t('sellers.namePlaceholder')" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">{{ $t('common.firstName') }}</label>
            <input class="form-input" v-model="form.first_name" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('common.lastName') }}</label>
            <input class="form-input" v-model="form.last_name" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('sellers.logo') }}</label>
          <div class="flex items-center gap-2">
            <div class="logo-preview" @click="selectLogo">
              <img v-if="form.logo_data" :src="form.logo_data" alt="Logo" />
              <div v-else class="logo-placeholder">{{ $t('sellers.chooseLogo') }}</div>
            </div>
            <button v-if="form.logo_data" class="btn btn-ghost btn-sm" @click="form.logo_data = ''">
              {{ $t('sellers.removeLogo') }}
            </button>
          </div>
        </div>
        <hr style="border-color: var(--border-color); margin: 8px 0 16px" />
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
          <label class="form-label">{{ $t('sellers.website') }}</label>
          <input class="form-input" v-model="form.website" placeholder="www.example.de" />
        </div>
        <hr style="border-color: var(--border-color); margin: 8px 0 16px" />
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">{{ $t('sellers.taxId') }}</label>
            <input class="form-input" v-model="form.tax_id" placeholder="12/345/67890" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('sellers.vatId') }}</label>
            <input class="form-input" v-model="form.vat_id" placeholder="DE123456789" />
          </div>
        </div>
        <hr style="border-color: var(--border-color); margin: 8px 0 16px" />
        <div class="form-row-3">
          <div class="form-group">
            <label class="form-label">{{ $t('sellers.bank') }}</label>
            <input class="form-input" v-model="form.bank_name" placeholder="Sparkasse" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('sellers.iban') }}</label>
            <input class="form-input" v-model="form.bank_iban" placeholder="DE89 3704 0044 0532 0130 00" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('sellers.bic') }}</label>
            <input class="form-input" v-model="form.bank_bic" placeholder="COBADEFFXXX" />
          </div>
        </div>
        <hr style="border-color: var(--border-color); margin: 8px 0 16px" />
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">{{ $t('sellers.invoicePrefix') }}</label>
            <input class="form-input" v-model="form.invoice_prefix" placeholder="RE" @focus="guessPrefix" />
            <div class="form-hint">{{ $t('sellers.prefixExample', { prefix: form.invoice_prefix || 'RE' }) }}</div>
          </div>
          <div class="form-group" style="width: 140px;">
            <label class="form-label">{{ $t('sellers.color') }}</label>
            <input class="form-input" type="color" v-model="form.color"
              style="height: 38px; padding: 2px 4px; cursor: pointer;" />
            <div class="form-hint" style="line-height: 1.2">{{ $t('sellers.colorHint') }}</div>
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('sellers.nextInvoiceNr') }}</label>
            <input class="form-input" v-model.number="form.next_invoice_number" type="number" min="1" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('sellers.pdfTemplate') }}</label>
            <AppSelect v-model="form.pdf_template" :options="[
              { value: 'classic', label: 'Classic' },
              { value: 'modern', label: 'Modern' },
              { value: 'minimal', label: 'Minimal' },
            ]" />
          </div>
        </div>
        <hr style="border-color: var(--border-color); margin: 8px 0 16px" />
        <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 14px; color: var(--text-primary)">
          {{ $t('settings.invoiceDefaults') }}
        </h3>
        <div class="form-row-3">
          <div class="form-group">
            <label class="form-label">{{ $t('settings.defaultPaymentTerms') }}</label>
            <AppSelect v-model="form.default_payment_terms" :options="[
              { value: 'Sofort fällig', label: $t('invoiceForm.paymentImmediate') },
              { value: '7 Tage netto', label: $t('invoiceForm.payment7') },
              { value: '14 Tage netto', label: $t('invoiceForm.payment14') },
              { value: '30 Tage netto', label: $t('invoiceForm.payment30') },
            ]" :placeholder="$t('common.choose') || '—'" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('settings.defaultVat') }}</label>
            <AppSelect v-model="form.default_tax_rate" :options="TAX_RATE_OPTIONS" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('settings.currency') }}</label>
            <AppSelect v-model="form.currency" :options="[
              { value: 'EUR', label: 'EUR (€)' },
              { value: 'USD', label: 'USD ($)' },
              { value: 'GBP', label: 'GBP (£)' },
              { value: 'CHF', label: 'CHF' },
            ]" placeholder="—" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('settings.defaultNote') }}</label>
          <textarea class="form-textarea" v-model="form.default_note" rows="2"
            :placeholder="$t('settings.defaultNotePlaceholder')"></textarea>
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
import { createSeller, type Seller } from '../services/database';
import { useToast } from '../composables/useToast';
import { confirm } from '@tauri-apps/plugin-dialog';
import { X } from 'lucide-vue-next';
import AppSelect from './AppSelect.vue';
import { TAX_RATE_OPTIONS } from '../utils/taxRates';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{
  'update:open': [value: boolean];
  'saved': [id: number];
}>();

const { t } = useI18n({ useScope: 'global' });
const toast = useToast();

const empty = (): Seller => ({
  name: '', first_name: '', last_name: '', street: '', city: '', zip: '', country: 'Deutschland',
  phone: '', email: '', website: '', tax_id: '', vat_id: '',
  bank_name: '', bank_iban: '', bank_bic: '', logo_data: '',
  invoice_prefix: 'RE', next_invoice_number: 1, pdf_template: 'classic'
});

const form = ref<Seller>(empty());
const original = ref<Seller>(empty());

watch(() => props.open, (val) => {
  if (val) {
    form.value = empty();
    original.value = empty();
  }
});

function guessPrefix() {
  if (form.value.name && form.value.invoice_prefix === 'RE') {
    form.value.invoice_prefix = form.value.name.substring(0, 3).toUpperCase();
  }
}

async function selectLogo() {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { form.value.logo_data = reader.result as string; };
      reader.readAsDataURL(file);
    };
    input.click();
  } catch (e) {
    console.error('Logo select error:', e);
  }
}

async function save() {
  if (!form.value.name) return;
  try {
    const id = await createSeller(form.value);
    emit('saved', id);
    emit('update:open', false);
    toast.success(t('toast.sellerSaved'));
  } catch (e) {
    console.error('QuickSellerModal save error:', e);
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
