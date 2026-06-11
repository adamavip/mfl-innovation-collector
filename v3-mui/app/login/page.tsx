"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Fade,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import { supabase } from "@/lib/supabase";
import {
  PEACH, INK, INK_SOFT, INDIGO, INDIGO_DK, DISPLAY,
  FolioNav,
} from "@/lib/folio";

type Mode = "signin" | "signup";
type View = "form" | "confirm" | "forgot" | "reset-sent";

// Base URL the confirmation email should return to. Prefer an explicit
// NEXT_PUBLIC_SITE_URL (set in Vercel) so the link is correct regardless of
// where the user signed up; fall back to the current origin in the browser.
function siteUrl() {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env) return env;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [view, setView] = useState<View>("form");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ password?: string; firstName?: string; lastName?: string }>({});
  const sentEmailRef = useRef<string>("");

  function switchMode(next: Mode) {
    setMode(next);
    setView("form");
    setFormError(null);
    setFieldError({});
    setStage("");
  }

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setFieldError({});

    if (mode === "signin") {
      setStage("Authenticating…");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const isCreds = /invalid|credentials|password/i.test(error.message);
        setFormError(error.message);
        if (isCreds) setFieldError({ password: "Email or password didn’t match." });
        setBusy(false);
        setStage("");
        return;
      }
      setStage("Loading your workspace…");
      router.push("/dashboard");
      return;
    }

    // Sign-up flow
    const fe: typeof fieldError = {};
    if (!firstName.trim()) fe.firstName = "Required";
    if (!lastName.trim())  fe.lastName  = "Required";
    if (password.length < 8) fe.password = "Use 8 characters or more.";
    if (Object.keys(fe).length) { setFieldError(fe); setBusy(false); return; }

    setStage("Creating your account…");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name:  lastName.trim(),
          phone_number: phone.trim() || null,
        },
        emailRedirectTo: `${siteUrl()}/dashboard`,
      },
    });
    const EXISTS_MSG = "An account with this email already exists. Try signing in, or reset your password if you’ve forgotten it.";
    if (error) {
      // With "Confirm email" disabled, a repeat signup comes back as a direct
      // error ("User already registered") rather than an obfuscated user.
      const exists = /already registered|already exists|user[_ ]?already[_ ]?exists/i.test(error.message);
      setFormError(exists ? EXISTS_MSG : error.message);
      setBusy(false);
      setStage("");
      return;
    }
    // With "Confirm email" enabled, Supabase instead obfuscates a repeat signup
    // to avoid leaking which emails exist: a user with an empty `identities`
    // array and no error. Kept so the check is correct in both project modes.
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      setFormError(EXISTS_MSG);
      setBusy(false);
      setStage("");
      return;
    }
    if (data.session) {
      // "Confirm email" disabled → the user is signed in immediately.
      setStage("Loading your workspace…");
      router.push("/dashboard");
      return;
    }
    // Fallback for when "Confirm email" is re-enabled: no session yet, so the
    // user must open the confirmation link before they can sign in.
    sentEmailRef.current = email;
    setView("confirm");
    setBusy(false);
    setStage("");
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setFieldError({});
    setStage("Sending reset link…");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl()}/reset-password`,
    });
    if (error) {
      setFormError(error.message);
      setBusy(false);
      setStage("");
      return;
    }
    sentEmailRef.current = email;
    setView("reset-sent");
    setBusy(false);
    setStage("");
  }

  function goForgot() {
    setView("forgot");
    setFormError(null);
    setFieldError({});
    setStage("");
  }

  const isSignup = mode === "signup";
  const title    = isSignup ? "Create your account" : "Welcome back";
  const subtitle = isSignup
    ? "Set up your MFL Innovation Collector profile so your drafts, submissions, and uploads stay with you."
    : "Sign in to draft, validate, and submit innovation records.";
  const buttonLabel = busy ? (stage || (isSignup ? "Creating…" : "Signing in…")) : (isSignup ? "Create account" : "Sign in");

  return (
    <Box sx={{ minHeight: "100svh", bgcolor: PEACH, p: { xs: 1.25, sm: 2, md: 3 }, display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          flex: 1,
          maxWidth: 1180,
          width: "100%",
          mx: "auto",
          bgcolor: "#fff",
          borderRadius: { xs: 5, md: "36px" },
          overflow: "hidden",
          boxShadow: "0 40px 90px rgba(22,19,58,0.12)",
          display: "flex",
          flexDirection: "column",
          "& .MuiTypography-root": { fontFamily: DISPLAY },
        }}
      >
        <FolioNav
          links={[
            { label: "Home", href: "/" },
            { label: "Login", href: "/login", active: true },
          ]}
          maxWidth="100%"
        />

        <Box
          sx={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "0.95fr 1.05fr" },
            alignItems: "stretch",
          }}
        >
          {/* ── Left: indigo brand panel ─────────────────────────────────── */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              flexDirection: "column",
              justifyContent: "space-between",
              p: { md: 5, lg: 6 },
              bgcolor: INDIGO,
            }}
          >
            <Box sx={{ flex: 1, display: "grid", placeItems: "center", minHeight: 0, py: 2 }}>
              <CubeArt />
            </Box>

            <Stack gap={1.75} sx={{ mt: 4 }}>
              <PanelFeature icon={<VerifiedOutlinedIcon sx={{ fontSize: 18 }} />} text="Controlled vocabularies, validated at entry" />
              <PanelFeature icon={<EditNoteOutlinedIcon sx={{ fontSize: 18 }} />} text="Draft-friendly — save and resume anytime" />
              <PanelFeature icon={<HubOutlinedIcon sx={{ fontSize: 18 }} />} text="Centralised in one trusted record" />
            </Stack>
          </Box>

          {/* ── Right: form ──────────────────────────────────────────────── */}
          <Box sx={{ display: "grid", placeItems: "center", px: { xs: 2.5, sm: 5 }, py: { xs: 4, md: 6 } }}>
            <Box sx={{ width: 420, maxWidth: "100%" }} aria-busy={busy}>
              <Box sx={{ position: "relative" }}>
                <Fade in={busy} timeout={180} unmountOnExit>
                  <LinearProgress
                    sx={{
                      position: "absolute", top: -14, left: 0, right: 0, height: 2,
                      borderRadius: 2, bgcolor: "transparent",
                      "& .MuiLinearProgress-bar": { bgcolor: INDIGO },
                    }}
                  />
                </Fade>

                {view === "form" ? (
                  <>
                    <Typography
                      component="h1"
                      sx={{ fontSize: { xs: 28, sm: 32 }, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em", color: INK }}
                    >
                      {title}
                    </Typography>
                    <Typography sx={{ mt: 1, mb: 3.5, fontSize: 14.5, color: INK_SOFT, maxWidth: 380, lineHeight: 1.55 }}>
                      {subtitle}
                    </Typography>

                    <Box component="form" onSubmit={handle} noValidate>
                      <Stack gap={2}>
                        <Collapse in={isSignup} timeout={180} unmountOnExit>
                          <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                            <TextField
                              required={isSignup}
                              autoFocus={isSignup}
                              label="First name"
                              autoComplete="given-name"
                              disabled={busy}
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              error={!!fieldError.firstName}
                              helperText={fieldError.firstName ?? " "}
                              fullWidth
                              size="medium"
                              sx={inputSx}
                            />
                            <TextField
                              required={isSignup}
                              label="Last name"
                              autoComplete="family-name"
                              disabled={busy}
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              error={!!fieldError.lastName}
                              helperText={fieldError.lastName ?? " "}
                              fullWidth
                              size="medium"
                              sx={inputSx}
                            />
                          </Stack>
                        </Collapse>

                        <TextField
                          required
                          autoFocus={!isSignup}
                          type="email"
                          label="Email"
                          autoComplete="email"
                          inputMode="email"
                          spellCheck={false}
                          disabled={busy}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@cgiar.org"
                          fullWidth
                          size="medium"
                          sx={inputSx}
                        />

                        <Collapse in={isSignup} timeout={180} unmountOnExit>
                          <TextField
                            type="tel"
                            label="Phone number"
                            autoComplete="tel"
                            inputMode="tel"
                            disabled={busy}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+1 555 123 4567"
                            helperText="Optional — used only for account recovery."
                            fullWidth
                            size="medium"
                            sx={inputSx}
                          />
                        </Collapse>

                        <TextField
                          required
                          type="password"
                          label="Password"
                          autoComplete={isSignup ? "new-password" : "current-password"}
                          disabled={busy}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          fullWidth
                          error={!!fieldError.password}
                          helperText={fieldError.password ?? (isSignup ? "8 characters or more." : " ")}
                          size="medium"
                          sx={inputSx}
                        />

                        {!isSignup && (
                          <Box sx={{ mt: -1.5, textAlign: "right" }}>
                            <Box
                              component="button"
                              type="button"
                              onClick={goForgot}
                              disabled={busy}
                              sx={{
                                border: 0, bgcolor: "transparent", p: 0, font: "inherit",
                                fontFamily: DISPLAY, fontSize: 13, fontWeight: 700, color: INDIGO, cursor: "pointer",
                                "&:hover": { textDecoration: "underline" },
                                "&:disabled": { opacity: 0.4, cursor: "wait" },
                              }}
                            >
                              Forgot password?
                            </Box>
                          </Box>
                        )}

                        <Box aria-live="polite" role="status" sx={{ minHeight: 0 }}>
                          <Collapse in={!!formError} timeout={160} unmountOnExit>
                            <Alert
                              severity="error"
                              onClose={() => setFormError(null)}
                              sx={{ borderRadius: 2.5, fontSize: 13 }}
                            >
                              {formError}
                            </Alert>
                          </Collapse>
                        </Box>

                        <Button
                          type="submit"
                          fullWidth
                          disableElevation
                          disabled={busy}
                          endIcon={!busy ? <ArrowForwardIcon /> : undefined}
                          startIcon={busy ? <CircularProgress size={16} thickness={5} sx={{ color: "currentColor" }} /> : undefined}
                          sx={submitSx}
                        >
                          {buttonLabel}
                        </Button>
                      </Stack>
                    </Box>

                    {/* Mode toggle */}
                    <Typography
                      sx={{ mt: 3, fontSize: 13.5, color: INK_SOFT, display: "flex", gap: 1, alignItems: "center", justifyContent: "center" }}
                    >
                      {isSignup ? "Already have an account?" : "New to MFL Innovation Collector?"}
                      <Box
                        component="button"
                        type="button"
                        onClick={() => switchMode(isSignup ? "signin" : "signup")}
                        disabled={busy}
                        sx={{
                          border: 0, bgcolor: "transparent", p: 0, font: "inherit",
                          fontFamily: DISPLAY, fontWeight: 700, color: INDIGO, cursor: "pointer",
                          "&:hover": { textDecoration: "underline" },
                          "&:disabled": { opacity: 0.4, cursor: "wait" },
                        }}
                      >
                        {isSignup ? "Sign in" : "Create an account"}
                      </Box>
                    </Typography>
                  </>
                ) : view === "forgot" ? (
                  <>
                    <Typography
                      component="h1"
                      sx={{ fontSize: { xs: 28, sm: 32 }, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em", color: INK }}
                    >
                      Reset your password
                    </Typography>
                    <Typography sx={{ mt: 1, mb: 3.5, fontSize: 14.5, color: INK_SOFT, maxWidth: 380, lineHeight: 1.55 }}>
                      Enter the email for your account and we&apos;ll send you a link to choose a new password.
                    </Typography>

                    <Box component="form" onSubmit={handleReset} noValidate>
                      <Stack gap={2}>
                        <TextField
                          required
                          autoFocus
                          type="email"
                          label="Email"
                          autoComplete="email"
                          inputMode="email"
                          spellCheck={false}
                          disabled={busy}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@cgiar.org"
                          fullWidth
                          size="medium"
                          sx={inputSx}
                        />

                        <Box aria-live="polite" role="status" sx={{ minHeight: 0 }}>
                          <Collapse in={!!formError} timeout={160} unmountOnExit>
                            <Alert severity="error" onClose={() => setFormError(null)} sx={{ borderRadius: 2.5, fontSize: 13 }}>
                              {formError}
                            </Alert>
                          </Collapse>
                        </Box>

                        <Button
                          type="submit"
                          fullWidth
                          disableElevation
                          disabled={busy}
                          endIcon={!busy ? <ArrowForwardIcon /> : undefined}
                          startIcon={busy ? <CircularProgress size={16} thickness={5} sx={{ color: "currentColor" }} /> : undefined}
                          sx={submitSx}
                        >
                          {busy ? (stage || "Sending…") : "Send reset link"}
                        </Button>
                      </Stack>
                    </Box>

                    <Typography
                      sx={{ mt: 3, fontSize: 13.5, color: INK_SOFT, display: "flex", gap: 1, alignItems: "center", justifyContent: "center" }}
                    >
                      Remembered it?
                      <Box
                        component="button"
                        type="button"
                        onClick={() => switchMode("signin")}
                        disabled={busy}
                        sx={{
                          border: 0, bgcolor: "transparent", p: 0, font: "inherit",
                          fontFamily: DISPLAY, fontWeight: 700, color: INDIGO, cursor: "pointer",
                          "&:hover": { textDecoration: "underline" },
                          "&:disabled": { opacity: 0.4, cursor: "wait" },
                        }}
                      >
                        Back to sign in
                      </Box>
                    </Typography>
                  </>
                ) : (
                  <Stack alignItems="flex-start" gap={1.5}>
                    <Box
                      sx={{
                        width: 48, height: 48, borderRadius: "50%", display: "grid", placeItems: "center",
                        bgcolor: "rgba(83,65,232,0.10)", color: INDIGO,
                      }}
                      aria-hidden
                    >
                      <CheckCircleRoundedIcon sx={{ fontSize: 26 }} />
                    </Box>
                    <Typography component="h1" sx={{ fontSize: 24, fontWeight: 800, color: INK, letterSpacing: "-0.02em" }}>
                      {view === "reset-sent" ? "Check your email" : "Confirm your email"}
                    </Typography>
                    <Typography sx={{ fontSize: 14, color: INK_SOFT, lineHeight: 1.6 }}>
                      {view === "reset-sent" ? (
                        <>
                          If an account exists for{" "}
                          <Box component="span" sx={{ color: INK, fontWeight: 700 }}>
                            {sentEmailRef.current}
                          </Box>
                          , we&apos;ve sent a link to reset your password. Open it to choose a new one.
                        </>
                      ) : (
                        <>
                          We sent a confirmation link to{" "}
                          <Box component="span" sx={{ color: INK, fontWeight: 700 }}>
                            {sentEmailRef.current}
                          </Box>
                          . Open it to activate your account and land in your workspace.
                        </>
                      )}
                    </Typography>
                    <Button
                      onClick={() => switchMode("signin")}
                      variant="text"
                      sx={{ mt: 1, color: INDIGO, fontWeight: 700, px: 0, "&:hover": { bgcolor: "transparent", textDecoration: "underline" } }}
                    >
                      {view === "reset-sent" ? "Back to sign in" : "I’ll confirm later — go to sign in"}
                    </Button>
                  </Stack>
                )}
              </Box>

              {/* Footer */}
              <Typography
                sx={{ mt: 4, fontSize: 12, color: INK_SOFT, display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}
              >
                <span>© CGIAR Multifunctional Landscapes</span>
                <Box component="span" sx={{ width: 3, height: 3, borderRadius: "50%", bgcolor: "rgba(22,19,58,0.3)" }} aria-hidden />
                <Box
                  component="a"
                  href="mailto:adama.ndour@cgiar.org"
                  sx={{ color: INK_SOFT, textDecoration: "none", "&:hover": { color: INDIGO } }}
                >
                  Need help?
                </Box>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <style jsx global>{`
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

        @media (prefers-reduced-motion: reduce) {
          .flo { animation: none; }
          .MuiLinearProgress-bar, .MuiCircularProgress-svg { animation-duration: 0.001ms !important; }
        }
      `}</style>
    </Box>
  );
}

// ── Isometric cube cluster (same vocabulary as the landing hero art) ──────────
function poly(pts: number[][], fill: string) {
  return <polygon points={pts.map((p) => p.join(",")).join(" ")} fill={fill} />;
}
function Cube({
  x, y, w, h, top, left, right, cls,
}: { x: number; y: number; w: number; h: number; top: string; left: string; right: string; cls?: string }) {
  const T = [[x, y], [x + w, y + w / 2], [x, y + w], [x - w, y + w / 2]];
  const L = [[x - w, y + w / 2], [x, y + w], [x, y + w + h], [x - w, y + w / 2 + h]];
  const R = [[x, y + w], [x + w, y + w / 2], [x + w, y + w / 2 + h], [x, y + w + h]];
  return (
    <g className={cls}>
      {poly(L, left)}
      {poly(R, right)}
      {poly(T, top)}
    </g>
  );
}

function CubeArt() {
  return (
    <Box
      component="svg"
      viewBox="0 0 420 460"
      sx={{ width: "100%", maxWidth: 360, height: "auto", display: "block", overflow: "visible" }}
      aria-hidden
    >
      <defs>
        <radialGradient id="loginOrange" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FFB066" />
          <stop offset="55%" stopColor="#FF7A2F" />
          <stop offset="100%" stopColor="#ED5713" />
        </radialGradient>
        <radialGradient id="loginWhiteball" cx="32%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#D8D8E8" />
        </radialGradient>
        <radialGradient id="loginFloor" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(18,12,60,0.45)" />
          <stop offset="100%" stopColor="rgba(18,12,60,0)" />
        </radialGradient>
      </defs>

      {/* grounded soft shadow */}
      <ellipse cx="210" cy="410" rx="150" ry="30" fill="url(#loginFloor)" />

      {/* pink cube (top) */}
      <Cube x={214} y={70} w={66} h={74} top="#F8D7E2" left="#E7B2C6" right="#D89DB6" cls="flo a" />
      {/* lavender cube (left) */}
      <Cube x={108} y={196} w={58} h={66} top="#E9E5FA" left="#C7C0EE" right="#B0A7E2" cls="flo b" />
      {/* blue cube (bottom center) */}
      <Cube x={216} y={262} w={62} h={70} top="#7C6CF4" left="#5341E8" right="#3F2FC4" cls="flo c" />
      {/* light cube (right) */}
      <Cube x={322} y={206} w={60} h={68} top="#FFFFFF" left="#E6E6F1" right="#D2D2E2" cls="flo d" />

      {/* orange sphere */}
      <circle className="flo e" cx="204" cy="212" r="22" fill="url(#loginOrange)" />
      {/* white spheres */}
      <circle className="flo f" cx="120" cy="118" r="14" fill="url(#loginWhiteball)" />
      <circle className="flo g" cx="324" cy="146" r="11" fill="url(#loginWhiteball)" />
    </Box>
  );
}

function PanelFeature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Stack direction="row" alignItems="center" gap={1.5}>
      <Box
        sx={{
          flexShrink: 0, width: 34, height: 34, borderRadius: "50%",
          display: "grid", placeItems: "center",
          bgcolor: "rgba(255,255,255,0.16)", color: "#fff",
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>
        {text}
      </Typography>
    </Stack>
  );
}

const submitSx = {
  mt: 0.5,
  minHeight: 52,
  borderRadius: 999,
  fontFamily: DISPLAY,
  fontSize: 15,
  fontWeight: 700,
  bgcolor: INDIGO,
  color: "#fff",
  boxShadow: "none",
  transition: "transform .18s cubic-bezier(.2,.8,.2,1), background-color .18s",
  "&:hover": { bgcolor: INDIGO_DK, transform: "translateY(-1px)" },
  "&.Mui-disabled": { bgcolor: INDIGO, opacity: 0.55, color: "#fff", boxShadow: "none" },
} as const;

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2.5,
    "& fieldset": { borderColor: "rgba(22,19,58,0.16)" },
    "&:hover fieldset": { borderColor: "rgba(22,19,58,0.34)" },
    "&.Mui-focused fieldset": { borderWidth: 2, borderColor: INDIGO },
    "&.Mui-focused .MuiInputBase-input::placeholder": {
      color: "rgba(22,19,58,0.5)",
      opacity: 1,
    },
  },
  "& label.Mui-focused": { color: INDIGO },
} as const;
