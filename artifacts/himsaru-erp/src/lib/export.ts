import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function exportToExcel(filename: string, sheetName: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.addRow(headers);
  rows.forEach(row => worksheet.addRow(row.map(c => c ?? '')));
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToPDF(filename: string, title: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 22);
  autoTable(doc, {
    startY: 28,
    head: [headers],
    body: rows.map(r => r.map(c => c == null ? '' : String(c))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 64, 175] },
  });
  doc.save(`${filename}.pdf`);
}
