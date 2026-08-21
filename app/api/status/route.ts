import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const targets = [
  { id: "hub", name: "Maike Hub", url: "https://hub.maikedev.com.br" },
  { id: "domain", name: "Domínio principal", url: "https://maikedev.com.br" },
];

export async function GET() {
  const checkedAt = new Date().toISOString();
  const results = await Promise.all(targets.map(async (target) => {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      const response = await fetch(target.url, { method: "GET", cache: "no-store", redirect: "follow", signal: controller.signal });
      clearTimeout(timer);
      return { ...target, online: response.ok, status: response.status, latencyMs: Date.now() - start, checkedAt };
    } catch {
      return { ...target, online: false, status: 0, latencyMs: Date.now() - start, checkedAt };
    }
  }));
  return NextResponse.json({ checkedAt, services: results }, { headers: { "Cache-Control": "no-store" } });
}
