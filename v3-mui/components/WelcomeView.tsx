"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Card, CardActionArea, Chip, Divider, Skeleton, Stack, Typography,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import InventoryOutlinedIcon from "@mui/icons-material/InventoryOutlined";
import DraftsOutlinedIcon from "@mui/icons-material/DraftsOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";

import { supabase } from "@/lib/supabase";

interface DraftRow { id: string; name: string; updated_at: string; rows?: any[] }
interface SubmissionRow {
  id: string;
  innovation_description?: string | null;
  innovation_id?: string | null;
  country?: string | null;
  region?: string | null;
  submitted_at: string;
  extras?: { attachments?: any[]; geometry_file_path?: string | null } | null;
}

interface Props {
  firstName?: string | null;
  email: string | null;
  reloadKey: number;
  onNew: () => void;
  onBrowse: () => void;
  onResumeDraft: (d: DraftRow) => void;
  onEditInnovation: (s: SubmissionRow) => void;
}

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const secs = Math.round((now - d) / 1000);
  if (secs < 60)   return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60)   return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24)  return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30)   return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} mo ago`;
  return new Date(iso).toLocaleDateString();
}

function fmtFullDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function WelcomeView({
  firstName, email, reloadKey, onNew, onBrowse, onResumeDraft, onEditInnovation,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [s, d] = await Promise.all([
        supabase.from("innovations").select("id, innovation_description, innovation_id, country, region, submitted_at, extras")
          .order("submitted_at", { ascending: false }),
        supabase.from("drafts").select("id, name, updated_at, rows")
          .order("updated_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setSubmissions((s.data ?? []) as SubmissionRow[]);
      setDrafts((d.data ?? []) as DraftRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const stats = useMemo(() => {
    const filesCount = submissions.reduce((acc, inv) => {
      const a = inv.extras?.attachments?.length ?? 0;
      const g = inv.extras?.geometry_file_path ? 1 : 0;
      return acc + a + g;
    }, 0);
    const lastSubmission = submissions[0]?.submitted_at ?? null;
    return {
      submissions: submissions.length,
      drafts: drafts.length,
      files: filesCount,
      lastSubmission,
    };
  }, [submissions, drafts]);

  const isNewUser = !loading && submissions.length === 0 && drafts.length === 0;
  const displayName = (firstName ?? "").trim() || (email ?? "").split("@")[0];

  const heading = isNewUser
    ? `Welcome, ${displayName}.`
    : `Welcome back, ${displayName}.`;

  const subline = loading
    ? "Loading your workspace…"
    : isNewUser
    ? "Let’s set up your first innovation record."
    : `${stats.submissions} submission${stats.submissions === 1 ? "" : "s"}` +
      `, ${stats.drafts} draft${stats.drafts === 1 ? "" : "s"} in progress, ` +
      `${stats.files} file${stats.files === 1 ? "" : "s"} attached.`;

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", p: { xs: 2.5, sm: 4 } }}>
      {/* Greeting */}
      <Box mb={4}>
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: 28, sm: 38 },
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: "text.primary",
          }}
        >
          {heading}
        </Typography>
        <Typography sx={{ mt: 1, color: "text.secondary", fontSize: { xs: 14, sm: 15 } }}>
          {subline}
        </Typography>
      </Box>

      {/* Stat tiles */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
          gap: 2,
          mb: 4,
        }}
      >
        <StatTile
          label="Submissions"
          value={loading ? null : stats.submissions}
          icon={<InventoryOutlinedIcon sx={{ fontSize: 18 }} />}
          accent="primary.main"
          onClick={onBrowse}
        />
        <StatTile
          label="Drafts in progress"
          value={loading ? null : stats.drafts}
          icon={<DraftsOutlinedIcon sx={{ fontSize: 18 }} />}
          accent="secondary.main"
          onClick={drafts.length ? () => onResumeDraft(drafts[0]) : onNew}
        />
        <StatTile
          label="Files attached"
          value={loading ? null : stats.files}
          icon={<FolderOutlinedIcon sx={{ fontSize: 18 }} />}
          accent="#B7950B"
        />
        <StatTile
          label="Last submission"
          value={loading ? null : stats.lastSubmission ? timeAgo(stats.lastSubmission) : "—"}
          icon={<HistoryOutlinedIcon sx={{ fontSize: 18 }} />}
          accent="text.secondary"
          valueFontSize={20}
        />
      </Box>

      {/* Contextual section */}
      {loading ? (
        <Skeleton variant="rounded" height={220} />
      ) : isNewUser ? (
        <OnboardingPanel onStart={onNew} />
      ) : (
        <ActivityPanel
          submissions={submissions.slice(0, 5)}
          drafts={drafts.slice(0, 4)}
          onResumeDraft={onResumeDraft}
          onEditInnovation={onEditInnovation}
          onBrowseAll={onBrowse}
        />
      )}

      {/* Footer CTAs — only for returning users; new users get their CTA from OnboardingPanel above. */}
      {!loading && !isNewUser && (
        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} mt={4} alignItems={{ sm: "center" }}>
          <Button
            variant="contained"
            disableElevation
            startIcon={<AddCircleOutlineIcon />}
            onClick={onNew}
            sx={{
              minHeight: 44, fontWeight: 600, borderRadius: 1.25, px: 2.5,
            }}
          >
            Start new innovation
          </Button>
          <Button
            variant="outlined"
            startIcon={<ViewModuleIcon />}
            onClick={onBrowse}
            sx={{
              minHeight: 44, fontWeight: 600, borderRadius: 1.25, px: 2.5,
              borderColor: "rgba(14, 59, 92, 0.25)", color: "primary.main",
            }}
          >
            Browse all in grid
          </Button>
        </Stack>
      )}
    </Box>
  );
}

// ─── Building blocks ────────────────────────────────────────────────────────

function StatTile({
  label, value, icon, accent, onClick, valueFontSize = 32,
}: {
  label: string; value: number | string | null;
  icon: React.ReactNode; accent: string;
  onClick?: () => void; valueFontSize?: number;
}) {
  const content = (
    <Box
      sx={{
        position: "relative",
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "rgba(14, 59, 92, 0.12)",
        borderRadius: 2,
        p: 2,
        height: "100%",
        transition: "border-color .15s, transform .15s",
        "&:hover": onClick ? { borderColor: "rgba(14, 59, 92, 0.32)" } : {},
      }}
    >
      <Stack direction="row" alignItems="center" gap={0.75} mb={1}>
        <Box sx={{ color: accent, display: "inline-flex" }}>{icon}</Box>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontFamily: '"Roboto Mono", ui-monospace, monospace',
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontSize: 10.5,
          }}
        >
          {label}
        </Typography>
      </Stack>
      {value === null ? (
        <Skeleton variant="text" width="60%" height={valueFontSize * 1.2} />
      ) : (
        <Typography
          sx={{
            fontSize: valueFontSize,
            fontWeight: 700,
            lineHeight: 1.05,
            color: "primary.main",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </Typography>
      )}
    </Box>
  );
  if (onClick) {
    return (
      <CardActionArea
        onClick={onClick}
        sx={{ borderRadius: 2, height: "100%", "&:hover .MuiBox-root": {} }}
      >
        {content}
      </CardActionArea>
    );
  }
  return content;
}

function OnboardingPanel({ onStart }: { onStart: () => void }) {
  const steps = [
    {
      n: 1, title: "Open the form",
      body: "Click ‘Start my first innovation’ below. You’ll walk through nine focused sections — identification, geography, testing, impact, raw data, and more.",
    },
    {
      n: 2, title: "Use the controlled vocabularies",
      body: "Dropdowns are anchored to the MFL taxonomy so analysts can trust the data. Pick ‘Other (specify)’ when nothing fits and add your value inline.",
    },
    {
      n: 3, title: "Attach datasets and geometry",
      body: "Upload curated CSV/Excel/Word/PDF files at the raw-data step. Draw site polygons or upload GeoJSON / Shapefile in the geography step — both land in your private Supabase bucket.",
    },
    {
      n: 4, title: "Save drafts, submit when ready",
      body: "Save Draft at any step (drafts persist in your account). Submit when the required fields are green and the geometry is named. You can edit any submission later from the Sent tab.",
    },
  ];
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "rgba(14, 59, 92, 0.12)",
        borderRadius: 2,
        p: { xs: 2.5, sm: 3 },
      }}
    >
      <Stack direction="row" alignItems="baseline" gap={1} mb={2}>
        <Typography component="h2" sx={{ fontSize: 18, fontWeight: 700, color: "primary.main" }}>
          How to create your first innovation
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          ~ 10 minutes
        </Typography>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
          gap: { xs: 2, md: 2.5 },
        }}
      >
        {steps.map(s => (
          <Stack key={s.n} direction="row" gap={1.5}>
            <Box
              sx={{
                flexShrink: 0, width: 28, height: 28, borderRadius: "50%",
                display: "grid", placeItems: "center",
                bgcolor: "rgba(14, 59, 92, 0.08)",
                color: "primary.main",
                fontWeight: 700, fontSize: 13,
                fontFamily: '"Roboto Mono", ui-monospace, monospace',
              }}
            >
              {s.n}
            </Box>
            <Box>
              <Typography sx={{ fontSize: 14.5, fontWeight: 600, color: "primary.main", mb: 0.25 }}>
                {s.title}
              </Typography>
              <Typography sx={{ fontSize: 13, color: "text.secondary", lineHeight: 1.55 }}>
                {s.body}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Box>

      <Divider sx={{ my: 3 }} />

      <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
        <Button
          variant="contained" disableElevation
          startIcon={<AddCircleOutlineIcon />}
          onClick={onStart}
          sx={{ minHeight: 44, fontWeight: 600, borderRadius: 1.25 }}
        >
          Start my first innovation
        </Button>
        <Typography variant="caption" color="text.secondary">
          Stuck on something? Email{" "}
          <Box component="a" href="mailto:adama.ndour@cgiar.org" sx={{ color: "primary.main", textDecoration: "none" }}>
            adama.ndour@cgiar.org
          </Box>{" "}
          and we’ll help.
        </Typography>
      </Stack>
    </Box>
  );
}

function ActivityPanel({
  submissions, drafts, onResumeDraft, onEditInnovation, onBrowseAll,
}: {
  submissions: SubmissionRow[]; drafts: DraftRow[];
  onResumeDraft: (d: DraftRow) => void;
  onEditInnovation: (s: SubmissionRow) => void;
  onBrowseAll: () => void;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1.4fr 1fr" },
        gap: 2,
      }}
    >
      <PanelCard title="Recent submissions" count={submissions.length}>
        {submissions.length === 0 ? (
          <EmptyPanelMessage text="No submissions yet." />
        ) : (
          <Stack divider={<Divider flexItem />} sx={{ "& > *": { py: 1.25 } }}>
            {submissions.map(s => (
              <Stack key={s.id} direction="row" gap={1.5} alignItems="center">
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography
                    sx={{ fontSize: 14, fontWeight: 600, color: "primary.main", lineHeight: 1.3 }}
                    noWrap
                  >
                    {s.innovation_description?.slice(0, 90) ?? s.innovation_id ?? "(unnamed)"}
                  </Typography>
                  <Stack direction="row" gap={1} alignItems="center" mt={0.25} flexWrap="wrap">
                    {s.country && (
                      <Chip
                        size="small" variant="outlined" label={s.country}
                        sx={{ height: 18, fontSize: 10.5, "& .MuiChip-label": { px: 0.75 } }}
                      />
                    )}
                    {s.region && (
                      <Chip
                        size="small" variant="outlined" label={s.region}
                        sx={{ height: 18, fontSize: 10.5, "& .MuiChip-label": { px: 0.75 } }}
                      />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {fmtFullDate(s.submitted_at)} · {timeAgo(s.submitted_at)}
                    </Typography>
                  </Stack>
                </Box>
                <Button
                  size="small" variant="text" startIcon={<EditOutlinedIcon />}
                  onClick={() => onEditInnovation(s)}
                  sx={{ color: "primary.main", flexShrink: 0 }}
                >
                  Edit
                </Button>
              </Stack>
            ))}
          </Stack>
        )}
        {submissions.length > 0 && (
          <Button
            size="small" variant="text" endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
            onClick={onBrowseAll}
            sx={{ alignSelf: "flex-start", mt: 1.5, color: "primary.main", fontWeight: 600 }}
          >
            View all in grid
          </Button>
        )}
      </PanelCard>

      <PanelCard title="Active drafts" count={drafts.length}>
        {drafts.length === 0 ? (
          <EmptyPanelMessage text="No drafts in progress." />
        ) : (
          <Stack divider={<Divider flexItem />} sx={{ "& > *": { py: 1.25 } }}>
            {drafts.map(d => (
              <Stack key={d.id} direction="row" gap={1.5} alignItems="center">
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography
                    sx={{ fontSize: 14, fontWeight: 600, color: "primary.main", lineHeight: 1.3 }}
                    noWrap
                  >
                    {d.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Updated {timeAgo(d.updated_at)}
                  </Typography>
                </Box>
                <Button
                  size="small" variant="text"
                  onClick={() => onResumeDraft(d)}
                  sx={{ color: "primary.main", flexShrink: 0, fontWeight: 600 }}
                >
                  Resume
                </Button>
              </Stack>
            ))}
          </Stack>
        )}
      </PanelCard>
    </Box>
  );
}

function PanelCard({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: "rgba(14, 59, 92, 0.12)",
        boxShadow: "0 6px 20px rgba(14, 59, 92, 0.04)",
        p: { xs: 2, sm: 2.5 },
      }}
    >
      <Stack direction="row" alignItems="baseline" gap={1} mb={1.5}>
        <Typography component="h2" sx={{ fontSize: 14.5, fontWeight: 700, color: "primary.main" }}>
          {title}
        </Typography>
        {typeof count === "number" && (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {count}
          </Typography>
        )}
      </Stack>
      <Box sx={{ display: "flex", flexDirection: "column" }}>{children}</Box>
    </Card>
  );
}

function EmptyPanelMessage({ text }: { text: string }) {
  return (
    <Typography variant="body2" sx={{ color: "text.disabled", py: 2, textAlign: "center" }}>
      {text}
    </Typography>
  );
}
