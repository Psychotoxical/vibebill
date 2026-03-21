import Database from '@tauri-apps/plugin-sql';

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load('sqlite:vibebill.db');
    await runJsMigrations(dbInstance);
  }
  return dbInstance;
}

// Ensure columns exist, ignoring errors if they're already present
// This safely patches databases where Tauri migrations failed or were manually patched
async function runJsMigrations(db: Database) {
  const sellerColumns = [
    'first_name TEXT DEFAULT ""',
    'last_name TEXT DEFAULT ""',
    'default_payment_terms TEXT DEFAULT ""',
    'default_tax_rate REAL DEFAULT NULL',
    'currency TEXT DEFAULT ""',
    'default_note TEXT DEFAULT ""'
  ];
  for (const col of sellerColumns) {
    try {
      await db.execute(`ALTER TABLE sellers ADD COLUMN ${col}`);
    } catch (e) {
      if (!String(e).toLowerCase().includes('duplicate column')) throw e;
    }
  }

  const invoiceColumns = [
    'shipping_net REAL DEFAULT 0',
    'shipping_tax_rate REAL DEFAULT 19',
    'already_paid INTEGER DEFAULT 0'
  ];
  for (const col of invoiceColumns) {
    try {
      await db.execute(`ALTER TABLE invoices ADD COLUMN ${col}`);
    } catch (e) {
      if (!String(e).toLowerCase().includes('duplicate column')) throw e;
    }
  }
}

// ==================== SELLERS ====================

export interface Seller {
  id?: number;
  name: string;
  first_name: string;
  last_name: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  tax_id: string;
  vat_id: string;
  bank_name: string;
  bank_iban: string;
  bank_bic: string;
  invoice_prefix: string;
  next_invoice_number: number;
  logo_data?: string;
  pdf_template?: string;
  color?: string;
  default_payment_terms?: string;
  default_tax_rate?: number | null;
  currency?: string;
  default_note?: string;
  created_at?: string;
}

export async function getSellers(): Promise<Seller[]> {
  const d = await getDb();
  return await d.select('SELECT * FROM sellers ORDER BY name');
}

export async function getSeller(id: number): Promise<Seller | null> {
  const d = await getDb();
  const rows: Seller[] = await d.select('SELECT * FROM sellers WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function createSeller(s: Seller): Promise<number> {
  const d = await getDb();
  const result = await d.execute(
    `INSERT INTO sellers (name, first_name, last_name, street, city, zip, country, phone, email, website, tax_id, vat_id, bank_name, bank_iban, bank_bic, logo_data, invoice_prefix, next_invoice_number, pdf_template, color, default_payment_terms, default_tax_rate, currency, default_note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
    [s.name, s.first_name, s.last_name, s.street, s.city, s.zip, s.country, s.phone, s.email, s.website, s.tax_id, s.vat_id, s.bank_name, s.bank_iban, s.bank_bic, s.logo_data || '', s.invoice_prefix, s.next_invoice_number, s.pdf_template || 'classic', s.color || '#3b82f6', s.default_payment_terms || '', (s.default_tax_rate as any === '' || s.default_tax_rate == null) ? null : Number(s.default_tax_rate), s.currency || '', s.default_note || '']
  );
  return result.lastInsertId || 0;
}

export function emptySeller(): Seller {
  return {
    name: '', first_name: '', last_name: '', street: '', city: '', zip: '', country: 'Deutschland', phone: '', email: '', website: '',
    tax_id: '', vat_id: '', bank_name: '', bank_iban: '', bank_bic: '', invoice_prefix: 'RE', next_invoice_number: 1, logo_data: '', pdf_template: 'classic', color: '#3b82f6',
    default_payment_terms: '', default_tax_rate: null, currency: '', default_note: ''
  };
}

export async function updateSeller(s: Seller): Promise<void> {
  if (!s.id) throw new Error('Seller ID missing');
  const db = await getDb();
  await db.execute(
    `UPDATE sellers SET name=$1, first_name=$2, last_name=$3, street=$4, city=$5, zip=$6, country=$7, phone=$8, email=$9, website=$10, tax_id=$11, vat_id=$12, bank_name=$13, bank_iban=$14, bank_bic=$15, invoice_prefix=$16, next_invoice_number=$17, logo_data=$18, pdf_template=$19, color=$20, default_payment_terms=$21, default_tax_rate=$22, currency=$23, default_note=$24
     WHERE id=$25`,
    [s.name, s.first_name, s.last_name, s.street, s.city, s.zip, s.country, s.phone, s.email, s.website, s.tax_id, s.vat_id, s.bank_name, s.bank_iban, s.bank_bic, s.invoice_prefix, s.next_invoice_number, s.logo_data || '', s.pdf_template || 'classic', s.color || '#3b82f6', s.default_payment_terms || '', (s.default_tax_rate as any === '' || s.default_tax_rate == null) ? null : Number(s.default_tax_rate), s.currency || '', s.default_note || '', s.id]
  );
}

export async function deleteSeller(id: number): Promise<void> {
  const d = await getDb();
  await d.execute('DELETE FROM sellers WHERE id = $1', [id]);
}

// ==================== CUSTOMERS ====================

export interface Customer {
  id?: number;
  name: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  phone: string;
  email: string;
  notes: string;
  created_at?: string;
}

export async function getCustomers(): Promise<Customer[]> {
  const d = await getDb();
  return await d.select('SELECT * FROM customers ORDER BY name');
}

export async function getCustomer(id: number): Promise<Customer | null> {
  const d = await getDb();
  const rows: Customer[] = await d.select('SELECT * FROM customers WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function createCustomer(c: Customer): Promise<number> {
  const d = await getDb();
  const result = await d.execute(
    `INSERT INTO customers (name, street, city, zip, country, phone, email, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [c.name, c.street, c.city, c.zip, c.country, c.phone, c.email, c.notes]
  );
  return result.lastInsertId || 0;
}

export async function updateCustomer(c: Customer): Promise<void> {
  const d = await getDb();
  await d.execute(
    `UPDATE customers SET name=$1, street=$2, city=$3, zip=$4, country=$5, phone=$6, email=$7, notes=$8
     WHERE id=$9`,
    [c.name, c.street, c.city, c.zip, c.country, c.phone, c.email, c.notes, c.id]
  );
}

export async function deleteCustomer(id: number): Promise<void> {
  const d = await getDb();
  await d.execute('DELETE FROM customers WHERE id = $1', [id]);
}

// ==================== PRODUCTS ====================

export interface Product {
  id?: number;
  seller_id: number;
  name: string;
  description: string;
  type: 'product' | 'service';
  unit: string;
  price_net: number;
  tax_rate: number;
  stock: number;
  active: number;
  created_at?: string;
}

export async function getProducts(sellerId?: number): Promise<Product[]> {
  const d = await getDb();
  if (sellerId) {
    return await d.select('SELECT * FROM products WHERE seller_id = $1 ORDER BY name', [sellerId]);
  }
  return await d.select('SELECT * FROM products ORDER BY name');
}

export async function getProduct(id: number): Promise<Product | null> {
  const d = await getDb();
  const rows: Product[] = await d.select('SELECT * FROM products WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function createProduct(p: Product): Promise<number> {
  const d = await getDb();
  const result = await d.execute(
    `INSERT INTO products (seller_id, name, description, type, unit, price_net, tax_rate, stock, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [p.seller_id, p.name, p.description, p.type, p.unit, p.price_net, p.tax_rate, p.stock, p.active ? 1 : 0]
  );
  return result.lastInsertId || 0;
}

export async function updateProduct(p: Product): Promise<void> {
  const d = await getDb();
  await d.execute(
    `UPDATE products SET seller_id=$1, name=$2, description=$3, type=$4, unit=$5, price_net=$6, tax_rate=$7, stock=$8, active=$9
     WHERE id=$10`,
    [p.seller_id, p.name, p.description, p.type, p.unit, p.price_net, p.tax_rate, p.stock, p.active, p.id]
  );
}

export async function deleteProduct(id: number): Promise<void> {
  const d = await getDb();
  await d.execute('DELETE FROM products WHERE id = $1', [id]);
}

// ==================== INVOICES ====================

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  product_id: number | null;
  position: number;
  description: string;
  quantity: number;
  unit: string;
  price_net: number;
  tax_rate: number;
  total_net: number;
  total_tax: number;
  total_gross: number;
}

export interface Invoice {
  id?: number;
  seller_id: number;
  customer_id: number;
  invoice_number: string;
  date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  notes: string;
  payment_terms: string;
  total_net: number;
  total_tax: number;
  total_gross: number;
  shipping_net?: number;
  shipping_tax_rate?: number;
  already_paid?: number;
  created_at?: string;
  items?: InvoiceItem[];
  // joined fields
  seller_name?: string;
  customer_name?: string;
  paid_amount?: number;
}

export async function getInvoices(): Promise<Invoice[]> {
  const d = await getDb();
  return await d.select(`
    SELECT i.*, s.name as seller_name, c.name as customer_name,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = i.id) as paid_amount
    FROM invoices i
    LEFT JOIN sellers s ON i.seller_id = s.id
    LEFT JOIN customers c ON i.customer_id = c.id
    ORDER BY i.date DESC, i.id DESC
  `);
}

export async function getInvoice(id: number): Promise<Invoice | null> {
  const d = await getDb();
  const rows: Invoice[] = await d.select(`
    SELECT i.*, s.name as seller_name, c.name as customer_name
    FROM invoices i
    LEFT JOIN sellers s ON i.seller_id = s.id
    LEFT JOIN customers c ON i.customer_id = c.id
    WHERE i.id = $1
  `, [id]);
  if (!rows[0]) return null;
  const invoice = rows[0];
  invoice.items = await d.select('SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY position', [id]);
  return invoice;
}

export async function createInvoice(inv: Invoice, items: InvoiceItem[]): Promise<number> {
  const d = await getDb();
  const result = await d.execute(
    `INSERT INTO invoices (seller_id, customer_id, invoice_number, date, due_date, status, notes, payment_terms, total_net, total_tax, total_gross, shipping_net, shipping_tax_rate, already_paid)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [inv.seller_id, inv.customer_id, inv.invoice_number, inv.date, inv.due_date, inv.status, inv.notes, inv.payment_terms, inv.total_net, inv.total_tax, inv.total_gross, inv.shipping_net || 0, inv.shipping_tax_rate || 19, inv.already_paid ? 1 : 0]
  );
  const invoiceId = result.lastInsertId;
  for (const item of items) {
    await d.execute(
      `INSERT INTO invoice_items (invoice_id, product_id, position, description, quantity, unit, price_net, tax_rate, total_net, total_tax, total_gross)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [invoiceId, item.product_id || null, item.position, item.description, item.quantity, item.unit, item.price_net, item.tax_rate, item.total_net, item.total_tax, item.total_gross]
    );
  }
  return invoiceId || 0;
}

export async function updateInvoice(inv: Invoice, items: InvoiceItem[]): Promise<void> {
  const d = await getDb();
  await d.execute(
    `UPDATE invoices SET seller_id=$1, customer_id=$2, invoice_number=$3, date=$4, due_date=$5, status=$6, notes=$7, payment_terms=$8, total_net=$9, total_tax=$10, total_gross=$11, shipping_net=$12, shipping_tax_rate=$13, already_paid=$14
     WHERE id=$15`,
    [inv.seller_id, inv.customer_id, inv.invoice_number, inv.date, inv.due_date, inv.status, inv.notes, inv.payment_terms, inv.total_net, inv.total_tax, inv.total_gross, inv.shipping_net || 0, inv.shipping_tax_rate || 19, inv.already_paid ? 1 : 0, inv.id]
  );
  // recreate items
  await d.execute('DELETE FROM invoice_items WHERE invoice_id = $1', [inv.id]);
  for (const item of items) {
    await d.execute(
      `INSERT INTO invoice_items (invoice_id, product_id, position, description, quantity, unit, price_net, tax_rate, total_net, total_tax, total_gross)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [inv.id, item.product_id, item.position, item.description, item.quantity, item.unit, item.price_net, item.tax_rate, item.total_net, item.total_tax, item.total_gross]
    );
  }
}

export async function deleteInvoice(id: number): Promise<void> {
  const d = await getDb();
  await d.execute('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
  await d.execute('DELETE FROM invoices WHERE id = $1', [id]);
}

export async function updateInvoiceStatus(id: number, status: string): Promise<void> {
  const d = await getDb();
  await d.execute('UPDATE invoices SET status = $1 WHERE id = $2', [status, id]);
}

// ==================== INVOICE NUMBERS ====================

export async function generateInvoiceNumber(sellerId: number): Promise<string> {
  const d = await getDb();
  const rows: Seller[] = await d.select('SELECT * FROM sellers WHERE id = $1', [sellerId]);
  if (!rows[0]) return 'RE-0001';
  const seller = rows[0];
  const year = new Date().getFullYear();
  const num = String(seller.next_invoice_number).padStart(4, '0');
  const invoiceNumber = `${seller.invoice_prefix}-${year}-${num}`;
  await d.execute('UPDATE sellers SET next_invoice_number = next_invoice_number + 1 WHERE id = $1', [sellerId]);
  return invoiceNumber;
}

// ==================== SETTINGS ====================

export async function getSetting(key: string): Promise<string> {
  const d = await getDb();
  const rows: { key: string; value: string }[] = await d.select('SELECT * FROM settings WHERE key = $1', [key]);
  return rows[0]?.value || '';
}

export async function setSetting(key: string, value: string): Promise<void> {
  const d = await getDb();
  await d.execute('INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)', [key, value]);
}

// ==================== DASHBOARD STATS ====================

export interface DashboardStats {
  totalInvoices: number;
  openInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalRevenue: number;
  monthlyRevenue: number;
  openAmount: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const d = await getDb();
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const total: { count: number }[] = await d.select('SELECT COUNT(*) as count FROM invoices');
  const open: { count: number }[] = await d.select("SELECT COUNT(*) as count FROM invoices WHERE status = 'draft'");
  const paid: { count: number }[] = await d.select("SELECT COUNT(*) as count FROM invoices WHERE status IN ('paid', 'sent')");
  const overdue: { count: number }[] = await d.select("SELECT COUNT(*) as count FROM invoices WHERE status = 'overdue'");
  const revenue: { total: number }[] = await d.select("SELECT COALESCE(SUM(total_gross), 0) as total FROM invoices WHERE status IN ('paid', 'sent')");
  const monthly: { total: number }[] = await d.select("SELECT COALESCE(SUM(total_gross), 0) as total FROM invoices WHERE status IN ('paid', 'sent') AND date >= $1", [monthStart]);
  const openAmt: { total: number }[] = await d.select("SELECT COALESCE(SUM(total_gross), 0) as total FROM invoices WHERE status IN ('draft', 'overdue')");

  return {
    totalInvoices: total[0]?.count || 0,
    openInvoices: open[0]?.count || 0,
    paidInvoices: paid[0]?.count || 0,
    overdueInvoices: overdue[0]?.count || 0,
    totalRevenue: revenue[0]?.total || 0,
    monthlyRevenue: monthly[0]?.total || 0,
    openAmount: openAmt[0]?.total || 0,
  };
}

export async function getMonthlyRevenue(months = 12): Promise<{ month: string; revenue: number }[]> {
  const d = await getDb();
  const rows: { month: string; revenue: number }[] = await d.select(`
    SELECT strftime('%Y-%m', date) as month, COALESCE(SUM(total_gross), 0) as revenue
    FROM invoices WHERE status IN ('paid', 'sent')
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month DESC LIMIT $1
  `, [months]);
  return rows.reverse();
}

export async function getTopCustomers(limit = 5): Promise<{ name: string; total: number; count: number }[]> {
  const d = await getDb();
  return await d.select(`
    SELECT c.name, COALESCE(SUM(i.total_gross), 0) as total, COUNT(i.id) as count
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.status IN ('paid', 'sent')
    GROUP BY c.id
    ORDER BY total DESC LIMIT $1
  `, [limit]);
}

export async function getRevenueBySellerYear(sellerId: number, year: number): Promise<{ month: string; revenue: number }[]> {
  const d = await getDb();
  const rows: { month: string; revenue: number }[] = await d.select(`
    SELECT strftime('%Y-%m', date) as month, COALESCE(SUM(total_gross), 0) as revenue
    FROM invoices
    WHERE seller_id = $1 AND strftime('%Y', date) = $2 AND status IN ('paid', 'sent')
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month
  `, [sellerId, String(year)]);
  return rows;
}

// ==================== PAYMENTS ====================

export interface Payment {
  id?: number;
  invoice_id: number;
  amount: number;
  date: string;
  method: string;
  notes: string;
  created_at?: string;
}

export async function getPaymentsForInvoice(invoiceId: number): Promise<Payment[]> {
  const d = await getDb();
  return await d.select('SELECT * FROM payments WHERE invoice_id = $1 ORDER BY date DESC', [invoiceId]);
}

export async function addPayment(payment: Payment): Promise<number> {
  const d = await getDb();
  const result = await d.execute(
    'INSERT INTO payments (invoice_id, amount, date, method, notes) VALUES ($1, $2, $3, $4, $5)',
    [payment.invoice_id, payment.amount, payment.date, payment.method, payment.notes]
  );
  return result.lastInsertId || 0;
}

export async function deletePayment(id: number): Promise<void> {
  const d = await getDb();
  await d.execute('DELETE FROM payments WHERE id = $1', [id]);
}

export async function getPaidAmount(invoiceId: number): Promise<number> {
  const d = await getDb();
  const result: { total: number }[] = await d.select(
    'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE invoice_id = $1',
    [invoiceId]
  );
  return result[0]?.total || 0;
}
