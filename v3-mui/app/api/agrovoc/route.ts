import { NextResponse } from "next/server";

// Server-side proxy to the AGROVOC SKOSMOS search API. Runs on our origin so
// the browser isn't subject to cross-origin restrictions, and lets us cache and
// normalise the response to just { label, uri } pairs.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const url =
    `https://agrovoc.fao.org/browse/rest/v1/agrovoc/search` +
    `?query=${encodeURIComponent(q + "*")}&lang=en&maxhits=15`;

  try {
    const r = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },   // cache identical searches for an hour
    });
    if (!r.ok) return NextResponse.json({ results: [] });
    const data = await r.json();

    const seen = new Set<string>();
    const results: { label: string; uri: string }[] = [];
    for (const x of data.results ?? []) {
      const label = String(x.prefLabel ?? "").trim();
      if (!label) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ label, uri: String(x.uri ?? "") });
    }
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
