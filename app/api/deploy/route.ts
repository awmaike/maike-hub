import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || "";
  const commitRef = process.env.VERCEL_GIT_COMMIT_REF || "main";
  const commitMessage = process.env.VERCEL_GIT_COMMIT_MESSAGE || "";
  const deploymentUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "hub.maikedev.com.br";
  const environment = process.env.VERCEL_ENV || "production";
  const region = process.env.VERCEL_REGION || "auto";

  return NextResponse.json({
    provider: "Vercel",
    online: true,
    environment,
    deploymentUrl,
    branch: commitRef,
    commitSha,
    shortSha: commitSha ? commitSha.slice(0, 7) : "—",
    commitMessage: commitMessage || "Deploy atual",
    region,
    checkedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
