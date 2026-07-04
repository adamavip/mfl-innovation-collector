"use client";
import Link from "next/link";
import { Box, Button, Stack, Typography } from "@mui/material";

// ── Folio palette ────────────────────────────────────────────────────────────
// Single source of truth for the design language shared across the landing page,
// the login screen and the dashboard chrome.
export const PEACH = "#F7E1CF";
export const CREAM = "#FAF5EF";
export const INK = "#16133A";
export const INK_SOFT = "#5B5870";
export const INDIGO = "#5341E8";
export const INDIGO_DK = "#3F2FC4";
export const NAVY = "#141033";
export const HAIRLINE = "rgba(22, 19, 58, 0.10)";

export const DISPLAY =
  'var(--font-display), "Plus Jakarta Sans", system-ui, sans-serif';

// ── Logo ─────────────────────────────────────────────────────────────────────
export function Logo({ onDark = false }: { onDark?: boolean }) {
  return (
    <Stack direction="row" alignItems="center" gap={1.15} sx={{ flexShrink: 0 }}>
      <Box
        component="img"
        src="/mic2.svg"
        alt="MFL Innovation Collector logo"
        sx={{ height: 36, width: "auto", display: "block" }}
      />
      <Typography
        sx={{
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: 19,
          letterSpacing: "0.02em",
          color: onDark ? "#fff" : INK,
        }}
      >
        MIC
        <Box component="span" sx={{ color: onDark ? "#A99CFF" : INDIGO }}>
          .
        </Box>
      </Typography>
    </Stack>
  );
}

// ── Pill button ──────────────────────────────────────────────────────────────
export function PillButton({
  href,
  children,
  variant = "indigo",
  endIcon,
  ...rest
}: {
  href?: string;
  children: React.ReactNode;
  variant?: "indigo" | "navy" | "ghost" | "white";
  endIcon?: React.ReactNode;
} & Record<string, any>) {
  const styles: Record<string, any> = {
    indigo: { bgcolor: INDIGO, color: "#fff", "&:hover": { bgcolor: INDIGO_DK } },
    navy: { bgcolor: NAVY, color: "#fff", "&:hover": { bgcolor: "#0c0922" } },
    white: { bgcolor: "#fff", color: INK, "&:hover": { bgcolor: "#F1F1F8" } },
    ghost: {
      bgcolor: "transparent",
      color: INK,
      border: "1.5px solid rgba(22,19,58,0.18)",
      "&:hover": { borderColor: INK, bgcolor: "transparent" },
    },
  };
  return (
    <Button
      {...(href ? { component: Link, href } : {})}
      disableElevation
      endIcon={endIcon}
      sx={{
        borderRadius: 999,
        px: 3.25,
        py: 1.25,
        minHeight: 50,
        fontSize: 15,
        fontWeight: 700,
        fontFamily: DISPLAY,
        textTransform: "none",
        boxShadow: "none",
        transition:
          "transform .18s cubic-bezier(.2,.8,.2,1), background-color .18s",
        "&:hover": { transform: "translateY(-1px)" },
        ...styles[variant],
      }}
      {...rest}
    >
      {children}
    </Button>
  );
}

// ── Eyebrow (short rule + tracked label) ─────────────────────────────────────
export function Eyebrow({ label, light = false }: { label: string; light?: boolean }) {
  const c = light ? "rgba(255,255,255,0.85)" : INDIGO;
  return (
    <Stack direction="row" alignItems="center" gap={1.25}>
      <Box sx={{ width: 30, height: 2, bgcolor: c, borderRadius: 2 }} />
      <Typography
        sx={{
          fontFamily: DISPLAY,
          fontSize: 12.5,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: c,
        }}
      >
        {label}
      </Typography>
    </Stack>
  );
}

// ── Shared top navigation ────────────────────────────────────────────────────
export type NavLink = { label: string; href: string; active?: boolean };

export function FolioNav({
  links = [],
  cta,
  onDark = false,
  maxWidth = 1320,
}: {
  links?: NavLink[];
  cta?: { label: string; href: string };
  onDark?: boolean;
  maxWidth?: number | string;
}) {
  const linkColor = onDark ? "rgba(255,255,255,0.72)" : INK_SOFT;
  const linkActive = onDark ? "#fff" : INK;
  return (
    <Box component="nav" sx={{ width: "100%" }}>
      <Stack
        direction="row"
        alignItems="center"
        sx={{
          maxWidth,
          mx: "auto",
          px: { xs: 2.5, md: 5 },
          py: { xs: 2, md: 2.75 },
        }}
      >
        <Box component={Link} href="/" aria-label="Home" sx={{ textDecoration: "none" }}>
          <Logo onDark={onDark} />
        </Box>

        <Stack
          direction="row"
          gap={3.5}
          sx={{
            flexGrow: 1,
            justifyContent: "center",
            display: { xs: "none", md: "flex" },
          }}
        >
          {links.map((l) => (
            <Box
              key={l.href}
              component={l.href.startsWith("#") ? "a" : Link}
              href={l.href}
              sx={{
                fontFamily: DISPLAY,
                fontSize: 14.5,
                fontWeight: l.active ? 700 : 600,
                color: l.active ? linkActive : linkColor,
                textDecoration: "none",
                transition: "color .15s",
                "&:hover": { color: linkActive },
              }}
            >
              {l.label}
            </Box>
          ))}
        </Stack>

        <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />

        {/* Compact link row on mobile, where the centred row is hidden */}
        <Stack
          direction="row"
          gap={2.5}
          alignItems="center"
          sx={{ display: { xs: "flex", md: "none" }, mr: cta ? 2 : 0 }}
        >
          {links
            .filter((l) => l.active || l.label.toLowerCase() === "home")
            .slice(0, 1)
            .map((l) => (
              <Box
                key={l.href}
                component={l.href.startsWith("#") ? "a" : Link}
                href={l.href}
                sx={{
                  fontFamily: DISPLAY,
                  fontSize: 14,
                  fontWeight: 600,
                  color: linkActive,
                  textDecoration: "none",
                }}
              >
                {l.label}
              </Box>
            ))}
        </Stack>

        {cta && (
          <Button
            component={Link}
            href={cta.href}
            disableElevation
            sx={{
              borderRadius: 999,
              px: 2.75,
              py: 1,
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: 14.5,
              textTransform: "none",
              color: "#fff",
              bgcolor: onDark ? INDIGO : INK,
              "&:hover": { bgcolor: NAVY },
            }}
          >
            {cta.label}
          </Button>
        )}
      </Stack>
    </Box>
  );
}
