import jsPDF from 'jspdf';
import { save, confirm } from '@tauri-apps/plugin-dialog';
import { create, exists } from '@tauri-apps/plugin-fs';
import { getSeller, getCustomer, getSetting, type Invoice, type Seller, type Customer } from '../services/database';
import i18n from '../i18n';
import { calcTax, addToMap } from './money';

function t(key: string, params?: Record<string, string | number>): string {
    const { global } = i18n;
    return (global.t as any)(key, params || {});
}

export function buildInvoicePdfDoc(invoice: Invoice, seller: Seller, customer: Customer, locale: string): jsPDF {

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let y = 20;

    const t = i18n.global.t;
    const isModern = seller.pdf_template === 'modern';
    const isMinimal = seller.pdf_template === 'minimal';

    // Parse brand color, fallback to default blue
    const brandColorHex = seller.color || '#3b82f6';
    const r = parseInt(brandColorHex.slice(1, 3), 16);
    const g = parseInt(brandColorHex.slice(3, 5), 16);
    const b = parseInt(brandColorHex.slice(5, 7), 16);

    // Modern top decorative bar
    if (isModern) {
        doc.setFillColor(r, g, b); // Blue-500
        doc.rect(0, 0, pageWidth, 6, 'F');
        y += 6;
    }

    // ==================== HEADER ====================
    // Logo (left)
    if (seller.logo_data) {
        try {
            const props = doc.getImageProperties(seller.logo_data);
            const maxW = 40;
            const maxH = 20;

            let finalW = maxW;
            let finalH = maxH;
            if (props && props.width && props.height) {
                const ratio = Math.min(maxW / props.width, maxH / props.height);
                finalW = props.width * ratio;
                finalH = props.height * ratio;
            }

            doc.addImage(seller.logo_data, 'PNG', margin, y, finalW, finalH);
        } catch (e) {
            // if image fails, skip
        }
    }

    // Seller info (right)
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const sellerPerson = [seller.first_name, seller.last_name].filter(Boolean).join(' ');
    const sellerLines = [
        seller.name,
        sellerPerson || '',
        seller.street,
        `${seller.zip} ${seller.city}`,
        seller.phone ? `${t('pdf.tel')} ${seller.phone}` : '',
        seller.email ? `${t('pdf.email')} ${seller.email}` : '',
        seller.website || '',
    ].filter(Boolean);

    let headerY = y;
    for (const line of sellerLines) {
        doc.text(line, pageWidth - margin, headerY, { align: 'right' });
        headerY += 4;
    }

    y = Math.max(y + 25, headerY + 5);

    // ==================== SENDER LINE (small above address) ====================
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    const senderName = sellerPerson ? `${seller.name}, ${sellerPerson}` : seller.name;
    doc.text(`${senderName} · ${seller.street} · ${seller.zip} ${seller.city}`, margin, y);
    y += 8;

    // ==================== RECIPIENT ====================
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const recipientLines = [
        customer.name,
        customer.street,
        `${customer.zip} ${customer.city}`,
        customer.country !== 'Deutschland' ? customer.country : '',
    ].filter(Boolean);

    for (const line of recipientLines) {
        doc.text(line, margin, y);
        y += 5;
    }

    y += 10;

    // ==================== INVOICE DETAILS ====================
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    if (isModern) {
        doc.setTextColor(r, g, b);
    } else {
        doc.setTextColor(0, 0, 0);
    }
    doc.text(t('pdf.invoice'), margin, y);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);

    const detailsX = pageWidth - margin;
    let detailY = y - 8;
    const details = [
        [t('pdf.invoiceNr'), invoice.invoice_number],
        [t('pdf.date'), formatDateLocale(invoice.date, locale)],
        [t('pdf.dueDate'), formatDateLocale(invoice.due_date, locale)],
        seller.tax_id ? [t('pdf.taxNr'), seller.tax_id] : null,
        seller.vat_id ? [t('pdf.vatId'), seller.vat_id] : null,
    ].filter(Boolean) as string[][];

    for (const [label, value] of details) {
        doc.text(label, detailsX - 45, detailY);
        doc.text(value, detailsX, detailY, { align: 'right' });
        detailY += 4;
    }

    y += 10;

    // ==================== ITEMS TABLE ====================
    const items = invoice.items || [];
    const pad = 2; // padding so text doesn't touch the colored row edges
    const colX = {
        pos: margin + pad,
        desc: margin + 12,
        qty: margin + contentWidth - 90,
        unit: margin + contentWidth - 75,
        price: margin + contentWidth - 42,
        tax: margin + contentWidth - 22,
        total: margin + contentWidth - pad,
    };

    // Table header
    if (isModern) {
        doc.setFillColor(r, g, b);
        doc.setTextColor(255, 255, 255);
    } else if (isMinimal) {
        doc.setFillColor(255, 255, 255);
        doc.setTextColor(80, 80, 80);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y + 7, margin + contentWidth, y + 7);
    } else {
        doc.setFillColor(245, 245, 245);
        doc.setTextColor(80, 80, 80);
    }

    if (!isMinimal) {
        doc.rect(margin, y, contentWidth, 7, 'F');
    }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    y += 5;
    doc.text(t('pdf.pos'), colX.pos, y);
    doc.text(t('pdf.description'), colX.desc, y);
    doc.text(t('pdf.quantity'), colX.qty, y, { align: 'right' });
    doc.text(t('pdf.unit'), colX.unit, y);
    doc.text(t('pdf.unitPrice'), colX.price, y, { align: 'right' });
    doc.text(t('pdf.vat'), colX.tax, y, { align: 'right' });
    doc.text(t('pdf.total'), colX.total, y, { align: 'right' });
    y += 5;

    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Check if we need a new page
        if (y > 250) {
            doc.addPage();
            y = 20;
        }

        // Alternate row background
        if (i % 2 === 1 && !isMinimal) {
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, y - 4, contentWidth, 7, 'F');
        } else if (isMinimal) {
            doc.setDrawColor(230, 230, 230);
            doc.line(margin, y + 3, margin + contentWidth, y + 3);
        }

        doc.text(String(item.position), colX.pos, y);

        // Handle long descriptions
        const maxDescWidth = colX.qty - colX.desc - 5; // approx 65mm
        const descLines = wrapText(doc, item.description, maxDescWidth);
        doc.text(descLines[0] || '', colX.desc, y);

        doc.text(formatNumber(item.quantity), colX.qty, y, { align: 'right' });
        const displayUnit = (unit: string): string => {
            switch (unit) {
                case 'Stk': return t('invoiceForm.unitPc');
                case 'Std': return t('invoiceForm.unitHour');
                case 'Pausch.': return t('invoiceForm.unitFlat');
                case 'kg': return t('invoiceForm.unitKg');
                case 'm': return t('invoiceForm.unitM');
                case 'Lizenz': return t('invoiceForm.unitLicense');
                default: return unit;
            }
        };
        doc.text(displayUnit(item.unit), colX.unit, y);
        doc.text(formatCurrency(item.price_net), colX.price, y, { align: 'right' });
        doc.text(`${item.tax_rate}%`, colX.tax, y, { align: 'right' });
        doc.text(formatCurrency(item.total_gross), colX.total, y, { align: 'right' });
        y += 6;

        // Additional description lines
        for (let j = 1; j < descLines.length; j++) {
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(descLines[j], colX.desc, y);
            y += 4;
            doc.setFontSize(9);
            doc.setTextColor(30, 30, 30);
        }
    }

    // Line after table
    y += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, margin + contentWidth, y);
    y += 8;

    // ==================== TOTALS ====================
    const totalsX = margin + contentWidth;
    const labelX = totalsX - 50;

    // Tax breakdown
    const taxMap: Record<number, number> = {};
    for (const item of items) {
        addToMap(taxMap, item.tax_rate, item.total_tax);
    }

    // Add shipping tax to taxMap
    const sNet = typeof invoice.shipping_net === 'number' ? invoice.shipping_net : 0;
    if (sNet > 0) {
        const sRate = typeof invoice.shipping_tax_rate === 'number' ? invoice.shipping_tax_rate : 19;
        const sTax = calcTax(sNet, sRate);
        addToMap(taxMap, sRate, sTax);

        doc.setFontSize(9);
        doc.text(t('pdf.shippingNet'), labelX, y, { align: 'right' });
        doc.text(formatCurrency(sNet), totalsX, y, { align: 'right' });
        y += 5;
    }

    doc.setFontSize(9);
    doc.text(t('pdf.netTotal'), labelX, y, { align: 'right' });
    doc.text(formatCurrency(invoice.total_net), totalsX, y, { align: 'right' });
    y += 5;

    for (const [rate, amount] of Object.entries(taxMap).sort()) {
        doc.text(t('pdf.vatRate', { rate }), labelX, y, { align: 'right' });
        doc.text(formatCurrency(amount as number), totalsX, y, { align: 'right' });
        y += 5;
    }

    // Grand total
    y += 2;
    doc.setDrawColor(100, 100, 100);
    doc.line(labelX + 2, y, totalsX, y);
    y += 6;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(t('pdf.grossTotal'), labelX, y, { align: 'right' });
    doc.text(formatCurrency(invoice.total_gross), totalsX, y, { align: 'right' });
    y += 10;

    // ==================== PAYMENT TERMS ====================
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);

    if (invoice.already_paid || invoice.status === 'paid') {
        doc.text(t('pdf.paymentReceived'), margin, y);
        y += 5;
    } else if (invoice.payment_terms) {
        doc.text(t('pdf.paymentTerms', { terms: invoice.payment_terms }), margin, y);
        y += 5;
    }

    if (invoice.notes) {
        y += 2;
        doc.text(t('pdf.notes'), margin, y);
        y += 4;
        const noteLines = doc.splitTextToSize(invoice.notes, contentWidth);
        for (const line of noteLines) {
            doc.text(line, margin, y);
            y += 4;
        }
    }

    // ==================== FOOTER ====================
    const footerY = 275;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, footerY - 5, margin + contentWidth, footerY - 5);

    doc.setFontSize(7);
    doc.setTextColor(130, 130, 130);

    // Three columns in footer
    const col1 = margin;
    const col2 = margin + contentWidth / 3;
    const col3 = margin + (contentWidth / 3) * 2;

    let fy = footerY;
    // Col 1 - Contact
    doc.text(seller.name, col1, fy);
    fy += 3;
    if (sellerPerson) { doc.text(sellerPerson, col1, fy); fy += 3; }
    if (seller.street) { doc.text(seller.street, col1, fy); fy += 3; }
    doc.text(`${seller.zip} ${seller.city}`, col1, fy);

    fy = footerY;
    // Col 2 - Contact details
    if (seller.phone) { doc.text(`${t('pdf.tel')} ${seller.phone}`, col2, fy); fy += 3; }
    if (seller.email) { doc.text(`${t('pdf.email')} ${seller.email}`, col2, fy); fy += 3; }
    if (seller.website) { doc.text(seller.website, col2, fy); }

    fy = footerY;
    // Col 3 - Bank
    if (seller.bank_name) { doc.text(seller.bank_name, col3, fy); fy += 3; }
    if (seller.bank_iban) { doc.text(`IBAN: ${seller.bank_iban}`, col3, fy); fy += 3; }
    if (seller.bank_bic) { doc.text(`BIC: ${seller.bank_bic}`, col3, fy); }

    return doc;
}

export async function generateInvoicePdf(invoice: Invoice): Promise<void> {
    const seller = await getSeller(invoice.seller_id);
    const customer = await getCustomer(invoice.customer_id);
    if (!seller || !customer) {
        console.error('Seller or customer not found');
        return;
    }

    const locale = i18n.global.locale.value || 'de';
    const doc = buildInvoicePdfDoc(invoice, seller, customer, locale);

    // Save PDF - check for default download folder
    const defaultName = `Rechnung_${invoice.invoice_number.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
    let filePath: string | null = null;

    try {
        const downloadFolder = await getSetting('download_folder');
        if (downloadFolder) {
            const sep = downloadFolder.endsWith('/') ? '' : '/';
            filePath = downloadFolder + sep + defaultName;
        } else {
            filePath = await save({
                defaultPath: defaultName,
                filters: [{ name: 'PDF', extensions: ['pdf'] }],
            });
        }
    } catch {
        filePath = await save({
            defaultPath: defaultName,
            filters: [{ name: 'PDF', extensions: ['pdf'] }],
        });
    }

    if (filePath) {
        try {
            if (await exists(filePath)) {
                const locale = i18n.global.locale.value || 'de';
                const msg = locale === 'de'
                    ? `Die Datei "${defaultName}" existiert bereits. Möchtest du sie überschreiben?`
                    : `The file "${defaultName}" already exists. Do you want to overwrite it?`;
                const title = locale === 'de' ? 'Datei überschreiben?' : 'Overwrite file?';

                const agreed = await confirm(msg, { title, kind: 'warning' });
                if (!agreed) {
                    // Ask for new path
                    filePath = await save({
                        defaultPath: defaultName,
                        filters: [{ name: 'PDF', extensions: ['pdf'] }],
                    });
                    if (!filePath) return; // User cancelled second prompt
                }
            }

            const pdfBytes = doc.output('arraybuffer');
            const file = await create(filePath);
            await file.write(new Uint8Array(pdfBytes));
            await file.close();
        } catch (e) {
            console.error('PDF save error:', e);
        }
    }
}

export function previewPdfTemplate(seller: Seller): string {
    const locale = i18n.global.locale.value || 'de';

    // Create dummy customer
    const dummyCustomer: any = {
        name: 'Max Mustermann',
        street: 'Musterstraße 123',
        zip: '12345',
        city: 'Musterstadt',
        country: 'Deutschland',
        email: 'max@example.com',
        phone: '0123 456789'
    };

    // Create dummy invoice
    const dummyInvoice: Invoice = {
        seller_id: seller.id || 0,
        customer_id: 0,
        invoice_number: `${seller.invoice_prefix || 'RE'}-2026-0001`,
        date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        status: 'draft',
        payment_terms: '14 Tage netto',
        notes: t('pdf.previewNote', { defaultValue: 'Dies ist eine Vorschau des gewählten PDF-Templates.' }),
        total_net: 100,
        total_tax: 19,
        total_gross: 119,
        items: [
            {
                invoice_id: 0,
                product_id: 0,
                position: 1,
                description: 'Beispiel Artikel 1',
                quantity: 1,
                unit: 'Stk',
                price_net: 50,
                tax_rate: 19,
                total_net: 50,
                total_tax: 9.5,
                total_gross: 59.5
            },
            {
                invoice_id: 0,
                product_id: 0,
                position: 2,
                description: 'Beispiel Artikel 2',
                quantity: 2,
                unit: 'Std',
                price_net: 25,
                tax_rate: 19,
                total_net: 50,
                total_tax: 9.5,
                total_gross: 59.5
            }
        ]
    };

    const doc = buildInvoicePdfDoc(dummyInvoice, seller, dummyCustomer, locale);
    return doc.output('datauristring');
}

function formatDateLocale(d: string, locale: string): string {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US');
}

function formatCurrency(val: number): string {
    return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' €';
}

function formatNumber(val: number): string {
    if (val === Math.floor(val)) return String(val);
    return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(val);
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
    if (!text) return [];
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
        if (doc.getTextWidth(word) > maxWidth) {
            // Word is too long, we need to split the word itself
            if (currentLine) {
                lines.push(currentLine.trimEnd());
                currentLine = '';
            }
            let currentWordPart = '';
            for (let i = 0; i < word.length; i++) {
                const char = word[i];
                if (doc.getTextWidth(currentWordPart + char) > maxWidth) {
                    lines.push(currentWordPart);
                    currentWordPart = char;
                } else {
                    currentWordPart += char;
                }
            }
            currentLine = currentWordPart + ' ';
        } else {
            const testLine = currentLine + word + ' ';
            if (doc.getTextWidth(testLine) > maxWidth) {
                lines.push(currentLine.trimEnd());
                currentLine = word + ' ';
            } else {
                currentLine = testLine;
            }
        }
    }
    if (currentLine.trimEnd()) {
        lines.push(currentLine.trimEnd());
    }
    return lines;
}
