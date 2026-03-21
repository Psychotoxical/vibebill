<template>
  <div>
    <div class="topbar">
      <div class="topbar-title">{{ $t('invoices.title') }}</div>
      <div class="topbar-actions">
        <button class="btn btn-secondary" @click="exportCsv"><Download :size="15" /> {{ $t('invoices.exportCsv') }}</button>
        <router-link to="/invoices/new" class="btn btn-primary">{{ $t('invoices.newInvoice') }}</router-link>
      </div>
    </div>
    <div class="page-content">
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="search-bar" style="max-width: 260px; width: 100%">
            <span class="search-icon"><Search :size="15" /></span>
            <input class="form-input" v-model="search" :placeholder="$t('invoices.searchPlaceholder')" />
          </div>
          <AppSelect v-model="filterStatus" :options="statusFilterOptions" />
        </div>
      </div>
      <div class="card">
        <div class="card-body" style="padding: 0">
          <table class="data-table" v-if="filtered.length">
            <thead>
              <tr>
                <th>{{ $t('invoices.nr') }}</th>
                <th>{{ $t('invoices.customer') }}</th>
                <th>{{ $t('invoices.seller') }}</th>
                <th>{{ $t('invoices.date') }}</th>
                <th>{{ $t('common.status') }}</th>
                <th class="text-right">{{ $t('common.amount') }}</th>
                <th class="actions-cell">{{ $t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inv in filtered" :key="inv.id" @dblclick="router.push('/invoices/' + inv.id + '/edit')" style="cursor: pointer">
                <td><strong>{{ inv.invoice_number }}</strong></td>
                <td>{{ inv.customer_name }}</td>
                <td>{{ inv.seller_name }}</td>
                <td>{{ formatDate(inv.date) }}</td>
                <td>
                  <AppSelect
                    :model-value="inv.status"
                    size="sm"
                    :options="statusOptions"
                    @change="v => changeStatus(inv, String(v))"
                  />
                </td>
                <td class="text-right">
                  <div>{{ formatCurrency(inv.total_gross) }}</div>
                  <div v-if="Number(inv.paid_amount) > 0 && inv.status !== 'paid' && inv.status !== 'sent'" 
                       style="font-size: 0.8em; color: var(--success); margin-top: 2px;">
                    {{ formatCurrency(Number(inv.paid_amount)) }} {{ $t('status.paid') }}
                  </div>
                </td>
                <td class="actions-cell">
                  <button v-if="inv.status !== 'paid' && inv.status !== 'sent'" class="btn btn-ghost btn-icon" @click="changeStatus(inv, 'paid')" :data-tooltip="$t('invoices.markPaid')" style="color: var(--success)"><CheckCircle :size="15" /></button>
                  <button class="btn btn-ghost btn-icon" @click="exportPdf(inv)" :data-tooltip="$t('invoices.exportPdf')"><FileDown :size="15" /></button>
                  <router-link :to="'/invoices/' + inv.id + '/edit'" class="btn btn-ghost btn-icon" :data-tooltip="$t('common.edit')"><Pencil :size="15" /></router-link>
                  <button class="btn btn-ghost btn-icon" @click="duplicate(inv)" :data-tooltip="$t('invoices.duplicate')"><Copy :size="15" /></button>
                  <button class="btn btn-ghost btn-icon" @click="confirmDelete(inv)" :data-tooltip="$t('common.delete')"><Trash2 :size="15" /></button>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="empty-state" v-else-if="!search && !filterStatus">
            <div class="empty-icon"><FileText :size="40" /></div>
            <div class="empty-title">{{ $t('invoices.noInvoices') }}</div>
            <div class="empty-desc">{{ $t('invoices.createFirst') }}</div>
            <router-link to="/invoices/new" class="btn btn-primary">{{ $t('invoices.newInvoice') }}</router-link>
          </div>
          <div class="empty-state" v-else>
            <div class="empty-desc">{{ $t('common.noResults') }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete confirm -->
    <div class="modal-overlay" v-if="deleteTarget" @click.self="deleteTarget = null">
      <div class="modal" style="max-width: 400px">
        <div class="modal-header"><h2>{{ $t('invoices.deleteConfirm') }}</h2></div>
        <div class="modal-body">
          <p>{{ $t('invoices.deleteMessage', { nr: deleteTarget.invoice_number }) }}</p>
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
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  getInvoices, getInvoice, deleteInvoice, updateInvoiceStatus,
  createInvoice, generateInvoiceNumber,
  type Invoice
} from '../services/database';
import { generateInvoicePdf } from '../utils/pdfGenerator';
import { exportInvoicesCsv } from '../utils/csvExport';
import { useToast } from '../composables/useToast';
import { Download, Search, CheckCircle, FileDown, Pencil, Copy, Trash2, FileText } from 'lucide-vue-next';
import AppSelect from '../components/AppSelect.vue';

const { locale, t } = useI18n({ useScope: 'global' });
const router = useRouter();
const toast = useToast();
const invoices = ref<Invoice[]>([]);
const search = ref('');
const filterStatus = ref('');
const deleteTarget = ref<Invoice | null>(null);

const statusFilterOptions = computed(() => [
  { value: '', label: t('status.allStatus') },
  { value: 'draft', label: t('status.draft') },
  { value: 'sent', label: t('status.sent') },
  { value: 'paid', label: t('status.paid') },
  { value: 'overdue', label: t('status.overdue') },
  { value: 'cancelled', label: t('status.cancelled') },
]);

const statusOptions = computed(() => [
  { value: 'draft', label: t('status.draft') },
  { value: 'sent', label: t('status.sent') },
  { value: 'paid', label: t('status.paid') },
  { value: 'overdue', label: t('status.overdue') },
  { value: 'cancelled', label: t('status.cancelled') },
]);

const filtered = computed(() => {
  let items = invoices.value;
  if (filterStatus.value) items = items.filter(i => i.status === filterStatus.value);
  if (search.value) {
    const q = search.value.toLowerCase();
    items = items.filter(i =>
      i.invoice_number.toLowerCase().includes(q) ||
      (i.customer_name || '').toLowerCase().includes(q) ||
      (i.seller_name || '').toLowerCase().includes(q)
    );
  }
  return items;
});

onMounted(load);

async function load() {
  try { invoices.value = await getInvoices(); } catch (e) { console.error(e); }
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat(locale.value === 'de' ? 'de-DE' : 'en-US', { style: 'currency', currency: 'EUR' }).format(val);
}

function formatDate(d: string): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString(locale.value === 'de' ? 'de-DE' : 'en-US');
}

async function changeStatus(inv: Invoice, status: string) {
  try {
    await updateInvoiceStatus(inv.id!, status);
    await load();
    toast.success(t('toast.invoiceStatusChanged'));
  } catch (e) { console.error(e); toast.error(t('toast.error')); }
}

async function exportPdf(inv: Invoice) {
  try {
    const full = await getInvoice(inv.id!);
    if (full) { await generateInvoicePdf(full); toast.success(t('toast.pdfExported')); }
  } catch (e) { console.error(e); toast.error(t('toast.error')); }
}

async function duplicate(inv: Invoice) {
  try {
    const full = await getInvoice(inv.id!);
    if (!full) return;
    const newNumber = await generateInvoiceNumber(full.seller_id);
    const newInv: Invoice = {
      ...full,
      id: undefined,
      invoice_number: newNumber,
      date: new Date().toISOString().split('T')[0],
      status: 'draft',
      created_at: undefined,
    };
    const items = (full.items || []).map(item => ({
      ...item,
      id: undefined,
      invoice_id: undefined,
    }));
    await createInvoice(newInv, items);
    await load();
    toast.success(t('toast.invoiceDuplicated'));
  } catch (e) { console.error(e); toast.error(t('toast.error')); }
}

function confirmDelete(inv: Invoice) { deleteTarget.value = inv; }

async function doDelete() {
  if (!deleteTarget.value?.id) return;
  try { await deleteInvoice(deleteTarget.value.id); deleteTarget.value = null; await load(); toast.success(t('toast.invoiceDeleted')); }
  catch (e) { console.error(e); toast.error(t('toast.error')); }
}

async function exportCsv() {
  try {
    const ok = await exportInvoicesCsv(filtered.value, locale.value);
    if (ok) toast.success(t('toast.csvExported'));
  } catch (e) { console.error(e); toast.error(t('toast.error')); }
}
</script>
