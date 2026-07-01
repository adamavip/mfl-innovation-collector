"use client";
import Link from "next/link";
import { Box, Stack, Typography, Chip, Divider, Link as MuiLink } from "@mui/material";
import { PEACH, INK, INK_SOFT, INDIGO, HAIRLINE, DISPLAY, FolioNav, Eyebrow, PillButton } from "@/lib/folio";
import { taxonomy } from "@/lib/taxonomy";

// ── Controlled-vocabulary definitions ────────────────────────────────────────
// Keyed by taxonomy key → option label → plain-language meaning. Options are
// rendered from `taxonomy` so this guide always matches the form's dropdowns.
const DEFS: Record<string, Record<string, string>> = {
  innovation_type: {
    "Technical": "A physical or biological technology — a tool, input, variety, machine, or practice. E.g. a drought-tolerant maize variety.",
    "Socio-technical": "A technology plus the social arrangements needed to use it. E.g. a small irrigation scheme together with a water-user association.",
    "Economic": "A financial or market mechanism. E.g. a credit product, index insurance, or a payment-for-ecosystem-services scheme.",
    "Socio-economic": "A social, institutional or organisational innovation with economic aims. E.g. a cooperative model or a benefit-sharing arrangement.",
  },
  innovation_scale: {
    "Plot": "A single experimental plot.",
    "Field": "One farmer's field.",
    "Farm": "A whole farm or household unit.",
    "Community": "A village or community.",
    "Landscape": "A multi-use landscape spanning several farms and land uses.",
    "Subnational": "A district, province or region within a country.",
    "National": "Applied country-wide.",
    "Multiscale": "Operates across several of the levels above.",
  },
  scaling: {
    "1 – Concept": "An idea or early prototype, not yet tested in the field.",
    "2 – Validated / Pilot": "Tested and shown to work under real conditions at limited scale.",
    "3 – Scaling-ready": "Proven and packaged for wider roll-out.",
    "4 – Institutionalized": "Embedded in policy, programmes or markets at scale.",
  },
  thematic_area: {
    "Agroecological Production Systems": "Sustainable, biodiversity-based production and agroecological transitions.",
    "Commons and Protected Areas": "Conservation, restoration and governance of shared and protected landscapes.",
    "Waterscapes and Water Security": "Water resources, watersheds, and water-related ecosystem services.",
    "Nutritionscapes and Livelihood Resilience": "Nutrition, food security and resilient rural livelihoods.",
    "Knowledge, Advisory and Scaling Pathways": "Knowledge systems, advisory services and pathways to scale.",
    "Markets, Value Chains and PES": "Markets, value chains and payments for ecosystem services.",
    "Governance and GESI": "Governance, gender equality and social inclusion.",
    "Policy": "Policy engagement, instruments and enabling environments.",
  },
  production_system: {
    "Mixed farming systems": "Crop–livestock, often with cereals, legumes, fodder, and manure/nutrient cycling.",
    "Staple-crop systems": "Rice, wheat, maize, roots/tubers, legumes, dryland cereals.",
    "Animal and aquatic food systems": "Livestock, pastoral/agro-pastoral systems, aquaculture, fisheries.",
    "Natural-resource-based systems": "Rainfed, irrigated, agroforestry, rangeland, and landscape systems.",
    "Market- and nutrition-oriented systems": "Horticulture, peri-urban agriculture, diversified food systems.",
  },
  challenge_cat: {
    "Productivity": "Low or declining yields or output.",
    "Climate risk": "Drought, floods, heat or variability threatening the system.",
    "Market access": "Difficulty reaching buyers, prices or value chains.",
    "Natural resource degradation": "Loss of soil, water, biodiversity or land quality.",
    "Social exclusion": "Barriers facing women, youth or marginalised groups.",
    "Financial barriers": "Lack of credit, capital, or affordability.",
  },
  data_collected: {
    "Crop production and agronomic performance": "Yields, biomass, phenology, agronomic trial results.",
    "Soil health and soil properties": "Soil organic carbon, nutrients, texture, structure, erosion.",
    "Biodiversity and ecosystem indicators": "Species richness, habitat quality, ecosystem-service metrics.",
    "Climate and environmental indicators": "Rainfall, temperature, GHG emissions, water balance.",
    "Genetic and germplasm data": "Accessions, traits, molecular or genotypic data.",
    "Livestock and animal production": "Herd size, liveweight, milk yield, animal health.",
    "Socioeconomic and livelihood data": "Income, assets, labour, food security.",
    "Cost-benefit and economic analysis": "Costs, returns, profitability, gross margins.",
    "Adoption and participation metrics": "Uptake rates, number of adopters, participation levels.",
    "Knowledge, perception and qualitative data": "Interviews, perceptions, attitudes, qualitative findings.",
    "Landscape and rangeland condition": "Land cover, vegetation state, rangeland condition.",
    "Modelling and simulation outputs": "Crop, hydrology or economic model results.",
  },
  barrier_categories: {
    "Biophysical misfit": "Doesn't suit local soils, climate or terrain.",
    "Labour and input unavailability": "The labour or inputs it needs are hard to obtain.",
    "Unaffordable cost": "Too expensive for the intended users.",
    "Too knowledge-intensive": "Requires skills or knowledge users don't have.",
    "Low or uncertain returns": "Benefits are small or unreliable.",
    "Weak social infrastructure": "Missing groups, networks or trust to support it.",
    "Poor market and value chain access": "No reliable markets or buyers.",
    "Long time to returns": "Benefits take too long to appear.",
    "Conflicting trade-offs": "Gains in one area cause losses in another.",
    "Unfavourable policy and institutional environment": "Rules or institutions work against it.",
  },
  success_factor_categories: {
    "Peer learning platform": "Farmer-to-farmer learning, demonstrations, field schools.",
    "Third-party facilitation": "NGO, extension or project support that enables uptake.",
    "Input availability and access": "Seeds and inputs are reliably available.",
    "Financial incentives or subsidies": "Grants, subsidies or payments that encourage adoption.",
    "Favourable biophysical conditions": "Local conditions suit the innovation.",
    "Strong market and value chain linkages": "Reliable buyers and prices.",
    "Supportive policy and institutional environment": "Enabling rules and institutions.",
    "Collective action and group adoption": "Adopted together by groups or communities.",
    "Co-design with end users": "Users helped design it, improving fit.",
    "Low adoption cost or high cost-effectiveness": "Cheap, or clearly worth the cost.",
    "Quick visible returns": "Benefits appear quickly and are easy to see.",
    "Complementary innovations bundled": "Works alongside other practices or inputs.",
  },
  cgiar_rating: {
    "Principal": "This impact area is a main objective of the innovation.",
    "Significant": "An important but secondary objective.",
    "Not targeted": "The innovation does not specifically address it.",
    "Not provided": "Not assessed, or no information available.",
  },
  actor_types: {
    "Individual farmer": "A single farmer or producer.",
    "Agri-entrepreneur": "A farmer or actor running an agriculture-based business.",
    "Farmer group / cooperative": "Organised producer groups or cooperatives.",
    "Agro-dealer": "A retailer of seeds, inputs or equipment.",
    "Consumer": "End consumers of the produce.",
    "Service provider (extension, advisory)": "Extension or advisory service providers.",
    "Government / public agency": "Public bodies and government agencies.",
    "NGO / civil society": "Non-governmental and civil-society organisations.",
    "Research institution": "Universities and research centres.",
    "Private sector / company": "Firms and companies along the value chain.",
  },
};

// ── Field reference, by form section ─────────────────────────────────────────
type FieldDoc = { name: string; def: string; example?: string; vocab?: keyof typeof taxonomy };
type SectionDoc = { n: string; title: string; intro: string; fields: FieldDoc[] };

const SECTIONS: SectionDoc[] = [
  {
    n: "01", title: "Identification & innovation",
    intro: "Identify the innovation and classify what kind of thing it is.",
    fields: [
      { name: "innovation_id", def: "A unique identifier generated automatically. You can't edit it — it's copied onto every file uploaded for this record." },
      { name: "innovation_name", def: "A short label for the innovation, under 20 characters. Used to name its folder in storage, so keep it recognisable.", example: "DT-Maize-Kenya" },
      { name: "innovation_description", def: "A one-line, plain-language description: the official name plus a short summary.", example: "Drought-tolerant maize variety for semi-arid Kenya." },
      { name: "innovation_type", def: "What kind of innovation this is.", vocab: "innovation_type" },
      { name: "innovation_scale", def: "The spatial or organisational level at which the innovation applies.", vocab: "innovation_scale" },
      { name: "scaling_readiness_level", def: "How far the innovation has progressed from idea to institutionalised.", vocab: "scaling" },
      { name: "keywords", def: "Start typing to search AGROVOC and pick standardised terms. Enter the term label (words), not the URI — you can also add your own keyword. Stored separated by “ | ”.", example: "maize | agroforestry | soil water conservation" },
      { name: "thematic_area", def: "The MFL thematic area the innovation best fits.", vocab: "thematic_area" },
    ],
  },
  {
    n: "02", title: "Site & geography",
    intro: "Where the innovation is implemented.",
    fields: [
      { name: "region", def: "The broad region.", vocab: "region" },
      { name: "country/countries", def: "One or more countries where the innovation is implemented. Select from the list; multiple are allowed for regional or global innovations." },
      { name: "site_name(s)", def: "One or more sites, searched via Mapbox — pick a place and its name is filled automatically, its coordinates are captured, and it's saved as a named pin in the record's map data. Type a custom name if a site isn't listed. Optional for national, regional or global innovations." },
      { name: "climate_class", def: "Köppen–Geiger climate class of the site. If unsure, use the Köppen map linked in the form." },
      { name: "latitude / longitude", def: "Optional. Filled automatically from your first site, in decimal degrees. Not required for national, regional or global innovations — leave blank or use the map to outline the area. Edit for a more precise point.", example: "-1.5177, 37.2634" },
      { name: "production_system", def: "The dominant production system at the site.", vocab: "production_system" },
      { name: "Additional geography", def: "Optionally draw or upload points, lines or polygons (GeoJSON or zipped shapefile). Name every feature — names are saved with the GeoJSON. The parsed geometry and your original file are both stored." },
    ],
  },
  {
    n: "03", title: "Challenge, data & description",
    intro: "What the innovation addresses, what data exists, and where to find it.",
    fields: [
      { name: "challenge_category", def: "One or more categories of challenge the innovation addresses.", vocab: "challenge_cat" },
      { name: "challenge_description", def: "A plain-language description of the challenge. Use ontology terms (AGRO, ENVO) where they fit.", example: "Recurrent mid-season dry spells reduce maize yields in semi-arid zones." },
      { name: "data_collected", def: "One or more types of data collected for this innovation.", vocab: "data_collected" },
      { name: "indicators_measured", def: "The specific indicators measured — always include the unit. Pick from the list or type your own.", example: "Crop yield (kg/ha) | Soil organic carbon (%)" },
      { name: "data_repository_url", def: "One or more public links to the dataset(s) or repository. Public datasets only.", example: "https://datadryad.org/…" },
      { name: "innovation_description_url", def: "Required. At least one public link describing the innovation — a project page, brief or blog post.", example: "https://cgiar.org/…" },
      { name: "link_another_aow", def: "Link to another Area of Work, if applicable." },
    ],
  },
  {
    n: "04", title: "Testing & validation",
    intro: "Each phase can have its own duration, number of actors, and (for validation) scaling readiness.",
    fields: [
      { name: "start_year / end_year", def: "First and last calendar year of the testing (and validation) phase. Use the same year for a single-year phase." },
      { name: "nb_actors", def: "Number of actors who participated in the phase.", example: "120" },
      { name: "actors_tested / actors_validated", def: "Up to three types of actor involved in each phase.", vocab: "actor_types" },
      { name: "scaling_readiness_validation", def: "Readiness at the end of validation — may differ from the overall level.", vocab: "scaling" },
    ],
  },
  {
    n: "05", title: "Organisations",
    intro: "Focal point and partners.",
    fields: [
      { name: "focal_point_name / email", def: "The person who can answer questions about this record.", example: "name@cgiar.org" },
      { name: "lead_organisation", def: "The organisation leading the innovation. Used in the storage folder name." },
      { name: "co_developers", def: "Co-developing organisations, acronyms separated by |.", example: "CIMMYT | ICRISAT | IFPRI" },
      { name: "implementing_partners", def: "Implementing partners, acronyms separated by |." },
    ],
  },
  {
    n: "06", title: "Impact & SDGs",
    intro: "Up to three SDGs and a contribution rating for each of the five CGIAR Impact Areas.",
    fields: [
      { name: "sdg / sdg_secondary / sdg_tertiary", def: "The Sustainable Development Goals the innovation contributes to, in order of importance (primary, secondary, tertiary)." },
      { name: "CGIAR Impact Area ratings", def: "How strongly the innovation targets each CGIAR Impact Area (food security, livelihoods, gender equality, environment & biodiversity, climate change).", vocab: "cgiar_rating" },
    ],
  },
  {
    n: "07", title: "Adoption — barriers & success factors",
    intro: "Pick the categories that matter most — up to four each. Use 'Other' to add anything missing.",
    fields: [
      { name: "barriers_to_scaling", def: "The main reasons this innovation is hard to scale or sustain.", vocab: "barrier_categories" },
      { name: "success_factors", def: "The conditions that made adoption work.", vocab: "success_factor_categories" },
    ],
  },
  {
    n: "08", title: "Raw data, comments & feedback",
    intro: "Attach curated datasets, leave comments, and tell us how to improve the form.",
    fields: [
      { name: "attachments", def: "Curated, analysis-ready datasets — clean tables with clear column names, units, treatment/control labels, one observation per row. CSV, Excel, TSV, text, Word or PDF, up to 50 MB each." },
      { name: "general_comments", def: "Anything else worth noting — caveats, context, related work." },
      { name: "form_feedback", def: "How to improve the form itself: confusing fields, missing vocabularies, anything that slowed you down." },
    ],
  },
];

const CONVENTIONS = [
  ["“Other (specify)”", "When no option fits, pick Other and type your value inline. Prefer an existing option whenever one is close."],
  ["Multi-select fields", "Some fields (challenge, data, indicators, barriers, success factors, actors) accept more than one value. Values are stored separated by a vertical bar “ | ”."],
  ["Required fields", "Innovation id, innovation name, region, country, description, type, and at least one description URL are required to submit."],
  ["Units", "Always include the unit with any indicator, e.g. “Crop yield (kg/ha)”."],
  ["Ontology terms", "For free-text fields, prefer terms from AGROVOC, AGRO, ENVO or TO so records stay comparable."],
];

export default function Guide() {
  return (
    <Box sx={{ minHeight: "100svh", bgcolor: PEACH, p: { xs: 1.25, sm: 2, md: 3 } }}>
      <Box
        sx={{
          maxWidth: 1080, mx: "auto", bgcolor: "#fff", borderRadius: { xs: 5, md: "36px" },
          overflow: "hidden", boxShadow: "0 40px 90px rgba(22,19,58,0.12)",
          "& .MuiTypography-root": { fontFamily: DISPLAY },
        }}
      >
        <FolioNav
          links={[
            { label: "Home", href: "/" },
            { label: "Dashboard", href: "/dashboard" },
            { label: "Guide", href: "/guide", active: true },
          ]}
          maxWidth="100%"
        />

        <Box sx={{ px: { xs: 2.5, sm: 5, md: 8 }, py: { xs: 4, md: 6 } }}>
          {/* Header */}
          <Eyebrow label="Field guide" />
          <Typography component="h1" sx={{ mt: 2, fontSize: { xs: 32, md: 44 }, fontWeight: 800, letterSpacing: "-0.03em", color: INK, lineHeight: 1.05 }}>
            How to fill the innovation form
          </Typography>
          <Typography sx={{ mt: 2, fontSize: 16, lineHeight: 1.65, color: INK_SOFT, maxWidth: 720 }}>
            Definitions and examples for every field and category, so records are captured
            consistently. Dropdowns use controlled vocabularies — pick the closest option, and
            use <em>Other (specify)</em> only when nothing fits.
          </Typography>

          {/* Conventions */}
          <Box sx={{ mt: 4, p: { xs: 2.5, md: 3.5 }, bgcolor: "#FAF5EF", borderRadius: 4, border: `1px solid ${HAIRLINE}` }}>
            <Typography sx={{ fontWeight: 800, color: INK, fontSize: 15, mb: 1.5 }}>Conventions</Typography>
            <Stack gap={1.25}>
              {CONVENTIONS.map(([term, desc]) => (
                <Box key={term} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "200px 1fr" }, gap: { xs: 0.25, sm: 2 } }}>
                  <Typography sx={{ fontWeight: 700, color: INK, fontSize: 14 }}>{term}</Typography>
                  <Typography sx={{ color: INK_SOFT, fontSize: 14, lineHeight: 1.55 }}>{desc}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Sections */}
          <Stack gap={5} sx={{ mt: 6 }}>
            {SECTIONS.map((s) => (
              <Box key={s.n}>
                <Stack direction="row" alignItems="baseline" gap={1.5}>
                  <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, color: INDIGO, fontSize: 15 }}>{s.n}</Typography>
                  <Typography component="h2" sx={{ fontSize: { xs: 22, md: 26 }, fontWeight: 800, letterSpacing: "-0.02em", color: INK }}>
                    {s.title}
                  </Typography>
                </Stack>
                <Typography sx={{ mt: 0.5, mb: 2.5, color: INK_SOFT, fontSize: 14.5 }}>{s.intro}</Typography>

                <Stack gap={2.5}>
                  {s.fields.map((f) => (
                    <Box key={f.name} sx={{ pl: { sm: 2 }, borderLeft: { sm: `2px solid ${HAIRLINE}` } }}>
                      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography sx={{ fontFamily: "monospace", fontSize: 13.5, fontWeight: 700, color: INK }}>
                          {f.name}
                        </Typography>
                        {f.example && (
                          <Chip
                            size="small"
                            label={`e.g. ${f.example}`}
                            sx={{ bgcolor: "rgba(83,65,232,0.08)", color: INDIGO, fontWeight: 600, height: 22, fontFamily: DISPLAY }}
                          />
                        )}
                      </Stack>
                      <Typography sx={{ mt: 0.5, color: INK_SOFT, fontSize: 14.5, lineHeight: 1.6, maxWidth: 760 }}>
                        {f.def}
                      </Typography>

                      {f.vocab && (
                        <Stack gap={0.75} sx={{ mt: 1.5 }}>
                          {taxonomy[f.vocab].map((opt) => (
                            <Box key={opt} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "260px 1fr" }, gap: { xs: 0, sm: 2 } }}>
                              <Typography sx={{ fontWeight: 700, color: INK, fontSize: 13.5 }}>{opt}</Typography>
                              <Typography sx={{ color: INK_SOFT, fontSize: 13.5, lineHeight: 1.5 }}>
                                {DEFS[f.vocab as string]?.[opt] ?? ""}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>

          <Divider sx={{ my: 5 }} />

          <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems={{ sm: "center" }} justifyContent="space-between">
            <Typography sx={{ color: INK_SOFT, fontSize: 14 }}>
              Still unsure about a field? Email{" "}
              <MuiLink href="mailto:adama.ndour@cgiar.org" sx={{ color: INDIGO, fontWeight: 700 }}>adama.ndour@cgiar.org</MuiLink>.
            </Typography>
            <PillButton href="/dashboard" variant="indigo">Back to the form</PillButton>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
