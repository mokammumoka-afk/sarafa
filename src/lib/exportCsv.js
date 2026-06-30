import Papa from 'papaparse';

// Closes the "exportable reports" gap from the original spec (section 5.9) —
// a lightweight CSV export, since the data already lives in `transactions`/
// `profiles` and a full PDF report generator was explicitly scoped out.
export function exportToCsv(filename, rows) {
  if (!rows?.length) return;
  const csv = Papa.unparse(rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
