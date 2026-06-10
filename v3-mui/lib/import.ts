import Papa from "papaparse";
import * as XLSX from "xlsx";
import { COLS, RowData } from "./taxonomy";

const VALID_FIELDS = new Set(COLS.map(c => c.field));

function normaliseRow(raw: Record<string, unknown>): RowData {
  const out: RowData = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = k.trim();
    if (!VALID_FIELDS.has(key)) continue;
    if (v === undefined || v === null || v === "") continue;
    out[key as keyof RowData] = typeof v === "string" ? v.trim() : (v as number);
  }
  return out;
}

export async function importFile(file: File): Promise<RowData[]> {
  const isExcel = /\.(xlsx|xls)$/i.test(file.name);
  if (isExcel) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames.includes("Data_Entry") ? "Data_Entry" : wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: true, range: detectHeaderRow(ws) });
    return json.map(normaliseRow).filter(r => Object.keys(r).length > 0);
  }
  return new Promise<RowData[]>((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true, skipEmptyLines: true, dynamicTyping: false,
      complete: r => resolve(r.data.map(normaliseRow).filter(x => Object.keys(x).length > 0)),
      error: reject,
    });
  });
}

// The Excel template has a title in row 1 and a group header in row 2; field headers are row 3.
function detectHeaderRow(ws: XLSX.WorkSheet): string | undefined {
  const ref = ws["!ref"];
  if (!ref) return undefined;
  const range = XLSX.utils.decode_range(ref);
  for (let r = range.s.r; r <= Math.min(range.s.r + 5, range.e.r); r++) {
    let hits = 0;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === "string" && VALID_FIELDS.has(cell.v.trim())) hits++;
    }
    if (hits >= 3) {
      const newRange = { s: { r, c: range.s.c }, e: range.e };
      return XLSX.utils.encode_range(newRange);
    }
  }
  return undefined;
}
