"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Divider, Drawer, IconButton, List, ListItem, ListItemButton,
  ListItemText, Stack, Tab, Tabs, Tooltip, Typography, Chip, CircularProgress,
  Dialog, DialogContent, DialogTitle, Table, TableBody, TableCell, TableHead, TableRow,
} from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import DraftsIcon from "@mui/icons-material/Drafts";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import MapIcon from "@mui/icons-material/Map";

import { supabase } from "@/lib/supabase";
import { RowData, COLS } from "@/lib/taxonomy";

export const SIDEBAR_WIDTH = 320;
export const COLLAPSED_WIDTH = 48;

interface Draft { id: string; name: string; rows: RowData[]; updated_at: string }
interface Attachment { filename: string; mime_type?: string; size_bytes?: number; path: string; description?: string }
interface Extras {
  attachments?: Attachment[];
  geometry?: { type: "FeatureCollection"; features: any[] } | null;
  geometry_file_path?: string;
}
type Submitted = RowData & {
  id: string;
  submitted_at: string;
  extras?: Extras | null;
};
interface FileItem extends Attachment {
  innovation_id: string;
  innovation_description?: string | null;
  submitted_at: string;
}

async function downloadFromStorage(path: string, filename: string) {
  const { data, error } = await supabase.storage.from("mfl").createSignedUrl(path, 60);
  if (error || !data) { alert(`Could not get download link: ${error?.message ?? "unknown error"}`); return; }
  const a = document.createElement("a");
  a.href = data.signedUrl; a.download = filename; a.target = "_blank"; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
}

interface Props {
  open: boolean;
  onToggle: () => void;
  onLoadDraft: (draft: Draft) => void;
  onLoadInnovation?: (innov: Submitted) => void;
  reloadKey: number;
}

function downloadInnovationAsJson(innov: Submitted) {
  const blob = new Blob([JSON.stringify(innov, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const base = String(innov.innovation_description ?? innov.innovation_id ?? innov.id ?? "innovation").replace(/[^\w.\-]/g, "_");
  a.download = `${base}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(a.href);
}

export function SidePanel({ open, onToggle, onLoadDraft, onLoadInnovation, reloadKey }: Props) {
  const [tab, setTab] = useState(0);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [submitted, setSubmitted] = useState<Submitted[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<Submitted | null>(null);

  async function refresh() {
    setLoading(true);
    const [d, s] = await Promise.all([
      supabase.from("drafts").select("*").order("updated_at", { ascending: false }),
      supabase.from("innovations").select("*").order("submitted_at", { ascending: false }),
    ]);
    if (d.data) setDrafts(d.data as Draft[]);
    if (s.data) setSubmitted(s.data as Submitted[]);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, [reloadKey]);

  async function deleteDraft(id: string) {
    if (!confirm("Delete this draft?")) return;
    await supabase.from("drafts").delete().eq("id", id);
    refresh();
  }

  const files = useMemo<FileItem[]>(() => submitted.flatMap(s =>
    (s.extras?.attachments ?? []).map(a => ({
      ...a,
      innovation_id: String(s.innovation_id ?? s.id),
      innovation_description: (s.innovation_description as string | null | undefined) ?? null,
      submitted_at: s.submitted_at,
    }))
  ), [submitted]);

  return (
    <>
      <Drawer
        variant="permanent" anchor="left"
        sx={{
          width: open ? SIDEBAR_WIDTH : COLLAPSED_WIDTH,
          flexShrink: 0,
          transition: "width .2s",
          "& .MuiDrawer-paper": {
            width: open ? SIDEBAR_WIDTH : COLLAPSED_WIDTH,
            transition: "width .2s",
            overflowX: "hidden",
            boxSizing: "border-box",
            top: 48, height: "calc(100vh - 48px)",
          },
        }}
      >
        {!open ? (
          <Stack alignItems="center" pt={1} gap={1}>
            <Tooltip title="Expand panel" placement="right">
              <IconButton onClick={onToggle} size="small"><ChevronRightIcon /></IconButton>
            </Tooltip>
            <Tooltip title="Drafts" placement="right">
              <IconButton size="small" onClick={() => { onToggle(); setTab(0); }}><DraftsIcon /></IconButton>
            </Tooltip>
            <Tooltip title="Submitted" placement="right">
              <IconButton size="small" onClick={() => { onToggle(); setTab(1); }}><CheckCircleIcon /></IconButton>
            </Tooltip>
            <Tooltip title="Files" placement="right">
              <IconButton size="small" onClick={() => { onToggle(); setTab(2); }}><FolderOpenIcon /></IconButton>
            </Tooltip>
          </Stack>
        ) : (
          <Box>
            <Stack direction="row" alignItems="center" px={1.5} py={1} borderBottom={1} borderColor="divider">
              <Typography variant="overline" sx={{ flexGrow: 1, letterSpacing: 1 }}>Workspace</Typography>
              <IconButton size="small" onClick={refresh}><RefreshIcon fontSize="small" /></IconButton>
              <IconButton size="small" onClick={onToggle}><ChevronLeftIcon /></IconButton>
            </Stack>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ minHeight: 40 }}>
              <Tab sx={{ minHeight: 40 }} icon={<DraftsIcon fontSize="small" />}      iconPosition="start" label="Drafts" />
              <Tab sx={{ minHeight: 40 }} icon={<CheckCircleIcon fontSize="small" />} iconPosition="start" label="Sent" />
              <Tab sx={{ minHeight: 40 }} icon={<FolderOpenIcon fontSize="small" />}  iconPosition="start" label="Files" />
            </Tabs>
            <Divider />

            {tab === 0 && (
              <Box>
                {loading ? <Box p={2}><CircularProgress size={18} /></Box> :
                 drafts.length === 0 ? <Typography variant="body2" color="text.secondary" p={2}>No drafts yet.</Typography> :
                 <List dense disablePadding>
                   {drafts.map(d => (
                     <ListItem key={d.id} disablePadding
                       secondaryAction={
                         <IconButton edge="end" size="small" onClick={() => deleteDraft(d.id)}>
                           <DeleteOutlineIcon fontSize="small" />
                         </IconButton>
                       }>
                       <ListItemButton onClick={() => onLoadDraft(d)}>
                         <ListItemText
                           primary={d.name}
                           secondary={`${(d.rows ?? []).filter(r => Object.keys(r).length).length} row(s) · ${new Date(d.updated_at).toLocaleString()}`}
                           primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
                           secondaryTypographyProps={{ variant: "caption" }}
                         />
                       </ListItemButton>
                     </ListItem>
                   ))}
                 </List>}
              </Box>
            )}

            {tab === 1 && (
              <Box>
                {loading ? <Box p={2}><CircularProgress size={18} /></Box> :
                 submitted.length === 0 ? <Typography variant="body2" color="text.secondary" p={2}>Nothing submitted yet.</Typography> :
                 <List dense disablePadding>
                   {submitted.map(s => (
                     <ListItem key={s.id} disablePadding>
                       <ListItemButton onClick={() => setViewing(s)}>
                         <ListItemText
                           primary={s.innovation_description ?? s.innovation_id ?? "(unnamed)"}
                           secondary={
                             <Stack direction="row" gap={0.5} alignItems="center" component="span">
                               {s.region && <Chip size="small" label={String(s.region)} sx={{ height: 18, fontSize: 10 }} />}
                               {s.country && <Chip size="small" label={String(s.country)} sx={{ height: 18, fontSize: 10 }} />}
                               <span style={{ fontSize: 10, color: "#888" }}>{new Date(s.submitted_at).toLocaleDateString()}</span>
                             </Stack>
                           }
                           primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
                           secondaryTypographyProps={{ component: "div" }}
                         />
                       </ListItemButton>
                     </ListItem>
                   ))}
                 </List>}
              </Box>
            )}

            {tab === 2 && (
              <Box>
                {loading ? <Box p={2}><CircularProgress size={18} /></Box> :
                 files.length === 0 ? <Typography variant="body2" color="text.secondary" p={2}>No files uploaded yet.</Typography> :
                 <List dense disablePadding>
                   {files.map((f, i) => (
                     <ListItem key={`${f.path}-${i}`} disablePadding
                       secondaryAction={
                         <IconButton edge="end" size="small" onClick={() => downloadFromStorage(f.path, f.filename)}>
                           <DownloadIcon fontSize="small" />
                         </IconButton>
                       }>
                       <ListItemButton onClick={() => downloadFromStorage(f.path, f.filename)}>
                         <ListItemText
                           primary={f.filename}
                           secondary={
                             <span>
                               {f.size_bytes ? `${(f.size_bytes / 1024).toFixed(1)} KB · ` : ""}
                               {f.innovation_description ?? f.innovation_id} · {new Date(f.submitted_at).toLocaleDateString()}
                             </span>
                           }
                           primaryTypographyProps={{ variant: "body2", fontWeight: 500, noWrap: true }}
                           secondaryTypographyProps={{ variant: "caption", component: "div" }}
                         />
                       </ListItemButton>
                     </ListItem>
                   ))}
                 </List>}
              </Box>
            )}
          </Box>
        )}
      </Drawer>

      <Dialog open={!!viewing} onClose={() => setViewing(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pr: 1 }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography component="span" noWrap variant="h6">
              {viewing?.innovation_description ?? viewing?.innovation_id}
            </Typography>
          </Box>
          {viewing && onLoadInnovation && (
            <Button
              size="small" variant="outlined" startIcon={<EditIcon />}
              onClick={() => { const v = viewing; setViewing(null); onLoadInnovation(v); }}
            >
              Edit
            </Button>
          )}
          {viewing && (
            <Button
              size="small" variant="outlined" color="success" startIcon={<SaveAltIcon />}
              onClick={() => downloadInnovationAsJson(viewing)}
            >
              Download
            </Button>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {viewing && (
            <>
              {(viewing.extras?.attachments?.length ?? 0) > 0 && (
                <Box mb={3}>
                  <Typography variant="subtitle2" mb={1}>Raw data attachments</Typography>
                  <Stack gap={0.75}>
                    {viewing.extras!.attachments!.map((a, i) => (
                      <Stack key={i} direction="row" alignItems="center" gap={1}
                             sx={{ border: 1, borderColor: "divider", borderRadius: 1, px: 1.5, py: 1 }}>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="body2" noWrap>{a.filename}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {a.size_bytes ? `${(a.size_bytes / 1024).toFixed(1)} KB` : ""}
                            {a.description ? ` · ${a.description}` : ""}
                          </Typography>
                        </Box>
                        <IconButton size="small" onClick={() => downloadFromStorage(a.path, a.filename)}>
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}

              {viewing.extras?.geometry && (viewing.extras.geometry.features?.length ?? 0) > 0 && (
                <Box mb={3}>
                  <Stack direction="row" alignItems="center" gap={1} mb={1}>
                    <MapIcon fontSize="small" color="action" />
                    <Typography variant="subtitle2">Additional geometry</Typography>
                    <Chip size="small" variant="outlined" label={`${viewing.extras.geometry.features.length} feature(s)`} />
                    <Box sx={{ flexGrow: 1 }} />
                    {viewing.extras.geometry_file_path && (
                      <Button size="small" variant="outlined" startIcon={<DownloadIcon />}
                              onClick={() => downloadFromStorage(viewing.extras!.geometry_file_path!, "geometry.geojson")}>
                        geometry.geojson
                      </Button>
                    )}
                  </Stack>
                  <Box component="pre" sx={{
                    bgcolor: "grey.100", border: 1, borderColor: "divider", borderRadius: 1,
                    p: 1.5, fontSize: 11, maxHeight: 180, overflow: "auto",
                  }}>
                    {JSON.stringify(viewing.extras.geometry, null, 2)}
                  </Box>
                </Box>
              )}

              <Table size="small">
                <TableHead>
                  <TableRow><TableCell>Field</TableCell><TableCell>Value</TableCell></TableRow>
                </TableHead>
                <TableBody>
                  {COLS.map(c => (
                    <TableRow key={c.field}>
                      <TableCell sx={{ color: "text.secondary", width: 280 }}>{c.field}</TableCell>
                      <TableCell>{String((viewing as any)[c.field] ?? "—")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
