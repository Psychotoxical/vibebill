<template>
  <div>
    <div class="topbar">
      <div class="topbar-title">{{ isEdit ? $t('invoices.editInvoice') : $t('invoices.newInvoiceTitle') }}</div>
      <div class="topbar-actions">
        <router-link to="/invoices" class="btn btn-secondary">{{ $t('common.back') }}</router-link>
        <button class="btn btn-primary" @click="saveInvoice" :disabled="!canSave || isSaving"><Save :size="15" /> {{ $t('common.save') }}</button>
        <button v-if="isEdit" class="btn btn-secondary" @click="exportPdf"><FileDown :size="15" /> {{ $t('invoiceForm.pdf') }}</button>
      </div>
    </div>
    <div class="page-content">

      <!-- Invoice metadata -->
      <div class="card mb-4">
        <div class="card-header">
          <h2>{{ $t('invoiceForm.invoiceData') }}</h2>
        </div>
        <div class="card-body">
          <div class="form-row-3">
            <div class="form-group">
              <label class="form-label">{{ $t('invoiceForm.seller') }} *</label>
              <AppSelect
                v-model="invoice.seller_id"
                :options="sellerOptions"
                :placeholder="$t('common.choose')"
                @change="() => onSellerChange()"
              />
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('invoiceForm.customer') }} *</label>
              <AppSelect
                v-model="invoice.customer_id"
                :options="customerOptions"
                :placeholder="$t('common.choose')"
              />
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('invoiceForm.invoiceNumber') }} *</label>
              <div class="flex gap-2">
                <input class="form-input" v-model="invoice.invoice_number" :placeholder="suggestedNumber" />
                <button class="btn btn-secondary btn-sm" @click="autoNumber" data-tooltip="Auto" :disabled="!invoice.seller_id"><RefreshCw :size="14" /></button>
              </div>
              <div class="form-hint">{{ $t('invoiceForm.autoOrManual') }}</div>
            </div>
          </div>
          <div class="form-row-3">
            <div class="form-group">
              <label class="form-label">{{ $t('common.date') }} *</label>
              <input class="form-input" type="date" v-model="invoice.date" @change="blurInput" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('invoiceForm.paymentTerms') }}</label>
              <AppSelect
                v-model="invoice.payment_terms"
                :options="paymentTermsOptions"
                @change="() => calcDueDate()"
              />
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('invoiceForm.dueDate') }}</label>
              <input class="form-input" type="date" v-model="invoice.due_date" @change="blurInput" />
            </div>
          </div>
          <div class="form-group" style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <input type="checkbox" id="alreadyPaidCheck" v-model="invoice.already_paid" :true-value="1" :false-value="0" />
            <label for="alreadyPaidCheck" style="font-size: 14px; cursor: pointer; color: var(--text-primary);">
              {{ $t('invoiceForm.markAsPaidCheckbox') }}
            </label>
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('common.notes') }}</label>
            <textarea class="form-textarea" v-model="invoice.notes" rows="2"
              :placeholder="$t('invoiceForm.notesPlaceholder')"></textarea>
          </div>
        </div>
      </div>

      <!-- Line items -->
      <InvoiceItemsTable
        :items="items"
        :available-products="availableProducts"
        :shipping-net="invoice.shipping_net ?? 0"
        :shipping-tax-rate="invoice.shipping_tax_rate ?? 19"
        :default-tax-rate="defaultTaxRate"
        @update:items="items = $event"
        @update:shippingNet="invoice.shipping_net = $event"
        @update:shippingTaxRate="invoice.shipping_tax_rate = $event"
        @save-to-catalog="openProductModal"
      />

      <!-- Totals -->
      <div class="invoice-totals" v-if="items.length">
        <table>
          <tbody>
            <tr>
              <td class="total-label">{{ $t('invoiceForm.netTotal') }}</td>
              <td class="total-value">{{ formatCurrency(totals.net) }}</td>
            </tr>
            <tr v-for="tax in taxBreakdown" :key="tax.rate">
              <td class="total-label">{{ $t('invoiceForm.vatAmount', { rate: tax.rate }) }}</td>
              <td class="total-value">{{ formatCurrency(tax.amount) }}</td>
            </tr>
            <tr class="grand-total">
              <td class="total-label">{{ $t('invoiceForm.grossTotal') }}</td>
              <td class="total-value">{{ formatCurrency(totals.gross) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Payments (only on edit) -->
      <div class="card mb-4" v-if="isEdit">
        <div class="card-header">
          <h2>{{ $t('invoiceForm.payments') }}</h2>
          <div class="flex items-center gap-2">
            <span class="badge" :class="remainingAmount <= 0 ? 'badge-paid' : 'badge-overdue'" style="font-size: 13px">
              {{ formatCurrency(paidTotal) }} / {{ formatCurrency(totals.gross) }}
            </span>
          </div>
        </div>
        <div class="card-body" style="padding: 0">
          <table class="data-table" v-if="payments.length">
            <thead>
              <tr>
                <th>{{ $t('common.date') }}</th>
                <th class="text-right">{{ $t('common.amount') }}</th>
                <th>{{ $t('invoiceForm.paymentMethod') }}</th>
                <th>{{ $t('common.notes') }}</th>
                <th style="width: 45px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in payments" :key="p.id">
                <td>{{ formatDate(p.date) }}</td>
                <td class="text-right" style="color: var(--success); font-weight: 600">{{ formatCurrency(p.amount) }}</td>
                <td>{{ p.method }}</td>
                <td>{{ p.notes }}</td>
                <td><button class="btn btn-ghost btn-sm" @click="removePayment(p.id!)"><Trash2 :size="15" /></button></td>
              </tr>
            </tbody>
          </table>
          <div style="padding: 12px 16px; border-top: 1px solid var(--border-color)">
            <div class="form-row" style="align-items: flex-end">
              <div class="form-group" style="margin-bottom: 0">
                <label class="form-label" style="font-size: 11px">{{ $t('common.date') }}</label>
                <input class="form-input" type="date" v-model="newPayment.date" style="font-size: 13px" @change="blurInput" />
              </div>
              <div class="form-group" style="margin-bottom: 0">
                <label class="form-label" style="font-size: 11px">{{ $t('common.amount') }} (€)</label>
                <input class="form-input text-right" type="number" step="0.01" min="0"
                  v-model.number="newPayment.amount" style="font-size: 13px" @focus="selectAll" />
              </div>
              <div class="form-group" style="margin-bottom: 0">
                <label class="form-label" style="font-size: 11px">{{ $t('invoiceForm.paymentMethod') }}</label>
                <AppSelect v-model="newPayment.method" :options="paymentMethodOptions" />
              </div>
              <div class="form-group" style="margin-bottom: 0">
                <button class="btn btn-primary btn-sm" @click="addNewPayment" :disabled="!newPayment.amount">
                  + {{ $t('invoiceForm.addPayment') }}
                </button>
              </div>
            </div>
          </div>
          <div v-if="remainingAmount > 0"
            style="padding: 8px 16px; font-size: 13px; color: var(--danger); font-weight: 600; border-top: 1px solid var(--border-color)">
            {{ $t('invoiceForm.remaining') }}: {{ formatCurrency(remainingAmount) }}
          </div>
        </div>
      </div>
    </div>

    <QuickCustomerModal :open="showCustomerModal" @update:open="showCustomerModal = $event"
      @saved="onCustomerSaved" />
    <QuickSellerModal :open="showSellerModal" @update:open="showSellerModal = $event"
      @saved="onSellerSaved" />
    <QuickProductModal :open="showProductModal" @update:open="showProductModal = $event"
      :seller-id="invoice.seller_id" :default-tax-rate="defaultTaxRate"
      :initial-item="productModalItem" :item-index="productSaveIndex"
      @saved="onProductSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  getSellers, getCustomers, getProducts, getInvoice,
  createInvoice, updateInvoice, generateInvoiceNumber,
  getPaymentsForInvoice, addPayment, deletePayment,
  type Seller, type Customer, type Product, type Invoice, type InvoiceItem, type Payment
} from '../services/database';
import { generateInvoicePdf } from '../utils/pdfGenerator';
import { useToast } from '../composables/useToast';
import { calcTax, sum, addToMap } from '../utils/money';
import { Save, FileDown, RefreshCw, Trash2 } from 'lucide-vue-next';
import AppSelect from '../components/AppSelect.vue';
import InvoiceItemsTable from '../components/InvoiceItemsTable.vue';
import QuickCustomerModal from '../components/QuickCustomerModal.vue';
import QuickSellerModal from '../components/QuickSellerModal.vue';
import QuickProductModal from '../components/QuickProductModal.vue';

const { locale, t } = useI18n({ useScope: 'global' });
const route = useRoute();
const router = useRouter();
const toast = useToast();

function selectAll(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target) setTimeout(() => target.select(), 10);
}

function blurInput(e: Event) {
  (e.target as HTMLInputElement)?.blur();
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat(locale.value === 'de' ? 'de-DE' : 'en-US', { style: 'currency', currency: 'EUR' }).format(val);
}

function formatDate(d: string): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString(locale.value === 'de' ? 'de-DE' : 'en-US');
}

// ── State ──────────────────────────────────────────────────────────────────
const isEdit = computed(() => !!route.params.id);
const isSaving = ref(false);

const sellers = ref<Seller[]>([]);
const customers = ref<Customer[]>([]);
const products = ref<Product[]>([]);
const suggestedNumber = ref('');
const defaultTaxRate = ref(19);
const currency = ref('EUR');

const invoice = ref<Invoice>({
  seller_id: 0, customer_id: 0, invoice_number: '', date: new Date().toISOString().split('T')[0],
  due_date: '', status: 'draft', notes: '', payment_terms: '14 Tage netto',
  total_net: 0, total_tax: 0, total_gross: 0,
  shipping_net: 0, shipping_tax_rate: 19, already_paid: 0
});

const items = ref<InvoiceItem[]>([]);

// ── Modals ─────────────────────────────────────────────────────────────────
const showCustomerModal = ref(false);
const showSellerModal = ref(false);
const showProductModal = ref(false);
const productSaveIndex = ref(-1);
const productModalItem = ref<{ description: string; unit: string; price_net: number; tax_rate: number } | null>(null);

// ── Payments ───────────────────────────────────────────────────────────────
const payments = ref<Payment[]>([]);
const newPayment = ref({ date: new Date().toISOString().split('T')[0], amount: 0, method: '', notes: '' });
const paidTotal = computed(() => payments.value.reduce((s, p) => s + p.amount, 0));
const remainingAmount = computed(() => Math.max(0, totals.value.gross - paidTotal.value));

// ── Computed ───────────────────────────────────────────────────────────────
const sellerOptions = computed(() => [
  { value: -1, label: t('invoiceForm.createNewSeller'), accent: true },
  ...sellers.value.map(s => ({ value: s.id as number, label: s.name })),
]);

const customerOptions = computed(() => [
  { value: -1, label: t('invoiceForm.createNewCustomer'), accent: true },
  ...customers.value.map(c => ({ value: c.id as number, label: c.name })),
]);

const paymentTermsOptions = computed(() => [
  { value: 'Sofort fällig', label: t('invoiceForm.paymentImmediate') },
  { value: '7 Tage netto', label: t('invoiceForm.payment7') },
  { value: '14 Tage netto', label: t('invoiceForm.payment14') },
  { value: '30 Tage netto', label: t('invoiceForm.payment30') },
]);

const paymentMethodOptions = computed(() => [
  { value: '', label: '—' },
  { value: 'bank', label: t('invoiceForm.methodBank') },
  { value: 'cash', label: t('invoiceForm.methodCash') },
  { value: 'paypal', label: 'PayPal' },
  { value: 'other', label: t('invoiceForm.methodOther') },
]);

const availableProducts = computed(() => {
  if (!invoice.value.seller_id) return [];
  return products.value.filter(p => p.seller_id === invoice.value.seller_id && p.active);
});

const canSave = computed(() =>
  invoice.value.seller_id && invoice.value.customer_id && invoice.value.invoice_number && items.value.length > 0
);

const totals = computed(() => {
  const sNet = typeof invoice.value.shipping_net === 'number' ? invoice.value.shipping_net : 0;
  const sRate = typeof invoice.value.shipping_tax_rate === 'number' ? invoice.value.shipping_tax_rate : 19;
  const sTax = sNet > 0 ? calcTax(sNet, sRate) : 0;
  const net = sum([sNet, ...items.value.map(i => i.total_net)]);
  const tax = sum([sTax, ...items.value.map(i => i.total_tax)]);
  const gross = sum([sNet + sTax, ...items.value.map(i => i.total_gross)]);
  return { net, tax, gross };
});

const taxBreakdown = computed(() => {
  const map: Record<number, number> = {};
  for (const item of items.value) {
    addToMap(map, item.tax_rate, item.total_tax);
  }
  const sNet = typeof invoice.value.shipping_net === 'number' ? invoice.value.shipping_net : 0;
  if (sNet > 0) {
    const sRate = typeof invoice.value.shipping_tax_rate === 'number' ? invoice.value.shipping_tax_rate : 19;
    addToMap(map, sRate, calcTax(sNet, sRate));
  }
  return Object.entries(map)
    .map(([rate, amount]) => ({ rate: Number(rate), amount }))
    .filter(t => t.amount > 0)
    .sort((a, b) => a.rate - b.rate);
});

// ── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    sellers.value = await getSellers();
    customers.value = await getCustomers();
    products.value = await getProducts();

    if (route.params.id) {
      const inv = await getInvoice(Number(route.params.id));
      if (inv) {
        invoice.value = inv;
        items.value = inv.items || [];
        payments.value = await getPaymentsForInvoice(inv.id!);
      }
    } else {
      calcDueDate();
    }
  } catch (e) { console.error(e); }
});

watch(() => invoice.value.date, calcDueDate);

watch(() => invoice.value.customer_id, (val) => {
  if (val === -1) {
    invoice.value.customer_id = 0;
    showCustomerModal.value = true;
  }
});

// ── Seller ─────────────────────────────────────────────────────────────────
async function onSellerChange() {
  if (invoice.value.seller_id === -1) {
    invoice.value.seller_id = 0;
    showSellerModal.value = true;
    return;
  }
  const seller = sellers.value.find(s => s.id === invoice.value.seller_id);
  if (seller) {
    if (seller.default_tax_rate !== null && seller.default_tax_rate !== undefined) {
      defaultTaxRate.value = seller.default_tax_rate;
    }
    if (seller.currency) currency.value = seller.currency;
  }
  if (!isEdit.value && invoice.value.seller_id) {
    try {
      suggestedNumber.value = await peekInvoiceNumber(invoice.value.seller_id);
      if (seller) {
        if (seller.default_payment_terms) invoice.value.payment_terms = seller.default_payment_terms;
        if (seller.default_note) invoice.value.notes = seller.default_note;
        calcDueDate();
      }
    } catch (e) { console.error(e); }
  }
}

async function peekInvoiceNumber(sellerId: number): Promise<string> {
  const seller = sellers.value.find(s => s.id === sellerId);
  if (!seller) return '';
  const year = new Date().getFullYear();
  const num = String(seller.next_invoice_number).padStart(4, '0');
  return `${seller.invoice_prefix}-${year}-${num}`;
}

async function autoNumber() {
  if (!invoice.value.seller_id) return;
  try {
    invoice.value.invoice_number = await generateInvoiceNumber(invoice.value.seller_id);
    sellers.value = await getSellers();
  } catch (e) { console.error(e); }
}

function calcDueDate() {
  if (!invoice.value.date) return;
  const base = new Date(invoice.value.date);
  let days = 14;
  if (invoice.value.payment_terms === 'Sofort fällig') days = 0;
  else if (invoice.value.payment_terms === '7 Tage netto') days = 7;
  else if (invoice.value.payment_terms === '30 Tage netto') days = 30;
  base.setDate(base.getDate() + days);
  invoice.value.due_date = base.toISOString().split('T')[0];
}

// ── Modal callbacks ────────────────────────────────────────────────────────
async function onCustomerSaved(id: number) {
  customers.value = await getCustomers();
  invoice.value.customer_id = id;
}

async function onSellerSaved(id: number) {
  sellers.value = await getSellers();
  invoice.value.seller_id = id;
  onSellerChange();
}

async function onProductSaved(productId: number, itemIndex: number) {
  if (itemIndex >= 0) items.value[itemIndex].product_id = productId;
  products.value = await getProducts();
}

function openProductModal(index: number) {
  if (!invoice.value.seller_id) {
    toast.error(t('invoiceForm.chooseSellerFirst'));
    return;
  }
  const item = items.value[index];
  if (!item) return;
  productSaveIndex.value = index;
  productModalItem.value = {
    description: item.description,
    unit: item.unit,
    price_net: item.price_net,
    tax_rate: item.tax_rate
  };
  showProductModal.value = true;
}

// ── Save ───────────────────────────────────────────────────────────────────
async function saveInvoice() {
  if (isSaving.value) return;
  isSaving.value = true;
  try {
    invoice.value.total_net = totals.value.net;
    invoice.value.total_tax = totals.value.tax;
    invoice.value.total_gross = totals.value.gross;

    if (invoice.value.already_paid && invoice.value.status === 'draft') {
      invoice.value.status = 'paid';
    }

    items.value.forEach((item, i) => item.position = i + 1);

    if (isEdit.value) {
      await updateInvoice(invoice.value, items.value);
    } else {
      await createInvoice(invoice.value, items.value);
    }
    toast.success(t('toast.invoiceSaved'));
    router.push('/invoices');
  } catch (e) {
    console.error('Save invoice error:', e);
    toast.error(t('toast.error'));
  } finally {
    isSaving.value = false;
  }
}

async function exportPdf() {
  try {
    const full = await getInvoice(invoice.value.id!);
    if (full) { await generateInvoicePdf(full); toast.success(t('toast.pdfExported')); }
  } catch (e) { console.error(e); toast.error(t('toast.error')); }
}

// ── Payments ───────────────────────────────────────────────────────────────
async function addNewPayment() {
  if (!newPayment.value.amount || !invoice.value.id) return;
  try {
    await addPayment({
      invoice_id: invoice.value.id,
      amount: newPayment.value.amount,
      date: newPayment.value.date,
      method: newPayment.value.method,
      notes: newPayment.value.notes,
    });
    payments.value = await getPaymentsForInvoice(invoice.value.id);
    newPayment.value = { date: new Date().toISOString().split('T')[0], amount: 0, method: '', notes: '' };
    toast.success(t('toast.paymentAdded'));
  } catch (e) { console.error(e); toast.error(t('toast.error')); }
}

async function removePayment(id: number) {
  if (!invoice.value.id) return;
  try {
    await deletePayment(id);
    payments.value = await getPaymentsForInvoice(invoice.value.id);
    toast.success(t('toast.paymentDeleted'));
  } catch (e) { console.error(e); toast.error(t('toast.error')); }
}
</script>

<style scoped></style>
