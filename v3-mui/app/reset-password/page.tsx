"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { supabase } from "@/lib/supabase";
import { PEACH, INK, INK_SOFT, INDIGO, INDIGO_DK, DISPLAY, FolioNav } from "@/lib/folio";

// "checking" while we confirm the recovery link established a session;
// "ready" to show the form; "invalid" if the link is bad/expired; "done" on success.
type Phase = "checking" | "ready" | "invalid" | "done";

export default function ResetPassword() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ password?: string; confirm?: string }>({});

  useEffect(() => {
    // The recovery link carries a token in the URL hash. The Supabase client
    // (detectSessionInUrl) exchanges it on load, which fires PASSWORD_RECOVERY
    // and establishes a short-lived session that authorises updateUser().
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || session) setPhase("ready");
    });

    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setPhase("ready");
    });

    // If no recovery session has appeared shortly after load, the link is stale.
    const t = setTimeout(() => {
      if (active) setPhase((p) => (p === "checking" ? "invalid" : p));
    }, 3000);

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const fe: typeof fieldError = {};
    if (password.length < 8) fe.password = "Use 8 characters or more.";
    if (confirm !== password) fe.confirm = "Passwords don’t match.";
    if (Object.keys(fe).length) {
      setFieldError(fe);
      return;
    }
    setFieldError({});
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setFormError(error.message);
      setBusy(false);
      return;
    }
    setBusy(false);
    setPhase("done");
  }

  return (
    <Box sx={{ minHeight: "100svh", bgcolor: PEACH, p: { xs: 1.25, sm: 2, md: 3 }, display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          flex: 1,
          maxWidth: 560,
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
            { label: "Login", href: "/login" },
          ]}
          maxWidth="100%"
        />

        <Box sx={{ flex: 1, display: "grid", placeItems: "center", px: { xs: 2.5, sm: 5 }, py: { xs: 4, md: 6 } }}>
          <Box sx={{ width: 400, maxWidth: "100%" }} aria-busy={busy}>
            {phase === "checking" && (
              <Stack alignItems="center" gap={2} sx={{ py: 4 }}>
                <CircularProgress size={26} thickness={5} sx={{ color: INDIGO }} />
                <Typography sx={{ fontSize: 14.5, color: INK_SOFT }}>Verifying your reset link…</Typography>
              </Stack>
            )}

            {phase === "invalid" && (
              <Stack alignItems="flex-start" gap={1.5}>
                <Box
                  sx={{ width: 48, height: 48, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: "rgba(214,69,69,0.10)", color: "#C1392B" }}
                  aria-hidden
                >
                  <ErrorOutlineRoundedIcon sx={{ fontSize: 26 }} />
                </Box>
                <Typography component="h1" sx={{ fontSize: 24, fontWeight: 800, color: INK, letterSpacing: "-0.02em" }}>
                  This link has expired
                </Typography>
                <Typography sx={{ fontSize: 14, color: INK_SOFT, lineHeight: 1.6 }}>
                  Password reset links can only be used once and expire after a short while. Request a fresh one from the sign-in page.
                </Typography>
                <Button onClick={() => router.push("/login")} disableElevation endIcon={<ArrowForwardIcon />} sx={submitSx}>
                  Back to sign in
                </Button>
              </Stack>
            )}

            {phase === "ready" && (
              <>
                <Typography component="h1" sx={{ fontSize: { xs: 26, sm: 30 }, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em", color: INK }}>
                  Set a new password
                </Typography>
                <Typography sx={{ mt: 1, mb: 3.5, fontSize: 14.5, color: INK_SOFT, lineHeight: 1.55 }}>
                  Choose a new password for your account. You&apos;ll be signed in once it&apos;s saved.
                </Typography>

                <Box component="form" onSubmit={handle} noValidate>
                  <Stack gap={2}>
                    <TextField
                      required
                      autoFocus
                      type="password"
                      label="New password"
                      autoComplete="new-password"
                      disabled={busy}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      error={!!fieldError.password}
                      helperText={fieldError.password ?? "8 characters or more."}
                      fullWidth
                      size="medium"
                      sx={inputSx}
                    />
                    <TextField
                      required
                      type="password"
                      label="Confirm new password"
                      autoComplete="new-password"
                      disabled={busy}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      error={!!fieldError.confirm}
                      helperText={fieldError.confirm ?? " "}
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
                      {busy ? "Saving…" : "Update password"}
                    </Button>
                  </Stack>
                </Box>
              </>
            )}

            {phase === "done" && (
              <Stack alignItems="flex-start" gap={1.5}>
                <Box
                  sx={{ width: 48, height: 48, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: "rgba(83,65,232,0.10)", color: INDIGO }}
                  aria-hidden
                >
                  <CheckCircleRoundedIcon sx={{ fontSize: 26 }} />
                </Box>
                <Typography component="h1" sx={{ fontSize: 24, fontWeight: 800, color: INK, letterSpacing: "-0.02em" }}>
                  Password updated
                </Typography>
                <Typography sx={{ fontSize: 14, color: INK_SOFT, lineHeight: 1.6 }}>
                  Your password has been changed and you&apos;re signed in. Head to your workspace to continue.
                </Typography>
                <Button onClick={() => router.push("/dashboard")} disableElevation endIcon={<ArrowForwardIcon />} sx={submitSx}>
                  Go to your workspace
                </Button>
              </Stack>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
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
  },
  "& label.Mui-focused": { color: INDIGO },
} as const;
