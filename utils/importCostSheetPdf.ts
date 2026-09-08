import jsPDF from 'jspdf';
import { ImportClearanceCostSheet } from '../types';

export interface GenerateImportCostPdfOptions {
  sheet: ImportClearanceCostSheet;
  logo?: string;
}

export const generateImportCostSheetPdf = ({ sheet, logo }: GenerateImportCostPdfOptions): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  let y = 10;

  // 1. TOP LOGO
  let logoDrawn = false;
  if (logo) {
    try {
      const imgProps = doc.getImageProperties(logo);
      const ratio = imgProps.width / imgProps.height;
      let w = 42;
      let h = w / ratio;
      if (h > 18) {
        h = 18;
        w = h * ratio;
      }
      const logoX = (pageWidth - w) / 2;
      doc.addImage(logo, 'PNG', logoX, y, w, h);
      logoDrawn = true;
      y += h + 5;
    } catch (e) {
      console.warn('Could not draw provided base64 logo', e);
    }
  }

  if (!logoDrawn) {
    // Draw crisp Writer emblem vector logo
    const centerX = pageWidth / 2;
    const emblemY = y + 2;

    // Orange Left Chevron
    doc.setFillColor(245, 130, 32); // #F58220
    doc.setDrawColor(245, 130, 32);
    // Draw polygon for left chevron
    doc.triangle(centerX - 36, emblemY + 6, centerX - 26, emblemY, centerX - 26, emblemY + 4, 'FD');
    doc.triangle(centerX - 36, emblemY + 6, centerX - 26, emblemY + 8, centerX - 26, emblemY + 12, 'FD');

    // Black/Dark Right Chevron
    doc.setFillColor(26, 26, 26); // #1A1A1A
    doc.setDrawColor(26, 26, 26);
    doc.triangle(centerX - 24, emblemY + 6, centerX - 14, emblemY, centerX - 14, emblemY + 4, 'FD');
    doc.triangle(centerX - 24, emblemY + 6, centerX - 14, emblemY + 8, centerX - 14, emblemY + 12, 'FD');

    // WRITER Wordmark
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(26, 26, 26);
    doc.text('W  R  I  T  E  R', centerX - 8, emblemY + 8);

    y += 18;
  }

  // 2. HEADER INFO SECTION
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);

  const col1X = margin;
  const col2X = margin + 115;

  // Row 1: Job No & Date
  doc.text('Job No  :', col1X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(sheet.job_no || sheet.job_id || '—', col1X + 22, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Date  :', col2X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(sheet.date ? new Date(`${sheet.date}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—', col2X + 16, y);

  y += 6.5;

  // Row 2: Consignee & BL No / AWB
  doc.setFont('helvetica', 'bold');
  doc.text('Consignee :', col1X, y);
  doc.setFont('helvetica', 'normal');
  doc.text((sheet.consignee || '—').toUpperCase(), col1X + 24, y);

  // BL Box
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(col2X, y - 4, 53, 5);
  doc.setFont('helvetica', 'bold');
  doc.text('BL no :', col2X + 2, y - 0.5);
  doc.setFont('helvetica', 'normal');
  doc.text(sheet.bl_no || '—', col2X + 17, y - 0.5);

  y += 6.5;

  // Row 3: CONT NO & AWB Box
  doc.setFont('helvetica', 'bold');
  doc.text('CONT NO', col1X, y);
  doc.setFont('helvetica', 'normal');
  doc.text((sheet.cont_no || 'AIR').toUpperCase(), col1X + 22, y);

  // AWB Box
  doc.rect(col2X, y - 4, 53, 5);
  doc.setFont('helvetica', 'bold');
  doc.text('AWB', col2X + 2, y - 0.5);
  doc.setFont('helvetica', 'bold');
  doc.text(sheet.awb || '—', col2X + 16, y - 0.5);

  y += 6.5;

  // Row 4: Vol / Weight
  doc.setFont('helvetica', 'bold');
  doc.text('Vol  :', col2X, y);
  doc.setFont('helvetica', 'bold');
  doc.text(sheet.volume_weight || '—', col2X + 16, y);

  y += 5.5;

  // 3. TABLE LAYOUT
  // Column widths:
  // Sl No: 12mm
  // Description: 82mm
  // Cost DHS: 28mm
  // Cost Fils: 15mm
  // Invoice DHS: 28mm
  // Invoice Fils: 17mm
  // Total = 12 + 82 + 28 + 15 + 28 + 17 = 182mm
  const colW = {
    sl: 12,
    desc: 82,
    costDhs: 28,
    costFils: 15,
    invDhs: 28,
    invFils: 17,
  };

  const xSl = margin;
  const xDesc = xSl + colW.sl;
  const xCostDhs = xDesc + colW.desc;
  const xCostFils = xCostDhs + colW.costDhs;
  const xInvDhs = xCostFils + colW.costFils;
  const xInvFils = xInvDhs + colW.invDhs;
  const xEnd = margin + contentWidth;

  const tableTopY = y;
  const headerRow1H = 5.5;
  const headerRow2H = 5.5;
  const tableHeaderH = headerRow1H + headerRow2H;

  // Draw Table Header Box
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.rect(margin, tableTopY, contentWidth, tableHeaderH);

  // Header dividing lines
  // Vertical line after Sl No
  doc.line(xDesc, tableTopY, xDesc, tableTopY + tableHeaderH);
  // Vertical line after Desc
  doc.line(xCostDhs, tableTopY, xCostDhs, tableTopY + tableHeaderH);
  // Horizontal split across Cost Amount and Invoice Amount
  doc.line(xCostDhs, tableTopY + headerRow1H, xEnd, tableTopY + headerRow1H);
  // Vertical split between Cost and Invoice
  doc.line(xInvDhs, tableTopY, xInvDhs, tableTopY + tableHeaderH);
  // Vertical split between Cost DHS and Fils
  doc.line(xCostFils, tableTopY + headerRow1H, xCostFils, tableTopY + tableHeaderH);
  // Vertical split between Invoice DHS and Fils
  doc.line(xInvFils, tableTopY + headerRow1H, xInvFils, tableTopY + tableHeaderH);

  // Header Texts
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);

  // Sl No.
  doc.text('Sl No.', xSl + colW.sl / 2, tableTopY + 7, { align: 'center' });

  // Top header labels
  doc.text('Cost Amount', xCostDhs + (colW.costDhs + colW.costFils) / 2, tableTopY + 4, { align: 'center' });
  doc.text('Invoice Amount', xInvDhs + (colW.invDhs + colW.invFils) / 2, tableTopY + 4, { align: 'center' });

  // Sub headers
  doc.text('DHS', xCostDhs + colW.costDhs / 2, tableTopY + headerRow1H + 4, { align: 'center' });
  doc.text('Fils', xCostFils + colW.costFils / 2, tableTopY + headerRow1H + 4, { align: 'center' });
  doc.text('DHS', xInvDhs + colW.invDhs / 2, tableTopY + headerRow1H + 4, { align: 'center' });
  doc.text('Fils', xInvFils + colW.invFils / 2, tableTopY + headerRow1H + 4, { align: 'center' });

  let rowY = tableTopY + tableHeaderH;
  const rowHeight = 5.6;

  // Draw 23 items + custom items
  const items = sheet.items || [];
  
  items.forEach((item, index) => {
    // Outer row line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25);
    doc.rect(margin, rowY, contentWidth, rowHeight);

    // Vertical column grid lines
    doc.line(xDesc, rowY, xDesc, rowY + rowHeight);
    doc.line(xCostDhs, rowY, xCostDhs, rowY + rowHeight);
    doc.line(xCostFils, rowY, xCostFils, rowY + rowHeight);
    doc.line(xInvDhs, rowY, xInvDhs, rowY + rowHeight);
    doc.line(xInvFils, rowY, xInvFils, rowY + rowHeight);

    // Row texts
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);

    // Sl No
    doc.text(String(item.sl_no || index + 1), xSl + colW.sl / 2, rowY + 4, { align: 'center' });

    // Description (Bold uppercase for standard items matching attached format)
    doc.setFont('helvetica', 'bold');
    doc.text(item.description || '', xDesc + 3, rowY + 4);

    // Cost Amount (Segregated into DHS and Fils columns)
    const costTotal = (item.cost_amount !== undefined && item.cost_amount !== null && item.cost_amount > 0)
      ? item.cost_amount
      : ((item.cost_dhs || 0) + (item.cost_fils || 0) / 100);

    const hasCost = costTotal > 0 || (item.cost_dhs !== undefined && item.cost_dhs > 0) || (item.cost_fils !== undefined && item.cost_fils > 0);

    if (hasCost) {
      const totalCostCents = Math.round(costTotal * 100);
      const dhsVal = Math.floor(totalCostCents / 100);
      const filsVal = totalCostCents % 100;

      const dhsText = (dhsVal > 0 || (item.cost_dhs !== undefined && item.cost_dhs > 0)) 
        ? dhsVal.toLocaleString('en-US') 
        : (filsVal > 0 ? '0' : '');
      const filsText = String(filsVal).padStart(2, '0');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);

      // Cost DHS in DHS column
      if (dhsText) {
        doc.text(dhsText, xCostDhs + colW.costDhs - 2.5, rowY + 3.8, { align: 'right' });
      }
      // Cost Fils in Fils column
      doc.text(filsText, xCostFils + colW.costFils / 2, rowY + 3.8, { align: 'center' });
    }

    // Invoice Amount (Segregated into DHS and Fils columns)
    const invTotal = (item.invoice_amount !== undefined && item.invoice_amount !== null && item.invoice_amount > 0)
      ? item.invoice_amount
      : ((item.invoice_dhs || 0) + (item.invoice_fils || 0) / 100);

    const hasInvoice = invTotal > 0 || (item.invoice_dhs !== undefined && item.invoice_dhs > 0) || (item.invoice_fils !== undefined && item.invoice_fils > 0);

    if (hasInvoice) {
      const totalInvCents = Math.round(invTotal * 100);
      const invDhsVal = Math.floor(totalInvCents / 100);
      const invFilsVal = totalInvCents % 100;

      const invDhsText = (invDhsVal > 0 || (item.invoice_dhs !== undefined && item.invoice_dhs > 0)) 
        ? invDhsVal.toLocaleString('en-US') 
        : (invFilsVal > 0 ? '0' : '');
      const invFilsText = String(invFilsVal).padStart(2, '0');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);

      // Invoice DHS in DHS column
      if (invDhsText) {
        doc.text(invDhsText, xInvDhs + colW.invDhs - 2.5, rowY + 3.8, { align: 'right' });
      }
      // Invoice Fils in Fils column
      doc.text(invFilsText, xInvFils + colW.invFils / 2, rowY + 3.8, { align: 'center' });
    }

    rowY += rowHeight;
  });

  // 4. TOTAL ROW
  const totalRowHeight = 6.5;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.rect(margin, rowY, contentWidth, totalRowHeight);

  // Column lines for Total Row
  doc.line(xCostDhs, rowY, xCostDhs, rowY + totalRowHeight);
  doc.line(xCostFils, rowY, xCostFils, rowY + totalRowHeight);
  doc.line(xInvDhs, rowY, xInvDhs, rowY + totalRowHeight);
  doc.line(xInvFils, rowY, xInvFils, rowY + totalRowHeight);

  // TOTAL label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('TOTAL', xSl + (colW.sl + colW.desc) / 2, rowY + 4.5, { align: 'center' });

  // Highlighted Yellow Box for Cost Total
  doc.setFillColor(254, 240, 138); // #FEF08A Light yellow
  doc.rect(xCostDhs, rowY, colW.costDhs, totalRowHeight, 'FD');
  doc.rect(xCostFils, rowY, colW.costFils, totalRowHeight, 'FD');
  // Redraw the middle dividing line
  doc.line(xCostFils, rowY, xCostFils, rowY + totalRowHeight);

  // Total Cost value segregated into DHS and Fils
  const totalCostCents = Math.round((sheet.total_cost || 0) * 100);
  const totalCostDhs = Math.floor(totalCostCents / 100);
  const totalCostFils = totalCostCents % 100;

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(totalCostDhs.toLocaleString('en-US'), xCostDhs + colW.costDhs - 2.5, rowY + 4.5, { align: 'right' });
  doc.text(String(totalCostFils).padStart(2, '0'), xCostFils + colW.costFils / 2, rowY + 4.5, { align: 'center' });

  // Total Invoice value segregated into DHS and Fils
  if (sheet.total_invoice && sheet.total_invoice > 0) {
    const totalInvCents = Math.round((sheet.total_invoice || 0) * 100);
    const totalInvDhs = Math.floor(totalInvCents / 100);
    const totalInvFils = totalInvCents % 100;

    doc.text(totalInvDhs.toLocaleString('en-US'), xInvDhs + colW.invDhs - 2.5, rowY + 4.5, { align: 'right' });
    doc.text(String(totalInvFils).padStart(2, '0'), xInvFils + colW.invFils / 2, rowY + 4.5, { align: 'center' });
  }

  rowY += totalRowHeight + 7;

  // 5. TR.PORT & NET BOX SUMMARY (Bottom Right)
  const summaryBoxW = 48;
  const summaryBoxX = xEnd - summaryBoxW;
  const trPortRowH = 6;
  const netRowH = 6.5;

  // TR.PORT Row
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.rect(summaryBoxX, rowY, summaryBoxW, trPortRowH);
  doc.line(summaryBoxX + 22, rowY, summaryBoxX + 22, rowY + trPortRowH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('TR.PORT', summaryBoxX + 3, rowY + 4.2);
  doc.text((sheet.transport_amount || 0).toFixed(2), summaryBoxX + summaryBoxW - 3, rowY + 4.2, { align: 'right' });

  // NET TOTAL Highlighted Yellow Box
  const netY = rowY + trPortRowH;
  doc.setFillColor(254, 240, 138); // #FEF08A
  doc.rect(summaryBoxX, netY, summaryBoxW, netRowH, 'F');
  doc.rect(summaryBoxX, netY, summaryBoxW, netRowH, 'S');

  const netAmount = (sheet.net_cost !== undefined ? sheet.net_cost : (sheet.total_cost - (sheet.transport_amount || 0)));
  const netAmountStr = netAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(netAmountStr, summaryBoxX + summaryBoxW - 3, netY + 4.5, { align: 'right' });

  // 6. SIGNATURE SECTION (Bottom Left)
  const sigY = rowY + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Signature  :', margin + 5, sigY);

  // If digital signature exists, draw it above or next to the line
  if (sheet.signature_image) {
    try {
      doc.addImage(sheet.signature_image, 'PNG', margin + 30, sigY - 8, 45, 12);
    } catch (e) {
      console.warn('Could not draw signature image', e);
    }
  } else if (sheet.signature_name) {
    doc.setFont('helvetica', 'normal');
    doc.text(sheet.signature_name, margin + 32, sigY - 2);
  }

  doc.setLineWidth(0.3);
  doc.line(margin + 30, sigY + 0.5, margin + 85, sigY + 0.5);

  return doc;
};
