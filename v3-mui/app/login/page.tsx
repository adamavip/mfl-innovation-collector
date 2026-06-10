"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Fade, LinearProgress,
  Stack, Tab, Tabs, TextField, Typography,
} from "@mui/material";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string>("");
  const [msg, setMsg] = useState<{ severity: "error" | "success"; text: string } | null>(null);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    if (tab === 0) {
      setStage("Authenticating…");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setMsg({ severity: "error", text: error.message }); setBusy(false); setStage(""); return; }
      setStage("Loading your workspace…");
      router.push("/dashboard");
      return;
    }
    setStage("Sending sign-in link…");
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined },
    });
    if (error) setMsg({ severity: "error", text: error.message });
    else setMsg({ severity: "success", text: "Check your inbox for the sign-in link." });
    setBusy(false); setStage("");
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "background.default", p: 2, position: "relative" }}>
      <Box sx={{ width: 400, maxWidth: "100%" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <Typography variant="caption" color="text.secondary">← Back</Typography>
        </Link>
        <Typography variant="h5" sx={{ mt: 2, fontWeight: 700 }}>Sign in</Typography>
        <Typography variant="body2" color="text.secondary">to MFL Innovation Collector</Typography>

        <Card variant="outlined" sx={{ mt: 2, position: "relative", overflow: "hidden" }}>
          <Fade in={busy} timeout={200} unmountOnExit>
            <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 2 }} />
          </Fade>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
            <Tab label="Email + password" disabled={busy} />
            <Tab label="Magic link" disabled={busy} />
          </Tabs>
          <CardContent>
            <form onSubmit={handle}>
              <Stack gap={2}>
                <TextField required type="email" label="Email" disabled={busy}
                           value={email} onChange={e => setEmail(e.target.value)}
                           placeholder="you@cgiar.org" />
                {tab === 0 && (
                  <TextField required type="password" label="Password" disabled={busy}
                             value={password} onChange={e => setPassword(e.target.value)} />
                )}
                {msg && <Alert severity={msg.severity}>{msg.text}</Alert>}
                <Button
                  type="submit" variant="contained" disabled={busy}
                  startIcon={busy ? <CircularProgress size={16} color="inherit" thickness={5} /> : undefined}
                  sx={{ minHeight: 40 }}
                >
                  {busy ? (stage || "Signing in…") : (tab === 0 ? "Sign in" : "Send magic link")}
                </Button>
              </Stack>
            </form>
          </CardContent>
        </Card>
      </Box>

      <Fade in={busy} timeout={300} unmountOnExit>
        <Box sx={{
          position: "fixed", inset: 0, display: "grid", placeItems: "center", zIndex: 1300,
          bgcolor: "rgba(245, 247, 250, 0.6)", backdropFilter: "blur(2px)", pointerEvents: "none",
        }}>
          <Stack alignItems="center" gap={1.5}>
            <Box sx={{ position: "relative", display: "inline-flex" }}>
              <CircularProgress size={56} thickness={4} />
              <CircularProgress
                size={56} thickness={4} variant="determinate" value={25}
                sx={{ position: "absolute", left: 0, color: "primary.light", opacity: 0.3 }}
              />
            </Box>
            <Typography variant="body2" color="primary.dark" sx={{ fontWeight: 600 }}>
              {stage || "Working…"}
            </Typography>
          </Stack>
        </Box>
      </Fade>
    </Box>
  );
}
