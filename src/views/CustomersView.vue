<template>
  <div>
    <div class="topbar">
      <div class="topbar-title">{{ $t('customers.title') }}</div>
      <div class="topbar-actions">
        <button class="btn btn-primary" @click="openForm()">{{ $t('customers.newCustomer') }}</button>
      </div>
    </div>
    <div class="page-content">
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="search-bar" style="max-width: 320px; width: 100%">
            <span class="search-icon"><Search :size="15" /></span>
            <input class="form-input" v-model="search" :placeholder="$t('customers.searchPlaceholder')" />
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-body" style="padding: 0">
          <table class="data-table" v-if="filtered.length">
            <thead>
              <tr>
                <th>{{ $t('common.name') }}</th>
                <th>{{ $t('customers.location') }}</th>
                <th>{{ $t('common.email') }}</th>
                <th>{{ $t('common.phone') }}</th>
                <th class="actions-cell">{{ $t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in filtered" :key="c.id" @dblclick="openForm(c)" style="cursor: pointer">
                <td><strong>{{ c.name }}</strong></td>
                <td>{{ c.zip }} {{ c.city }}</td>
                <td>{{ c.email }}</td>
                <td>{{ c.phone }}</td>
                <td class="actions-cell">
                  <button class="btn btn-ghost btn-sm" @click="openForm(c)"><Pencil :size="15" /></button>
                  <button class="btn btn-ghost btn-sm" @click="confirmDelete(c)"><Trash2 :size="15" /></button>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="empty-state" v-else-if="!search">
            <div class="empty-icon"><Users :size="40" /></div>
            <div class="empty-title">{{ $t('customers.noCustomers') }}</div>
            <div class="empty-desc">{{ $t('customers.createFirst') }}</div>
            <button class="btn btn-primary" @click="openForm()">{{ $t('customers.newCustomer') }}</button>
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
          <h2>{{ editing ? $t('customers.editCustomer') : $t('customers.newCustomerTitle') }}</h2>
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
            <textarea class="form-textarea" v-model="form.notes"
              :placeholder="$t('customers.notesPlaceholder')"></textarea>
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
          <h2>{{ $t('customers.deleteConfirm') }}</h2>
        </div>
        <div class="modal-body">
          <p>{{ $t('customers.deleteMessage', { name: deleteTarget.name }) }}</p>
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
import { Search, Pencil, Trash2, Users, X } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, type Customer } from '../services/database';
import { useToast } from '../composables/useToast';
import { confirm } from '@tauri-apps/plugin-dialog';

const { t } = useI18n({ useScope: 'global' });
const toast = useToast();

const customers = ref<Customer[]>([]);
const search = ref('');
const showModal = ref(false);
const editing = ref(false);
const deleteTarget = ref<Customer | null>(null);

const emptyForm = (): Customer => ({
  name: '', street: '', city: '', zip: '', country: 'Deutschland',
  phone: '', email: '', notes: ''
});

const form = ref<Customer>(emptyForm());
const originalForm = ref<Customer>(emptyForm());

const filtered = computed(() => {
  if (!search.value) return customers.value;
  const q = search.value.toLowerCase();
  return customers.value.filter(c =>
    c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.city.toLowerCase().includes(q)
  );
});

onMounted(load);

async function load() {
  try { customers.value = await getCustomers(); } catch (e) { console.error(e); }
}

function openForm(c?: Customer) {
  if (c) {
    editing.value = true;
    form.value = { ...c };
    originalForm.value = { ...c };
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
    if (editing.value) await updateCustomer(form.value);
    else await createCustomer(form.value);
    showModal.value = false;
    await load();
    toast.success(t('toast.customerSaved'));
  } catch (e) { console.error(e); toast.error(t('toast.error')); }
}

function confirmDelete(c: Customer) { deleteTarget.value = c; }

async function doDelete() {
  if (!deleteTarget.value?.id) return;
  try { await deleteCustomer(deleteTarget.value.id); deleteTarget.value = null; await load(); toast.success(t('toast.customerDeleted')); }
  catch (e) { console.error(e); toast.error(t('toast.error')); }
}
</script>
