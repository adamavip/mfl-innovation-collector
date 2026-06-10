"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Chip, FormControl, IconButton,
  InputLabel, LinearProgress, MenuItem, Paper, Select, Snackbar, Stack, Step, StepButton,
  Stepper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { getNames } from "country-list";

import { supabase } from "@/lib/supabase";
import { COLS, taxonomy } from "@/lib/taxonomy";
import { LEAD_ORGANISATIONS, MAX_FILE_BYTES, ACCEPTED_FILES } from "@/lib/formTaxonomy";
import dynamic from "next/dynamic";

const GeographyWidget = dynamic(() => import("./GeographyWidget").then(m => m.GeographyWidget), { ssr: false });

const COUNTRIES = getNames().sort();

interface Attachment {
  filename: string;
  mime_type: string;
  size_bytes: number;
  path: string;            // bucket path: <user_id>/<innovation_id>/<ts>_<filename>
  description?: string;
}

const BUCKET = "mfl";

export interface FormState {
  innovation_id: string;
  innovation_description: string;
  innovation_type: string;
  innovation_scale: string;
  scaling_readiness_level: string;
  region: string;
  country: string;
  site_name: string;
  climate_class: string;
  latitude: string;
  longitude: string;
  challenge_category: string;
  challenge_description: string;
  data_collected: string;
  data_repository_url: string;
  innovation_description_url: string;
  link_another_aow: string;
  years_tested: string;
  nb_actors_test_innovations: string;
  actors_tested: string;       // pipe-separated, e.g. "Individual farmer | NGO / civil society"
  focal_point_name: string;
  focal_point_email: string;
  lead_organisation: string;
  co_developers: string;
  implementing_partners: string;
  sdg: string;
  cgiar_food_security: string;
  cgiar_improved_livelihoods: string;
  cgiar_gender_equality: string;
  cgiar_environment_biodiversity: string;
  cgiar_climate_change: string;
  attachments: Attachment[];
  has_additional_geo: "" | "Y" | "N";
  geometry: { type: "FeatureCollection"; features: any[] } | null;
}

const STEPS = [
  "Identification", "Site & geography", "Challenge & description",
  "Testing & reach", "Organisations", "Impact & SDGs",
  "Raw data", "Review",
];

const REQUIRED: (keyof FormState)[] = [
  "innovation_id", "region", "country", "innovation_description", "innovation_type",
];

const initialState = (): FormState => ({
  innovation_id: crypto.randomUUID(),
  innovation_description: "", innovation_type: "", innovation_scale: "", scaling_readiness_level: "",
  region: "", country: "", site_name: "", climate_class: "", latitude: "", longitude: "",
  challenge_category: "", challenge_description: "",
  data_collected: "", data_repository_url: "", innovation_description_url: "", link_another_aow: "",
  years_tested: "", nb_actors_test_innovations: "", actors_tested: "",
  focal_point_name: "", focal_point_email: "", lead_organisation: "", co_developers: "", implementing_partners: "",
  sdg: "",
  cgiar_food_security: "", cgiar_improved_livelihoods: "", cgiar_gender_equality: "",
  cgiar_environment_biodiversity: "", cgiar_climate_change: "",
  attachments: [],
  has_additional_geo: "",
  geometry: null,
});

// Shared key — grid mode (rows[0]) and form mode read/write the same record.
const DRAFT_KEY = "mfl-shared-record";
const EDITING_KEY = "mfl-editing-id";

export function FormMode({ onDone }: { onDone?: () => void }) {
  const [state, setState] = useState<FormState>(initialState);
  const [activeStep, setActiveStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState<{ severity: "success" | "error" | "info"; text: string } | null>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setEditingId(localStorage.getItem(EDITING_KEY));
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

  // localStorage caps each origin at ~5 MB; geometry can blow that out alone.
  // Persist everything else; geometry stays in memory and rides to Supabase via Save Draft.
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

  async function uploadGeometry(userId: string, innovationId: string,
                                geometry: { type: "FeatureCollection"; features: any[] }) {
    const blob = new Blob([JSON.stringify(geometry, null, 2)], { type: "application/geo+json" });
    const path = `${userId}/${innovationId}/geometry.geojson`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: "application/geo+json", upsert: true,
    });
    return error ? null : path;
  }

  async function saveDraft() {
    setBusy(true);
    persistLocal(state);
    const { data: u } = await supabase.auth.getUser();
    let geometryPath: string | null = null;
    if (u.user && state.has_additional_geo === "Y"
        && state.geometry && state.geometry.features?.length) {
      geometryPath = await uploadGeometry(u.user.id, state.innovation_id, state.geometry);
    }
    if (u.user) {
      const draftRow = { __form_mode: true, ...state, ...(geometryPath ? { geometry_file_path: geometryPath } : {}) };
      if (activeDraftId) {
        await supabase.from("drafts").update({
          rows: [draftRow], updated_at: new Date().toISOString(),
        }).eq("id", activeDraftId);
      } else {
        const { data } = await supabase.from("drafts").insert({
          user_id: u.user.id,
          name: `Form · ${state.innovation_description || state.innovation_id.slice(0, 8)}`,
          rows: [draftRow],
        }).select().single();
        if (data) setActiveDraftId(data.id);
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
    const { data: u } = await supabase.auth.getUser();

    const { attachments = [], geometry = null, has_additional_geo,
            latitude, longitude, years_tested, nb_actors_test_innovations,
            ...rest } = state;
    const extras: Record<string, unknown> = {};
    if (attachments.length) extras.attachments = attachments;
    let geoUploadedTo: string | null = null;
    if (has_additional_geo === "Y" && geometry && geometry.features?.length) {
      extras.geometry = geometry;
      if (u.user) {
        const path = await uploadGeometry(u.user.id, state.innovation_id, geometry);
        if (path) { extras.geometry_file_path = path; geoUploadedTo = path; }
      }
    }
    const payload = {
      ...rest,
      latitude:  latitude  ? Number(latitude)  : null,
      longitude: longitude ? Number(longitude) : null,
      years_tested:               years_tested               ? Number(years_tested)               : null,
      nb_actors_test_innovations: nb_actors_test_innovations ? Number(nb_actors_test_innovations) : null,
      extras: Object.keys(extras).length ? extras : null,
    };

    const isEditing = !!editingId;
    const { error } = isEditing
      ? await supabase.from("innovations").update(payload).eq("id", editingId!)
      : await supabase.from("innovations").insert({ ...payload, user_id: u.user?.id });

    if (!error && activeDraftId && !isEditing) await supabase.from("drafts").delete().eq("id", activeDraftId);
    setBusy(false);
    if (error) { setSnack({ severity: "error", text: error.message }); return; }
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(EDITING_KEY);
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
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }} nonLinear>
        {STEPS.map((label, i) => (
          <Step key={label} completed={i < activeStep}>
            <StepButton onClick={() => setActiveStep(i)}>{label}</StepButton>
          </Step>
        ))}
      </Stepper>

      <Card variant="outlined">
        <CardContent sx={{ p: 4 }}>
          {activeStep === 0 && <IdentificationStep state={state} set={set} />}
          {activeStep === 1 && <SiteStep state={state} set={set} />}
          {activeStep === 2 && <ChallengeAndDataStep state={state} set={set} />}
          {activeStep === 3 && <TestingStep state={state} set={set} />}
          {activeStep === 4 && <OrganisationsStep state={state} set={set} />}
          {activeStep === 5 && <ImpactStep state={state} set={set} />}
          {activeStep === 6 && <RawDataStep state={state} set={set} />}
          {activeStep === 7 && <ReviewStep state={state} missing={missing} />}
        </CardContent>
      </Card>

      <Stack direction="row" gap={1.5} mt={3} alignItems="center">
        <Button onClick={() => setActiveStep(s => Math.max(0, s - 1))} disabled={activeStep === 0}>Back</Button>
        {activeStep < STEPS.length - 1 ? (
          <Button variant="contained" onClick={() => setActiveStep(s => Math.min(STEPS.length - 1, s + 1))}>Next</Button>
        ) : (
          <Button variant="contained" color="success" onClick={submit} disabled={busy || missing.length > 0}>
            {editingId ? "Update innovation" : "Submit innovation"}
          </Button>
        )}
        {editingId && (
          <Button variant="text" color="warning" onClick={() => {
            if (!confirm("Discard edit and start a new innovation?")) return;
            localStorage.removeItem(EDITING_KEY);
            localStorage.removeItem(DRAFT_KEY);
            setState(initialState()); setEditingId(null); setActiveStep(0);
          }} disabled={busy}>
            Cancel edit
          </Button>
        )}
        <Box sx={{ flexGrow: 1 }} />
        {editingId && <Chip color="warning" size="small" label="Editing existing innovation" />}
        <Button variant="outlined" onClick={saveDraft} disabled={busy || !!editingId}>
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

interface StepProps { state: FormState; set: <K extends keyof FormState>(k: K, v: FormState[K]) => void }

function SectionTitle({ n, title, subtitle }: { n: string; title: string; subtitle?: string }) {
  return (
    <Box mb={3}>
      <Typography variant="overline" color="primary">Section {n}</Typography>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>{title}</Typography>
      {subtitle && <Typography variant="body2" color="text.secondary" mt={0.5}>{subtitle}</Typography>}
    </Box>
  );
}

function IdentificationStep({ state, set }: StepProps) {
  return (
    <>
      <SectionTitle n="01" title="Identification & innovation" subtitle="Unique identifier and innovation classification." />
      <Stack gap={2.5}>
        <TextField label="innovation_id (auto)" value={state.innovation_id} InputProps={{ readOnly: true }} size="small"
                   sx={{ "& input": { fontFamily: "monospace", fontSize: 12 } }} />
        <TextField required label="innovation_description" value={state.innovation_description} onChange={e => set("innovation_description", e.target.value)}
                   inputProps={{ maxLength: 150 }} size="small" fullWidth />
        <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
          <FormControl size="small" fullWidth required>
            <InputLabel>innovation_type *</InputLabel>
            <Select label="innovation_type *" value={state.innovation_type} onChange={e => set("innovation_type", e.target.value)}>
              {taxonomy.innovation_type.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>innovation_scale</InputLabel>
            <Select label="innovation_scale" value={state.innovation_scale} onChange={e => set("innovation_scale", e.target.value)}>
              {taxonomy.innovation_scale.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
        <FormControl size="small" fullWidth>
          <InputLabel>scaling_readiness_level</InputLabel>
          <Select label="scaling_readiness_level" value={state.scaling_readiness_level} onChange={e => set("scaling_readiness_level", e.target.value)}>
            {taxonomy.scaling.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>
    </>
  );
}

function SiteStep({ state, set }: StepProps) {
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
          <Autocomplete freeSolo options={COUNTRIES} value={state.country}
            onInputChange={(_, v) => set("country", v)}
            renderInput={(p) => <TextField {...p} required label="country *" size="small" />}
            sx={{ width: "100%" }} />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
          <TextField label="site_name" value={state.site_name} onChange={e => set("site_name", e.target.value)} size="small" fullWidth />
          <FormControl size="small" fullWidth>
            <InputLabel>climate_class</InputLabel>
            <Select label="climate_class" value={state.climate_class} onChange={e => set("climate_class", e.target.value)}>
              {taxonomy.climate.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
          <TextField label="latitude" type="number" inputProps={{ step: "0.000001", min: -90, max: 90 }}
                     value={state.latitude} onChange={e => set("latitude", e.target.value)} size="small" fullWidth />
          <TextField label="longitude" type="number" inputProps={{ step: "0.000001", min: -180, max: 180 }}
                     value={state.longitude} onChange={e => set("longitude", e.target.value)} size="small" fullWidth />
        </Stack>

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
          <Box mt={1}>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Either upload a <strong>GeoJSON</strong> file (`.geojson` / `.json`) or a zipped <strong>Shapefile</strong>
              (`.zip` containing `.shp`, `.shx`, `.dbf`); <em>or</em> draw points / polygons / rectangles / lines on the
              map. Geometry is stored as GeoJSON (EPSG:4326) inside the innovation record.
            </Typography>
            <GeographyWidget value={state.geometry} onChange={g => set("geometry", g)} />
          </Box>
        )}
      </Stack>
    </>
  );
}

function ChallengeAndDataStep({ state, set }: StepProps) {
  return (
    <>
      <SectionTitle n="03" title="Challenge & description" subtitle="What the innovation addresses, plus data assets and links." />
      <Stack gap={2.5}>
        <FormControl size="small" fullWidth>
          <InputLabel>challenge_category</InputLabel>
          <Select label="challenge_category" value={state.challenge_category} onChange={e => set("challenge_category", e.target.value)}>
            {taxonomy.challenge_cat.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField label="challenge_description" value={state.challenge_description} onChange={e => set("challenge_description", e.target.value)}
                   multiline minRows={3} inputProps={{ maxLength: 1000 }} fullWidth />
        <FormControl size="small" fullWidth>
          <InputLabel>data_collected</InputLabel>
          <Select label="data_collected" value={state.data_collected} onChange={e => set("data_collected", e.target.value)}>
            {taxonomy.data_collected.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </Select>
        </FormControl>
        <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
          <TextField label="data_repository_url" value={state.data_repository_url} onChange={e => set("data_repository_url", e.target.value)}
                     placeholder="https://…" size="small" fullWidth />
          <TextField label="innovation_description_url" value={state.innovation_description_url} onChange={e => set("innovation_description_url", e.target.value)}
                     placeholder="https://…" size="small" fullWidth />
        </Stack>
        <FormControl size="small" fullWidth>
          <InputLabel>link_another_aow</InputLabel>
          <Select label="link_another_aow" value={state.link_another_aow} onChange={e => set("link_another_aow", e.target.value)}>
            <MenuItem value=""><em>—</em></MenuItem>
            {taxonomy.aow.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>
    </>
  );
}

function TestingStep({ state, set }: StepProps) {
  const selectedActors = state.actors_tested
    ? state.actors_tested.split(" | ").map(s => s.trim()).filter(Boolean)
    : [];
  return (
    <>
      <SectionTitle n="04" title="Testing & reach" subtitle="Duration of testing, number of actors, and which kinds of actors tested the innovation." />
      <Stack gap={2.5}>
        <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
          <TextField label="years_tested" type="number" inputProps={{ min: 0, max: 100, step: 1 }}
                     helperText="Years during which the innovation was tested (0–100)"
                     value={state.years_tested} onChange={e => set("years_tested", e.target.value)} size="small" fullWidth />
          <TextField label="nb_actors_test_innovations" type="number" inputProps={{ min: 0, step: 1 }}
                     helperText="Number of actors testing the innovation"
                     value={state.nb_actors_test_innovations}
                     onChange={e => set("nb_actors_test_innovations", e.target.value)} size="small" fullWidth />
        </Stack>
        <Autocomplete
          multiple freeSolo size="small"
          options={[...taxonomy.actor_types]}
          value={selectedActors}
          onChange={(_, v) => {
            const next = (v as string[]).slice(0, 3);
            set("actors_tested", next.join(" | "));
          }}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip variant="outlined" size="small" label={option} {...getTagProps({ index })} key={`${option}-${index}`} />
            ))
          }
          renderInput={(p) => (
            <TextField {...p} label="actors_tested" placeholder="Type or pick — up to 3"
                       helperText={`Actor types that tested the innovation (max 3). ${selectedActors.length}/3 selected.`} />
          )}
        />
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
                   helperText="Acronyms separated by |" size="small" fullWidth />
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
      <SectionTitle n="06" title="Impact & SDGs" subtitle="Primary SDG and contribution ratings for the five CGIAR Impact Areas." />
      <Stack gap={2.5}>
        <FormControl size="small" fullWidth>
          <InputLabel>sdg</InputLabel>
          <Select label="sdg" value={state.sdg} onChange={e => set("sdg", e.target.value)}>
            {taxonomy.sdg.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </Select>
        </FormControl>
        <Typography variant="subtitle2" mt={1}>CGIAR Impact Area contribution</Typography>
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

function RawDataStep({ state, set }: StepProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true); setError(null);

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setError("Sign in expired — refresh the page."); setUploading(false); return; }

    const added: Attachment[] = [];
    for (const f of files) {
      if (f.size > MAX_FILE_BYTES) { setError(`${f.name}: exceeds 5 MB — skipped.`); continue; }
      const safeName = f.name.replace(/[^\w.\-]/g, "_");
      const path = `${u.user.id}/${state.innovation_id}/${Date.now()}_${safeName}`;
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
      <SectionTitle n="07" title="Raw data for effect sizes" subtitle="Upload supporting datasets that document the innovation's effect." />
      <Paper variant="outlined" sx={{ p: 3, bgcolor: "#fff8e1", borderColor: "warning.light", borderStyle: "dashed" }}>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Please upload <strong>curated, analysis-ready datasets</strong> — clean tables with clear column names,
          units, treatment/control labels, and one observation per row. Well-structured files make it possible to
          verify effect sizes, reuse the data in meta-analyses, and reproduce results. Avoid raw exports with
          merged cells, mixed headers, or undocumented codes.
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
          Accepted: CSV, Excel (.xlsx/.xls), TSV, plain text, Word (.doc/.docx), PDF — up to 5 MB each.
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
    </>
  );
}

function ReviewStep({ state, missing }: { state: FormState; missing: (keyof FormState)[] }) {
  return (
    <>
      <SectionTitle n="08" title="Review" subtitle="Verify the record before submission." />
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
        </TableBody>
      </Table>
    </>
  );
}
