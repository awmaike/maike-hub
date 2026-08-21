import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const repo = "awmaike/maike-hub";

export async function GET() {
  try {
    const headers = { Accept: "application/vnd.github+json", "User-Agent": "maike-hub" };
    const [repoRes, commitsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${repo}`, { headers, cache: "no-store" }),
      fetch(`https://api.github.com/repos/${repo}/commits?per_page=5`, { headers, cache: "no-store" }),
    ]);

    if (!repoRes.ok || !commitsRes.ok) throw new Error("GitHub API indisponível");

    const repository = await repoRes.json();
    const commits = await commitsRes.json();

    return NextResponse.json({
      repository: {
        name: repository.full_name,
        branch: repository.default_branch,
        visibility: repository.visibility,
        stars: repository.stargazers_count,
        forks: repository.forks_count,
        openIssues: repository.open_issues_count,
        updatedAt: repository.updated_at,
      },
      commits: commits.map((item: any) => ({
        sha: item.sha,
        shortSha: item.sha.slice(0, 7),
        message: item.commit?.message?.split("\n")[0] || "Commit",
        author: item.commit?.author?.name || item.author?.login || "desconhecido",
        date: item.commit?.author?.date || item.commit?.committer?.date,
        url: item.html_url,
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar o GitHub." }, { status: 502 });
  }
}
