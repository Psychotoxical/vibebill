import jsPDF from 'jspdf';
import { save } from '@tauri-apps/plugin-dialog';
import { create } from '@tauri-apps/plugin-fs';
import { getSeller, getSetting, type Invoice } from '../services/database';
import i18n from '../i18n';

export async function generateYearlyOverviewPdf(sellerId: number, year: number, invoices: Invoice[]): Promise<void> {
    const seller = await getSeller(sellerId);
    if (!seller) return;

    const locale = i18n.global.locale.value || 'de';
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });

    const margin = 20;
    const pageWidth = 210;
    const contentWidth = pageWidth - 2 * margin;
    let y = 30;

    // Parse brand color, fallback to default blue
    const brandColorHex = seller.color || '#3b82f6';
    const r = parseInt(brandColorHex.slice(1, 3), 16);
    const g = parseInt(brandColorHex.slice(3, 5), 16);
    const b = parseInt(brandColorHex.slice(5, 7), 16);

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(r, g, b); // Brand color
    doc.text(`Jahresübersicht ${year}`, margin, y);

    y += 10;
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(seller.name, margin, y);

    y += 15;

    // Filter paid invoices in that year
    const yearlyInvoices = invoices.filter(inv => {
        return inv.seller_id === sellerId &&
            inv.status === 'paid' &&
            inv.date.startsWith(String(year));
    }).sort((a, b) => a.date.localeCompare(b.date));

    if (yearlyInvoices.length === 0) {
        doc.setFontSize(10);
        doc.text('Keine bezahlten Rechnungen in diesem Jahr.', margin, y);
    } else {
        // Table Header
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y, contentWidth, 8, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 50, 50);

        y += 5;
        doc.text('Datum', margin + 2, y);
        doc.text('Rechnung', margin + 30, y);
        doc.text('Kunde', margin + 65, y);
        doc.text('Netto', margin + 130, y, { align: 'right' });
        doc.text('MwSt', margin + 150, y, { align: 'right' });
        doc.text('Brutto', margin + 170, y, { align: 'right' });

        y += 5;
        doc.setFont('helvetica', 'normal');

        let totalNet = 0;
        let totalTax = 0;
        let totalGross = 0;

        for (let i = 0; i < yearlyInvoices.length; i++) {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }

            const inv = yearlyInvoices[i];

            // Draw alternating row background first BEFORE text
            if (i % 2 === 1) {
                doc.setFillColor(252, 252, 252);
                doc.rect(margin, y - 4, contentWidth, 7, 'F');
            }

            totalNet += inv.total_net;
            totalTax += inv.total_tax;
            totalGross += inv.total_gross;

            doc.setTextColor(30, 30, 30);
            doc.text(formatDateLocale(inv.date, locale), margin + 2, y);
            doc.text(inv.invoice_number, margin + 30, y);

            // Truncate customer name if too long
            const cName = doc.splitTextToSize(inv.customer_name || '', 55)[0];
            doc.text(cName, margin + 65, y);

            doc.text(formatCurrency(inv.total_net), margin + 130, y, { align: 'right' });
            doc.text(formatCurrency(inv.total_tax), margin + 150, y, { align: 'right' });
            doc.text(formatCurrency(inv.total_gross), margin + 170, y, { align: 'right' });

            y += 6;
        }

        // Totals line
        y += 2;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin + 80, y, margin + 175, y);
        y += 6;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Gesamt:', margin + 80, y);
        doc.text(formatCurrency(totalNet), margin + 130, y, { align: 'right' });
        doc.text(formatCurrency(totalTax), margin + 150, y, { align: 'right' });
        doc.text(formatCurrency(totalGross), margin + 170, y, { align: 'right' });
    }

    // Save
    const defaultName = `Jahresuebersicht_${year}_${seller.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    let filePath: string | null = null;
    try {
        const downloadFolder = await getSetting('download_folder');
        if (downloadFolder) {
            const sep = downloadFolder.endsWith('/') ? '' : '/';
            filePath = downloadFolder + sep + defaultName;
        } else {
            filePath = await save({ defaultPath: defaultName, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
        }
    } catch {
        filePath = await save({ defaultPath: defaultName, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    }

    if (filePath) {
        try {
            const pdfBytes = doc.output('arraybuffer');
            const file = await create(filePath);
            await file.write(new Uint8Array(pdfBytes));
            await file.close();
        } catch (e) {
            console.error('PDF save error:', e);
            throw e;
        }
    }
}

function formatDateLocale(d: string, locale: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US');
}

function formatCurrency(val: number): string {
    return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' €';
}
