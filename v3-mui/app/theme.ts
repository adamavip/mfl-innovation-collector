"use client";
import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary:   { main: "#0E3B5C" },
    secondary: { main: "#0E6655" },
    background:{ default: "#F5F7FA", paper: "#FFFFFF" },
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 600 },
  },
});
