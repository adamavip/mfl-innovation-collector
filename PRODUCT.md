# Product

## Register

product

## Users

CGIAR researchers, MFL (Multifunctional Landscapes) focal points, and program officers across the network's research centres. They sit somewhere between field collection and headquarters reporting: they collect innovation records on laptops in regional offices (often on slow connections), need to attach raw research data, draw site geometries on a map, and roll the result up to the program-wide MFL Solutions Dashboard. The job-to-be-done on any screen is *"capture one innovation record accurately, with the right vocabulary, the right files, the right geography, and ship it to Supabase."*

## Product Purpose

A controlled-vocabulary data collection tool for the CGIAR Multifunctional Landscapes program. It replaces an Excel-based inventory with a validated, centralised store that feeds the public MFL Solutions Dashboard. Two collection modes — spreadsheet-like grid for bulk entry, multi-step form for guided single records — share the same column set and write to one Supabase table. Files (Excel/CSV/Word/PDF raw datasets, GeoJSON / Shapefile geometries) go to a private storage bucket. Success: focal points complete a full innovation record without contacting a data coordinator, and downstream analysts trust the vocabulary.

## Brand Personality

Scientific, trustworthy, calm. The voice is precise without being dry — the way a CGIAR technical brief reads, not how a SaaS dashboard talks. No marketing flourish, no decorative noise, no urgency theatrics. When a section needs to be felt, it does so through hierarchy, typography weight, and deliberate restraint — never through gradients, glows, or motion-for-motion's-sake. Confidence comes from showing the controlled vocabulary doing its job (red cells with helpful messages, dropdowns that respect the taxonomy, validation that explains the rule).

## Anti-references

- **Heavy gradient hero, glass cards, blurry orbs** — the late-2020s AI/SaaS marketing template is explicitly off the table. No `background-clip: text` rainbows, no `backdrop-filter` glass on form cards, no decorative gradients behind the auth form. Color comes from semantic state (validation, taxonomy group, status), not decoration.
- Stock unmodified Material Design — MUI is the engine, not the look. The defaults need to be tuned (typography, density, surface treatment) so it doesn't read as "first Material project."
- Cream/sand "magazine-warm" body backgrounds tinted toward 70° hue — the 2026 AI-default near-white. The surface here is neutral or a deliberate cool/forest tint that ties to MFL's landscape register, not a paper-feel reflex.

## Design Principles

1. **The taxonomy is the design.** Every controlled vocabulary, every validation rule, every red cell exists because the data quality matters more than the form. The UI should make following the rules feel like the obvious path, and breaking them feel diagnostic, not punitive.
2. **Two modes, one record.** Grid and form mode are surfaces over the same data. The visual treatment must reinforce that they're equivalent — same field names, same vocabulary, same record. Nothing in the chrome should suggest one is "the real one."
3. **Field-office reality.** Slow Cellular, older laptops, OneDrive sync running, intermittent network. Performance budget and progressive states (loading, retry, offline-friendly drafts) are part of the design, not afterthoughts.
4. **Quiet confidence.** The product is dealing with high-stakes research data. Visual loudness erodes trust. Earn density through hierarchy and restraint, not color or motion.
5. **Bucket-anchored proof.** Every file the user attaches — datasets, geometries — has a path in Supabase Storage. The UI should make that observable: filename, size, signed-URL download, and a sense that the data isn't trapped.

## Accessibility & Inclusion

- WCAG 2.1 AA across all pages. Body text ≥ 4.5:1, large text ≥ 3:1, including placeholder copy on form inputs (the common failure on tinted backgrounds).
- Low-bandwidth contexts: total above-the-fold weight under budget, no autoplay or background video, map tiles lazy-loaded.
- Full keyboard navigation on all primary flows (login → form steps → submit, grid edit → save draft).
- Reduced-motion alternatives on every animation: crossfades or instant transitions when `prefers-reduced-motion: reduce`.
- Colorblind-safe semantic colors: red validation paired with text + icon, never red alone. Taxonomy group colors paired with a label.
- Live regions for async feedback (login progress, save draft confirmation, validation summary).
