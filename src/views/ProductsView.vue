<template>
  <div>
    <div class="topbar">
      <div class="topbar-title">{{ $t('products.title') }}</div>
      <div class="topbar-actions">
        <button class="btn btn-primary" @click="openForm()">{{ $t('products.newProduct') }}</button>
      </div>
    </div>
    <div class="page-content">
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="search-bar" style="max-width: 260px; width: 100%">
            <span class="search-icon"><Search :size="15" /></span>
            <input class="form-input" v-model="search" :placeholder="$t('products.searchPlaceholder')" />
          </div>
          <AppSelect v-model="filterSeller" :options="sellerOptions" />
        </div>
      </div>
      <div class="tabs">
        <button class="tab" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">{{ $t('products.tabAll')
          }}</button>
        <button class="tab" :class="{ active: activeTab === 'product' }" @click="activeTab = 'product'">{{
          $t('products.tabProducts') }}</button>
        <button class="tab" :class="{ active: activeTab === 'service' }" @click="activeTab = 'service'">{{
          $t('products.tabServices') }}</button>
      </div>
      <div class="card">
        <div class="card-body" style="padding: 0">
          <table class="data-table" v-if="filtered.length">
            <thead>
              <tr>
                <th>{{ $t('common.name') }}</th>
                <th>{{ $t('products.type') }}</th>
                <th>{{ $t('products.seller') }}</th>
                <th>{{ $t('products.unit') }}</th>
                <th class="text-right">{{ $t('products.netPrice') }}</th>
                <th class="text-right">{{ $t('products.vat') }}</th>
                <th class="text-right" v-if="activeTab !== 'service'">{{ $t('products.stock') }}</th>
                <th class="actions-cell">{{ $t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in filtered" :key="p.id" @dblclick="openForm(p)" style="cursor: pointer">
                <td>
                  <strong>{{ p.name }}</strong>
                  <div class="text-xs text-secondary" v-if="p.description">{{ p.description }}</div>
                </td>
                <td><span class="badge" :class="p.type === 'product' ? 'badge-sent' : 'badge-paid'">{{ p.type ===
                  'product' ? $t('products.typeProduct') : $t('products.typeService') }}</span></td>
                <td>{{ sellerName(p.seller_id) }}</td>
                <td>{{ displayUnit(p.unit) }}</td>
                <td class="text-right">{{ formatCurrency(p.price_net) }}</td>
                <td class="text-right">{{ p.tax_rate }}%</td>
                <td class="text-right" v-if="activeTab !== 'service'">{{ p.type === 'product' ? p.stock : '—' }}</td>
                <td class="actions-cell">
                  <button class="btn btn-ghost btn-sm" @click="openForm(p)"><Pencil :size="15" /></button>
                  <button class="btn btn-ghost btn-sm" @click="confirmDelete(p)"><Trash2 :size="15" /></button>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="empty-state" v-else-if="!search && !filterSeller">
            <div class="empty-icon"><Package :size="40" /></div>
            <div class="empty-title">{{ $t('products.noProducts') }}</div>
            <div class="empty-desc">{{ $t('products.createFirst') }}</div>
            <button class="btn btn-primary" @click="openForm()">{{ $t('products.newProduct') }}</button>
          </div>
          <div class="empty-state" v-else>
            <div class="empty-desc">{{ $t('common.noResults') }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal-overlay" v-if="showModal" @click.self="confirmClose">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editing ? $t('products.editProduct') : $t('products.newProductTitle') }}</h2>
          <button class="btn btn-ghost btn-icon" @click="confirmClose"><X :size="16" /></button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ $t('products.seller') }} *</label>
              <AppSelect v-model="form.seller_id" :options="sellerModalOptions" :placeholder="$t('common.choose')" />
            </div>
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
                <input type="checkbox" id="isGrossCheck" v-model="formIsGross" />
                <label for="isGrossCheck" style="font-size: 13px; cursor: pointer; color: var(--text-primary);">Brutto
                  eingeben</label>
              </div>
            </div>
          </div>
          <div class="form-row-3">
            <div class="form-group">
              <label class="form-label">{{ formIsGross ? 'Bruttopreis' : $t('products.netPrice') }} (€) *</label>
              <input class="form-input" v-model.number="formDisplayPrice" type="number" step="0.01" min="0"
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
          <div v-if="formIsGross" style="font-size: 12px; color: var(--text-secondary); margin-right: auto;">
            {{ $t('products.calculatedNet') }}: {{ formatCurrency(calculatedNetPrice) }}
          </div>
          <button class="btn btn-secondary" @click="confirmClose">{{ $t('common.cancel') }}</button>
          <button class="btn btn-primary" @click="save"
            :disabled="!form.name || !form.seller_id || formDisplayPrice <= 0">{{ $t('common.save')
            }}</button>
        </div>
      </div>
    </div>

    <!-- Delete confirm -->
    <div class="modal-overlay" v-if="deleteTarget" @click.self="deleteTarget = null">
      <div class="modal" style="max-width: 400px">
        <div class="modal-header">
          <h2>{{ $t('products.deleteConfirm') }}</h2>
        </div>
        <div class="modal-body">
          <p>{{ $t('products.deleteMessage', { name: deleteTarget.name }) }}</p>
          <div class="confirm-actions">
            <button class="btn btn-secondary" @click="deleteTarget = null">{{ $t('common.cancel') }}</button>
            <button class="btn btn-danger" @click="doDelete">{{ $t('common.delete') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Search, Pencil, Trash2, Package, X } from 'lucide-vue-next';
import AppSelect from '../components/AppSelect.vue';
import { useI18n } from 'vue-i18n';
import { getProducts, createProduct, updateProduct, deleteProduct, getSellers, type Product, type Seller } from '../services/database';
import { useToast } from '../composables/useToast';
import { confirm } from '@tauri-apps/plugin-dialog';

const { locale, t } = useI18n({ useScope: 'global' });
const toast = useToast();
const products = ref<Product[]>([]);
const sellers = ref<Seller[]>([]);
const search = ref('');
const filterSeller = ref(0);
const activeTab = ref('all');
const showModal = ref(false);
const editing = ref(false);
const deleteTarget = ref<Product | null>(null);

const sellerOptions = computed(() => [
  { value: 0, label: t('products.allSellers') },
  ...sellers.value.map(s => ({ value: s.id as number, label: s.name })),
]);

const sellerModalOptions = computed(() => [
  ...sellers.value.map(s => ({ value: s.id as number, label: s.name })),
]);

const formIsGross = ref(false);
const formDisplayPrice = ref(0);

const calculatedNetPrice = computed(() => {
  if (!formIsGross.value) return formDisplayPrice.value;
  const taxMultiplier = 1 + (form.value.tax_rate / 100);
  return Math.round((formDisplayPrice.value / taxMultiplier) * 100) / 100;
});

const emptyForm = (): Product => ({
  seller_id: 0, name: '', description: '', type: 'product',
  unit: 'Stk', price_net: 0, tax_rate: 19, stock: 0, active: 1
});

const form = ref<Product>(emptyForm());
const originalForm = ref<Product>(emptyForm());

const filtered = computed(() => {
  let items = products.value;
  if (filterSeller.value) items = items.filter(p => p.seller_id === filterSeller.value);
  if (activeTab.value !== 'all') items = items.filter(p => p.type === activeTab.value);
  if (search.value) {
    const q = search.value.toLowerCase();
    items = items.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }
  return items;
});

onMounted(load);

async function load() {
  try {
    sellers.value = await getSellers();
    products.value = await getProducts();
  } catch (e) { console.error(e); }
}

function sellerName(id: number): string {
  return sellers.value.find(s => s.id === id)?.name || '—';
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat(locale.value === 'de' ? 'de-DE' : 'en-US', { style: 'currency', currency: 'EUR' }).format(val);
}

function displayUnit(unit: string): string {
  switch (unit) {
    case 'Stk': return t('invoiceForm.unitPc');
    case 'Std': return t('invoiceForm.unitHour');
    case 'Pausch.': return t('invoiceForm.unitFlat');
    case 'kg': return t('invoiceForm.unitKg');
    case 'm': return t('invoiceForm.unitM');
    case 'Lizenz': return t('invoiceForm.unitLicense');
    default: return unit;
  }
}

function openForm(p?: Product) {
  formIsGross.value = false;
  if (p) {
    editing.value = true;
    form.value = { ...p };
    originalForm.value = { ...p };
    formDisplayPrice.value = p.price_net;
  } else {
    editing.value = false;
    const f = emptyForm();
    if (filterSeller.value) f.seller_id = filterSeller.value;
    if (sellers.value.length === 1 && sellers.value[0].id) f.seller_id = sellers.value[0].id;
    form.value = { ...f };
    originalForm.value = { ...f };
    formDisplayPrice.value = 0;
  }
  showModal.value = true;
}

async function confirmClose() {
  const hasChanges = JSON.stringify(form.value) !== JSON.stringify(originalForm.value);
  if (hasChanges) {
    const agreed = await confirm(t('common.unsavedChanges'), { title: 'VibeBill', kind: 'warning' });
    if (!agreed) return;
  }
  showModal.value = false;
}

async function save() {
  try {
    form.value.price_net = calculatedNetPrice.value;
    if (editing.value) await updateProduct(form.value);
    else await createProduct(form.value);
    showModal.value = false;
    await load();
    toast.success(t('toast.productSaved'));
  } catch (e) { console.error(e); toast.error(t('toast.error')); }
}

function selectAll(e: Event) {
  setTimeout(() => (e.target as HTMLInputElement)?.select(), 10);
}

function confirmDelete(p: Product) { deleteTarget.value = p; }

async function doDelete() {
  if (!deleteTarget.value?.id) return;
  try { await deleteProduct(deleteTarget.value.id); deleteTarget.value = null; await load(); toast.success(t('toast.productDeleted')); }
  catch (e) { console.error(e); toast.error(t('toast.error')); }
}
</script>
