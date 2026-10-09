import * as XLSX from "xlsx";

/** Export an array of flat objects to an .xlsx file download. */
export function exportToExcel(
  rows: Record<string, unknown>[],
  sheetName: string,
  fileName: string,
) {
  const ws = XLSX.utils.json_to_sheet(rows);
  // Auto column widths
  const keys = rows.length > 0 ? Object.keys(rows[0]) : [];
  ws["!cols"] = keys.map((k) => ({
    wch: Math.max(
      k.length,
      ...rows.map((r) => String(r[k] ?? "").length),
    ) + 2,
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export function todayFileTag() {
  return new Date().toISOString().slice(0, 10);
}
