"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, AlertTitle, Autocomplete, Box, Button, Card, CardContent, Chip, CircularProgress,
  Collapse, Divider, Fade, FormControl, FormHelperText, IconButton, InputLabel, LinearProgress,
  Link as MuiLink, MenuItem, Paper, Select, Snackbar, Stack, Step, StepButton, Stepper, Table,
  TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import AddIcon from "@mui/icons-material/Add";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import { getNames } from "country-list";

import { supabase } from "@/lib/supabase";
import { COLS, taxonomy } from "@/lib/taxonomy";
import { LEAD_ORGANISATIONS, MAX_FILE_BYTES, ACCEPTED_FILES } from "@/lib/formTaxonomy";
import dynamic from "next/dynamic";

const GeographyWidget = dynamic(() => import("./GeographyWidget").then(m => m.GeographyWidget), { ssr: false });
const COUNTRIES = getNames().sort();
const BUCKET = "mfl";
const MAX_FILE_MB = Math.round(MAX_FILE_BYTES / 1024 / 1024);
const MB_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

// Split a pipe-delimited multi-value string. Comma is NOT a delimiter here —
// country names ("Korea, Republic of") and place names ("Machakos, Kenya")
// contain commas.
const splitPipe = (s: string) => (s ? s.split(/\s*\|\s*/).map(x => x.trim()).filter(Boolean) : []);

// Merge one named Point feature per geolocated site into a FeatureCollection,
// replacing any previous site-derived points but keeping features the user drew.
type GeoFC = { type: "FeatureCollection"; features: any[] };
function withSitePoints(geometry: GeoFC | null, sites: { name: string; center: [number, number] }[]): GeoFC | null {
  const others = (geometry?.features ?? []).filter((f: any) => f?.properties?.source !== "site");
  const points = sites.map((s, i) => ({
    type: "Feature",
    id: `site-${Date.now()}-${i}`,
    properties: { name: s.name, source: "site" },
    geometry: { type: "Point", coordinates: [s.center[0], s.center[1]] },
  }));
  const features = [...others, ...points];
  return features.length ? { type: "FeatureCollection", features } : null;
}

// External reference links — provided once, reused via helpText helpers.
const LINKS = {
  koppen: "https://en.wikipedia.org/wiki/K%C3%B6ppen_climate_classification",
  decimalDegrees: "https://www.fcc.gov/media/radio/dms-decimal",
  agro: "https://obofoundry.org/ontology/agro.html",
  envo: "https://obofoundry.org/ontology/envo.html",
  agrovoc: "https://www.fao.org/agrovoc/",
  to: "https://obofoundry.org/ontology/to.html",
  ncbitaxon: "https://obofoundry.org/ontology/ncbitaxon.html",
} as const;

interface Attachment {
  filename: string;
  mime_type: string;
  size_bytes: number;
  path: string;
  description?: string;
}

export interface FormState {
  innovation_id: string;
  innovation_name: string;
  innovation_description: string;
  innovation_type: string;
  innovation_scale: string;
  scaling_readiness_level: string;
  keywords: string;
  region: string;
  country: string;
  site_name: string;
  climate_class: string;
  latitude: string;
  longitude: string;
  production_system: string;
  thematic_area: string;
  challenge_category: string;
  challenge_description: string;
  indicators_measured: string;
  data_collected: string;
  data_repository_url: string;          // stored pipe-separated
  innovation_description_url: string;   // stored pipe-separated
  link_another_aow: string;
  start_year_tested: string;
  end_year_tested: string;
  nb_actors_test_innovations: string;
  actors_tested: string;
  start_year_validated: string;
  end_year_validated: string;
  nb_actors_validation: string;
  actors_validated: string;
  scaling_readiness_validation: string;
  focal_point_name: string;
  focal_point_email: string;
  lead_organisation: string;
  co_developers: string;
  implementing_partners: string;
  sdg: string;
  sdg_secondary: string;
  sdg_tertiary: string;
  cgiar_food_security: string;
  cgiar_improved_livelihoods: string;
  cgiar_gender_equality: string;
  cgiar_environment_biodiversity: string;
  cgiar_climate_change: string;
  barriers_to_scaling: string;
  success_factors: string;
  general_comments: string;
  form_feedback: string;
  attachments: Attachment[];
  has_additional_geo: "" | "Y" | "N";
  geometry: { type: "FeatureCollection"; features: any[] } | null;
}

const STEPS = [
  "Identification",
  "Site & geography",
  "Challenge & data",
  "Testing & validation",
  "Organisations",
  "Impact & SDGs",
  "Adoption",
  "Raw data & comments",
  "Review",
];

const REQUIRED: (keyof FormState)[] = [
  "innovation_id", "innovation_name", "region", "country", "innovation_description", "innovation_type",
  "innovation_description_url",
];

const initialState = (): FormState => ({
  innovation_id: crypto.randomUUID(),
  innovation_name: "",
  innovation_description: "", innovation_type: "", innovation_scale: "", scaling_readiness_level: "",
  keywords: "",
  region: "", country: "", site_name: "", climate_class: "", latitude: "", longitude: "",
  production_system: "",
  thematic_area: "",
  challenge_category: "", challenge_description: "", indicators_measured: "",
  data_collected: "", data_repository_url: "", innovation_description_url: "", link_another_aow: "",
  start_year_tested: "", end_year_tested: "", nb_actors_test_innovations: "", actors_tested: "",
  start_year_validated: "", end_year_validated: "", nb_actors_validation: "", actors_validated: "", scaling_readiness_validation: "",
  focal_point_name: "", focal_point_email: "", lead_organisation: "", co_developers: "", implementing_partners: "",
  sdg: "", sdg_secondary: "", sdg_tertiary: "",
  cgiar_food_security: "", cgiar_improved_livelihoods: "", cgiar_gender_equality: "",
  cgiar_environment_biodiversity: "", cgiar_climate_change: "",
  barriers_to_scaling: "", success_factors: "",
  general_comments: "", form_feedback: "",
  attachments: [],
  has_additional_geo: "",
  geometry: null,
});

const DRAFT_KEY        = "mfl-shared-record";
const EDITING_KEY      = "mfl-editing-id";
const ACTIVE_DRAFT_KEY = "mfl-active-draft-id";
const INTRO_KEY        = "mfl-intro-dismissed";

// ── Storage folder layout ────────────────────────────────────────────────────
// firstname_lastname_userid / innovationname_innovationid / {geometries|data} / <file>
function slugify(s: string): string {
  return (s || "")
    .normalize("NFKD")                          // decompose accents; the alnum filter below drops the marks
    .trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function recordFolder(user: any, state: FormState): string {
  const who = [slugify(user?.user_metadata?.first_name ?? ""), slugify(user?.user_metadata?.last_name ?? "")]
    .filter(Boolean).join("_") || "user";
  const person     = `${who}_${user?.id ?? "unknown"}`;
  const innovation = `${slugify(state.innovation_name) || "innovation"}_${state.innovation_id}`;
  return `${person}/${innovation}`;
}

// The folder is derived from the innovation name, so it must be set before any
// file can be filed. (User id and innovation id are always present.)
function uploadBlockReason(state: FormState): string | null {
  if (!state.innovation_name.trim())
    return "Add a short innovation name (Identification step) before uploading files.";
  return null;
}

export function FormMode({ onDone }: { onDone?: () => void }) {
  const [state, setState] = useState<FormState>(initialState);
  const [activeStep, setActiveStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [submitStage, setSubmitStage] = useState("");
  const [snack, setSnack] = useState<{ severity: "success" | "error" | "info"; text: string } | null>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [introOpen, setIntroOpen] = useState(true);

  useEffect(() => {
    setEditingId(localStorage.getItem(EDITING_KEY));
    const armedDraft = localStorage.getItem(ACTIVE_DRAFT_KEY);
    if (armedDraft) setActiveDraftId(armedDraft);
    setIntroOpen(localStorage.getItem(INTRO_KEY) !== "1");
    const local = localStorage.getItem(DRAFT_KEY);
    if (!local) return;
    try {
      const parsed = JSON.parse(local) as Record<string, unknown>;
      const fresh = initialState();
      const clean = { ...fresh } as FormState;
      for (const k of Object.keys(fresh) as (keyof FormState)[]) {
        if (k in parsed) (clean as any)[k] = parsed[k];
      }
      clean.attachments = Array.isArray(parsed.attachments) ? parsed.attachments as Attachment[] : [];
      setState(clean);
    } catch {}
  }, []);

  function persistLocal(s: FormState) {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(s)); return; }
    catch {}
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...s, geometry: null })); } catch {}
  }

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setState(prev => {
      const next = { ...prev, [k]: v };
      persistLocal(next);
      return next;
    });
  }

  const missing = useMemo(
    () => REQUIRED.filter(k => !String(state[k] ?? "").trim()),
    [state],
  );

  async function uploadGeometry(folder: string,
                                geometry: { type: "FeatureCollection"; features: any[] }) {
    const blob = new Blob([JSON.stringify(geometry, null, 2)], { type: "application/geo+json" });
    const path = `${folder}/geometries/geometry.geojson`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: "application/geo+json", upsert: true,
    });
    return error ? null : path;
  }

  // Store the original geospatial upload (.geojson/.json/.zip) in the mfl bucket
  // as an attachment, alongside the parsed geometry.geojson.
  async function handleGeoSource(file: File) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSnack({ severity: "error", text: "Sign in expired — refresh the page." }); return; }
    const block = uploadBlockReason(state);
    if (block) { setSnack({ severity: "error", text: block }); return; }
    if (file.size > MAX_FILE_BYTES) {
      setSnack({ severity: "error", text: `${file.name}: exceeds ${MAX_FILE_MB} MB — parsed geometry was kept, but the source file wasn't stored.` });
      return;
    }
    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const path = `${recordFolder(u.user, state)}/geometries/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || "application/octet-stream", upsert: false,
    });
    if (error) { setSnack({ severity: "error", text: `${file.name}: ${error.message}` }); return; }
    set("attachments", [
      ...(state.attachments ?? []),
      { filename: file.name, mime_type: file.type, size_bytes: file.size, path, description: "Source geometry file" },
    ]);
    setSnack({ severity: "success", text: `${file.name} stored with the record` });
  }

  async function saveDraft() {
    setBusy(true);
    persistLocal(state);
    const { data: u } = await supabase.auth.getUser();
    let geometryPath: string | null = null;
    if (u.user && state.geometry && state.geometry.features?.length) {
      geometryPath = await uploadGeometry(recordFolder(u.user, state), state.geometry);
    }
    if (u.user) {
      const draftRow = { __form_mode: true, ...state, ...(geometryPath ? { geometry_file_path: geometryPath } : {}) };
      if (activeDraftId) {
        await supabase.from("drafts").update({ rows: [draftRow], updated_at: new Date().toISOString() }).eq("id", activeDraftId);
      } else {
        const { data } = await supabase.from("drafts").insert({
          user_id: u.user.id,
          name: `Form · ${state.innovation_description?.slice(0, 60) || state.innovation_id.slice(0, 8)}`,
          rows: [draftRow],
        }).select().single();
        if (data) {
          setActiveDraftId(data.id);
          try { localStorage.setItem(ACTIVE_DRAFT_KEY, data.id); } catch {}
        }
      }
    }
    setSnack({
      severity: "success",
      text: geometryPath ? "Draft saved · geometry uploaded to mfl bucket" : "Draft saved",
    });
    setBusy(false);
  }

  async function submit() {
    if (missing.length) { setSnack({ severity: "error", text: `Required: ${missing.join(", ")}` }); return; }
    setBusy(true);
    setSubmitStage("Preparing…");
    const { data: u } = await supabase.auth.getUser();

    const { attachments = [], geometry = null, has_additional_geo,
            latitude, longitude,
            start_year_tested, end_year_tested,
            start_year_validated, end_year_validated,
            nb_actors_test_innovations, nb_actors_validation,
            ...rest } = state;
    const extras: Record<string, unknown> = {};
    if (attachments.length) extras.attachments = attachments;
    let geoUploadedTo: string | null = null;
    if (geometry && geometry.features?.length) {
      extras.geometry = geometry;
      if (u.user) {
        setSubmitStage("Uploading geometry…");
        const path = await uploadGeometry(recordFolder(u.user, state), geometry);
        if (path) { extras.geometry_file_path = path; geoUploadedTo = path; }
      }
    }
    const payload = {
      ...rest,
      latitude:  latitude  ? Number(latitude)  : null,
      longitude: longitude ? Number(longitude) : null,
      start_year_tested:          start_year_tested          ? Number(start_year_tested)          : null,
      end_year_tested:            end_year_tested            ? Number(end_year_tested)            : null,
      start_year_validated:       start_year_validated       ? Number(start_year_validated)       : null,
      end_year_validated:         end_year_validated         ? Number(end_year_validated)         : null,
      nb_actors_test_innovations: nb_actors_test_innovations ? Number(nb_actors_test_innovations) : null,
      nb_actors_validation:       nb_actors_validation       ? Number(nb_actors_validation)       : null,
      extras: Object.keys(extras).length ? extras : null,
    };

    const isEditing = !!editingId;
    setSubmitStage(isEditing ? "Updating…" : "Submitting…");
    const { error } = isEditing
      ? await supabase.from("innovations").update(payload).eq("id", editingId!)
      : await supabase.from("innovations").insert({ ...payload, user_id: u.user?.id });

    if (!error && activeDraftId && !isEditing) {
      setSubmitStage("Cleaning up draft…");
      await supabase.from("drafts").delete().eq("id", activeDraftId);
    }
    setBusy(false);
    setSubmitStage("");
    if (error) { setSnack({ severity: "error", text: error.message }); return; }
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(EDITING_KEY);
    localStorage.removeItem(ACTIVE_DRAFT_KEY);
    setSnack({
      severity: "success",
      text: (isEditing ? "Innovation updated" : "Innovation submitted")
            + (geoUploadedTo ? " · geometry → mfl/" + geoUploadedTo.split("/").pop() : ""),
    });
    setState(initialState()); setActiveStep(0); setActiveDraftId(null); setEditingId(null);
    onDone?.();
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto", p: 3 }}>
      <Collapse in={introOpen}>
        <IntroPanel onDismiss={() => { setIntroOpen(false); try { localStorage.setItem(INTRO_KEY, "1"); } catch {} }} />
      </Collapse>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }} nonLinear>
        {STEPS.map((label, i) => (
          <Step key={label} completed={i < activeStep}>
            <StepButton onClick={() => setActiveStep(i)}>{label}</StepButton>
          </Step>
        ))}
      </Stepper>

      <Card variant="outlined" sx={{ position: "relative", overflow: "hidden" }}>
        <Fade in={busy} timeout={180} unmountOnExit>
          <LinearProgress sx={{
            position: "absolute", top: 0, left: 0, right: 0, height: 3, zIndex: 2,
            bgcolor: "transparent",
            "& .MuiLinearProgress-bar": { bgcolor: "success.main" },
          }} />
        </Fade>
        <CardContent sx={{ p: 4 }}>
          {activeStep === 0 && <IdentificationStep state={state} set={set} />}
          {activeStep === 1 && <SiteStep state={state} set={set} onGeoSource={handleGeoSource} />}
          {activeStep === 2 && <ChallengeAndDataStep state={state} set={set} />}
          {activeStep === 3 && <TestingValidationStep state={state} set={set} />}
          {activeStep === 4 && <OrganisationsStep state={state} set={set} />}
          {activeStep === 5 && <ImpactStep state={state} set={set} />}
          {activeStep === 6 && <AdoptionStep state={state} set={set} />}
          {activeStep === 7 && <RawDataStep state={state} set={set} />}
          {activeStep === 8 && <ReviewStep state={state} missing={missing} />}
        </CardContent>
      </Card>

      <Stack direction="row" gap={1.5} mt={3} alignItems="center" flexWrap="wrap">
        <Button onClick={() => setActiveStep(s => Math.max(0, s - 1))} disabled={activeStep === 0 || busy}>Back</Button>
        {activeStep < STEPS.length - 1 ? (
          <Button variant="contained" onClick={() => setActiveStep(s => Math.min(STEPS.length - 1, s + 1))} disabled={busy}>Next</Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            onClick={submit}
            disabled={busy || missing.length > 0}
            startIcon={busy ? <CircularProgress size={16} thickness={5} sx={{ color: "currentColor" }} /> : undefined}
          >
            {busy ? submitStage || "Submitting…" : (editingId ? "Update innovation" : "Submit innovation")}
          </Button>
        )}
        {editingId && (
          <Button variant="text" color="warning" onClick={() => {
            if (!confirm("Discard edit and start a new innovation?")) return;
            localStorage.removeItem(EDITING_KEY);
            localStorage.removeItem(DRAFT_KEY);
            localStorage.removeItem(ACTIVE_DRAFT_KEY);
            setState(initialState()); setEditingId(null); setActiveDraftId(null); setActiveStep(0);
          }} disabled={busy}>
            Cancel edit
          </Button>
        )}
        <Box sx={{ flexGrow: 1 }} />
        {editingId && <Chip color="warning" size="small" label="Editing existing innovation" />}
        <Button variant="outlined" onClick={saveDraft} disabled={busy || !!editingId}
          startIcon={busy && !submitStage ? <CircularProgress size={14} thickness={5} sx={{ color: "currentColor" }} /> : undefined}
        >
          {activeDraftId ? "Update draft" : "Save draft"}
        </Button>
        {missing.length > 0 && (
          <Chip color="warning" size="small" label={`${missing.length} required missing`} />
        )}
      </Stack>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)}>{snack.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}

// ─── Shared building blocks ─────────────────────────────────────────────────

interface StepProps { state: FormState; set: <K extends keyof FormState>(k: K, v: FormState[K]) => void }

function IntroPanel({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Alert
      severity="info"
      icon={<LightbulbOutlinedIcon />}
      onClose={onDismiss}
      sx={{ mb: 3, "& .MuiAlert-message": { width: "100%" } }}
    >
      <AlertTitle sx={{ fontWeight: 700 }}>Before you start</AlertTitle>
      <Typography variant="body2" sx={{ mb: 1 }}>
        This form captures one MFL innovation record at a time. It writes directly to the central Supabase
        database; uploads (raw data, geometry) go to the <code>mfl</code> Storage bucket. You can{" "}
        <strong>save drafts</strong> at any step and resume later — drafts are stored against your account.
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        <strong>Required fields</strong> are marked with <Box component="span" sx={{ color: "error.main" }}>*</Box>{" "}
        — innovation ID, region, country, innovation description, and innovation type. Dropdowns must match the
        controlled vocabulary; pick <em>Other (specify)</em> when nothing fits and add your value inline.
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        For free-text fields (challenge, indicators, descriptions), prefer terms from recognised ontologies:{" "}
        <MuiLink href={LINKS.agro}    target="_blank" rel="noopener">AGRO</MuiLink>,{" "}
        <MuiLink href={LINKS.envo}    target="_blank" rel="noopener">ENVO</MuiLink>,{" "}
        <MuiLink href={LINKS.to}      target="_blank" rel="noopener">TO</MuiLink>,{" "}
        <MuiLink href={LINKS.agrovoc} target="_blank" rel="noopener">AGROVOC</MuiLink>,{" "}
        <MuiLink href={LINKS.ncbitaxon} target="_blank" rel="noopener">NCBITaxon</MuiLink>.
      </Typography>
      <Typography variant="body2">
        Not sure what a field or category means?{" "}
        <MuiLink href="/guide" target="_blank" rel="noopener" sx={{ fontWeight: 700 }}>
          Open the field guide
        </MuiLink>{" "}
        for definitions and examples of every field and option.
      </Typography>
    </Alert>
  );
}

function SectionTitle({ n, title, subtitle }: { n: string; title: string; subtitle?: string }) {
  return (
    <Box mb={3}>
      <Typography variant="overline" color="primary">Section {n}</Typography>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>{title}</Typography>
      {subtitle && <Typography variant="body2" color="text.secondary" mt={0.5}>{subtitle}</Typography>}
    </Box>
  );
}

function HelpTip({ text }: { text: React.ReactNode }) {
  return (
    <Tooltip title={text} arrow placement="top">
      <HelpOutlineIcon fontSize="small" sx={{ color: "text.secondary", fontSize: 16, ml: 0.5, verticalAlign: "middle", cursor: "help" }} />
    </Tooltip>
  );
}

/** Dropdown that always offers an "Other (specify)" option at the bottom. */
function SelectWithOther({
  label, required, value, onChange, options, helperText, descriptions,
}: {
  label: string; required?: boolean; value: string;
  onChange: (next: string) => void; options: readonly string[]; helperText?: React.ReactNode;
  /** Optional per-option subline shown inside the dropdown, not in the closed selector. */
  descriptions?: Record<string, string>;
}) {
  const isOther = value === "Other" || value.startsWith("Other:");
  const otherText = value.startsWith("Other:") ? value.replace(/^Other:\s*/, "") : "";
  const selectValue = isOther ? "Other" : (options.includes(value) ? value : "");
  return (
    <Box>
      <FormControl size="small" fullWidth required={required}>
        <InputLabel>{label}{required ? " *" : ""}</InputLabel>
        <Select
          label={`${label}${required ? " *" : ""}`} value={selectValue}
          renderValue={(v) => (v === "Other" ? "Other (specify)" : (v as string))}
          onChange={(e) => {
            const v = e.target.value as string;
            if (v === "Other") onChange("Other");
            else onChange(v);
          }}
        >
          {options.map(o => (
            <MenuItem key={o} value={o} sx={{ alignItems: "flex-start", py: 1 }}>
              <Box sx={{ display: "flex", flexDirection: "column", whiteSpace: "normal", lineHeight: 1.3 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{o}</Typography>
                {descriptions?.[o] && (
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", maxWidth: 480 }}>
                    {descriptions[o]}
                  </Typography>
                )}
              </Box>
            </MenuItem>
          ))}
          <MenuItem value="Other" sx={{ py: 1 }}><em>Other (specify)</em></MenuItem>
        </Select>
        {helperText && <FormHelperText>{helperText}</FormHelperText>}
      </FormControl>
      <Collapse in={isOther} timeout={180} unmountOnExit>
        <TextField
          autoFocus size="small" fullWidth sx={{ mt: 1 }} placeholder="Specify…"
          value={otherText}
          onChange={(e) => onChange(`Other: ${e.target.value}`)}
        />
      </Collapse>
    </Box>
  );
}

const URL_RE = /^https?:\/\//i;
const isInvalidUrl = (u: string) => u.trim().length > 0 && !URL_RE.test(u.trim());

/** A list of URL inputs persisted as a single pipe-separated string in `value`. */
function MultiUrlField({
  label, value, onChange, placeholder, helperText,
}: {
  label: string; value: string; onChange: (next: string) => void;
  placeholder?: string; helperText?: React.ReactNode;
}) {
  const urls = value ? value.split(" | ").map(s => s.trim()) : [""];
  const setIdx = (i: number, v: string) => {
    const next = [...urls]; next[i] = v;
    onChange(next.filter(s => s.length > 0).join(" | "));
  };
  const remove = (i: number) => {
    const next = urls.filter((_, j) => j !== i);
    onChange(next.filter(s => s.length > 0).join(" | "));
  };
  const add = () => onChange([...urls, ""].filter(s => s.length > 0).join(" | "));
  const anyInvalid = urls.some(isInvalidUrl);
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
        {label}
      </Typography>
      <Stack gap={1}>
        {(urls.length ? urls : [""]).map((u, i) => {
          const invalid = isInvalidUrl(u);
          return (
            <Stack key={i} direction="row" gap={1} alignItems="flex-start">
              <TextField
                size="small" fullWidth value={u}
                onChange={(e) => setIdx(i, e.target.value)}
                placeholder={placeholder ?? "https://…"}
                type="url"
                error={invalid}
                helperText={invalid ? "URL must start with http:// or https://" : " "}
              />
              <IconButton size="small" onClick={() => remove(i)} disabled={urls.length <= 1 && !u} sx={{ mt: 0.5 }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          );
        })}
        <Box>
          <Button size="small" startIcon={<AddIcon />} onClick={add} variant="text" disabled={anyInvalid}>
            Add another URL
          </Button>
        </Box>
        {helperText && <FormHelperText sx={{ mx: 0 }}>{helperText}</FormHelperText>}
      </Stack>
    </Box>
  );
}

/** Reusable up-to-N multi-select autocomplete for pipe-separated text columns. */
function MultiSelectField({
  label, options, value, onChange, max, helperText, allowOther = true,
}: {
  label: string; options: readonly string[]; value: string;
  onChange: (next: string) => void; max?: number;
  helperText?: React.ReactNode; allowOther?: boolean;
}) {
  const selected = value ? value.split(" | ").map(s => s.trim()).filter(Boolean) : [];
  const opts = allowOther ? [...options, "Other"] : [...options];
  return (
    <Autocomplete
      multiple freeSolo={allowOther} size="small"
      options={opts}
      value={selected}
      onChange={(_, v) => {
        const next = max ? (v as string[]).slice(0, max) : (v as string[]);
        onChange(next.join(" | "));
      }}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => (
          <Chip variant="outlined" size="small" label={option} {...getTagProps({ index })} key={`${option}-${index}`} />
        ))
      }
      renderInput={(p) => (
        <TextField {...p} label={label} helperText={helperText}
                   placeholder={max ? `Type or pick — up to ${max}` : "Type or pick"} />
      )}
    />
  );
}

/** Keywords field with live AGROVOC term lookup. Stores pipe-separated labels;
 *  users pick standardised terms or type their own. */
function KeywordsField({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const selected = value ? value.split(/\s*[|,]\s*/).map(s => s.trim()).filter(Boolean) : [];
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = input.trim();
    if (q.length < 2) { setOptions([]); setLoading(false); return; }
    let active = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/agrovoc?q=${encodeURIComponent(q)}`);
        const data = await r.json();
        if (!active) return;
        setOptions((data.results ?? []).map((x: any) => x.label as string));
      } catch {
        if (active) setOptions([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [input]);

  return (
    <Autocomplete
      multiple freeSolo autoHighlight size="small"
      options={options}
      filterOptions={(x) => x}          // server already matched; don't re-filter
      value={selected}
      inputValue={input}
      onInputChange={(_, v) => setInput(v)}
      loading={loading}
      onChange={(_, v) => onChange((v as string[]).map(s => s.trim()).filter(Boolean).join(" | "))}
      renderTags={(vals, getTagProps) =>
        vals.map((option, index) => (
          <Chip variant="outlined" size="small" label={option} {...getTagProps({ index })} key={`${option}-${index}`} />
        ))
      }
      renderInput={(p) => (
        <TextField
          {...p}
          label="keywords"
          placeholder="Search AGROVOC — e.g. maize, agroforestry…"
          helperText={
            <>
              Start typing to search{" "}
              <MuiLink href={LINKS.agrovoc} target="_blank" rel="noopener">AGROVOC</MuiLink>{" "}
              and pick the matching term. Enter the term <strong>label</strong> (e.g. “maize”), not the URI —
              you can also type your own keyword and press Enter.
            </>
          }
          InputProps={{
            ...p.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={16} thickness={5} sx={{ mr: 1 }} /> : null}
                {p.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

/** Multi-site picker backed by Mapbox geocoding. Names are filled from Mapbox,
 *  and selecting a site reports its centre so the caller can set the primary
 *  latitude/longitude. Falls back to free text when the token/API is missing. */
function SitesField({
  value, onPick,
}: { value: string; onPick: (sites: { name: string; center: [number, number] | null }[]) => void }) {
  const selected = splitPipe(value);
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const centers = useRef<Record<string, [number, number]>>({});

  useEffect(() => {
    const q = input.trim();
    if (q.length < 2 || !MB_TOKEN) { setOptions([]); setLoading(false); return; }
    let active = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
          + `?access_token=${MB_TOKEN}&autocomplete=true&limit=6`;
        const r = await fetch(url);
        const data = await r.json();
        if (!active) return;
        const labels: string[] = [];
        for (const f of data.features ?? []) {
          const label = String(f.place_name ?? f.text ?? "").trim();
          if (!label) continue;
          labels.push(label);
          if (Array.isArray(f.center) && f.center.length === 2) {
            centers.current[label] = [Number(f.center[0]), Number(f.center[1])];
          }
        }
        setOptions(labels);
      } catch {
        if (active) setOptions([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [input]);

  return (
    <Autocomplete
      multiple freeSolo autoHighlight size="small"
      options={options}
      filterOptions={(x) => x}
      value={selected}
      inputValue={input}
      onInputChange={(_, v) => setInput(v)}
      loading={loading}
      onChange={(_, vals) => {
        const names = (vals as string[]).map(s => s.trim()).filter(Boolean);
        onPick(names.map(n => ({ name: n, center: centers.current[n] ?? null })));
      }}
      renderTags={(vals, getTagProps) =>
        vals.map((option, index) => (
          <Chip variant="outlined" size="small" label={option} {...getTagProps({ index })} key={`${option}-${index}`} />
        ))
      }
      renderInput={(p) => (
        <TextField
          {...p}
          label="site_name(s)"
          placeholder={MB_TOKEN ? "Search a place — e.g. Machakos, Kenya…" : "Type a site name and press Enter…"}
          helperText={
            MB_TOKEN
              ? "Search and select one or more places — names come from Mapbox and set the coordinates automatically. Type a custom name and press Enter if a site isn't listed."
              : "Type one or more site names and press Enter."
          }
          InputProps={{
            ...p.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={16} thickness={5} sx={{ mr: 1 }} /> : null}
                {p.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

// ─── Step components ────────────────────────────────────────────────────────

function IdentificationStep({ state, set }: StepProps) {
  return (
    <>
      <SectionTitle n="01" title="Identification & innovation" subtitle="Unique identifier, classification, and search keywords." />
      <Stack gap={2.5}>
        <TextField label="innovation_id (auto)" value={state.innovation_id} InputProps={{ readOnly: true }} size="small"
                   helperText="Generated automatically and copied with every related upload."
                   sx={{ "& input": { fontFamily: "monospace", fontSize: 12 } }} />

        <TextField
          required
          label={<>innovation_name <HelpTip text="A short label for the innovation (up to 20 characters). Used to name its folder in storage." /></>}
          value={state.innovation_name}
          onChange={e => set("innovation_name", e.target.value)}
          inputProps={{ maxLength: 20 }}
          size="small" fullWidth
          error={state.innovation_name.length > 20}
          helperText={`Short name — up to 20 characters. ${state.innovation_name.length}/20`}
        />

        <TextField
          required label={<>innovation_description <HelpTip text="A short, plain-language description of the innovation (the official name plus a 1-line summary)." /></>}
          value={state.innovation_description}
          onChange={e => set("innovation_description", e.target.value)}
          inputProps={{ maxLength: 300 }} size="small" fullWidth multiline minRows={2}
        />

        <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
          <Box sx={{ flex: 1 }}>
            <SelectWithOther
              label="innovation_type" required
              value={state.innovation_type}
              onChange={v => set("innovation_type", v)}
              options={taxonomy.innovation_type}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <SelectWithOther
              label="innovation_scale"
              value={state.innovation_scale}
              onChange={v => set("innovation_scale", v)}
              options={taxonomy.innovation_scale}
            />
          </Box>
        </Stack>

        <FormControl size="small" fullWidth>
          <InputLabel>scaling_readiness_level</InputLabel>
          <Select label="scaling_readiness_level"
                  value={state.scaling_readiness_level}
                  onChange={e => set("scaling_readiness_level", e.target.value)}>
            {taxonomy.scaling.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </Select>
          <FormHelperText>
            Four stages: Concept → Validated/Pilot → Scaling-ready → Institutionalized.
          </FormHelperText>
        </FormControl>

        <KeywordsField value={state.keywords} onChange={v => set("keywords", v)} />

        <SelectWithOther
          label="thematic_area"
          value={state.thematic_area}
          onChange={v => set("thematic_area", v)}
          options={taxonomy.thematic_area}
          descriptions={{
            "Agroecological Production Systems":          "Sustainable, biodiversity-based production and agroecological transitions.",
            "Commons and Protected Areas":                "Conservation, restoration and governance of shared and protected landscapes.",
            "Waterscapes and Water Security":             "Water resources, watersheds, and water-related ecosystem services.",
            "Nutritionscapes and Livelihood Resilience":  "Nutrition, food security and resilient rural livelihoods.",
            "Knowledge, Advisory and Scaling Pathways":   "Knowledge systems, advisory services and pathways to scale.",
            "Markets, Value Chains and PES":              "Markets, value chains and payments for ecosystem services.",
            "Governance and GESI":                        "Governance, gender equality and social inclusion.",
            "Policy":                                     "Policy engagement, instruments and enabling environments.",
          }}
          helperText="The MFL thematic area this innovation best fits. Pick Other (specify) if it spans a theme not listed."
        />
      </Stack>
    </>
  );
}

function SiteStep({ state, set, onGeoSource }: StepProps & { onGeoSource: (file: File) => void }) {
  const broadScope =
    ["Subnational", "National", "Multiscale"].includes(state.innovation_scale) ||
    state.region === "Global";
  return (
    <>
      <SectionTitle n="02" title="Site & geography" subtitle="Where the innovation is implemented." />
      <Stack gap={2.5}>
        <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
          <FormControl size="small" fullWidth required>
            <InputLabel>region *</InputLabel>
            <Select label="region *" value={state.region} onChange={e => set("region", e.target.value)}>
              {taxonomy.region.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
          </FormControl>
          <Autocomplete
            multiple freeSolo options={COUNTRIES}
            value={splitPipe(state.country)}
            onChange={(_, v) => set("country", (v as string[]).map(s => s.trim()).filter(Boolean).join(" | "))}
            renderTags={(vals, getTagProps) =>
              vals.map((o, i) => <Chip variant="outlined" size="small" label={o} {...getTagProps({ index: i })} key={`${o}-${i}`} />)
            }
            renderInput={(p) => <TextField {...p} required label="country/countries *" size="small" helperText="Select one or more countries." />}
            sx={{ width: "100%" }}
          />
        </Stack>

        <SitesField
          value={state.site_name}
          onPick={(sites) => {
            set("site_name", sites.map(s => s.name).join(" | "));
            const geo = sites.filter(s => s.center) as { name: string; center: [number, number] }[];
            if (geo.length) {
              const [lng, lat] = geo[0].center;
              set("longitude", String(+lng.toFixed(6)));
              set("latitude",  String(+lat.toFixed(6)));
            }
            // Keep a named pin for every geolocated site in the map geometry,
            // and open the map so the pins show directly.
            set("geometry", withSitePoints(state.geometry, geo));
            if (geo.length) set("has_additional_geo", "Y");
          }}
        />

        <FormControl size="small" fullWidth>
          <InputLabel>climate_class</InputLabel>
          <Select label="climate_class" value={state.climate_class} onChange={e => set("climate_class", e.target.value)}>
            {taxonomy.climate.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </Select>
          <FormHelperText>
            Köppen–Geiger classification. Not sure which class fits?{" "}
            <MuiLink href={LINKS.koppen} target="_blank" rel="noopener">See the Köppen map and descriptions</MuiLink>.
          </FormHelperText>
        </FormControl>

        <Box>
          <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
            <TextField
              label="latitude (optional)" type="number"
              inputProps={{ step: "0.000001", min: -90, max: 90 }}
              value={state.latitude} onChange={e => set("latitude", e.target.value)}
              size="small" fullWidth
              error={state.latitude !== "" && (isNaN(Number(state.latitude)) || Number(state.latitude) < -90 || Number(state.latitude) > 90)}
              helperText="Decimal degrees between −90 and 90."
            />
            <TextField
              label="longitude (optional)" type="number"
              inputProps={{ step: "0.000001", min: -180, max: 180 }}
              value={state.longitude} onChange={e => set("longitude", e.target.value)}
              size="small" fullWidth
              error={state.longitude !== "" && (isNaN(Number(state.longitude)) || Number(state.longitude) < -180 || Number(state.longitude) > 180)}
              helperText={
                <>
                  Decimal degrees between −180 and 180.{" "}
                  <MuiLink href={LINKS.decimalDegrees} target="_blank" rel="noopener">Convert DMS → decimal</MuiLink>.
                </>
              }
            />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Coordinates are optional and are filled automatically from your first site.
            {broadScope
              ? " This innovation is national, regional or global in scope — a precise point isn't required. Leave them blank, or use the map below to outline the area."
              : " Adjust them if you need a more precise point."}
          </Typography>
        </Box>

        <SelectWithOther
          label="production_system"
          value={state.production_system}
          onChange={v => set("production_system", v)}
          options={taxonomy.production_system}
          descriptions={{
            "Mixed farming systems":                "Crop–livestock, often with cereals, legumes, fodder, and manure/nutrient cycling.",
            "Staple-crop systems":                  "Rice, wheat, maize, roots/tubers, legumes, dryland cereals.",
            "Animal and aquatic food systems":      "Livestock, pastoral/agro-pastoral systems, aquaculture, fisheries.",
            "Natural-resource-based systems":       "Rainfed, irrigated, agroforestry, rangeland, and landscape systems.",
            "Market- and nutrition-oriented systems": "Horticulture, peri-urban agriculture, diversified food systems.",
          }}
          helperText="Dominant production system at the site."
        />

        <Divider sx={{ my: 1 }} />

        <FormControl size="small" sx={{ maxWidth: 380 }}>
          <InputLabel>Do you have additional geographic information?</InputLabel>
          <Select label="Do you have additional geographic information?"
                  value={state.has_additional_geo}
                  onChange={e => set("has_additional_geo", e.target.value as any)}>
            <MenuItem value="N">No</MenuItem>
            <MenuItem value="Y">Yes</MenuItem>
          </Select>
        </FormControl>

        {state.has_additional_geo === "Y" && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <AlertTitle sx={{ fontWeight: 700 }}>How to add geometry</AlertTitle>
              <Typography variant="body2" component="div">
                <ul style={{ margin: 0, paddingLeft: "1.2em" }}>
                  <li>Search a place top-right, then use the toolbar (top-left) to draw a <strong>point</strong>, <strong>line</strong>, or <strong>polygon</strong>.</li>
                  <li><strong>Double-click</strong> to finish a polyline or polygon.</li>
                  <li>Places you selected under <strong>site_name(s)</strong> already appear here as named pins — rename or remove them like any other feature.</li>
                  <li><strong>Name every feature</strong> in the list under the map — names are saved with the GeoJSON and travel with the record.</li>
                  <li>Use the trash tool to delete a feature, or the zoom icon next to a feature row to focus the map on it.</li>
                  <li>Upload one or more <strong>.geojson</strong> or zipped <strong>shapefiles</strong> — each is <strong>added</strong> to what's already on the map, so you can combine several geometries. Everything (site pins, drawings, uploads) is saved as one FeatureCollection, both inline and as a file in the <code>mfl</code> bucket on submit.</li>
                </ul>
              </Typography>
            </Alert>
            <GeographyWidget value={state.geometry} onChange={g => set("geometry", g)} onSourceFile={onGeoSource} />
          </Box>
        )}
      </Stack>
    </>
  );
}

function ChallengeAndDataStep({ state, set }: StepProps) {
  return (
    <>
      <SectionTitle n="03" title="Challenge, data & description" subtitle="What the innovation addresses, what data is collected, and where to find it." />
      <Stack gap={2.5}>
        <MultiSelectField
          label="challenge_category"
          options={taxonomy.challenge_cat}
          value={state.challenge_category}
          onChange={v => set("challenge_category", v)}
          helperText="Pick one or more challenge categories the innovation addresses, or type your own."
        />

        <TextField
          label={<>challenge_description <HelpTip text="Plain-language description of the challenge. Use ontology terms where possible." /></>}
          value={state.challenge_description} onChange={e => set("challenge_description", e.target.value)}
          multiline minRows={3} inputProps={{ maxLength: 1000 }} fullWidth
          helperText="Use ontology terms (AGRO, ENVO) when they fit. Otherwise plain language."
        />

        <MultiSelectField
          label="data_collected"
          options={taxonomy.data_collected}
          value={state.data_collected}
          onChange={v => set("data_collected", v)}
          helperText="Pick one or more data types collected, or type your own."
        />

        <MultiSelectField
          label="indicators_measured"
          options={taxonomy.indicators_measured}
          value={state.indicators_measured}
          onChange={v => set("indicators_measured", v)}
          helperText="Pick from common indicators or type your own. Always include the unit."
        />

        <MultiUrlField
          label="data_repository_url(s)"
          value={state.data_repository_url}
          onChange={v => set("data_repository_url", v)}
          placeholder="https://datadryad.org/…"
          helperText="One row per repository or dataset. Public datasets only."
        />

        <MultiUrlField
          label="innovation_description_url(s) *"
          value={state.innovation_description_url}
          onChange={v => set("innovation_description_url", v)}
          placeholder="https://…"
          helperText="Required — at least one public link describing the innovation (project page, brief, blog post). URLs must start with http:// or https://."
        />

        <FormControl size="small" fullWidth>
          <InputLabel>link_another_aow</InputLabel>
          <Select label="link_another_aow" value={state.link_another_aow} onChange={e => set("link_another_aow", e.target.value)}>
            <MenuItem value=""><em>—</em></MenuItem>
            {taxonomy.aow.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </Select>
          <FormHelperText>Link to another Area of Work, if applicable.</FormHelperText>
        </FormControl>
      </Stack>
    </>
  );
}

function PhaseBlock({
  title, prefix, state, set, includeReadiness = false,
}: {
  title: string;
  prefix: "test" | "validation";
  state: FormState;
  set: StepProps["set"];
  includeReadiness?: boolean;
}) {
  const startKey   = prefix === "test" ? "start_year_tested"          : "start_year_validated";
  const endKey     = prefix === "test" ? "end_year_tested"            : "end_year_validated";
  const nbKey      = prefix === "test" ? "nb_actors_test_innovations" : "nb_actors_validation";
  const actorsKey  = prefix === "test" ? "actors_tested"              : "actors_validated";
  const selected   = (state[actorsKey] as string) ? (state[actorsKey] as string).split(" | ").map(s => s.trim()).filter(Boolean) : [];
  const startN = Number(state[startKey] as string);
  const endN   = Number(state[endKey] as string);
  const badRange = state[startKey] && state[endKey] && Number.isFinite(startN) && Number.isFinite(endN) && endN < startN;
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>{title}</Typography>
      <Stack gap={2}>
        <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
          <TextField
            label={startKey}
            type="number" inputProps={{ min: 1900, max: 2100, step: 1 }}
            value={state[startKey] as string}
            onChange={e => set(startKey, e.target.value)}
            helperText="First calendar year."
            size="small" fullWidth
            placeholder="e.g. 1999"
            error={!!badRange}
          />
          <TextField
            label={endKey}
            type="number" inputProps={{ min: 1900, max: 2100, step: 1 }}
            value={state[endKey] as string}
            onChange={e => set(endKey, e.target.value)}
            helperText={badRange ? "End year must be ≥ start year." : "Final calendar year (or same as start for a single-year phase)."}
            size="small" fullWidth
            placeholder="e.g. 2002"
            error={!!badRange}
          />
          <TextField
            label={nbKey} type="number" inputProps={{ min: 0, step: 1 }}
            value={state[nbKey] as string}
            onChange={e => set(nbKey, e.target.value)}
            helperText="Number of actors participating."
            size="small" fullWidth
          />
        </Stack>
        <Autocomplete
          multiple freeSolo size="small"
          options={[...taxonomy.actor_types, "Other"]}
          value={selected}
          onChange={(_, v) => {
            const next = (v as string[]).slice(0, 3);
            set(actorsKey, next.join(" | "));
          }}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip variant="outlined" size="small" label={option} {...getTagProps({ index })} key={`${option}-${index}`} />
            ))
          }
          renderInput={(p) => (
            <TextField {...p} label={`${actorsKey}`}
                       placeholder="Type or pick — up to 3"
                       helperText={`Up to 3 actor types. ${selected.length}/3 selected.`} />
          )}
        />
        {includeReadiness && (
          <FormControl size="small" fullWidth>
            <InputLabel>scaling_readiness_validation</InputLabel>
            <Select label="scaling_readiness_validation"
                    value={state.scaling_readiness_validation}
                    onChange={e => set("scaling_readiness_validation", e.target.value)}>
              {taxonomy.scaling.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
            <FormHelperText>Readiness at the end of validation — may differ from the overall level.</FormHelperText>
          </FormControl>
        )}
      </Stack>
    </Paper>
  );
}

function TestingValidationStep({ state, set }: StepProps) {
  return (
    <>
      <SectionTitle
        n="04"
        title="Testing & validation"
        subtitle="Each phase can have its own duration, number of actors, and (for validation) scaling readiness."
      />
      <Stack gap={3}>
        <PhaseBlock title="Testing phase"    prefix="test"       state={state} set={set} />
        <PhaseBlock title="Validation phase" prefix="validation" state={state} set={set} includeReadiness />
      </Stack>
    </>
  );
}

function OrganisationsStep({ state, set }: StepProps) {
  return (
    <>
      <SectionTitle n="05" title="Organisations" subtitle="Focal point and partners." />
      <Stack gap={2.5}>
        <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
          <TextField label="focal_point_name" value={state.focal_point_name} onChange={e => set("focal_point_name", e.target.value)} size="small" fullWidth />
          <TextField label="focal_point_email" type="email" value={state.focal_point_email}
                     onChange={e => set("focal_point_email", e.target.value)}
                     placeholder="name@cgiar.org" size="small" fullWidth />
        </Stack>
        <Autocomplete freeSolo options={LEAD_ORGANISATIONS} value={state.lead_organisation}
          onInputChange={(_, v) => set("lead_organisation", v)}
          renderInput={(p) => <TextField {...p} label="lead_organisation" size="small" />}
          sx={{ width: "100%" }} />
        <TextField label="co_developers" value={state.co_developers} onChange={e => set("co_developers", e.target.value)}
                   helperText="Acronyms separated by | (e.g. CIMMYT | ICRISAT | IFPRI)" size="small" fullWidth />
        <TextField label="implementing_partners" value={state.implementing_partners} onChange={e => set("implementing_partners", e.target.value)}
                   helperText="Acronyms separated by |" size="small" fullWidth />
      </Stack>
    </>
  );
}

function ImpactStep({ state, set }: StepProps) {
  const ratingFields: [keyof FormState, string][] = [
    ["cgiar_food_security", "cgiar_food_security"],
    ["cgiar_improved_livelihoods", "cgiar_improved_livelihoods"],
    ["cgiar_gender_equality", "cgiar_gender_equality"],
    ["cgiar_environment_biodiversity", "cgiar_environment_biodiversity"],
    ["cgiar_climate_change", "cgiar_climate_change"],
  ];
  return (
    <>
      <SectionTitle n="06" title="Impact & SDGs" subtitle="Up to three SDGs (primary, secondary, tertiary) and contribution ratings for the five CGIAR Impact Areas." />
      <Stack gap={2.5}>
        <Typography variant="subtitle2">Sustainable Development Goals</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} gap={2} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 260, flex: 1 }}>
            <InputLabel>sdg (primary)</InputLabel>
            <Select label="sdg (primary)" value={state.sdg} onChange={e => set("sdg", e.target.value)}>
              <MenuItem value=""><em>—</em></MenuItem>
              {taxonomy.sdg.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 260, flex: 1 }}>
            <InputLabel>sdg_secondary</InputLabel>
            <Select label="sdg_secondary" value={state.sdg_secondary} onChange={e => set("sdg_secondary", e.target.value)}>
              <MenuItem value=""><em>—</em></MenuItem>
              {taxonomy.sdg.filter(s => s !== state.sdg).map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 260, flex: 1 }}>
            <InputLabel>sdg_tertiary</InputLabel>
            <Select label="sdg_tertiary" value={state.sdg_tertiary} onChange={e => set("sdg_tertiary", e.target.value)}>
              <MenuItem value=""><em>—</em></MenuItem>
              {taxonomy.sdg.filter(s => s !== state.sdg && s !== state.sdg_secondary).map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>

        <Divider />

        <Typography variant="subtitle2">CGIAR Impact Area contribution</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} flexWrap="wrap" gap={2}>
          {ratingFields.map(([key, label]) => (
            <FormControl size="small" sx={{ minWidth: 240, flex: 1 }} key={key}>
              <InputLabel>{label}</InputLabel>
              <Select label={label} value={(state[key] as string) ?? ""} onChange={e => set(key, e.target.value as any)}>
                <MenuItem value=""><em>—</em></MenuItem>
                {taxonomy.cgiar_rating.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </Select>
            </FormControl>
          ))}
        </Stack>
      </Stack>
    </>
  );
}

function AdoptionStep({ state, set }: StepProps) {
  return (
    <>
      <SectionTitle n="07" title="Adoption — barriers & success factors" subtitle="Pick the categories that matter most; up to four each. Use 'Other' to add anything missing." />
      <Stack gap={3}>
        <Box>
          <MultiSelectField
            label="barriers_to_scaling"
            options={taxonomy.barrier_categories}
            value={state.barriers_to_scaling}
            onChange={v => set("barriers_to_scaling", v)}
            max={4}
            helperText="The main reasons this innovation is hard to scale or sustain."
          />
        </Box>
        <Box>
          <MultiSelectField
            label="success_factors"
            options={taxonomy.success_factor_categories}
            value={state.success_factors}
            onChange={v => set("success_factors", v)}
            max={4}
            helperText="The conditions that made adoption work (peer learning, market access, policy, etc.)."
          />
        </Box>
      </Stack>
    </>
  );
}

function RawDataStep({ state, set }: StepProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true); setError(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setError("Sign in expired — refresh the page."); setUploading(false); return; }
    const block = uploadBlockReason(state);
    if (block) { setError(block); setUploading(false); return; }
    const added: Attachment[] = [];
    for (const f of files) {
      if (f.size > MAX_FILE_BYTES) { setError(`${f.name}: exceeds ${MAX_FILE_MB} MB — skipped.`); continue; }
      const safeName = f.name.replace(/[^\w.\-]/g, "_");
      const path = `${recordFolder(u.user, state)}/data/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, f, {
        contentType: f.type || "application/octet-stream", upsert: false,
      });
      if (upErr) { setError(`${f.name}: ${upErr.message}`); continue; }
      added.push({ filename: f.name, mime_type: f.type, size_bytes: f.size, path });
    }
    set("attachments", [...(state.attachments ?? []), ...added]);
    setUploading(false);
    e.target.value = "";
  }

  async function removeAt(idx: number) {
    const att = (state.attachments ?? [])[idx];
    if (!att) return;
    if (att.path) await supabase.storage.from(BUCKET).remove([att.path]);
    set("attachments", (state.attachments ?? []).filter((_, j) => j !== idx));
  }

  return (
    <>
      <SectionTitle n="08" title="Raw data, comments & feedback" subtitle="Attach curated datasets, leave general comments, and share feedback about the form itself." />

      <Paper variant="outlined" sx={{ p: 3, bgcolor: "#fff8e1", borderColor: "warning.light", borderStyle: "dashed", mb: 3 }}>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Please upload <strong>curated, analysis-ready datasets</strong> — clean tables with clear column names,
          units, treatment/control labels, and one observation per row. Well-structured files make it possible to
          verify effect sizes, reuse the data in meta-analyses, and reproduce results. Accepted: CSV, Excel,
          TSV, plain text, Word (.doc/.docx), PDF — up to 50 MB each. Files land in the <code>mfl</code> Storage bucket.
        </Typography>
        {uploading && <LinearProgress sx={{ mb: 1 }} />}
        {error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>{error}</Alert>}

        {(state.attachments ?? []).length > 0 && (
          <Stack gap={0.75} mb={2}>
            {(state.attachments ?? []).map((a, i) => (
              <Stack key={i} direction="row" alignItems="center" gap={1}
                     sx={{ bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: 1, px: 1.5, py: 1 }}>
                <AttachFileIcon fontSize="small" color="action" />
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap>{a.filename}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(a.size_bytes / 1024).toFixed(1)} KB · uploaded
                  </Typography>
                </Box>
                <TextField placeholder="Description (optional)" size="small" value={a.description ?? ""}
                  onChange={e => set("attachments", (state.attachments ?? []).map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                  sx={{ width: 260 }} />
                <IconButton size="small" onClick={() => removeAt(i)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        )}
        <Button component="label" variant="contained" color="warning" startIcon={<AttachFileIcon />} disabled={uploading}>
          Attach file(s)
          <input type="file" hidden multiple accept={ACCEPTED_FILES} onChange={onPick} />
        </Button>
      </Paper>

      <Stack gap={2.5}>
        <TextField
          label="general_comments"
          value={state.general_comments}
          onChange={e => set("general_comments", e.target.value)}
          multiline minRows={3} inputProps={{ maxLength: 2000 }} fullWidth
          helperText="Anything else worth noting about this innovation — caveats, context, related work."
        />

        <TextField
          label="form_feedback"
          value={state.form_feedback}
          onChange={e => set("form_feedback", e.target.value)}
          multiline minRows={3} inputProps={{ maxLength: 2000 }} fullWidth
          helperText={
            <>
              Tell us how to improve the form — confusing fields, missing vocabularies, anything that slowed you down.
              Stuck right now? Email{" "}
              <MuiLink href="mailto:adama.ndour@cgiar.org">adama.ndour@cgiar.org</MuiLink>{" "}
              and we'll help.
            </>
          }
        />
      </Stack>
    </>
  );
}

function ReviewStep({ state, missing }: { state: FormState; missing: (keyof FormState)[] }) {
  return (
    <>
      <SectionTitle n="09" title="Review" subtitle="Verify the record before submission." />
      {missing.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>Missing required: {missing.join(", ")}</Alert>
      )}
      <Table size="small">
        <TableHead><TableRow><TableCell sx={{ width: 300 }}>Field</TableCell><TableCell>Value</TableCell></TableRow></TableHead>
        <TableBody>
          {COLS.map(c => {
            const v = String((state as any)[c.field] ?? "");
            return (
              <TableRow key={c.field}>
                <TableCell sx={{ color: "text.secondary", fontFamily: "monospace", fontSize: 11 }}>{c.field}</TableCell>
                <TableCell>{v || <Box component="span" color="text.disabled">—</Box>}</TableCell>
              </TableRow>
            );
          })}
          <TableRow>
            <TableCell sx={{ color: "text.secondary", fontFamily: "monospace", fontSize: 11 }}>attachments</TableCell>
            <TableCell>{(state.attachments ?? []).length} file(s)</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ color: "text.secondary", fontFamily: "monospace", fontSize: 11 }}>geometry</TableCell>
            <TableCell>
              {state.has_additional_geo === "Y" && state.geometry?.features?.length
                ? `${state.geometry.features.length} feature(s)`
                : <Box component="span" color="text.disabled">—</Box>}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </>
  );
}
