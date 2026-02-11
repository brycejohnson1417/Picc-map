import { SavedProposal, ProposalLineItem } from '../types';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const exportToPDF = (proposal: SavedProposal) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  doc.setFontSize(18);
  doc.text('PICC Platform Proposal', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;
  doc.setFontSize(11);
  doc.text(`Proposal: ${proposal.title}`, 20, yPosition);

  yPosition += 8;
  doc.text(`Customer: ${proposal.customer.name}`, 20, yPosition);

  yPosition += 8;
  doc.text(`Date: ${new Date(proposal.created_at).toLocaleDateString()}`, 20, yPosition);

  yPosition += 15;

  // Line Items Table
  doc.setFontSize(12);
  doc.text('Line Items:', 20, yPosition);

  yPosition += 8;
  doc.setFontSize(10);

  // Table headers
  const headers = ['Product', 'Brand', 'Qty', 'Unit Price', 'Total'];
  const colWidths = [70, 40, 20, 30, 30];
  let xPosition = 20;

  headers.forEach((header, idx) => {
    doc.text(header, xPosition, yPosition);
    xPosition += colWidths[idx];
  });

  yPosition += 8;

  // Table rows
  proposal.items.forEach(item => {
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = 20;
    }

    xPosition = 20;
    doc.text(item.product_title, xPosition, yPosition);
    xPosition += colWidths[0];
    doc.text(item.brand, xPosition, yPosition);
    xPosition += colWidths[1];
    doc.text(item.quantity.toString(), xPosition, yPosition);
    xPosition += colWidths[2];
    doc.text(formatCurrency(item.unit_price), xPosition, yPosition);
    xPosition += colWidths[3];
    doc.text(formatCurrency(item.line_total), xPosition, yPosition);

    yPosition += 8;
  });

  yPosition += 5;

  // Totals
  doc.setFontSize(11);
  doc.text(`Total Items: ${proposal.total_items}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Total Cost: ${formatCurrency(proposal.total_cost)}`, 20, yPosition);

  if (proposal.notes) {
    yPosition += 15;
    doc.setFontSize(10);
    doc.text('Notes:', 20, yPosition);
    yPosition += 6;
    const splitNotes = doc.splitTextToSize(proposal.notes, pageWidth - 40);
    doc.text(splitNotes, 20, yPosition);
  }

  doc.save(`${proposal.title}.pdf`);
};

export const exportToExcel = (proposal: SavedProposal) => {
  const data = [
    ['PICC Platform Proposal'],
    [''],
    [`Proposal: ${proposal.title}`],
    [`Customer: ${proposal.customer.name}`],
    [`Date: ${new Date(proposal.created_at).toLocaleDateString()}`],
    [''],
    ['Product', 'Brand', 'Strain', 'Size', 'Quantity', 'Unit Price', 'Line Total'],
    ...proposal.items.map(item => [
      item.product_title,
      item.brand,
      item.strain_name,
      item.size,
      item.quantity,
      item.unit_price,
      item.line_total
    ]),
    [''],
    ['Total Items', proposal.total_items],
    ['Total Cost', proposal.total_cost],
  ];

  if (proposal.notes) {
    data.push(['']);
    data.push(['Notes']);
    data.push([proposal.notes]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Proposal');

  XLSX.writeFile(workbook, `${proposal.title}.xlsx`);
};

export const exportToCSV = (proposal: SavedProposal) => {
  const rows: string[] = [];

  rows.push('PICC Platform Proposal');
  rows.push('');
  rows.push(`Proposal: ${proposal.title}`);
  rows.push(`Customer: ${proposal.customer.name}`);
  rows.push(`Date: ${new Date(proposal.created_at).toLocaleDateString()}`);
  rows.push('');
  rows.push('Product,Brand,Strain,Size,Quantity,Unit Price,Line Total');

  proposal.items.forEach(item => {
    rows.push([
      `"${item.product_title}"`,
      `"${item.brand}"`,
      `"${item.strain_name}"`,
      `"${item.size}"`,
      item.quantity,
      item.unit_price,
      item.line_total
    ].join(','));
  });

  rows.push('');
  rows.push(`Total Items,${proposal.total_items}`);
  rows.push(`Total Cost,${proposal.total_cost}`);

  if (proposal.notes) {
    rows.push('');
    rows.push('Notes');
    rows.push(`"${proposal.notes}"`);
  }

  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${proposal.title}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
};

export const copyToClipboard = async (items: ProposalLineItem[]) => {
  const text = items
    .map(item => `${item.product_title} (${item.brand}) - ${item.size}`)
    .join('\n');

  await navigator.clipboard.writeText(text);
};

export const copyWithQuantities = async (items: ProposalLineItem[]) => {
  const text = items
    .map(item => `${item.product_title} (${item.brand}) - ${item.size} - Qty: ${item.quantity}`)
    .join('\n');

  await navigator.clipboard.writeText(text);
};
