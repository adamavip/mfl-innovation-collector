"use client";
import { createTheme } from "@mui/material/styles";

// ── Folio design tokens (shared with lib/folio.tsx) ──────────────────────────
const INK = "#16133A";
const INK_SOFT = "#5B5870";
const INDIGO = "#5341E8";
const INDIGO_DK = "#3F2FC4";
const NAVY = "#141033";

const DISPLAY =
  'var(--font-display), "Plus Jakarta Sans", Roboto, "Helvetica Neue", Arial, sans-serif';

export const theme = createTheme({
  palette: {
    mode: "light",
    primary:   { main: INDIGO, dark: INDIGO_DK, contrastText: "#ffffff" },
    secondary: { main: NAVY, contrastText: "#ffffff" },
    text:      { primary: INK, secondary: INK_SOFT },
    background:{ default: "#FAF5EF", paper: "#FFFFFF" },
    divider:   "rgba(22, 19, 58, 0.10)",
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: DISPLAY,
    h1: { fontWeight: 800, letterSpacing: "-0.03em" },
    h2: { fontWeight: 800, letterSpacing: "-0.02em" },
    h3: { fontWeight: 800, letterSpacing: "-0.02em" },
    button: { textTransform: "none", fontWeight: 700 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
  },
});
