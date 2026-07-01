"use client";
import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Chip, IconButton, Stack, TextField, Typography } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MyLocationIcon from "@mui/icons-material/MyLocation";

import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";

const MB_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
if (MB_TOKEN) mapboxgl.accessToken = MB_TOKEN;

interface GeoJSONFC { type: "FeatureCollection"; features: any[] }

interface Props {
  value: GeoJSONFC | null;
  onChange: (g: GeoJSONFC | null) => void;
  /** Called with the raw uploaded file (.geojson/.json/.zip) after it parses,
   *  so the caller can keep the original alongside the parsed geometry. */
  onSourceFile?: (file: File) => void;
}

function computeBounds(fc: GeoJSONFC): [[number, number], [number, number]] | null {
  let minLng =  Infinity, minLat =  Infinity;
  let maxLng = -Infinity, maxLat = -Infinity;
  const walk = (c: any) => {
    if (typeof c[0] === "number" && typeof c[1] === "number") {
      minLng = Math.min(minLng, c[0]); maxLng = Math.max(maxLng, c[0]);
      minLat = Math.min(minLat, c[1]); maxLat = Math.max(maxLat, c[1]);
    } else c.forEach(walk);
  };
  for (const f of fc.features) if (f.geometry?.coordinates) walk(f.geometry.coordinates);
  if (!isFinite(minLng)) return null;
  return [[minLng, minLat], [maxLng, maxLat]];
}

export function GeographyWidget({ value, onChange, onSourceFile }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<{ id: string; type: string; name: string }[]>(
    () => (value?.features ?? []).map((f: any) => ({
      id: String(f.id ?? ""),
      type: f.geometry?.type ?? "Unknown",
      name: (f.properties?.name as string) ?? "",
    }))
  );
  const count = rows.length;

  useEffect(() => {
    if (!containerRef.current) return;
    if (!MB_TOKEN) {
      setError("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is not set — add it to v3-mui/.env.local and restart the dev server.");
      return;
    }

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-v8",
      center: [20, 5],
      zoom: 2,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-left");

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, line_string: true, point: true, trash: true },
    });
    map.addControl(draw as any, "top-left");

    const geocoder = new MapboxGeocoder({
      accessToken: MB_TOKEN,
      mapboxgl: mapboxgl as any,
      marker: false,
      placeholder: "Search a place…",
      collapsed: false,
    });
    map.addControl(geocoder as any, "top-right");

    const recompute = () => {
      const fc = draw.getAll() as GeoJSONFC;
      setRows(fc.features.map((f: any) => ({
        id: String(f.id),
        type: f.geometry?.type ?? "Unknown",
        name: (f.properties?.name as string) ?? "",
      })));
      onChange(fc.features.length ? fc : null);
    };
    map.on("draw.create", recompute);
    map.on("draw.update", recompute);
    map.on("draw.delete", recompute);

    map.on("load", () => {
      if (value && value.features?.length) {
        draw.add(value as any);
        const b = computeBounds(value);
        if (b) map.fitBounds(b, { padding: 40, maxZoom: 12 });
        recompute();
      }
    });

    mapRef.current = map;
    drawRef.current = draw;
    return () => { map.remove(); mapRef.current = null; drawRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    try {
      let gj: any;
      if (/\.zip$/i.test(f.name)) {
        const shp = (await import("shpjs")).default;
        gj = await shp(await f.arrayBuffer());
      } else if (/\.(geojson|json)$/i.test(f.name)) {
        gj = JSON.parse(await f.text());
      } else {
        setError("Use a .geojson, .json, or zipped shapefile (.zip).");
        return;
      }
      if (gj.type === "Feature") gj = { type: "FeatureCollection", features: [gj] };
      else if (gj.type !== "FeatureCollection") {
        gj = { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: gj }] };
      }

      const draw = drawRef.current;
      const map = mapRef.current;
      if (!draw || !map) return;
      draw.deleteAll();
      draw.add(gj);
      const b = computeBounds(gj);
      if (b) map.fitBounds(b, { padding: 40, maxZoom: 12 });
      const fc = draw.getAll() as GeoJSONFC;
      setRows(fc.features.map((f: any) => ({
        id: String(f.id),
        type: f.geometry?.type ?? "Unknown",
        name: (f.properties?.name as string) ?? "",
      })));
      onChange(fc.features.length ? fc : null);
      // Keep the original upload too, not just the parsed geometry.
      onSourceFile?.(f);
    } catch (err: any) {
      setError(`Failed to parse: ${err?.message ?? err}`);
    }
    e.target.value = "";
  }

  function clearAll() {
    drawRef.current?.deleteAll();
    setRows([]);
    onChange(null);
  }

  function renameFeature(id: string, name: string) {
    const draw = drawRef.current;
    if (!draw) return;
    draw.setFeatureProperty(id, "name", name);
    setRows(prev => prev.map(r => r.id === id ? { ...r, name } : r));
    const fc = draw.getAll() as GeoJSONFC;
    onChange(fc.features.length ? fc : null);
  }

  function deleteFeature(id: string) {
    const draw = drawRef.current;
    if (!draw) return;
    draw.delete(id);
    setRows(prev => prev.filter(r => r.id !== id));
    const fc = draw.getAll() as GeoJSONFC;
    onChange(fc.features.length ? fc : null);
  }

  function flyTo(id: string) {
    const draw = drawRef.current;
    const map = mapRef.current;
    if (!draw || !map) return;
    const f = draw.get(id);
    if (!f) return;
    const b = computeBounds({ type: "FeatureCollection", features: [f] });
    if (b) map.fitBounds(b, { padding: 60, maxZoom: 14, duration: 600 });
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" gap={1} mb={1} flexWrap="wrap">
        <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
          Search a place (top-right), draw with the toolbar (top-left), or upload a GeoJSON / zipped Shapefile.
        </Typography>
        <Chip size="small" label={`${count} feature(s)`} color={count > 0 ? "primary" : "default"} variant="outlined" />
      </Stack>

      <Box ref={containerRef} sx={{ height: 440, borderRadius: 1, border: 1, borderColor: "divider", overflow: "hidden" }} />

      <Stack direction="row" gap={1} mt={1.5} flexWrap="wrap">
        <Button component="label" variant="outlined" size="small" startIcon={<UploadFileIcon />}>
          Upload GeoJSON / Shapefile
          <input type="file" hidden accept=".geojson,.json,.zip" onChange={onFile} />
        </Button>
        <Button variant="outlined" color="error" size="small" startIcon={<DeleteSweepIcon />} onClick={clearAll} disabled={count === 0}>
          Clear
        </Button>
      </Stack>

      {rows.length > 0 && (
        <Box mt={2}>
          <Typography variant="subtitle2" mb={1}>Name your features</Typography>
          <Stack gap={0.75}>
            {rows.map((r, i) => (
              <Stack key={r.id} direction="row" alignItems="center" gap={1}
                     sx={{ border: 1, borderColor: "divider", borderRadius: 1, px: 1, py: 0.5 }}>
                <Chip size="small" variant="outlined" label={`#${i + 1} · ${r.type}`} sx={{ minWidth: 110 }} />
                <TextField
                  size="small" fullWidth placeholder="e.g. North field, Trial site A, Watershed boundary"
                  value={r.name}
                  onChange={e => renameFeature(r.id, e.target.value)}
                />
                <IconButton size="small" onClick={() => flyTo(r.id)} title="Zoom to feature">
                  <MyLocationIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => deleteFeature(r.id)} title="Delete feature">
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>{error}</Alert>}
    </Box>
  );
}
