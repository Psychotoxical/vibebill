<template>
  <div v-if="open" class="modal-overlay" @click.self="confirmClose">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h2>{{ $t('products.newProductTitle') }}</h2>
        <button class="btn btn-ghost btn-icon" @click="confirmClose"><X :size="16" /></button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">{{ $t('products.type') }} *</label>
            <AppSelect v-model="form.type" :options="[
              { value: 'product', label: $t('products.typeProduct') },
              { value: 'service', label: $t('products.typeService') },
            ]" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('common.name') }} *</label>
          <input class="form-input" v-model="form.name" :placeholder="$t('products.namePlaceholder')" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('common.description') }}</label>
          <textarea class="form-textarea" v-model="form.description" rows="2"
            :placeholder="$t('products.descriptionPlaceholder')"></textarea>
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label class="form-label">{{ $t('products.unit') }}</label>
            <AppSelect v-model="form.unit" :options="[
              { value: 'Stk', label: $t('products.unitPc') },
              { value: 'Std', label: $t('products.unitHour') },
              { value: 'Pausch.', label: $t('products.unitFlat') },
              { value: 'kg', label: $t('products.unitKg') },
              { value: 'm', label: $t('products.unitM') },
              { value: 'Lizenz', label: $t('products.unitLicense') },
            ]" />
          </div>
          <div class="form-group" style="display: flex; flex-direction: column; justify-content: center;">
            <label class="form-label" style="opacity: 0; margin-bottom: 4px;">isGross</label>
            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" id="quickIsGrossCheck" v-model="isGross" />
              <label for="quickIsGrossCheck" style="font-size: 13px; cursor: pointer; color: var(--text-primary);">
                Brutto eingeben
              </label>
            </div>
          </div>
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label class="form-label">{{ isGross ? 'Bruttopreis' : $t('products.netPrice') }} (€) *</label>
            <input class="form-input" v-model.number="displayPrice" type="number" step="0.01" min="0"
              @focus="selectAll" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('products.taxRate') }} (%)</label>
            <input class="form-input" v-model.number="form.tax_rate" type="number" step="0.5" min="0" max="100"
              @focus="selectAll" />
          </div>
        </div>
        <div class="form-group" v-if="form.type === 'product'">
          <label class="form-label">{{ $t('products.stock') }}</label>
          <input class="form-input" v-model.number="form.stock" type="number" min="0" style="max-width: 150px" />
        </div>
      </div>
      <div class="modal-footer">
        <div v-if="isGross" style="font-size: 12px; color: var(--text-secondary); margin-right: auto;">
          {{ $t('products.calculatedNet') }}: {{ formatCurrency(calculatedNetPrice) }}
        </div>
        <button class="btn btn-secondary" @click="confirmClose">{{ $t('common.cancel') }}</button>
        <button class="btn btn-primary" @click="save" :disabled="!form.name || displayPrice <= 0">
          {{ $t('common.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { createProduct, type Product } from '../services/database';
import { useToast } from '../composables/useToast';
import { calcNetFromGross } from '../utils/money';
import { confirm } from '@tauri-apps/plugin-dialog';
import { X } from 'lucide-vue-next';
import AppSelect from './AppSelect.vue';

const props = defineProps<{
  open: boolean;
  sellerId: number;
  defaultTaxRate: number;
  initialItem?: { description: string; unit: string; price_net: number; tax_rate: number } | null;
  itemIndex?: number;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  'saved': [productId: number, itemIndex: number];
}>();

const { locale, t } = useI18n({ useScope: 'global' });
const toast = useToast();

function formatCurrency(val: number) {
  return new Intl.NumberFormat(locale.value === 'de' ? 'de-DE' : 'en-US', { style: 'currency', currency: 'EUR' }).format(val);
}

function selectAll(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target) setTimeout(() => target.select(), 10);
}

const empty = (): Product => ({
  seller_id: props.sellerId,
  name: '',
  description: '',
  type: 'product',
  unit: 'Stk',
  price_net: 0,
  tax_rate: props.defaultTaxRate,
  stock: 0,
  active: 1
});

const form = ref<Product>(empty());
const original = ref<Product>(empty());
const isGross = ref(false);
const displayPrice = ref(0);

const calculatedNetPrice = computed(() => {
  if (!isGross.value) return displayPrice.value;
  return calcNetFromGross(displayPrice.value, form.value.tax_rate);
});

watch(() => props.open, (val) => {
  if (val) {
    isGross.value = false;
    if (props.initialItem) {
      const f: Product = {
        seller_id: props.sellerId,
        name: props.initialItem.description || t('invoiceForm.freePosition'),
        description: '',
        type: props.initialItem.unit === 'Std' || props.initialItem.unit === 'Pausch.' ? 'service' : 'product',
        unit: props.initialItem.unit || 'Stk',
        price_net: props.initialItem.price_net || 0,
        tax_rate: props.initialItem.tax_rate || props.defaultTaxRate,
        stock: 0,
        active: 1
      };
      form.value = f;
      original.value = { ...f };
      displayPrice.value = f.price_net;
    } else {
      form.value = empty();
      original.value = empty();
      displayPrice.value = 0;
    }
  }
});

async function save() {
  if (!form.value.name || !props.sellerId) return;
  try {
    form.value.price_net = calculatedNetPrice.value;
    const id = await createProduct(form.value);
    emit('saved', id, props.itemIndex ?? -1);
    emit('update:open', false);
    toast.success(t('invoiceForm.productSavedToCatalog'));
  } catch (e) {
    console.error('QuickProductModal save error:', e);
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
