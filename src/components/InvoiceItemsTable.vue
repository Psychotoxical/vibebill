<template>
  <div class="card mb-4">
    <div class="card-header">
      <h2>{{ $t('invoiceForm.positions') }}</h2>
      <div class="flex gap-2">
        <AppSelect
          v-if="availableProducts.length"
          v-model="selectedProduct"
          :options="catalogOptions"
          :placeholder="$t('invoiceForm.fromCatalog')"
        />
        <button class="btn btn-secondary btn-sm" v-if="selectedProduct" @click="addFromCatalog">
          {{ $t('common.add') }}
        </button>
        <button class="btn btn-primary btn-sm" @click="addItem">{{ $t('invoiceForm.freePosition') }}</button>
      </div>
    </div>
    <div class="card-body" style="padding: 0; overflow-x: auto">
      <table class="invoice-items-table" v-if="items.length">
        <thead>
          <tr>
            <th style="width:45px">{{ $t('invoiceForm.pos') }}</th>
            <th>{{ $t('common.description') }}</th>
            <th style="width:100px">{{ $t('invoiceForm.quantity') }}</th>
            <th style="width:110px">{{ $t('invoiceForm.unit') }}</th>
            <th style="width:140px">{{ $t('invoiceForm.unitPrice') }}</th>
            <th style="width:100px">{{ $t('invoiceForm.vat') }}</th>
            <th style="width:120px" class="text-right">{{ $t('invoiceForm.total') }}</th>
            <th style="width:45px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in items" :key="i" draggable="true"
            @dragstart="onDragStart(i, $event)" @dragover.prevent="onDragOver(i)" @dragend="onDragEnd"
            :class="{ 'drag-over': dragOverIndex === i, 'dragging': dragIndex === i }" style="cursor: grab">
            <td class="text-center drag-handle" style="cursor: grab; user-select: none; color: var(--text-secondary)"><GripVertical :size="16" /></td>
            <td><input class="form-input" v-model="item.description" :placeholder="$t('common.description')"
                @input="recalc" @focus="selectAll" /></td>
            <td><input class="form-input text-right" v-model.number="item.quantity" type="number" step="0.01"
                min="0" @input="recalc" @focus="selectAll" /></td>
            <td>
              <AppSelect v-model="item.unit" :options="unitOptions" size="sm" />
            </td>
            <td><input class="form-input text-right" v-model.number="item.price_net" type="number" step="0.01"
                min="0" @input="recalc" @focus="selectAll" /></td>
            <td>
              <AppSelect v-model="item.tax_rate" :options="taxRateOptions" size="sm" @change="recalc" style="width: 80px" />
            </td>
            <td><input class="form-input text-right" v-model.number="item.total_gross" type="number" step="0.01"
                min="0" @input="recalcFromGross(i)" @focus="selectAll" /></td>
            <td>
              <div class="flex gap-1" style="justify-content: flex-end">
                <button class="btn btn-ghost btn-sm" v-if="!item.product_id" @click="emit('save-to-catalog', i)"
                  :data-tooltip="$t('invoiceForm.saveToCatalog')"><Save :size="14" /></button>
                <button class="btn btn-ghost btn-sm" @click="removeItem(i)"><X :size="14" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div style="padding: 12px 16px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 16px; align-items: center">
        <span style="font-size: 13px; font-weight: 500; color: var(--text-primary)">
          {{ $t('invoiceForm.shippingCosts') }}:
        </span>
        <div class="flex items-center gap-2">
          <input class="form-input text-right" type="number" step="0.01" min="0"
            :value="shippingNet" @input="emit('update:shippingNet', Number(($event.target as HTMLInputElement).value))"
            style="width: 80px; font-size: 13px" placeholder="0.00" @focus="selectAll" />
          <span style="font-size: 12px; color: var(--text-secondary)">€</span>
        </div>
        <div class="flex items-center gap-2">
          <AppSelect
            :model-value="shippingTaxRate"
            :options="taxRateOptions"
            style="width: 80px"
            @change="emit('update:shippingTaxRate', Number($event))"
          />
          <span style="font-size: 12px; color: var(--text-secondary)">{{ $t('invoiceForm.vat') }}</span>
        </div>
      </div>
      <div class="empty-state" v-if="!items.length" style="padding: 32px">
        <div class="empty-desc">{{ $t('invoiceForm.noPositions') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { type Product, type InvoiceItem } from '../services/database';
import { calcNet, calcTax, calcGross, calcNetFromGross, round2 } from '../utils/money';
import { GripVertical, Save, X } from 'lucide-vue-next';
import AppSelect, { type SelectOption } from '../components/AppSelect.vue';
import { TAX_RATE_OPTIONS } from '../utils/taxRates';

const props = defineProps<{
  items: InvoiceItem[];
  availableProducts: Product[];
  shippingNet: number;
  shippingTaxRate: number;
  defaultTaxRate: number;
}>();

const emit = defineEmits<{
  'update:items': [items: InvoiceItem[]];
  'update:shippingNet': [value: number];
  'update:shippingTaxRate': [value: number];
  'save-to-catalog': [index: number];
}>();

const { locale, t } = useI18n({ useScope: 'global' });

function formatCurrency(val: number) {
  return new Intl.NumberFormat(locale.value === 'de' ? 'de-DE' : 'en-US', { style: 'currency', currency: 'EUR' }).format(val);
}

function selectAll(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target) setTimeout(() => target.select(), 10);
}

const selectedProduct = ref<number>(0);

const catalogOptions = computed<SelectOption[]>(() =>
  props.availableProducts.map(p => ({
    value: p.id as number,
    label: `${p.name} (${formatCurrency(p.price_net)})`,
  }))
);

const taxRateOptions = TAX_RATE_OPTIONS;

const unitOptions = computed<SelectOption[]>(() => [
  { value: 'Stk', label: t('invoiceForm.unitPc') },
  { value: 'Std', label: t('invoiceForm.unitHour') },
  { value: 'Pausch.', label: t('invoiceForm.unitFlat') },
  { value: 'kg', label: t('invoiceForm.unitKg') },
  { value: 'm', label: t('invoiceForm.unitM') },
  { value: 'Lizenz', label: t('invoiceForm.unitLicense') },
]);
const dragIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

// items is mutated in place (it's a reactive array from the parent)
// we emit update:items after structural changes (add/remove/reorder)

function recalc() {
  for (const item of props.items) {
    item.total_net = calcNet(item.quantity, item.price_net);
    item.total_tax = calcTax(item.total_net, item.tax_rate);
    item.total_gross = calcGross(item.total_net, item.total_tax);
  }
}

function recalcFromGross(index: number) {
  const item = props.items[index];
  if (!item || item.total_gross <= 0) return;
  const gross = item.total_gross;
  item.total_net = calcNetFromGross(gross, item.tax_rate);
  item.total_tax = calcTax(item.total_net, item.tax_rate);
  if (item.quantity > 0) {
    item.price_net = round2(item.total_net / item.quantity);
  }
}

function addItem() {
  const newItems = [...props.items, {
    product_id: null, position: props.items.length + 1,
    description: '', quantity: 1, unit: 'Stk', price_net: 0,
    tax_rate: props.defaultTaxRate, total_net: 0, total_tax: 0, total_gross: 0
  }];
  emit('update:items', newItems);
}

function addFromCatalog() {
  const p = props.availableProducts.find(prod => prod.id === selectedProduct.value);
  if (!p) return;
  const tax = calcTax(p.price_net, p.tax_rate);
  const newItems = [...props.items, {
    product_id: p.id || null, position: props.items.length + 1,
    description: p.name + (p.description ? ' – ' + p.description : ''),
    quantity: 1, unit: p.unit, price_net: p.price_net,
    tax_rate: p.tax_rate, total_net: p.price_net,
    total_tax: tax,
    total_gross: calcGross(p.price_net, tax)
  }];
  emit('update:items', newItems);
  selectedProduct.value = 0;
}

function removeItem(i: number) {
  const newItems = props.items.filter((_, idx) => idx !== i);
  emit('update:items', newItems);
}

function onDragStart(index: number, e: DragEvent) {
  dragIndex.value = index;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }
}

function onDragOver(index: number) {
  if (dragIndex.value === null || dragIndex.value === index) return;
  dragOverIndex.value = index;
  const newItems = [...props.items];
  const dragged = newItems[dragIndex.value];
  newItems.splice(dragIndex.value, 1);
  newItems.splice(index, 0, dragged);
  dragIndex.value = index;
  emit('update:items', newItems);
}

function onDragEnd() {
  dragIndex.value = null;
  dragOverIndex.value = null;
}
</script>
