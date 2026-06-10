"use client";
import Link from "next/link";
import { AppBar, Box, Button, Container, Grid, Stack, Toolbar, Typography, Paper } from "@mui/material";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";

export default function Landing() {
  return (
    <Box sx={{ minHeight: "100vh" }}>
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, flexGrow: 1 }}>
            CGIAR · MFL Innovation Collector
          </Typography>
          <Button component={Link} href="/login" color="inherit" variant="outlined" sx={{ borderColor: "rgba(255,255,255,.5)" }}>
            Sign in
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 10 }}>
        <Typography variant="overline" color="secondary">Multifunctional Landscapes Program</Typography>
        <Typography variant="h2" sx={{ fontWeight: 700, mt: 1, lineHeight: 1.1 }}>
          A central, ontology-checked record for every MFL innovation.
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mt: 3, maxWidth: 640, fontWeight: 400 }}>
          Collect, validate and centralise innovation metadata across CGIAR&apos;s
          Multifunctional Landscapes program — climate zones, partners, scaling
          readiness, and impact contributions, all in one place.
        </Typography>

        <Stack direction="row" gap={2} sx={{ mt: 5 }}>
          <Button component={Link} href="/login" size="large" variant="contained">Get started</Button>
          <Button href="#about" size="large" variant="outlined">Learn more</Button>
        </Stack>

        <Grid container spacing={3} sx={{ mt: 8 }} id="about">
          {[
            { icon: <ShieldOutlinedIcon color="primary" />,  t: "Validated",     d: "Köppen climate, SDGs, CGIAR Impact Areas — controlled at entry." },
            { icon: <SaveOutlinedIcon color="primary" />,    t: "Draft-friendly",d: "Save progress, share with co-developers, submit when ready." },
            { icon: <StorageOutlinedIcon color="primary" />, t: "Centralised",   d: "Goes straight to Supabase. No more spreadsheet sprawl." },
          ].map(c => (
            <Grid item xs={12} sm={4} key={c.t}>
              <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
                {c.icon}
                <Typography variant="h6" sx={{ mt: 1 }}>{c.t}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{c.d}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
