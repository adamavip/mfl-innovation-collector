import { COLS, REQUIRED_FIELDS, RowData, taxonomy } from "./taxonomy";

export interface RowError {
  rowIndex: number;
  field: string;
  message: string;
}

const URL_RE = /^https?:\/\//i;

export function validateRow(row: RowData, rowIndex: number): RowError[] {
  const errs: RowError[] = [];

  for (const req of REQUIRED_FIELDS) {
    const v = row[req];
    if (v === undefined || v === null || String(v).trim() === "") {
      errs.push({ rowIndex, field: req, message: "Required" });
    }
  }

  for (const col of COLS) {
    const v = row[col.field];
    if (v === undefined || v === null || v === "") continue;

    if (col.type === "dropdown" && typeof col.dv === "string") {
      const allowed = taxonomy[col.dv] as readonly string[];
      const sv = String(v);
      // Accept either a vocab match, or a free-form "Other: <text>" entry.
      const isOther = sv === "Other" || sv.startsWith("Other:");
      if (!allowed.includes(sv) && !isOther) {
        errs.push({ rowIndex, field: col.field, message: `Not in vocabulary` });
      }
    } else if (col.type === "integer" && Array.isArray(col.dv)) {
      const n = Number(v);
      if (!Number.isInteger(n) || n < col.dv[0] || n > col.dv[1]) {
        errs.push({ rowIndex, field: col.field, message: `Integer ${col.dv[0]}–${col.dv[1]}` });
      }
    } else if (col.type === "decimal" && Array.isArray(col.dv)) {
      const n = Number(v);
      if (!Number.isFinite(n) || n < col.dv[0] || n > col.dv[1]) {
        errs.push({ rowIndex, field: col.field, message: `Decimal ${col.dv[0]}–${col.dv[1]}` });
      }
    } else if (col.type === "url") {
      if (!URL_RE.test(String(v))) {
        errs.push({ rowIndex, field: col.field, message: "Must start with http:// or https://" });
      }
    }
  }
  return errs;
}

export function isRowEmpty(row: RowData): boolean {
  return COLS.every(c => {
    const v = row[c.field];
    return v === undefined || v === null || String(v).trim() === "";
  });
}

export function validateAll(rows: RowData[]): RowError[] {
  return rows.flatMap((r, i) => (isRowEmpty(r) ? [] : validateRow(r, i)));
}
