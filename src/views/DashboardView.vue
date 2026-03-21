<template>
  <div>
    <div class="topbar">
      <div class="topbar-title">{{ $t('dashboard.title') }}</div>
      <div class="topbar-actions">
        <router-link to="/invoices/new" class="btn btn-primary">{{ $t('dashboard.newInvoice') }}</router-link>
      </div>
    </div>
    <div class="page-content">
      <!-- Stats cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">{{ $t('dashboard.openInvoices') }}</div>
          <div class="stat-value">{{ stats.openInvoices }}</div>
          <div class="stat-sub">{{ formatCurrency(stats.openAmount) }} {{ $t('dashboard.outstanding') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ $t('dashboard.paidTotal') }}</div>
          <div class="stat-value">{{ formatCurrency(stats.totalRevenue) }}</div>
          <div class="stat-sub">{{ $t('dashboard.invoicesCount', { n: stats.paidInvoices }) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ $t('dashboard.revenueThisMonth') }}</div>
          <div class="stat-value">{{ formatCurrency(stats.monthlyRevenue) }}</div>
        </div>
        <div class="stat-card" v-if="stats.overdueInvoices > 0">
          <div class="stat-label" style="color: var(--danger)">{{ $t('dashboard.overdue') }}</div>
          <div class="stat-value" style="color: var(--danger)">{{ stats.overdueInvoices }}</div>
        </div>
      </div>

      <!-- Charts row -->
      <div class="dashboard-charts">
        <!-- Revenue chart -->
        <div class="card" style="flex: 2">
          <div class="card-header"><h2>{{ $t('dashboard.monthlyRevenue') }}</h2></div>
          <div class="card-body" style="height: 280px; padding: 12px">
            <Bar v-if="revenueChartData" :data="revenueChartData" :options="barOptions" />
          </div>
        </div>

        <!-- Top Customers -->
        <div class="card" style="flex: 1">
          <div class="card-header"><h2>{{ $t('dashboard.topCustomers') }}</h2></div>
          <div class="card-body" style="padding: 0">
            <div v-if="topCustomers.length" class="top-customers-list">
              <div v-for="(c, i) in topCustomers" :key="i" class="top-customer-item">
                <div class="top-customer-rank">{{ i + 1 }}</div>
                <div class="top-customer-info">
                  <div class="top-customer-name">{{ c.name }}</div>
                  <div class="top-customer-count">{{ c.count }} {{ $t('dashboard.invoicesLabel') }}</div>
                </div>
                <div class="top-customer-total">{{ formatCurrency(c.total) }}</div>
              </div>
            </div>
            <div class="empty-state" v-else style="padding: 24px">
              <div class="empty-desc">{{ $t('dashboard.noData') }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent invoices -->
      <div class="card">
        <div class="card-header">
          <h2>{{ $t('dashboard.recentInvoices') }}</h2>
          <router-link to="/invoices" class="btn btn-ghost btn-sm">{{ $t('dashboard.showAll') }}</router-link>
        </div>
        <div class="card-body" style="padding: 0">
          <table class="data-table" v-if="recentInvoices.length">
            <thead>
              <tr>
                <th>{{ $t('dashboard.nr') }}</th>
                <th>{{ $t('dashboard.customer') }}</th>
                <th>{{ $t('dashboard.seller') }}</th>
                <th>{{ $t('common.date') }}</th>
                <th>{{ $t('common.status') }}</th>
                <th class="text-right">{{ $t('common.amount') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inv in recentInvoices" :key="inv.id"
                :class="{ 'overdue-row': inv.status === 'overdue' }"
                @dblclick="goToInvoice(inv.id || 0)" style="cursor: pointer">
                <td>{{ inv.invoice_number }}</td>
                <td>{{ inv.customer_name }}</td>
                <td>{{ inv.seller_name }}</td>
                <td>{{ formatDate(inv.date) }}</td>
                <td><span :class="'badge badge-' + inv.status">{{ $t('status.' + inv.status) }}</span></td>
                <td class="text-right">
                  <div>{{ formatCurrency(inv.total_gross) }}</div>
                  <div v-if="Number(inv.paid_amount) > 0 && inv.status !== 'paid' && inv.status !== 'sent'" 
                       style="font-size: 0.8em; color: var(--success); margin-top: 2px;">
                    {{ formatCurrency(Number(inv.paid_amount)) }} {{ $t('status.paid') }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="empty-state" v-else>
            <div class="empty-icon"><FileText :size="40" /></div>
            <div class="empty-title">{{ $t('dashboard.noInvoices') }}</div>
            <div class="empty-desc">{{ $t('dashboard.createFirst') }}</div>
            <router-link to="/invoices/new" class="btn btn-primary">{{ $t('dashboard.newInvoice') }}</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { FileText } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import {
  getDashboardStats, getInvoices, getMonthlyRevenue, getTopCustomers,
  type Invoice, type DashboardStats
} from '../services/database';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend
} from 'chart.js';
import { useRouter } from 'vue-router';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const { locale, t } = useI18n({ useScope: 'global' });
const router = useRouter();

const stats = ref<DashboardStats>({
  totalInvoices: 0, openInvoices: 0, paidInvoices: 0,
  overdueInvoices: 0, totalRevenue: 0, monthlyRevenue: 0, openAmount: 0
});
const recentInvoices = ref<Invoice[]>([]);
const topCustomers = ref<{ name: string; total: number; count: number }[]>([]);
const monthlyData = ref<{ month: string; revenue: number }[]>([]);

const revenueChartData = computed(() => {
  if (!monthlyData.value.length) return null;
  return {
    labels: monthlyData.value.map(d => {
      const [y, m] = d.month.split('-');
      const date = new Date(Number(y), Number(m) - 1);
      return date.toLocaleDateString(locale.value === 'de' ? 'de-DE' : 'en-US', { month: 'short', year: '2-digit' });
    }),
    datasets: [{
      label: t('dashboard.revenue'),
      data: monthlyData.value.map(d => d.revenue),
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1,
      borderRadius: 6,
    }],
  };
});

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) =>
          new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(ctx.raw),
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (val: any) => val >= 1000 ? (val / 1000) + 'k €' : val + ' €',
      },
      grid: { color: 'rgba(0,0,0,0.06)' },
    },
    x: {
      grid: { display: false },
    },
  },
};

onMounted(async () => {
  try {
    stats.value = await getDashboardStats();
    const all = await getInvoices();
    recentInvoices.value = all.slice(0, 5);
    monthlyData.value = await getMonthlyRevenue(12);
    topCustomers.value = await getTopCustomers(5);
  } catch (e) {
    console.error('Dashboard load error:', e);
  }
});

function formatCurrency(val: number): string {
  return new Intl.NumberFormat(locale.value === 'de' ? 'de-DE' : 'en-US', { style: 'currency', currency: 'EUR' }).format(val);
}

function formatDate(d: string): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString(locale.value === 'de' ? 'de-DE' : 'en-US');
}

function goToInvoice(id: number) {
  router.push(`/invoices/${id}/edit`);
}
</script>
