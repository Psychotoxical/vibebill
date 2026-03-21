<template>
  <div>
    <div class="topbar">
      <div class="topbar-title">{{ $t('sellers.title') }}</div>
      <div class="topbar-actions">
        <button class="btn btn-primary" @click="openForm()">{{ $t('sellers.newSeller') }}</button>
      </div>
    </div>
    <div class="page-content">
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="search-bar" style="max-width: 320px; width: 100%">
            <span class="search-icon"><Search :size="15" /></span>
            <input class="form-input" v-model="search" :placeholder="$t('sellers.searchPlaceholder')" />
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-body" style="padding: 0">
          <table class="data-table" v-if="filtered.length">
            <thead>
              <tr>
                <th style="width: 50px">{{ $t('sellers.logo') }}</th>
                <th>{{ $t('common.name') }}</th>
                <th>{{ $t('sellers.prefix') }}</th>
                <th>{{ $t('common.email') }}</th>
                <th>{{ $t('sellers.taxNr') }}</th>
                <th class="actions-cell">{{ $t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in filtered" :key="s.id" @dblclick="openForm(s)" style="cursor: pointer">
                <td>
                  <div class="logo-preview" style="width:36px;height:36px;cursor:default" v-if="s.logo_data">
                    <img :src="s.logo_data" alt="Logo" />
                  </div>
                  <span v-else style="color:var(--text-secondary)">—</span>
                </td>
                <td><strong>{{ s.name }}</strong></td>
                <td><code>{{ s.invoice_prefix }}</code></td>
                <td>{{ s.email }}</td>
                <td>{{ s.tax_id }}</td>
                <td class="actions-cell">
                  <button class="btn btn-ghost btn-sm" @click="exportYearly(s)" data-tooltip="Jahresübersicht"><BarChart2 :size="15" /></button>
                  <button class="btn btn-ghost btn-sm" @click="openForm(s)" data-tooltip="Bearbeiten"><Pencil :size="15" /></button>
                  <button class="btn btn-ghost btn-sm" @click="confirmDelete(s)" data-tooltip="Löschen"><Trash2 :size="15" /></button>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="empty-state" v-else-if="!search">
            <div class="empty-icon"><Building2 :size="40" /></div>
            <div class="empty-title">{{ $t('sellers.noSellers') }}</div>
            <div class="empty-desc">{{ $t('sellers.createFirst') }}</div>
            <button class="btn btn-primary" @click="openForm()">{{ $t('sellers.newSeller') }}</button>
          </div>
          <div class="empty-state" v-else>
            <div class="empty-desc">{{ $t('common.noResults') }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal-overlay" v-if="showModal" @click.self="confirmClose">
      <div class="modal modal-wide">
        <div class="modal-header">
          <h2>{{ editing ? $t('sellers.editSeller') : $t('sellers.newSellerTitle') }}</h2>
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
              <button v-if="form.logo_data" class="btn btn-ghost btn-sm" @click="form.logo_data = ''">{{
                $t('sellers.removeLogo') }}</button>
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
              <input class="form-input" v-model="form.invoice_prefix" placeholder="RE" />
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
              <div class="flex gap-2">
                <AppSelect v-model="form.pdf_template" :options="[
                  { value: 'classic', label: 'Classic' },
                  { value: 'modern', label: 'Modern' },
                  { value: 'minimal', label: 'Minimal' },
                ]" style="flex: 1" />
                <button class="btn btn-secondary" @click="showPreview" data-tooltip="Vorschau ansehen"><Eye :size="15" /> Vorschau</button>
              </div>
            </div>
          </div>
          <hr style="border-color: var(--border-color); margin: 8px 0 16px" />
          <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 14px; color: var(--text-primary)">{{
            $t('settings.invoiceDefaults') }}</h3>
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

    <!-- Delete confirm -->
    <div class="modal-overlay" v-if="deleteTarget" @click.self="deleteTarget = null">
      <div class="modal" style="max-width: 400px">
        <div class="modal-header">
          <h2>{{ $t('sellers.deleteConfirm') }}</h2>
        </div>
        <div class="modal-body">
          <p>{{ $t('sellers.deleteMessage', { name: deleteTarget.name }) }}</p>
          <p class="text-sm text-secondary mt-4">{{ $t('sellers.deleteNote') }}</p>
          <div class="confirm-actions">
            <button class="btn btn-secondary" @click="deleteTarget = null">{{ $t('common.cancel') }}</button>
            <button class="btn btn-danger" @click="doDelete">{{ $t('common.delete') }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- PDF Preview Modal -->
    <div class="modal-overlay" v-if="previewPdfUrl" @click.self="previewPdfUrl = null">
      <div class="modal modal-wide" style="max-width: 800px; height: 90vh; display: flex; flex-direction: column;">
        <div class="modal-header">
          <h2>PDF-Vorschau ({{ form.pdf_template }})</h2>
          <button class="btn btn-ghost btn-icon" @click="previewPdfUrl = null"><X :size="16" /></button>
        </div>
        <div class="modal-body" style="flex: 1; padding: 0; min-height: 0;">
          <iframe :src="previewPdfUrl" style="width: 100%; height: 100%; border: none;"></iframe>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Search, BarChart2, Pencil, Trash2, Building2, Eye, X } from 'lucide-vue-next';
import AppSelect from '../components/AppSelect.vue';
import { TAX_RATE_OPTIONS } from '../utils/taxRates';
import { useI18n } from 'vue-i18n';
import { getSellers, createSeller, updateSeller, deleteSeller, getInvoices, type Seller } from '../services/database';
import { useToast } from '../composables/useToast';
import { generateYearlyOverviewPdf } from '../utils/yearlyOverview';
import { previewPdfTemplate } from '../utils/pdfGenerator';
import { confirm } from '@tauri-apps/plugin-dialog';

const { t } = useI18n({ useScope: 'global' });
const toast = useToast();

const sellers = ref<Seller[]>([]);
const search = ref('');
const showModal = ref(false);
const editing = ref(false);
const deleteTarget = ref<Seller | null>(null);

const emptyForm = (): Seller => ({
  name: '', first_name: '', last_name: '', street: '', city: '', zip: '', country: 'Deutschland',
  phone: '', email: '', website: '', tax_id: '', vat_id: '',
  bank_name: '', bank_iban: '', bank_bic: '', logo_data: '',
  invoice_prefix: 'RE', next_invoice_number: 1, pdf_template: 'classic',
  default_payment_terms: '', default_tax_rate: null, currency: 'EUR', default_note: ''
});

const form = ref<Seller>(emptyForm());
const originalForm = ref<Seller>(emptyForm());
const previewPdfUrl = ref<string | null>(null);

const filtered = computed(() => {
  if (!search.value) return sellers.value;
  const q = search.value.toLowerCase();
  return sellers.value.filter(s =>
    s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
  );
});

onMounted(load);

async function load() {
  try {
    sellers.value = await getSellers();
  } catch (e) {
    console.error('Load sellers error:', e);
  }
}

function openForm(s?: Seller) {
  if (s) {
    editing.value = true;
    form.value = { ...s };
    originalForm.value = { ...s };
  } else {
    editing.value = false;
    form.value = emptyForm();
    originalForm.value = emptyForm();
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
    if (editing.value) {
      await updateSeller(form.value);
    } else {
      await createSeller(form.value);
    }
    showModal.value = false;
    await load();
    toast.success(t('toast.sellerSaved'));
  } catch (e) {
    console.error('Save seller error:', e);
    toast.error(t('toast.error'));
  }
}

function confirmDelete(s: Seller) {
  deleteTarget.value = s;
}

async function doDelete() {
  if (!deleteTarget.value?.id) return;
  try {
    await deleteSeller(deleteTarget.value.id);
    deleteTarget.value = null;
    await load();
    toast.success(t('toast.sellerDeleted'));
  } catch (e) {
    console.error('Delete seller error:', e);
    toast.error(t('toast.error'));
  }
}

function showPreview() {
  try {
    previewPdfUrl.value = previewPdfTemplate(form.value);
  } catch (e) {
    console.error('Preview error:', e);
    toast.error(t('toast.error'));
  }
}

async function exportYearly(s: Seller) {
  if (!s.id) return;
  const yearStr = prompt('Für welches Jahr?', String(new Date().getFullYear()));
  if (!yearStr) return;
  const year = parseInt(yearStr, 10);
  if (isNaN(year)) return;

  try {
    const invoices = await getInvoices();
    await generateYearlyOverviewPdf(s.id, year, invoices);
    toast.success(t('toast.pdfExported'));
  } catch (e) {
    console.error(e);
    toast.error(t('toast.error'));
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
      reader.onload = () => {
        form.value.logo_data = reader.result as string;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  } catch (e) {
    console.error('Logo select error:', e);
  }
}
</script>
