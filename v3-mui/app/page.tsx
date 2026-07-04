"use client";
import { useEffect, useRef, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import {
  PEACH, INK, INK_SOFT, INDIGO, INDIGO_DK, NAVY, DISPLAY,
  Eyebrow, PillButton, FolioNav,
} from "@/lib/folio";

// ── Isometric cube (3 faces, absolute coords so CSS float never clobbers it) ──
function poly(pts: number[][], fill: string) {
  return <polygon points={pts.map(p => p.join(",")).join(" ")} fill={fill} />;
}
function Cube({
  x, y, w, h, top, left, right, cls, spin,
}: { x: number; y: number; w: number; h: number; top: string; left: string; right: string; cls?: string; spin?: string }) {
  const T = [[x, y], [x + w, y + w / 2], [x, y + w], [x - w, y + w / 2]];
  const L = [[x - w, y + w / 2], [x, y + w], [x, y + w + h], [x - w, y + w / 2 + h]];
  const R = [[x, y + w], [x + w, y + w / 2], [x + w, y + w / 2 + h], [x, y + w + h]];
  return (
    <g className={cls}>
      <g className={spin}>
        {poly(L, left)}
        {poly(R, right)}
        {poly(T, top)}
      </g>
    </g>
  );
}

function HeroArt() {
  return (
    <Box
      component="svg"
      viewBox="0 0 620 600"
      sx={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
      aria-hidden
    >
      <defs>
        <radialGradient id="orange" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FFB066" />
          <stop offset="55%" stopColor="#FF7A2F" />
          <stop offset="100%" stopColor="#ED5713" />
        </radialGradient>
        <radialGradient id="whiteball" cx="32%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#D8D8E8" />
        </radialGradient>
        <radialGradient id="floorShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(18,12,60,0.45)" />
          <stop offset="100%" stopColor="rgba(18,12,60,0)" />
        </radialGradient>
      </defs>

      {/* faint depth ring */}
      <circle cx="330" cy="290" r="250" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />
      <circle cx="330" cy="290" r="180" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />

      {/* grounded soft shadow */}
      <ellipse cx="330" cy="500" rx="210" ry="40" fill="url(#floorShadow)" />

      {/* pink cube (top) */}
      <Cube x={330} y={120} w={78} h={86} top="#F8D7E2" left="#E7B2C6" right="#D89DB6" cls="flo a" spin="spin s1" />
      {/* lavender cube (left) */}
      <Cube x={185} y={240} w={70} h={78} top="#E9E5FA" left="#C7C0EE" right="#B0A7E2" cls="flo b" spin="spin s2" />
      {/* indigo cube (bottom center) */}
      <Cube x={335} y={320} w={74} h={82} top="#7C6CF4" left="#5341E8" right="#3F2FC4" cls="flo c" spin="spin s3" />
      {/* light cube (right) */}
      <Cube x={478} y={250} w={72} h={80} top="#FFFFFF" left="#E6E6F1" right="#D2D2E2" cls="flo d" spin="spin s4" />

      {/* orange sphere */}
      <circle className="flo e" cx="318" cy="262" r="26" fill="url(#orange)" />
      {/* white spheres */}
      <circle className="flo f" cx="206" cy="150" r="15" fill="url(#whiteball)" />
      <circle className="flo g" cx="488" cy="186" r="13" fill="url(#whiteball)" />
    </Box>
  );
}

// Compact cube cluster for the indigo "who it's for" band.
function MiniArt() {
  return (
    <Box component="svg" viewBox="0 0 420 360" sx={{ width: "100%", height: "100%", display: "block", overflow: "visible" }} aria-hidden>
      <defs>
        <radialGradient id="orange2" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FFB066" />
          <stop offset="55%" stopColor="#FF7A2F" />
          <stop offset="100%" stopColor="#ED5713" />
        </radialGradient>
      </defs>
      <Cube x={235} y={70} w={62} h={70} top="#F8D7E2" left="#E7B2C6" right="#D89DB6" cls="flo a" spin="spin s2" />
      <Cube x={130} y={150} w={56} h={64} top="#E9E5FA" left="#C7C0EE" right="#B0A7E2" cls="flo b" spin="spin s4" />
      <Cube x={250} y={190} w={58} h={66} top="#FFFFFF" left="#E6E6F1" right="#D2D2E2" cls="flo d" spin="spin s1" />
      <circle className="flo e" cx="214" cy="172" r="20" fill="url(#orange2)" />
    </Box>
  );
}

// Hero demo reel: muted autoplay by default, with a lightweight custom play/mute
// control (native <video> controls would clash with the rest of the chrome).
function DemoVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);

  return (
    <Box
      className="rise"
      sx={{
        position: "relative",
        borderRadius: { xs: 4, md: "32px" },
        overflow: "hidden",
        boxShadow: "0 40px 90px rgba(22,19,58,0.16)",
        border: "1px solid rgba(22,19,58,0.06)",
        lineHeight: 0,
        "&:hover .demo-controls": { opacity: 1 },
      }}
    >
      <Box
        component="video"
        ref={ref}
        autoPlay
        muted
        loop
        playsInline
        poster="/mic-promo-poster.jpg"
        onClick={() => {
          const v = ref.current;
          if (!v) return;
          if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
        }}
        sx={{ width: "100%", height: "auto", display: "block", cursor: "pointer", bgcolor: NAVY }}
      >
        <source src="/mic-promo-web.mp4" type="video/mp4" />
      </Box>

      <Stack
        className="demo-controls"
        direction="row"
        alignItems="center"
        gap={1}
        sx={{
          position: "absolute", left: 18, bottom: 18,
          opacity: { xs: 1, md: 0 }, transition: "opacity .2s ease",
        }}
      >
        <Box
          component="button"
          aria-label={playing ? "Pause demo video" : "Play demo video"}
          onClick={() => {
            const v = ref.current;
            if (!v) return;
            if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
          }}
          sx={{
            display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: "50%",
            border: "none", cursor: "pointer", bgcolor: "rgba(255,255,255,0.92)", color: INK,
            boxShadow: "0 8px 20px rgba(22,19,58,0.2)",
            "&:hover": { bgcolor: "#fff" },
          }}
        >
          {playing ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
        </Box>
        <Box
          component="button"
          aria-label={muted ? "Unmute demo video" : "Mute demo video"}
          onClick={() => {
            const v = ref.current;
            if (!v) return;
            v.muted = !v.muted;
            setMuted(v.muted);
          }}
          sx={{
            display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: "50%",
            border: "none", cursor: "pointer", bgcolor: "rgba(255,255,255,0.92)", color: INK,
            boxShadow: "0 8px 20px rgba(22,19,58,0.2)",
            "&:hover": { bgcolor: "#fff" },
          }}
        >
          {muted ? <VolumeOffRoundedIcon /> : <VolumeUpRoundedIcon />}
        </Box>
      </Stack>
    </Box>
  );
}

// ── Building blocks ──────────────────────────────────────────────────────────
function ServiceCard({
  icon, circle, iconColor, title, body, elevated = false,
}: { icon: React.ReactNode; circle: string; iconColor: string; title: string; body: string; elevated?: boolean }) {
  return (
    <Box
      sx={{
        bgcolor: "#fff", borderRadius: 5, p: { xs: 3, md: 3.5 }, textAlign: "center",
        border: "1px solid rgba(22,19,58,0.06)",
        boxShadow: elevated ? "0 30px 60px rgba(22,19,58,0.14)" : "0 12px 30px rgba(22,19,58,0.05)",
        transform: { md: elevated ? "translateY(-22px)" : "none" },
        transition: "transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .25s",
        "&:hover": { transform: { md: elevated ? "translateY(-30px)" : "translateY(-8px)" }, boxShadow: "0 34px 64px rgba(22,19,58,0.16)" },
        display: "flex", flexDirection: "column", alignItems: "center",
      }}
    >
      <Box sx={{ width: 96, height: 96, borderRadius: "50%", bgcolor: circle, display: "grid", placeItems: "center", mb: 2.5, color: iconColor, boxShadow: "inset 0 -6px 14px rgba(0,0,0,0.06)" }}>
        {icon}
      </Box>
      <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 19, color: INK, mb: 1 }}>{title}</Typography>
      <Typography sx={{ fontFamily: DISPLAY, fontSize: 14, lineHeight: 1.65, color: INK_SOFT, maxWidth: 240 }}>{body}</Typography>
      {elevated && (
        <Box mt={3}>
          <PillButton href="/login" variant="navy">Find out more</PillButton>
        </Box>
      )}
    </Box>
  );
}

export default function Landing() {
  // Supabase password-recovery links redirect to the project's Site URL (this
  // root) with the token in the URL fragment. The landing page doesn't load the
  // auth client, so forward the token to /reset-password, which consumes it.
  useEffect(() => {
    const { hash, search } = window.location;
    if (/type=recovery/.test(hash) || /type=recovery/.test(search)) {
      window.location.replace(`/reset-password${search}${hash}`);
    }
  }, []);

  const navLinks = [
    { label: "Home", href: "/", active: true },
    { label: "Overview", href: "#overview" },
    { label: "How it works", href: "#how" },
    { label: "Who it's for", href: "#who" },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: PEACH, p: { xs: 1.25, sm: 2, md: 3 } }}>
      <Box
        sx={{
          maxWidth: 1320, mx: "auto", bgcolor: "#fff", borderRadius: { xs: 5, md: "44px" },
          overflow: "hidden", boxShadow: "0 40px 90px rgba(22,19,58,0.12)",
          "& .MuiTypography-root": { fontFamily: DISPLAY },
        }}
      >
        {/* ── Nav ───────────────────────────────────────────────────────── */}
        <FolioNav links={navLinks} cta={{ label: "Sign in", href: "/login" }} maxWidth="100%" />

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <Box
          id="overview"
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.05fr 0.95fr" },
            alignItems: "stretch",
          }}
        >
          {/* left */}
          <Box sx={{ px: { xs: 3, sm: 4, md: 6 }, py: { xs: 5, md: 8 }, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <Box className="rise r1"><Eyebrow label="MFL Innovation Collector" /></Box>
            <Typography
              className="rise r2"
              component="h1"
              sx={{ mt: 2.5, fontWeight: 800, color: INK, letterSpacing: "-0.03em", lineHeight: 1.04, fontSize: { xs: "2.4rem", sm: "3rem", md: "3.6rem" } }}
            >
              Every MFL innovation, in one validated record.
            </Typography>
            <Typography
              className="rise r3"
              sx={{ mt: 3, fontSize: { xs: 15.5, md: 17 }, lineHeight: 1.65, color: INK_SOFT, maxWidth: 460 }}
            >
              Collect, validate and centralise innovation metadata across CGIAR&apos;s
              Multifunctional Landscapes program — climate zones, partners, scaling
              readiness and impact, all in one place.
            </Typography>
            <Stack className="rise r4" direction={{ xs: "column", sm: "row" }} gap={1.75} sx={{ mt: 4.5 }} alignItems={{ sm: "center" }}>
              <PillButton href="/login" variant="indigo" endIcon={<ArrowForwardIcon />}>Get started</PillButton>
              <PillButton href="#how" variant="ghost">See how it works</PillButton>
            </Stack>
          </Box>

          {/* right — indigo art panel */}
          <Box
            sx={{
              position: "relative",
              background: `radial-gradient(120% 120% at 60% 20%, #6A59F0 0%, ${INDIGO} 45%, ${INDIGO_DK} 100%)`,
              minHeight: { xs: 340, md: 520 },
              display: "grid", placeItems: "center",
              px: { xs: 3, md: 4 }, py: { xs: 4, md: 5 },
            }}
          >
            <Box sx={{ width: "100%", maxWidth: 460 }}>
              <HeroArt />
            </Box>
          </Box>
        </Box>

        {/* ── What we do ────────────────────────────────────────────────── */}
        <Box id="how" sx={{ px: { xs: 3, sm: 4, md: 6 }, pt: { xs: 7, md: 10 }, pb: { xs: 2, md: 4 } }}>
          <Typography sx={{ fontSize: { xs: 17, md: 20 }, fontWeight: 600, color: INK_SOFT, maxWidth: 620, lineHeight: 1.5 }}>
            A central, ontology-checked home for innovation data — collected once, trusted by everyone.
          </Typography>
          <Typography
            component="h2"
            sx={{ mt: { xs: 3, md: 4 }, fontWeight: 800, color: INK, letterSpacing: "-0.03em", lineHeight: 1.0, fontSize: { xs: "2.6rem", sm: "3.4rem", md: "4.4rem" } }}
          >
            Collect. Validate.{" "}
            <Box component="span" sx={{ color: INDIGO }}>Scale.</Box>
          </Typography>
          <Box sx={{ mt: 4 }}>
            <PillButton href="/login" variant="indigo" endIcon={<ArrowForwardIcon />}>Start collecting</PillButton>
          </Box>
        </Box>

        {/* ── Demo reel ─────────────────────────────────────────────────── */}
        <Box sx={{ px: { xs: 3, sm: 4, md: 6 }, pt: { xs: 6, md: 8 } }}>
          <DemoVideo />
        </Box>

        {/* ── Service cards ─────────────────────────────────────────────── */}
        <Box sx={{ px: { xs: 3, sm: 4, md: 6 }, pt: { xs: 6, md: 9 }, pb: { xs: 4, md: 6 } }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: { xs: 2.5, md: 3 }, alignItems: "start" }}>
            <ServiceCard
              icon={<VerifiedOutlinedIcon sx={{ fontSize: 40 }} />} circle="#FFE08A" iconColor="#9A6B00"
              title="Validated at entry"
              body="Köppen climate classes, SDGs and CGIAR Impact Areas are controlled the moment you type them."
            />
            <ServiceCard
              elevated
              icon={<EditNoteOutlinedIcon sx={{ fontSize: 42 }} />} circle={INDIGO} iconColor="#fff"
              title="Draft-friendly"
              body="Save progress, share with co-developers and geometry, then submit when every required field is green."
            />
            <ServiceCard
              icon={<HubOutlinedIcon sx={{ fontSize: 38 }} />} circle="#F8C9D7" iconColor="#B23A63"
              title="Centralised"
              body="Everything lands straight in Supabase with files and site polygons — no more spreadsheet sprawl."
            />
          </Box>
        </Box>

        {/* ── Indigo "who it's for" band ────────────────────────────────── */}
        <Box
          id="who"
          sx={{
            mt: { xs: 4, md: 6 },
            background: `radial-gradient(120% 140% at 75% 15%, #6A59F0 0%, ${INDIGO} 50%, ${INDIGO_DK} 100%)`,
            px: { xs: 3, sm: 4, md: 6 }, py: { xs: 6, md: 9 },
            display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr" }, gap: 4, alignItems: "center",
          }}
        >
          <Box>
            <Typography
              component="h2"
              sx={{ fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.05, fontSize: { xs: "2.2rem", sm: "2.8rem", md: "3.4rem" } }}
            >
              Built for CGIAR&apos;s Multifunctional Landscapes teams.
            </Typography>
            <Typography sx={{ mt: 2.5, fontSize: { xs: 15, md: 16.5 }, lineHeight: 1.65, color: "rgba(255,255,255,0.82)", maxWidth: 460 }}>
              Researchers, focal points and partners capturing innovations across climates,
              testing reach and scaling readiness — with the controlled vocabularies analysts can trust.
            </Typography>
            <Box sx={{ mt: 4 }}>
              <PillButton href="/login" variant="white" endIcon={<ArrowForwardIcon />}>Get started</PillButton>
            </Box>
          </Box>
          <Box sx={{ display: { xs: "none", md: "block" }, maxWidth: 380, justifySelf: "center" }}>
            <MiniArt />
          </Box>
        </Box>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <Stack
          direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} gap={1.5}
          sx={{ px: { xs: 3, md: 6 }, py: { xs: 3.5, md: 4 } }}
        >
          <Stack direction="row" alignItems="center" gap={1.25}>
            <Box sx={{ width: 24, height: 24, borderRadius: "7px", background: `linear-gradient(135deg, ${INDIGO}, #8E80F5)` }} />
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: INK }}>MFL Innovation Collector</Typography>
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          <Typography sx={{ fontSize: 13, color: INK_SOFT }}>
            © {new Date().getFullYear()} CGIAR · Multifunctional Landscapes
          </Typography>
          <Box component="a" href="/login" sx={{ fontFamily: DISPLAY, fontSize: 14, fontWeight: 700, color: INDIGO, textDecoration: "none" }}>
            Sign in →
          </Box>
        </Stack>
      </Box>

      {/* ── Motion ──────────────────────────────────────────────────────── */}
      <style jsx global>{`
        @keyframes rise {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rise { opacity: 0; animation: rise 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .rise.r1 { animation-delay: 0.05s; }
        .rise.r2 { animation-delay: 0.15s; }
        .rise.r3 { animation-delay: 0.28s; }
        .rise.r4 { animation-delay: 0.40s; }

        @keyframes floaty {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-12px); }
        }
        .flo { animation: floaty 6s ease-in-out infinite; will-change: transform; }
        .flo.a { animation-duration: 6.5s; animation-delay: 0s; }
        .flo.b { animation-duration: 7.2s; animation-delay: -1.2s; }
        .flo.c { animation-duration: 5.8s; animation-delay: -0.6s; }
        .flo.d { animation-duration: 6.9s; animation-delay: -2.0s; }
        .flo.e { animation-duration: 4.8s; animation-delay: -0.4s; }
        .flo.f { animation-duration: 5.2s; animation-delay: -1.6s; }
        .flo.g { animation-duration: 5.6s; animation-delay: -0.9s; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin {
          transform-box: fill-box;
          transform-origin: 50% 50%;
          animation: spin 20s linear infinite;
          will-change: transform;
        }
        .spin.s1 { animation-duration: 20s; }
        .spin.s2 { animation-duration: 26s; animation-direction: reverse; }
        .spin.s3 { animation-duration: 17s; }
        .spin.s4 { animation-duration: 23s; animation-direction: reverse; }

        @media (prefers-reduced-motion: reduce) {
          .rise { opacity: 1; animation: none; }
          .flo { animation: none; }
          .spin { animation: none; }
        }
      `}</style>
    </Box>
  );
}
