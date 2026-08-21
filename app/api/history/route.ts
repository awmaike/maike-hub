import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUPABASE_URL = "https://abyivhafxbutmvgudktw.supabase.co";
const SUPABASE_KEY = "sb_publishable_SOOZgD8Lx2yPMhcyWazyBA_5QpODy4W";

const periods: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

type Row = {
  service_id: string;
  name: string;
  url: string;
  online: boolean;
  status: number;
  latency_ms: number;
  checked_at: string;
};

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get("period") || "24h";
  const duration = periods[period] || periods["24h"];
  const since = new Date(Date.now() - duration).toISOString();
  const query = new URL(`${SUPABASE_URL}/rest/v1/uptime_checks`);
  query.searchParams.set("select", "service_id,name,url,online,status,latency_ms,checked_at");
  query.searchParams.set("checked_at", `gte.${since}`);
  query.searchParams.set("order", "checked_at.asc");
  query.searchParams.set("limit", "10000");

  const response = await fetch(query, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Falha ao carregar histórico" }, { status: 502 });
  }

  const rows: Row[] = await response.json();
  const grouped: Record<string, Row[]> = {};
  for (const row of rows) (grouped[row.service_id] ||= []).push(row);

  const services = Object.entries(grouped).map(([id, samples]) => {
    const onlineCount = samples.filter(s => s.online).length;
    const uptime = samples.length ? (onlineCount / samples.length) * 100 : 0;
    const latencies = samples.filter(s => s.online && s.latency_ms > 0).map(s => s.latency_ms);
    const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const outages: { startedAt: string; endedAt: string | null; samples: number }[] = [];
    let current: { startedAt: string; endedAt: string | null; samples: number } | null = null;
    for (const sample of samples) {
      if (!sample.online) {
        if (!current) current = { startedAt: sample.checked_at, endedAt: null, samples: 0 };
        current.samples++;
      } else if (current) {
        current.endedAt = sample.checked_at;
        outages.push(current);
        current = null;
      }
    }
    if (current) outages.push(current);
    const chart = samples.map(s => ({ time: s.checked_at, online: s.online, latencyMs: s.latency_ms, status: s.status }));
    const last = samples.at(-1);
    return {
      id,
      name: last?.name || id,
      url: last?.url || "",
      uptime: Math.round(uptime * 1000) / 1000,
      avgLatency,
      totalChecks: samples.length,
      onlineChecks: onlineCount,
      offlineChecks: samples.length - onlineCount,
      currentOnline: last?.online ?? false,
      lastStatus: last?.status ?? 0,
      lastCheckedAt: last?.checked_at ?? null,
      outages: outages.reverse().slice(0, 20),
      chart,
    };
  });

  return NextResponse.json({ period, since, generatedAt: new Date().toISOString(), services }, { headers: { "Cache-Control": "no-store" } });
}
