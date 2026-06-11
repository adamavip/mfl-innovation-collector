"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AppBar, Box, Button, Chip, Snackbar, ToggleButton, ToggleButtonGroup,
  Toolbar, Typography, Alert, CircularProgress,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditNoteIcon from "@mui/icons-material/EditNote";
import TableRowsIcon from "@mui/icons-material/TableRows";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import InventoryOutlinedIcon from "@mui/icons-material/InventoryOutlined";
import { FormMode } from "@/components/FormMode";
import { WelcomeView } from "@/components/WelcomeView";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ColGroupDef } from "ag-grid-community";

import { supabase } from "@/lib/supabase";
import { COLS, GROUP_COLOURS, RowData } from "@/lib/taxonomy";
import { SidePanel } from "@/components/SidePanel";
import { INK, INK_SOFT, INDIGO, HAIRLINE, DISPLAY, Logo } from "@/lib/folio";

const SHARED_KEY = "mfl-shared-record";   // single record, shared with form mode
const EDITING_KEY = "mfl-editing-id";
const ACTIVE_DRAFT_KEY = "mfl-active-draft-id";

type Submitted = RowData & {
  id: string;
  submitted_at: string;
  extras?: { attachments?: any[]; geometry?: any } | null;
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function Dashboard() {
  const router = useRouter();
  const gridRef = useRef<AgGridReact>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [snack, setSnack] = useState<{ severity: "success" | "error" | "warning" | "info"; text: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [mode, setMode] = useState<"home" | "grid" | "form">("home");
  const [formKey, setFormKey] = useState(0);   // bump to force <FormMode> remount
  const [profile, setProfile] = useState<{ first_name?: string | null; last_name?: string | null } | null>(null);

  // Submitted innovations — the read-only recap shown in the Grid tab.
  const [submitted, setSubmitted] = useState<Submitted[]>([]);
  const [loadingGrid, setLoadingGrid] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { router.replace("/login"); return; }
      setEmail(data.user.email ?? null);
      // Fetch the mirrored profile row created on signup. Falls back gracefully
      // if the row isn't there yet (legacy users) — greeting will use email.
      const { data: p } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", data.user.id)
        .maybeSingle();
      if (p) setProfile(p);
    })();
  }, [router]);

  // Load the recap of submitted innovations whenever the workspace changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingGrid(true);
      const { data } = await supabase
        .from("innovations")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (cancelled) return;
      setSubmitted((data ?? []) as Submitted[]);
      setLoadingGrid(false);
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const columnDefs = useMemo<(ColDef | ColGroupDef)[]>(() => {
    const submittedCol: ColDef = {
      headerName: "Submitted",
      field: "submitted_at",
      width: 130,
      pinned: "left",
      valueFormatter: (p: any) => fmtDate(p.value),
      sort: "desc",
    };

    const groups: Record<string, ColDef[]> = {};
    for (const c of COLS) {
      (groups[c.group] ||= []).push({
        field: c.field,
        headerName: c.field,
        width: c.width,
      });
    }
    const grouped: ColGroupDef[] = Object.entries(groups).map(([g, children]) => ({
      headerName: g.toUpperCase(),
      headerClass: `grp-${g.replace(/[^a-z]/gi, "")}`,
      children,
    }));

    return [submittedCol, ...grouped];
  }, []);

  // Open a submitted innovation in the form for edit/update.
  function loadInnovation(innov: any) {
    const recForForm: Record<string, unknown> = {};
    for (const c of COLS) recForForm[c.field] = (innov as any)[c.field] ?? "";
    // numeric → string for the form's TextField inputs
    for (const k of [
      "latitude", "longitude",
      "start_year_tested", "end_year_tested",
      "start_year_validated", "end_year_validated",
      "nb_actors_test_innovations", "nb_actors_validation",
    ]) {
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

  function exportCsv() {
    if (!submitted.length) { setSnack({ severity: "info", text: "Nothing to export yet" }); return; }
    gridRef.current?.api?.exportDataAsCsv({ fileName: `mfl-innovations-${new Date().toISOString().slice(0, 10)}.csv` });
  }

  // Welcome-view callbacks
  function startNewInnovation() {
    try {
      localStorage.removeItem(SHARED_KEY);
      localStorage.removeItem(EDITING_KEY);
      localStorage.removeItem(ACTIVE_DRAFT_KEY);
    } catch {}
    setMode("form");
    setFormKey(k => k + 1);
  }

  function resumeDraft(d: { id: string; name: string; rows?: any[] }) {
    if (!d.rows?.[0]) { startNewInnovation(); return; }
    try {
      localStorage.setItem(SHARED_KEY, JSON.stringify(d.rows[0]));
      localStorage.setItem(ACTIVE_DRAFT_KEY, d.id);
      localStorage.removeItem(EDITING_KEY);
    } catch {}
    setMode("form");
    setFormKey(k => k + 1);
  }

  function changeMode(newMode: "home" | "grid" | "form") {
    if (newMode === mode) return;
    if (newMode === "form") setFormKey(k => k + 1);
    setMode(newMode);
  }

  async function signOut() { await supabase.auth.signOut(); router.push("/"); }

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: "#fff",
          color: INK,
          borderBottom: `1px solid ${HAIRLINE}`,
          zIndex: (t) => t.zIndex.drawer + 1,
        }}
      >
        <Toolbar variant="dense" sx={{ gap: 2, minHeight: 60 }}>
          <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }} aria-label="Home">
            <Logo />
          </Link>

          <Box sx={{ flexGrow: 1 }} />

          <ToggleButtonGroup
            value={mode}
            exclusive
            size="small"
            onChange={(_, v) => v && changeMode(v)}
            sx={{
              bgcolor: "rgba(22,19,58,0.05)",
              borderRadius: 999,
              p: 0.5,
              gap: 0.5,
              "& .MuiToggleButton-root": {
                border: 0,
                borderRadius: "999px !important",
                color: INK_SOFT,
                fontFamily: DISPLAY,
                fontWeight: 700,
                textTransform: "none",
                px: 1.75, py: 0.4,
                "&:hover": { bgcolor: "rgba(22,19,58,0.06)" },
                "&.Mui-selected": {
                  color: "#fff",
                  bgcolor: INDIGO,
                  "&:hover": { bgcolor: INDIGO },
                },
              },
            }}
          >
            <ToggleButton value="home"><HomeOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} />Home</ToggleButton>
            <ToggleButton value="form"><EditNoteIcon fontSize="small" sx={{ mr: 0.5 }} />Form</ToggleButton>
            <ToggleButton value="grid"><TableRowsIcon fontSize="small" sx={{ mr: 0.5 }} />Grid</ToggleButton>
          </ToggleButtonGroup>

          <Box sx={{ flexGrow: 1 }} />

          <Typography
            variant="caption"
            sx={{ color: INK_SOFT, fontWeight: 600, mr: 0.5, display: { xs: "none", sm: "block" }, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {email}
          </Typography>
          <Button
            size="small"
            onClick={signOut}
            sx={{
              borderRadius: 999,
              px: 2,
              fontFamily: DISPLAY,
              fontWeight: 700,
              color: INK,
              border: "1.5px solid rgba(22,19,58,0.16)",
              "&:hover": { borderColor: INK, bgcolor: "transparent" },
            }}
          >
            Sign out
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        <SidePanel
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(o => !o)}
          onLoadDraft={resumeDraft}
          onLoadInnovation={loadInnovation}
          reloadKey={reloadKey}
        />

        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {mode === "home" ? (
            <Box sx={{ flex: 1, overflow: "auto", bgcolor: "background.default" }}>
              <WelcomeView
                firstName={profile?.first_name ?? null}
                email={email}
                reloadKey={reloadKey}
                onNew={startNewInnovation}
                onBrowse={() => changeMode("grid")}
                onResumeDraft={resumeDraft}
                onEditInnovation={(s) => loadInnovation(s)}
              />
            </Box>
          ) : mode === "form" ? (
            <Box sx={{ flex: 1, overflow: "auto", bgcolor: "background.default" }}>
              <FormMode key={formKey} onDone={() => { setReloadKey(k => k + 1); setMode("home"); }} />
            </Box>
          ) : (<>
          <Box sx={{ p: 2, display: "flex", gap: 1.5, alignItems: "center", borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
            <InventoryOutlinedIcon fontSize="small" sx={{ color: "primary.main" }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.main" }}>
              Submitted innovations
            </Typography>
            <Chip
              size="small"
              label={loadingGrid ? "…" : `${submitted.length}`}
              sx={{ height: 20, fontWeight: 600 }}
            />
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1, display: { xs: "none", md: "block" } }}>
              Double-click a row to edit it in the form
            </Typography>
            <Button
              variant="outlined" size="small" startIcon={<RefreshIcon />}
              onClick={() => setReloadKey(k => k + 1)}
            >
              Refresh
            </Button>
            <Button
              variant="outlined" size="small" startIcon={<FileDownloadOutlinedIcon />}
              onClick={exportCsv}
              disabled={loadingGrid || submitted.length === 0}
            >
              Export CSV
            </Button>
            <Button
              variant="contained" size="small" startIcon={<AddCircleOutlineIcon />}
              onClick={startNewInnovation}
            >
              New innovation
            </Button>
          </Box>

          <Box sx={{ flex: 1, p: 2, minHeight: 0 }}>
            {loadingGrid ? (
              <Box sx={{ height: "100%", display: "grid", placeItems: "center" }}>
                <CircularProgress />
              </Box>
            ) : submitted.length === 0 ? (
              <Box sx={{ height: "100%", display: "grid", placeItems: "center", textAlign: "center" }}>
                <Box>
                  <InventoryOutlinedIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
                  <Typography sx={{ fontWeight: 600, color: "text.secondary" }}>No submissions yet</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                    Submitted innovations will appear here as a reviewable table.
                  </Typography>
                  <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={startNewInnovation}>
                    Start your first innovation
                  </Button>
                </Box>
              </Box>
            ) : (
              <div className="ag-theme-material" style={{ height: "100%", width: "100%", fontSize: 12 }}>
                <AgGridReact
                  ref={gridRef}
                  rowData={submitted}
                  columnDefs={columnDefs}
                  defaultColDef={{ sortable: true, filter: true, resizable: true, minWidth: 90 }}
                  tooltipShowDelay={0}
                  onRowDoubleClicked={(e) => e.data && loadInnovation(e.data)}
                />
              </div>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Read-only recap of everything you’ve submitted. Sort and filter any column; double-click a row to reopen it in the form for editing.
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
