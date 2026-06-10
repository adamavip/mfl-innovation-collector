"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AppBar, Box, Button, Chip, Snackbar, ToggleButton, ToggleButtonGroup,
  Toolbar, Typography, Alert,
} from "@mui/material";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import LayersClearIcon from "@mui/icons-material/LayersClear";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import TableRowsIcon from "@mui/icons-material/TableRows";
import EditNoteIcon from "@mui/icons-material/EditNote";
import { FormMode } from "@/components/FormMode";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ColGroupDef } from "ag-grid-community";
import { getNames } from "country-list";

import { supabase } from "@/lib/supabase";
import { COLS, GROUP_COLOURS, RowData, taxonomy } from "@/lib/taxonomy";
import { isRowEmpty, validateAll, RowError } from "@/lib/validation";
import { SidePanel } from "@/components/SidePanel";
import { AutocompleteEditor } from "@/components/AutocompleteEditor";

const COUNTRY_NAMES = getNames().sort();

const DRAFT_KEY  = "mfl-draft-rows";
const SHARED_KEY = "mfl-shared-record";   // first record, shared with form mode
const EDITING_KEY = "mfl-editing-id";
const BLANK_ROWS = 25;
const blank = (): RowData => ({});

export default function Dashboard() {
  const router = useRouter();
  const gridRef = useRef<AgGridReact>(null);
  const [rows, setRows] = useState<RowData[]>(() => Array.from({ length: BLANK_ROWS }, blank));
  const [errors, setErrors] = useState<RowError[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState<{ severity: "success" | "error" | "warning" | "info"; text: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedCount, setSelectedCount] = useState(0);
  const [siteSuggestions, setSiteSuggestions] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [mode, setMode] = useState<"grid" | "form">("form");
  const [formKey, setFormKey] = useState(0);   // bump to force <FormMode> remount

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
      else setEmail(data.user.email ?? null);
    });
    const local = localStorage.getItem(DRAFT_KEY);
    if (local) try { setRows(JSON.parse(local)); } catch {}
  }, [router]);

  useEffect(() => {
    supabase.from("innovations").select("site_name").not("site_name", "is", null).then(({ data }) => {
      if (!data) return;
      const uniq = Array.from(new Set(data.map((d: any) => d.site_name).filter(Boolean))) as string[];
      setSiteSuggestions(uniq.sort());
    });
  }, [reloadKey]);

  const groupedCols = useMemo<(ColDef | ColGroupDef)[]>(() => {
    const groups: Record<string, ColDef[]> = {};
    for (const c of COLS) {
      const isCountry  = c.field === "country";
      const isSiteName = c.field === "site_name";
      const isAutocomplete = isCountry || isSiteName;
      const isFirst = c.field === COLS[0].field;
      const colDef: ColDef = {
        field: c.field,
        headerName: c.field,
        width: isFirst && selectionMode ? c.width + 40 : c.width,
        editable: true,
        checkboxSelection: isFirst && selectionMode,
        headerCheckboxSelection: isFirst && selectionMode,
        cellEditor: isAutocomplete
          ? AutocompleteEditor
          : c.type === "dropdown" ? "agSelectCellEditor" : "agTextCellEditor",
        cellEditorPopup: isAutocomplete || undefined,
        cellEditorParams: isCountry
          ? { suggestions: COUNTRY_NAMES, placeholder: "Type a country…" }
          : isSiteName
          ? { suggestions: siteSuggestions, placeholder: "Type a site name…" }
          : c.type === "dropdown" && typeof c.dv === "string"
          ? { values: [...taxonomy[c.dv]] } : undefined,
        cellStyle: (p: any) => errors.find(e => e.rowIndex === p.node.rowIndex && e.field === c.field)
          ? { backgroundColor: "#fde7e7", color: "#b71c1c" } : null,
        tooltipValueGetter: (p: any) => errors.find(e => e.rowIndex === p.node.rowIndex && e.field === c.field)?.message ?? "",
      };
      (groups[c.group] ||= []).push(colDef);
    }
    return Object.entries(groups).map(([g, children]) => ({
      headerName: g.toUpperCase(),
      headerClass: `grp-${g.replace(/[^a-z]/gi, "")}`,
      children,
    }));
  }, [errors, siteSuggestions, selectionMode]);

  function persist(next: RowData[]) { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); }

  function loadDraft(d: { id: string; name: string; rows: RowData[] }) {
    setActiveDraftId(d.id);
    setErrors([]);
    const padded = (d.rows ?? []).length < BLANK_ROWS
      ? [...(d.rows ?? []), ...Array.from({ length: BLANK_ROWS - (d.rows ?? []).length }, blank)]
      : d.rows;
    setRows(padded); persist(padded);
    setSnack({ severity: "info", text: `Loaded "${d.name}"` });
  }

  async function saveDraft() {
    setBusy(true); persist(rows);
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      const cleanRows = rows.filter(r => !isRowEmpty(r));
      if (activeDraftId) {
        await supabase.from("drafts").update({ rows: cleanRows, updated_at: new Date().toISOString() }).eq("id", activeDraftId);
      } else {
        const { data } = await supabase.from("drafts").insert({
          user_id: u.user.id,
          name: `Draft ${new Date().toLocaleString()}`,
          rows: cleanRows,
        }).select().single();
        if (data) setActiveDraftId(data.id);
      }
    }
    setSnack({ severity: "success", text: "Draft saved" });
    setReloadKey(k => k + 1);
    setBusy(false);
  }

  async function submit() {
    const errs = validateAll(rows);
    setErrors(errs);
    if (errs.length) { setSnack({ severity: "error", text: `${errs.length} validation error(s)` }); return; }
    const toSend = rows.filter(r => !isRowEmpty(r));
    if (!toSend.length) { setSnack({ severity: "warning", text: "No rows to submit" }); return; }
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("innovations").insert(toSend.map(r => ({ ...r, user_id: u.user?.id })));
    if (!error && activeDraftId) await supabase.from("drafts").delete().eq("id", activeDraftId);
    setBusy(false);
    if (error) { setSnack({ severity: "error", text: error.message }); return; }
    localStorage.removeItem(DRAFT_KEY);
    setActiveDraftId(null);
    setSnack({ severity: "success", text: `Submitted ${toSend.length} innovation(s)` });
    setRows(Array.from({ length: BLANK_ROWS }, blank));
    setReloadKey(k => k + 1);
  }

  function deleteSelected() {
    const api = gridRef.current?.api;
    if (!api) return;
    const selectedRows = api.getSelectedRows() as RowData[];
    if (!selectedRows.length) { setSnack({ severity: "info", text: "No rows selected" }); return; }
    if (!confirm(`Delete ${selectedRows.length} selected row(s)?`)) return;
    const selectedSet = new Set(selectedRows);
    const next = rows.filter(r => !selectedSet.has(r));
    const padded = next.length < BLANK_ROWS
      ? [...next, ...Array.from({ length: BLANK_ROWS - next.length }, blank)]
      : next;
    setRows(padded); persist(padded);
    setSelectedCount(0);
    setSelectionMode(false);
    setErrors([]);
    setSnack({ severity: "success", text: `Deleted ${selectedRows.length} row(s)` });
  }

  function toggleSelectionMode() {
    setSelectionMode(prev => {
      const next = !prev;
      if (!next) {
        gridRef.current?.api?.deselectAll();
        setSelectedCount(0);
      }
      return next;
    });
  }

  function clearTable() {
    if (!confirm("Clear the entire table? Unsaved entries will be lost.")) return;
    const fresh = Array.from({ length: BLANK_ROWS }, blank);
    setRows(fresh); persist(fresh);
    setErrors([]); setSelectedCount(0); setActiveDraftId(null);
    setSnack({ severity: "success", text: "Table cleared" });
  }

  // Form-mode and grid-mode share the first record. On mode switch, sync the latest
  // edits between them so the user sees the same data on either side.
  function changeMode(newMode: "grid" | "form") {
    if (newMode === mode) return;
    try {
      if (newMode === "form") {
        // Grid → form: row 0 (if any non-empty value) into the shared record.
        const r0 = rows[0] ?? {};
        const hasContent = COLS.some(c => {
          const v = (r0 as any)[c.field];
          return v !== undefined && v !== null && String(v).trim() !== "";
        });
        if (hasContent) {
          const existing = JSON.parse(localStorage.getItem(SHARED_KEY) ?? "{}");
          const fromRow: Record<string, unknown> = {};
          for (const c of COLS) {
            const v = (r0 as any)[c.field];
            if (v !== undefined && v !== null && String(v) !== "") fromRow[c.field] = String(v);
          }
          localStorage.setItem(SHARED_KEY, JSON.stringify({ ...existing, ...fromRow }));
        }
        setFormKey(k => k + 1);
      } else {
        // Form → grid: shared record into row 0.
        const recStr = localStorage.getItem(SHARED_KEY);
        if (recStr) {
          const rec = JSON.parse(recStr);
          const row: RowData = {};
          for (const c of COLS) {
            if (rec[c.field] !== undefined && rec[c.field] !== "") row[c.field] = rec[c.field];
          }
          const next = [...rows];
          next[0] = row;
          setRows(next); persist(next);
        }
      }
    } catch {}
    setMode(newMode);
  }

  // Open a submitted innovation in the form for edit/update.
  function loadInnovation(innov: any) {
    const recForForm: Record<string, unknown> = {};
    for (const c of COLS) recForForm[c.field] = (innov as any)[c.field] ?? "";
    // numeric → string for the form's TextField inputs
    for (const k of ["latitude", "longitude", "years_tested", "nb_actors_test_innovations"]) {
      const v = recForForm[k];
      recForForm[k] = v === null || v === undefined ? "" : String(v);
    }
    recForForm.attachments = innov.extras?.attachments ?? [];
    recForForm.geometry    = innov.extras?.geometry ?? null;
    recForForm.has_additional_geo = (innov.extras?.geometry?.features?.length ?? 0) > 0 ? "Y" : "N";
    try {
      localStorage.setItem(SHARED_KEY, JSON.stringify(recForForm));
      localStorage.setItem(EDITING_KEY, innov.id);
    } catch {}
    setMode("form");
    setFormKey(k => k + 1);
  }

  async function signOut() { await supabase.auth.signOut(); router.push("/"); }

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar position="static" color="primary" elevation={0} sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar variant="dense">
          <Link href="/" style={{ color: "inherit", textDecoration: "none", flexGrow: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>MFL Innovation Collector</Typography>
          </Link>
          <ToggleButtonGroup
            value={mode}
            exclusive
            size="small"
            onChange={(_, v) => v && changeMode(v)}
            sx={{
              mr: 2,
              bgcolor: "rgba(255,255,255,0.08)",
              "& .MuiToggleButton-root": {
                color: "rgba(255,255,255,0.7)",
                borderColor: "rgba(255,255,255,0.2)",
                px: 1.5, py: 0.3,
                "&.Mui-selected": { color: "#fff", bgcolor: "rgba(255,255,255,0.16)" },
              },
            }}
          >
            <ToggleButton value="grid"><TableRowsIcon fontSize="small" sx={{ mr: 0.5 }} />Grid</ToggleButton>
            <ToggleButton value="form"><EditNoteIcon fontSize="small" sx={{ mr: 0.5 }} />Form</ToggleButton>
          </ToggleButtonGroup>
          {activeDraftId && mode === "grid" && <Chip label="Editing draft" size="small" color="warning" sx={{ mr: 2 }} />}
          <Typography variant="caption" sx={{ mr: 2, opacity: 0.8 }}>{email}</Typography>
          <Button color="inherit" size="small" onClick={signOut}>Sign out</Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        <SidePanel
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(o => !o)}
          onLoadDraft={loadDraft}
          onLoadInnovation={loadInnovation}
          reloadKey={reloadKey}
        />

        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {mode === "form" ? (
            <Box sx={{ flex: 1, overflow: "auto", bgcolor: "background.default" }}>
              <FormMode key={formKey} onDone={() => setReloadKey(k => k + 1)} />
            </Box>
          ) : (<>
          <Box sx={{ p: 2, display: "flex", gap: 1.5, alignItems: "center", borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
            <Button variant="contained" onClick={submit} disabled={busy}>Submit</Button>
            <Button variant="outlined" onClick={saveDraft} disabled={busy}>
              {activeDraftId ? "Update draft" : "Save draft"}
            </Button>
            <Button onClick={() => setRows(r => [...r, ...Array.from({ length: 5 }, blank)])}>+ 5 rows</Button>
            <Box sx={{ flexGrow: 1 }} />
            {errors.length > 0
              ? <Chip color="error" label={`${errors.length} validation error(s)`} size="small" sx={{ mr: 1 }} />
              : <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>Edit cells like a spreadsheet</Typography>}
            <Button
              variant={selectionMode ? "contained" : "outlined"}
              color={selectionMode ? "primary" : "inherit"}
              size="small"
              startIcon={selectionMode ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
              onClick={toggleSelectionMode}
            >
              {selectionMode ? `Selecting${selectedCount > 0 ? ` (${selectedCount})` : ""}` : "Select"}
            </Button>
            <Button
              variant="outlined" color="error" size="small"
              startIcon={<DeleteSweepIcon />}
              disabled={selectedCount === 0}
              onClick={deleteSelected}
            >
              Delete{selectedCount > 0 ? ` (${selectedCount})` : ""}
            </Button>
            <Button
              variant="outlined" color="warning" size="small"
              startIcon={<LayersClearIcon />}
              onClick={clearTable}
            >
              Clear table
            </Button>
          </Box>

          <Box sx={{ flex: 1, p: 2, minHeight: 0 }}>
            <div className="ag-theme-material" style={{ height: "100%", width: "100%", fontSize: 12 }}>
              <AgGridReact
                ref={gridRef}
                rowData={rows}
                columnDefs={groupedCols}
                rowSelection="multiple"
                suppressRowClickSelection
                singleClickEdit
                stopEditingWhenCellsLoseFocus
                tooltipShowDelay={0}
                onSelectionChanged={(e) => setSelectedCount(e.api.getSelectedNodes().length)}
                onCellValueChanged={(e) => {
                  const next = [...rows];
                  next[e.node.rowIndex!] = { ...next[e.node.rowIndex!], [e.colDef.field!]: e.newValue };
                  setRows(next); persist(next);
                  if (e.node.rowIndex === 0) {
                    try {
                      const existing = JSON.parse(localStorage.getItem(SHARED_KEY) ?? "{}");
                      localStorage.setItem(SHARED_KEY,
                        JSON.stringify({ ...existing, [e.colDef.field!]: e.newValue }));
                    } catch {}
                  }
                }}
              />
            </div>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Required: innovation_id, region, country, innovation_name, innovation_type.
              Dropdown cells must match the controlled vocabulary; URLs must start with http(s)://.
            </Typography>
          </Box>
          </>)}
        </Box>
      </Box>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)}>{snack.text}</Alert> : undefined}
      </Snackbar>

      <style jsx global>{`
        ${Object.entries(GROUP_COLOURS).map(([g, c]) =>
          `.ag-theme-material .grp-${g.replace(/[^a-z]/gi, "")} { background:${c} !important; color:#fff !important; font-weight:600; }`
        ).join("\n")}
      `}</style>
    </Box>
  );
}
