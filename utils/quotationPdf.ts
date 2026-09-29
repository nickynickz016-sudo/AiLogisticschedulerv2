import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation } from '../types';

export interface GenerateQuotationPdfOptions {
  quotation: Quotation;
  logo?: string;
  logoLinkUrl?: string;
  termsLinkUrl?: string;
  highlightSpecialNotes?: boolean;
}

// Robust currency & numeric formatter that handles numbers, strings, nulls, undefined, and NaN
export const formatMoney = (val: any): string => {
  if (val === null || val === undefined || val === '') return '0.00';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const generateQuotationPdf = ({
  quotation,
  logo,
  logoLinkUrl = 'https://www.writerrelocations.com',
  termsLinkUrl = 'https://www.writerrelocations.com/terms-and-conditions',
  highlightSpecialNotes
}: GenerateQuotationPdfOptions): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const primaryDark: [number, number, number] = [15, 23, 42]; // Slate-900
  const brandRed: [number, number, number] = [227, 30, 36]; // #E31E24
  const brandOrange: [number, number, number] = [245, 130, 32]; // #F58220
  const slateText: [number, number, number] = [51, 65, 85]; // Slate-700
  const lightBg: [number, number, number] = [248, 250, 252]; // Slate-50
  const borderGray: [number, number, number] = [226, 232, 240]; // Slate-200

  let y = 12;

  // Safe splitTextToSize helper
  const safeSplit = (text: any, maxWidth: number): string[] => {
    if (text === null || text === undefined || text === '') return ['—'];
    try {
      const res = doc.splitTextToSize(String(text), maxWidth);
      return Array.isArray(res) && res.length > 0 ? res : ['—'];
    } catch (e) {
      return [String(text)];
    }
  };

  // Top Running Mini Header on subsequent pages
  const drawHeaderSmall = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...primaryDark);
    doc.text('WRITER RELOCATIONS', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const quoteRef = quotation.quotation_no || 'Quotation';
    const clientRef = quotation.client_name || 'Client';
    doc.text(`Ref: ${quoteRef} | ${clientRef}`, margin + 45, y);
    doc.text(quotation.format === 'FCL_EXPORT' ? 'FCL Export Quotation' : 'Groupage FCL Export Quotation', pageWidth - margin, y, { align: 'right' });
    y += 2;
    doc.setDrawColor(...borderGray);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  // Helper for page break checks
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage();
      y = 16;
      drawHeaderSmall();
    }
  };

  // ==========================================
  // PAGE 1: HEADER SECTION
  // ==========================================

  // 1. Logo (Clickable!)
  let logoDrawn = false;
  const actualLogoUrl = quotation.logo_url || logoLinkUrl || 'https://www.writerrelocations.com';

  if (logo && typeof logo === 'string' && logo.trim().length > 0) {
    try {
      const imgProps = doc.getImageProperties(logo);
      const ratio = imgProps.width / imgProps.height;
      let w = 48;
      let h = w / ratio;
      if (h > 18) {
        h = 18;
        w = h * ratio;
      }
      doc.addImage(logo, 'PNG', margin, y, w, h);
      // Clickable link hotspot over logo
      if (actualLogoUrl) {
        doc.link(margin, y, w, h, { url: actualLogoUrl });
      }
      logoDrawn = true;
    } catch (e) {
      console.warn('Could not draw provided base64 logo', e);
    }
  }

  if (!logoDrawn) {
    // Vector Writer Relocations Brand Emblem & Typography
    const emblemX = margin;
    const emblemY = y + 1;

    // Orange Left Chevron
    doc.setFillColor(...brandOrange);
    doc.triangle(emblemX, emblemY + 4, emblemX + 7, emblemY, emblemX + 7, emblemY + 3, 'FD');
    doc.triangle(emblemX, emblemY + 4, emblemX + 7, emblemY + 5, emblemX + 7, emblemY + 8, 'FD');

    // Dark Right Chevron
    doc.setFillColor(...primaryDark);
    doc.triangle(emblemX + 8, emblemY + 4, emblemX + 15, emblemY, emblemX + 15, emblemY + 3, 'FD');
    doc.triangle(emblemX + 8, emblemY + 4, emblemX + 15, emblemY + 5, emblemX + 15, emblemY + 8, 'FD');

    // Typography
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...primaryDark);
    doc.text('WRITER', emblemX + 18, emblemY + 6);

    doc.setFontSize(8);
    doc.setTextColor(...brandRed);
    doc.text('RELOCATIONS', emblemX + 18, emblemY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('GLOBAL MOBILITY & RELOCATION SERVICES', emblemX + 18, emblemY + 13.5);

    // Make the vector logo area clickable as well
    if (actualLogoUrl) {
      doc.link(emblemX, emblemY, 70, 16, { url: actualLogoUrl });
    }
  }

  // Header Right: Company Coordinates & Certifications
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryDark);
  doc.text('WRITER RELOCATIONS LLC', pageWidth - margin, y + 2, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Jebel Ali Free Zone / Dubai Investments Park, UAE', pageWidth - margin, y + 6, { align: 'right' });
  doc.text('Tel: +971 4 885 1234 | Email: info@writerrelocations.com', pageWidth - margin, y + 10, { align: 'right' });
  doc.text('FIDI FAIM Certified | ISO 9001:2015 Accredited Member', pageWidth - margin, y + 14, { align: 'right' });

  y += 20;

  // Header Divider
  doc.setDrawColor(...brandRed);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + 40, y);
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.3);
  doc.line(margin + 40, y, pageWidth - margin, y);

  y += 6;

  // Title Banner
  const isFcl = quotation.format === 'FCL_EXPORT';
  const formatTitle = isFcl ? 'FULL CONTAINER LOAD (FCL) EXPORT QUOTATION' : 'GROUPAGE FCL EXPORT CONSOLIDATION QUOTATION';
  const formatSubtitle = isFcl 
    ? 'Dedicated Ocean Container • Professional Export Packing • Global Port-to-Door Mobility'
    : 'Consolidated Sea Freight • Shared FCL Container • Cost-Optimized LCL Moving Solution';

  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, y, contentWidth, 16, 1.5, 1.5, 'F');
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 16, 1.5, 1.5, 'S');

  // Colored left accent bar
  doc.setFillColor(isFcl ? brandRed[0] : brandOrange[0], isFcl ? brandRed[1] : brandOrange[1], isFcl ? brandRed[2] : brandOrange[2]);
  doc.rect(margin, y, 3, 16, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryDark);
  doc.text(formatTitle, margin + 7, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(formatSubtitle, margin + 7, y + 12);

  // Status Badge in Banner
  const statusColorMap: Record<string, [number, number, number]> = {
    'DRAFT': [217, 119, 6], // Amber-600
    'SAVED': [37, 99, 235], // Blue-600
    'FINALIZED': [16, 185, 129] // Emerald-600
  };
  const statusLabel = quotation.status || 'DRAFT';
  const statusBg = statusColorMap[statusLabel] || [100, 116, 139];
  const badgeWidth = 26;
  const badgeX = pageWidth - margin - badgeWidth - 4;
  doc.setFillColor(statusBg[0], statusBg[1], statusBg[2]);
  doc.roundedRect(badgeX, y + 4.5, badgeWidth, 7, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(statusLabel, badgeX + badgeWidth / 2, y + 9.2, { align: 'center' });

  y += 20;

  // ==========================================
  // QUOTATION METADATA & CLIENT SECTION
  // ==========================================

  const colWidth = (contentWidth - 6) / 2;

  // Box 1: Quotation Information
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, colWidth, 34, 1.5, 1.5, 'FD');

  doc.setFillColor(...lightBg);
  doc.rect(margin, y, colWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryDark);
  doc.text('QUOTATION DETAILS', margin + 4, y + 5);

  doc.setFontSize(8);
  const qLeft = margin + 4;
  const qValLeft = margin + 35;
  let qY = y + 12;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryDark);
  doc.text('Quote Ref No:', qLeft, qY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  doc.text(quotation.quotation_no || '—', qValLeft, qY);

  qY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryDark);
  doc.text('Quote Date:', qLeft, qY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  doc.text(quotation.date || '—', qValLeft, qY);

  qY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryDark);
  doc.text('Validity Period:', qLeft, qY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  doc.text(quotation.valid_until ? `Valid until ${quotation.valid_until}` : '30 days from issue', qValLeft, qY);

  qY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryDark);
  doc.text('Prepared By:', qLeft, qY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  doc.text(quotation.prepared_by || 'Relocation Specialist', qValLeft, qY);

  // Box 2: Client & Destination Information
  const cX = margin + colWidth + 6;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(cX, y, colWidth, 34, 1.5, 1.5, 'FD');

  doc.setFillColor(...lightBg);
  doc.rect(cX, y, colWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryDark);
  doc.text('CLIENT & ROUTE SPECIFICATIONS', cX + 4, y + 5);

  let cY = y + 12;
  const cLeft = cX + 4;
  const cValLeft = cX + 32;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryDark);
  doc.text('Shipper / Client:', cLeft, cY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  const clientName = quotation.client_name || 'Valued Client';
  const clientLine = quotation.company_name 
    ? `${clientName} (${quotation.company_name})` 
    : clientName;
  doc.text(safeSplit(clientLine, colWidth - 36)[0] || '—', cValLeft, cY);

  cY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryDark);
  doc.text('Origin:', cLeft, cY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  doc.text(`${quotation.origin_city || 'Dubai'}, ${quotation.origin_country || 'UAE'}`, cValLeft, cY);

  cY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryDark);
  doc.text('Destination:', cLeft, cY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  doc.text(`${quotation.destination_city || '—'}, ${quotation.destination_country || '—'}`, cValLeft, cY);

  cY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryDark);
  doc.text('Service Scope:', cLeft, cY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  doc.text(quotation.service_type || 'Door-to-Door Standard Relocation', cValLeft, cY);

  y += 38;

  // ==========================================
  // SHIPMENT SPECIFICATIONS GRID
  // ==========================================

  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, y, contentWidth, 18, 1, 1, 'FD');
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 18, 1, 1, 'S');

  const cellW = contentWidth / 4;
  const row1Y = y + 5;
  const row2Y = y + 13;

  // Col 1: Container / Mode
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(isFcl ? 'CONTAINER / EQUIPMENT' : 'CONSOLIDATION MODE', margin + 4, row1Y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryDark);
  doc.text(isFcl ? (quotation.container_size || '20ft General Purpose') : (quotation.groupage_mode || 'Shared 40ft HC FCL'), margin + 4, row2Y);

  // Col 2: Volume / Weight
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('ESTIMATED VOLUME / WEIGHT', margin + cellW + 4, row1Y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryDark);
  const volText = quotation.estimated_volume_cbm 
    ? `${quotation.estimated_volume_cbm} CBM (${quotation.estimated_volume_cft || Math.round(Number(quotation.estimated_volume_cbm) * 35.315)} CFT)`
    : 'As Surveyed';
  doc.text(volText, margin + cellW + 4, row2Y);

  // Col 3: Ports / Gateway
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('PORT OF ORIGIN / DESTINATION', margin + cellW * 2 + 4, row1Y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryDark);
  const portStr = `${quotation.origin_port || 'Jebel Ali'} -> ${quotation.destination_port || 'Destination Port'}`;
  doc.text(safeSplit(portStr, cellW - 6)[0] || '—', margin + cellW * 2 + 4, row2Y);

  // Col 4: Estimated Transit Time
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TRANSIT TIME ESTIMATE', margin + cellW * 3 + 4, row1Y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryDark);
  doc.text(quotation.transit_time || '20-30 Days (approx.)', margin + cellW * 3 + 4, row2Y);

  y += 24;

  // ==========================================
  // ITEMIZED PRICING SCHEDULE TABLE
  // ==========================================

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryDark);
  doc.text('PRICING SCHEDULE & FREIGHT CHARGES', margin, y);

  y += 2;

  const rawItems = quotation.line_items || [];
  const curr = quotation.currency || 'AED';

  let tableData = rawItems.map((item, idx) => [
    (idx + 1).toString(),
    item.description || 'Logistics Service',
    (item.quantity ?? 1).toString(),
    item.unit || 'Lump Sum',
    `${curr} ${formatMoney(item.unit_price)}`,
    `${curr} ${formatMoney(item.total_price)}`
  ]);

  if (tableData.length === 0) {
    tableData = [[
      '1',
      'Freight & Logistics Relocation Services (As per agreed scope)',
      '1',
      'Lump Sum',
      `${curr} ${formatMoney(quotation.total_amount)}`,
      `${curr} ${formatMoney(quotation.total_amount)}`
    ]];
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['#', 'Description of Logistics & Moving Services', 'Qty', 'Unit', 'Unit Rate', 'Total Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      cellPadding: 2.5
    },
    bodyStyles: {
      textColor: [51, 65, 85],
      fontSize: 7.5,
      cellPadding: 2.2
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  // Position after table
  const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 3 : y + 30;
  y = finalY;

  // Totals Summary Box
  const summaryBoxWidth = 85;
  const summaryBoxX = pageWidth - margin - summaryBoxWidth;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.3);
  doc.roundedRect(summaryBoxX, y, summaryBoxWidth, 24, 1.5, 1.5, 'FD');

  let sY = y + 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slateText);
  doc.text('Subtotal:', summaryBoxX + 4, sY);
  doc.text(`${curr} ${formatMoney(quotation.subtotal)}`, summaryBoxX + summaryBoxWidth - 4, sY, { align: 'right' });

  sY += 5;
  const vatRate = quotation.vat_percent ?? 0;
  doc.text(`VAT / Taxes (${vatRate}%):`, summaryBoxX + 4, sY);
  doc.text(`${curr} ${formatMoney(quotation.vat_amount)}`, summaryBoxX + summaryBoxWidth - 4, sY, { align: 'right' });

  sY += 4;
  doc.setDrawColor(...borderGray);
  doc.line(summaryBoxX + 4, sY, summaryBoxX + summaryBoxWidth - 4, sY);

  sY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...brandRed);
  doc.text('Total Quoted Price:', summaryBoxX + 4, sY);
  doc.text(`${curr} ${formatMoney(quotation.total_amount)}`, summaryBoxX + summaryBoxWidth - 4, sY, { align: 'right' });

  // Payment terms note next to totals
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Payment Terms: ${quotation.payment_terms || '100% advance prior to packing / container dispatch'}`, margin, y + 6);
  doc.text(`Currency of Quotation: ${curr} (All figures in ${curr})`, margin, y + 11);

  y += 28;

  // ==========================================
  // BULLETIZED INCLUSIONS & EXCLUSIONS
  // ==========================================

  checkPageBreak(50);

  // Inclusions Header
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'F');
  doc.setDrawColor(...borderGray);
  doc.rect(margin, y, contentWidth, 7, 'S');

  // Green accent bar
  doc.setFillColor(16, 185, 129); // Emerald
  doc.rect(margin, y, 2.5, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryDark);
  doc.text('INCLUSIONS IN THIS QUOTATION (SERVICES COVERED)', margin + 6, y + 4.8);

  y += 10;

  const activeInclusions = (quotation.inclusions || []).filter(item => item && item.included);

  doc.setFontSize(7.5);
  doc.setTextColor(...slateText);

  activeInclusions.forEach((item) => {
    checkPageBreak(8);

    // Bullet point checkmark symbol
    doc.setFillColor(16, 185, 129);
    doc.circle(margin + 2.5, y - 1, 1.2, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    const splitText = safeSplit(item.text, contentWidth - 8);
    doc.text(splitText, margin + 6, y);
    y += splitText.length * 3.6 + 1.2;
  });

  if (activeInclusions.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('No specific inclusions selected.', margin + 6, y);
    y += 5;
  }

  y += 5;
  checkPageBreak(50);

  // Exclusions Header
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'F');
  doc.setDrawColor(...borderGray);
  doc.rect(margin, y, contentWidth, 7, 'S');

  // Red accent bar
  doc.setFillColor(...brandRed);
  doc.rect(margin, y, 2.5, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryDark);
  doc.text('EXCLUSIONS & OPTIONAL / ADDITIONAL TARIFFS', margin + 6, y + 4.8);

  y += 10;

  const activeExclusions = (quotation.exclusions || []).filter(item => item && item.included);

  activeExclusions.forEach((item) => {
    checkPageBreak(8);

    // Bullet point cross symbol or minus dot
    doc.setFillColor(...brandRed);
    doc.rect(margin + 1.5, y - 1.5, 2.5, 0.8, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateText);
    const splitText = safeSplit(item.text, contentWidth - 8);
    doc.text(splitText, margin + 6, y);
    y += splitText.length * 3.6 + 1.2;
  });

  if (activeExclusions.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('No specific exclusions listed.', margin + 6, y);
    y += 5;
  }

  y += 6;

  // ==========================================
  // SPECIAL NOTES (BOLD & HIGHLIGHTED OPTION)
  // ==========================================

  const shouldHighlight = highlightSpecialNotes ?? (quotation.special_notes_bold || quotation.special_notes_highlighted);

  if (quotation.special_notes && String(quotation.special_notes).trim().length > 0) {
    checkPageBreak(40);

    const noteLines = safeSplit(quotation.special_notes, contentWidth - 14);
    const noteBoxHeight = noteLines.length * 4 + 14;

    if (shouldHighlight) {
      // Soft amber/yellow highlight background with bright amber/slate border
      doc.setFillColor(254, 243, 199); // Amber-100
      doc.setDrawColor(217, 119, 6); // Amber-600
      doc.setLineWidth(0.6);
      doc.roundedRect(margin, y, contentWidth, noteBoxHeight, 2, 2, 'FD');

      // Left Accent bar
      doc.setFillColor(217, 119, 6);
      doc.rect(margin, y, 3.5, noteBoxHeight, 'F');

      // Note Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(146, 64, 14); // Amber-800
      doc.text('CRITICAL NOTICE & SPECIAL FREIGHT CONDITIONS (PLEASE NOTE)', margin + 8, y + 6);

      // Note Body - in BOLD
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(120, 53, 15); // Amber-900
      doc.text(noteLines, margin + 8, y + 11);
    } else {
      // Standard discreet gray box
      doc.setFillColor(...lightBg);
      doc.setDrawColor(...borderGray);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentWidth, noteBoxHeight, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...primaryDark);
      doc.text('SPECIAL NOTES & OPERATIONAL CONDITIONS', margin + 6, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...slateText);
      doc.text(noteLines, margin + 6, y + 11);
    }

    y += noteBoxHeight + 6;
  }

  // ==========================================
  // TERMS & CONDITIONS (LINKABLE HYPERLINK)
  // ==========================================

  checkPageBreak(45);

  const actualTermsUrl = quotation.terms_and_conditions_url || termsLinkUrl || 'https://www.writerrelocations.com/terms-and-conditions';
  const termsText = quotation.terms_and_conditions_text || 'Writer Relocations General Terms and Conditions';

  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, y, contentWidth, 14, 1, 1, 'F');
  doc.setDrawColor(...borderGray);
  doc.rect(margin, y, contentWidth, 14, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...primaryDark);
  doc.text('GOVERNING CONTRACT & CLAUSES:', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('All relocation bookings and freight handling are strictly governed by ', margin + 4, y + 9.5);

  // Linkable text part
  const prefixWidth = doc.getTextWidth('All relocation bookings and freight handling are strictly governed by ');
  const linkX = margin + 4 + prefixWidth;
  const linkY = y + 9.5;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text(termsText, linkX, linkY);

  const linkWidth = doc.getTextWidth(termsText);
  // Draw link underline
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.2);
  doc.line(linkX, linkY + 0.5, linkX + linkWidth, linkY + 0.5);

  // Add clickable hyperlink hotspot
  if (actualTermsUrl) {
    doc.link(linkX, linkY - 3, linkWidth, 4.5, { url: actualTermsUrl });
  }

  y += 18;

  // ==========================================
  // CLIENT ACCEPTANCE & SIGN-OFF BLOCK
  // ==========================================

  checkPageBreak(35);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 32, 1.5, 1.5, 'FD');

  doc.setFillColor(...lightBg);
  doc.rect(margin, y, contentWidth, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryDark);
  doc.text('CLIENT QUOTATION ACCEPTANCE & BOOKING CONFIRMATION', margin + 4, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('I/We hereby accept the above quotation and authorize Writer Relocations to proceed with export logistics execution:', margin + 4, y + 11);

  // Signature lines
  const sigColW = (contentWidth - 12) / 3;
  const sigY = y + 26;

  // Client Signature
  doc.setDrawColor(...borderGray);
  doc.line(margin + 4, sigY, margin + 4 + sigColW, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...primaryDark);
  doc.text('Authorized Client Signature', margin + 4, sigY + 4);

  // Printed Name & Title
  doc.line(margin + 4 + sigColW + 4, sigY, margin + 4 + sigColW * 2 + 4, sigY);
  doc.text('Printed Name & Designation', margin + 4 + sigColW + 4, sigY + 4);

  // Date & Company Stamp
  doc.line(margin + 4 + (sigColW + 4) * 2, sigY, margin + 4 + sigColW * 3 + 8, sigY);
  doc.text('Acceptance Date & Stamp', margin + 4 + (sigColW + 4) * 2, sigY + 4);

  y += 36;

  // ==========================================
  // RUNNING FOOTERS ON ALL PAGES
  // ==========================================

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer divider line
    doc.setDrawColor(...borderGray);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    // Footer text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);

    doc.text(
      'Writer Relocations - An ISO 9001:2015 & FIDI FAIM Certified International Mobility Provider. All Rights Reserved.',
      margin,
      pageHeight - 8
    );

    doc.text(
      `Quote: ${quotation.quotation_no || 'Quotation'} | Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  return doc;
};
