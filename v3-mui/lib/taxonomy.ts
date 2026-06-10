// Controlled vocabularies from build_template_v3.py — keep in sync.
export const taxonomy = {
  region: ["Africa", "Asia", "Latin America", "Global"],
  innovation_type: ["Technical", "Socio-technical", "Economic", "Socio-economic"],
  innovation_scale: ["Plot", "Field", "Farm", "Community", "Landscape", "Subnational", "National", "Multiscale"],
  challenge_cat: ["Productivity", "Climate risk", "Market access", "Natural resource degradation", "Social exclusion", "Financial barriers"],
  data_collected: [
    "Crop production and agronomic performance",
    "Soil health and soil properties",
    "Biodiversity and ecosystem indicators",
    "Climate and environmental indicators",
    "Genetic and germplasm data",
    "Livestock and animal production",
    "Socioeconomic and livelihood data",
    "Cost-benefit and economic analysis",
    "Adoption and participation metrics",
    "Knowledge, perception and qualitative data",
    "Landscape and rangeland condition",
    "Modelling and simulation outputs",
  ],
  aow: ["AoW2", "AoW3", "AoW4", "AoW5", "AoW6"],
  scaling: [
    "1 – Concept", "2 – Concept", "3 – Concept",
    "4 – Validated/Pilot", "5 – Validated/Pilot", "6 – Validated/Pilot",
    "7 – Scaling-ready", "8 – Scaling-ready",
    "9 – Institutionalized",
  ],
  climate: [
    "Af – Tropical rainforest", "Am – Tropical monsoon", "Aw/As – Tropical savanna",
    "BWh – Hot desert", "BWk – Cold desert", "BSh – Hot semi-arid", "BSk – Cold semi-arid",
    "Csa – Hot-summer Mediterranean", "Csb – Warm-summer Mediterranean",
    "Cwa – Humid subtropical (dry winter)", "Cwb – Subtropical highland",
    "Cfa – Humid subtropical", "Cfb – Oceanic", "Cfc – Subpolar oceanic",
    "Dsa – Hot, dry-summer continental", "Dsb – Warm, dry-summer continental",
    "Dwa – Monsoon-influenced hot continental", "Dwb – Monsoon-influenced warm continental",
    "Dfa – Hot-summer continental", "Dfb – Warm-summer continental",
    "Dfc – Subarctic", "Dfd – Subarctic (very cold winter)",
    "ET – Tundra", "EF – Ice cap",
  ],
  sdg: [
    "Goal 1: No Poverty", "Goal 2: Zero Hunger", "Goal 3: Good Health and Well-being",
    "Goal 5: Gender Equality", "Goal 6: Clean Water and Sanitation",
    "Goal 8: Decent Work and Economic Growth", "Goal 10: Reduced Inequalities",
    "Goal 12: Responsible Consumption and Production", "Goal 13: Climate Action",
    "Goal 15: Life on Land", "Goal 16: Peace, Justice and Strong Institutions",
    "Goal 17: Partnerships for the Goals",
  ],
  cgiar_rating: ["Principal", "Significant", "Not targeted", "Not provided"],
  actor_types: ["Individual farmer", "Agri-entrepreneur", "Farmer group / cooperative",
                "Agro-dealer", "Consumer", "Service provider (extension, advisory)",
                "Government / public agency", "NGO / civil society",
                "Research institution", "Private sector / company"],
} as const;

export type TaxonomyKey = keyof typeof taxonomy;

export type InputType = "free" | "dropdown" | "integer" | "decimal" | "url";

export interface ColumnDef {
  field: string;
  group: string;
  type: InputType;
  dv?: TaxonomyKey | [number, number];
  width: number;
}

export const COLS: ColumnDef[] = [
  { field: "innovation_id",               group: "Identification",   type: "free",     width: 180 },
  { field: "region",                      group: "Site",             type: "dropdown", dv: "region",          width: 130 },
  { field: "country",                     group: "Site",             type: "free",     width: 150 },
  { field: "site_name",                   group: "Site",             type: "free",     width: 180 },
  { field: "climate_class",               group: "Site",             type: "dropdown", dv: "climate",         width: 230 },
  { field: "latitude",                    group: "Site",             type: "decimal",  dv: [-90, 90],         width: 110 },
  { field: "longitude",                   group: "Site",             type: "decimal",  dv: [-180, 180],       width: 110 },
  { field: "innovation_description",             group: "Innovation",       type: "free",     width: 220 },
  { field: "innovation_type",             group: "Innovation",       type: "dropdown", dv: "innovation_type", width: 170 },
  { field: "innovation_scale",            group: "Innovation",       type: "dropdown", dv: "innovation_scale",width: 160 },
  { field: "scaling_readiness_level",     group: "Innovation",       type: "dropdown", dv: "scaling",         width: 200 },
  { field: "challenge_category",          group: "Challenge",        type: "dropdown", dv: "challenge_cat",   width: 200 },
  { field: "challenge_description",       group: "Challenge",        type: "free",     width: 300 },
  { field: "years_tested",                group: "Testing & Reach",  type: "integer",  dv: [0, 100],          width: 120 },
  { field: "nb_actors_test_innovations",  group: "Testing & Reach",  type: "integer",  dv: [0, 9_999_999],    width: 180 },
  { field: "actors_tested",               group: "Testing & Reach",  type: "free",     width: 260 },
  { field: "data_collected",              group: "Data Asset",       type: "dropdown", dv: "data_collected",  width: 280 },
  { field: "data_repository_url",         group: "Data Asset",       type: "url",      width: 260 },
  { field: "innovation_description_url",  group: "Data Asset",       type: "url",      width: 260 },
  { field: "link_another_aow",            group: "Data Asset",       type: "dropdown", dv: "aow",             width: 130 },
  { field: "focal_point_name",            group: "Organisations",    type: "free",     width: 180 },
  { field: "focal_point_email",           group: "Organisations",    type: "free",     width: 220 },
  { field: "lead_organisation",           group: "Organisations",    type: "free",     width: 170 },
  { field: "co_developers",               group: "Organisations",    type: "free",     width: 220 },
  { field: "implementing_partners",       group: "Organisations",    type: "free",     width: 220 },
  { field: "sdg",                         group: "SDG",              type: "dropdown", dv: "sdg",             width: 280 },
  { field: "cgiar_food_security",         group: "CGIAR Impact",     type: "dropdown", dv: "cgiar_rating",    width: 170 },
  { field: "cgiar_improved_livelihoods",  group: "CGIAR Impact",     type: "dropdown", dv: "cgiar_rating",    width: 200 },
  { field: "cgiar_gender_equality",       group: "CGIAR Impact",     type: "dropdown", dv: "cgiar_rating",    width: 170 },
  { field: "cgiar_environment_biodiversity",group: "CGIAR Impact",   type: "dropdown", dv: "cgiar_rating",    width: 230 },
  { field: "cgiar_climate_change",        group: "CGIAR Impact",     type: "dropdown", dv: "cgiar_rating",    width: 170 },
];

export const GROUP_COLOURS: Record<string, string> = {
  "Identification":  "#566573",
  "Site":            "#1E8449",
  "Innovation":      "#1A5276",
  "Challenge":       "#784212",
  "Testing & Reach": "#6C3483",
  "Data Asset":      "#B7950B",
  "Organisations":   "#922B21",
  "SDG":             "#0E6655",
  "CGIAR Impact":    "#154360",
};

export const REQUIRED_FIELDS = [
  "innovation_id", "region", "country", "innovation_description", "innovation_type",
] as const;

export type RowData = Partial<Record<(typeof COLS)[number]["field"], string | number | null>>;
