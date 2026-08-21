"use client";

import { useEffect, useMemo, useState } from "react";

type Section = "inicio" | "servicos" | "historico" | "projetos" | "maquinas" | "atalhos" | "configuracoes";
type Period = "24h" | "7d" | "30d";
type LinkItem = { id: number; name: string; url: string; category: string };
type SiteStatus = { id: string; name: string; url: string; online: boolean; status: number; latencyMs: number; checkedAt: string };
type HistoryService = { id: string; name: string; url: string; uptime: number; avgLatency: number; totalChecks: number; onlineChecks: number; offlineChecks: number; currentOnline: boolean; lastStatus: number; lastCheckedAt: string | null; outages: { startedAt: string; endedAt: string | null; samples: number }[]; chart: { time: string; online: boolean; latencyMs: number; status: number }[] };
type GitHubData = { repository: { name: string; branch: string; visibility: string; stars: number; forks: number; openIssues: number; updatedAt: string }; commits: { sha: string; shortSha: string; message: string; author: string; date: string; url: string }[] };
type DeployData = { provider: string; online: boolean; environment: string; deploymentUrl: string; branch: string; commitSha: string; shortSha: string; commitMessage: string; region: string; checkedAt: string };
type Metrics = { online: boolean; hostname: string; os: string; cpu: { percent: number; name: string; cores?: number; threads?: number }; ram: { percent: number; usedGb: number; totalGb: number }; disk: { percent: number; freeGb: number }; processes?: { name: string; pid: number; ramMb: number; cpuSeconds: number }[]; uptimeHours: number; agentVersion: string };

const AGENT_URL = "http://127.0.0.1:43123/status";
const LINKS_KEY = "maike-hub:tech-links";
const initialLinks: LinkItem[] = [
  { id: 1, name: "GitHub", url: "https://github.com", category: "Dev" },
  { id: 2, name: "Vercel", url: "https://vercel.com", category: "Deploy" },
  { id: 3, name: "Registro.br", url: "https://registro.br", category: "Domínios" },
  { id: 4, name: "Tiflux", url: "https://tiflux.com", category: "Trabalho" },
];

function NavButton({ id, icon, label, section, onSelect }: { id: Section; icon: string; label: string; section: Section; onSelect: (id: Section) => void }) {
  return <button className={`navItem ${section === id ? "active" : ""}`} onClick={() => onSelect(id)}>{icon} <span>{label}</span></button>;
}

export default function Home() {
  const [section, setSection] = useState<Section>("inicio");
  const [period, setPeriod] = useState<Period>("24h");
  const [links, setLinks] = useState<LinkItem[]>(initialLinks);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [sites, setSites] = useState<SiteStatus[]>([]);
  const [history, setHistory] = useState<HistoryService[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [github, setGithub] = useState<GitHubData | null>(null);
  const [deploy, setDeploy] = useState<DeployData | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(LINKS_KEY);
    if (saved) { try { setLinks(JSON.parse(saved)); } catch {} }
  }, []);
  useEffect(() => { localStorage.setItem(LINKS_KEY, JSON.stringify(links)); }, [links]);

  useEffect(() => {
    let alive = true;
    async function pollAgent() {
      try {
        const r = await fetch(AGENT_URL, { cache: "no-store" });
        if (!r.ok) throw new Error();
        const data = await r.json();
        if (alive) setMetrics(data);
      } catch { if (alive) setMetrics(null); }
    }
    pollAgent();
    const timer = setInterval(pollAgent, 3000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadCloud() {
      try {
        const [s, g, d] = await Promise.all([
          fetch("/api/status", { cache: "no-store" }),
          fetch("/api/github", { cache: "no-store" }),
          fetch("/api/deploy", { cache: "no-store" }),
        ]);
        if (!alive) return;
        if (s.ok) setSites((await s.json()).services || []);
        if (g.ok) setGithub(await g.json());
        if (d.ok) setDeploy(await d.json());
      } catch {}
    }
    loadCloud();
    const timer = setInterval(loadCloud, 60000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadHistory() {
      setHistoryLoading(true);
      try {
        const r = await fetch(`/api/history?period=${period}`, { cache: "no-store" });
        const data = r.ok ? await r.json() : null;
        if (alive) setHistory(data?.services || []);
      } finally { if (alive) setHistoryLoading(false); }
    }
    loadHistory();
    const timer = setInterval(loadHistory, 60000);
    return () => { alive = false; clearInterval(timer); };
  }, [period]);

  function addLink() {
    const n = linkName.trim(); let u = linkUrl.trim();
    if (!n || !u) return;
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    setLinks(c => [...c, { id: Date.now(), name: n, url: u, category: "Personalizado" }]);
    setLinkName(""); setLinkUrl("");
  }

  const currentHub = sites.find(s => s.id === "hub");
  const hubHistory = history.find(s => s.id === "hub");
  const currentDomain = sites.find(s => s.id === "domain");
  const machineBadge = metrics ? <span className="badge ok">AGENTE ONLINE</span> : <span className="badge warn">AGENTE OFF</span>;
  const statusBadge = (online?: boolean) => online === undefined ? <span className="badge neutral">VERIFICANDO</span> : online ? <span className="badge ok">ONLINE</span> : <span className="badge warn">OFFLINE</span>;

  const serviceCards = <div className="serviceGrid">
    <article className="serviceCard"><div className="serviceTop"><strong>Maike Hub</strong>{statusBadge(currentHub?.online)}</div><p>hub.maikedev.com.br</p><small>{currentHub ? `HTTP ${currentHub.status} · ${currentHub.latencyMs} ms` : "Verificando..."}</small></article>
    <article className="serviceCard"><div className="serviceTop"><strong>Domínio principal</strong>{statusBadge(currentDomain?.online)}</div><p>maikedev.com.br</p><small>{currentDomain ? `${currentDomain.status ? `HTTP ${currentDomain.status} · ` : ""}${currentDomain.latencyMs} ms` : "Verificando..."}</small></article>
    <article className="serviceCard"><div className="serviceTop"><strong>GitHub</strong>{github ? <span className="badge ok">CONECTADO</span> : <span className="badge neutral">...</span>}</div><p>{github?.repository.name || "awmaike/maike-hub"}</p><small>{github ? `${github.repository.branch} · ${github.commits?.[0]?.shortSha || "—"}` : "Carregando..."}</small></article>
    <article className="serviceCard"><div className="serviceTop"><strong>Vercel</strong>{deploy ? <span className="badge ok">DEPLOY OK</span> : <span className="badge neutral">...</span>}</div><p>{deploy?.environment || "production"}</p><small>{deploy ? `${deploy.branch} · ${deploy.shortSha} · ${deploy.region}` : "Carregando..."}</small></article>
  </div>;

  const periodSelector = <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    {(["24h", "7d", "30d"] as Period[]).map(p => <button key={p} className={period === p ? "primaryButton" : "secondaryButton"} onClick={() => setPeriod(p)}>{p === "24h" ? "24 horas" : p === "7d" ? "7 dias" : "30 dias"}</button>)}
  </div>;

  const historyCards = historyLoading ? <article className="panel"><h2>Carregando histórico 24/7...</h2></article> : history.length === 0 ? <article className="panel"><h2>Aguardando dados</h2><p className="muted">O monitor já está coletando no servidor. Os primeiros pontos aparecem aqui assim que forem gravados.</p></article> : <div className="stack">{history.map(service => <article className="panel" key={service.id}>
    <div className="panelHeader"><div><p className="eyebrow">MONITORAMENTO 24/7</p><h2>{service.name}</h2></div>{statusBadge(service.currentOnline)}</div>
    <div className="metricCards">
      <MetricCard label="Uptime" value={`${service.uptime.toFixed(3)}%`} detail={`${service.onlineChecks}/${service.totalChecks} verificações online`} percent={service.uptime}/>
      <MetricCard label="Latência média" value={`${service.avgLatency} ms`} detail={`Período: ${period}`}/>
      <MetricCard label="Falhas" value={`${service.offlineChecks}`} detail={`${service.outages.length} incidentes agrupados`}/>
      <MetricCard label="Último HTTP" value={`${service.lastStatus || "—"}`} detail={service.lastCheckedAt ? new Date(service.lastCheckedAt).toLocaleString("pt-BR") : "—"}/>
    </div>
    <div style={{ marginTop: 18 }}>
      <p className="eyebrow">LINHA DO TEMPO</p>
      <div style={{ display: "flex", gap: 2, height: 28, overflow: "hidden", borderRadius: 8, background: "rgba(255,255,255,.04)", padding: 3 }}>
        {service.chart.slice(-180).map((point, i) => <div key={`${point.time}-${i}`} title={`${new Date(point.time).toLocaleString("pt-BR")} · ${point.online ? "Online" : "Offline"} · ${point.latencyMs} ms`} style={{ flex: 1, minWidth: 2, borderRadius: 3, background: point.online ? "#4de98b" : "#ff6b6b", opacity: .9 }} />)}
      </div>
    </div>
    <div style={{ marginTop: 18 }}><ChartCard title="Latência ao longo do período" values={service.chart.filter(x => x.online).slice(-120).map(x => x.latencyMs)} suffix=" ms" /></div>
    {service.outages.length > 0 && <div style={{ marginTop: 18 }}><p className="eyebrow">ÚLTIMAS QUEDAS</p><div className="roadmap">{service.outages.slice(0, 5).map((o, i) => <p key={i}>🔴 {new Date(o.startedAt).toLocaleString("pt-BR")} → {o.endedAt ? new Date(o.endedAt).toLocaleString("pt-BR") : "ainda offline"} · {o.samples} verificações</p>)}</div></div>}
  </article>)}</div>;

  const machinePanel = metrics ? <div className="stack"><article className="panel"><div className="panelHeader"><div><p className="eyebrow">TELEMETRIA AO VIVO</p><h2>{metrics.hostname}</h2></div>{machineBadge}</div><div className="metricCards"><MetricCard label="CPU" value={`${metrics.cpu.percent}%`} detail={metrics.cpu.name} percent={metrics.cpu.percent}/><MetricCard label="RAM" value={`${metrics.ram.percent}%`} detail={`${metrics.ram.usedGb}/${metrics.ram.totalGb} GB`} percent={metrics.ram.percent}/><MetricCard label="Disco" value={`${metrics.disk.percent}%`} detail={`${metrics.disk.freeGb} GB livres`} percent={metrics.disk.percent}/><MetricCard label="Uptime" value={`${metrics.uptimeHours}h`} detail={`Agent v${metrics.agentVersion}`}/></div></article>{metrics.processes && <article className="panel"><div className="panelHeader"><h2>Processos</h2><span className="badge neutral">TOP {metrics.processes.length}</span></div><div className="processTable"><div className="processRow head"><span>Processo</span><span>PID</span><span>RAM</span><span>CPU</span></div>{metrics.processes.map(p => <div className="processRow" key={p.pid}><strong>{p.name}</strong><span>{p.pid}</span><span>{p.ramMb} MB</span><span>{p.cpuSeconds}s</span></div>)}</div></article>}</div> : <article className="panel"><h2>Agente local offline</h2><p className="muted">O restante do Hub e o monitoramento 24/7 continuam funcionando normalmente.</p></article>;

  const projects = <div className="stack"><article className="panel"><div className="panelHeader"><div><p className="eyebrow">GITHUB REAL</p><h2>{github?.repository.name || "Maike Hub"}</h2></div><span className="badge ok">{github?.repository.visibility || "..."}</span></div>{github ? <><div className="repoStats"><span>Branch <b>{github.repository.branch}</b></span><span>Issues <b>{github.repository.openIssues}</b></span><span>Stars <b>{github.repository.stars}</b></span><span>Forks <b>{github.repository.forks}</b></span></div><div className="commitList">{github.commits.map(c => <a key={c.sha} href={c.url} target="_blank" rel="noreferrer"><code>{c.shortSha}</code><div><strong>{c.message}</strong><small>{c.author} · {new Date(c.date).toLocaleString("pt-BR")}</small></div></a>)}</div></> : <p className="muted">Carregando GitHub...</p>}</article><article className="panel"><div className="panelHeader"><div><p className="eyebrow">VERCEL REAL</p><h2>Deploy atual</h2></div>{deploy ? <span className="badge ok">ONLINE</span> : <span className="badge neutral">...</span>}</div>{deploy && <div className="deployGrid"><span>Ambiente <b>{deploy.environment}</b></span><span>Branch <b>{deploy.branch}</b></span><span>Commit <b>{deploy.shortSha}</b></span><span>Região <b>{deploy.region}</b></span><span className="full">Mensagem <b>{deploy.commitMessage}</b></span></div>}</article></div>;

  const shortcuts = <><div className="linkComposer"><input value={linkName} onChange={e => setLinkName(e.target.value)} placeholder="Nome"/><input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && addLink()} placeholder="https://..."/><button onClick={addLink}>Adicionar</button></div><div className="techLinks">{links.map(l => <a key={l.id} href={l.url} target="_blank" rel="noreferrer"><span>{l.category}</span><strong>{l.name}</strong><small>{l.url.replace(/^https?:\/\//, "")}</small></a>)}</div></>;

  let content;
  if (section === "servicos") content = <><Header eyebrow="INFRAESTRUTURA" title="Serviços" subtitle="Status atual e acesso direto ao histórico persistente."/><section className="stats"><article className="statCard"><span>Uptime Hub</span><strong>{hubHistory ? `${hubHistory.uptime.toFixed(2)}%` : "..."}</strong><small>{period}</small></article><article className="statCard"><span>Latência média</span><strong>{hubHistory ? `${hubHistory.avgLatency} ms` : "..."}</strong><small>servidor 24/7</small></article><article className="statCard"><span>Verificações</span><strong>{hubHistory?.totalChecks ?? "..."}</strong><small>gravadas no banco</small></article><article className="statCard"><span>Falhas</span><strong>{hubHistory?.offlineChecks ?? "..."}</strong><small>no período</small></article></section><article className="panel"><div className="panelHeader"><div><p className="eyebrow">STATUS AGORA</p><h2>Serviços</h2></div><button className="primaryButton" onClick={() => setSection("historico")}>Abrir histórico 24/7</button></div>{serviceCards}</article></>;
  else if (section === "historico") content = <><Header eyebrow="SUPABASE 24/7" title="Histórico" subtitle="Dados persistentes coletados mesmo com seu navegador e PC desligados."/><article className="panel" style={{ minHeight: "auto", marginBottom: 14 }}><div className="panelHeader"><div><p className="eyebrow">PERÍODO</p><h2>Escolha a janela</h2></div>{periodSelector}</div></article>{historyCards}</>;
  else if (section === "projetos") content = <><Header eyebrow="DESENVOLVIMENTO" title="Projetos" subtitle="GitHub e Vercel reais."/>{projects}</>;
  else if (section === "maquinas") content = <><Header eyebrow="HARDWARE" title="Máquinas" subtitle="Telemetria local do Windows."/>{machinePanel}</>;
  else if (section === "atalhos") content = <><Header eyebrow="FERRAMENTAS" title="Atalhos" subtitle="Acessos técnicos personalizados."/>{shortcuts}</>;
  else if (section === "configuracoes") content = <><Header eyebrow="SISTEMA" title="Configurações" subtitle="Estado atual do Maike Hub."/><article className="panel"><div className="roadmap"><p>✅ Agente Windows e telemetria</p><p>✅ Monitoramento HTTP real</p><p>✅ Histórico 24/7 persistente no Supabase</p><p>✅ Uptime 24h / 7d / 30d visível no Hub</p><p>✅ GitHub real</p><p>✅ Informações do deploy Vercel</p></div></article></>;
  else content = <><Header eyebrow="CENTRAL TÉCNICA" title="Maike Hub" subtitle="Agora o histórico 24/7 aparece diretamente no dashboard."/><section className="stats"><article className="statCard"><span>Hub agora</span><strong>{currentHub ? (currentHub.online ? "Online" : "Offline") : "..."}</strong><small>{currentHub ? `${currentHub.latencyMs} ms` : "verificando"}</small></article><article className="statCard"><span>Uptime 24/7</span><strong>{hubHistory ? `${hubHistory.uptime.toFixed(2)}%` : "..."}</strong><small>{period}</small></article><article className="statCard"><span>Máquina</span><strong>{metrics ? "Online" : "Offline"}</strong><small>{metrics?.hostname || "agente local"}</small></article><article className="statCard"><span>Último deploy</span><strong>{deploy?.shortSha || "..."}</strong><small>{deploy?.branch || "carregando"}</small></article></section><section className="dashboardGrid"><article className="panel wide"><div className="panelHeader"><div><p className="eyebrow">STATUS ATUAL</p><h2>Infraestrutura</h2></div></div>{serviceCards}</article><article className="panel"><div className="panelHeader"><div><p className="eyebrow">24/7</p><h2>Uptime persistente</h2></div><span className="badge ok">SUPABASE</span></div><p className="muted">{hubHistory ? `${hubHistory.totalChecks} verificações gravadas · ${hubHistory.offlineChecks} falhas · ${hubHistory.avgLatency} ms de média.` : "Carregando histórico do servidor..."}</p><button className="primaryButton" onClick={() => setSection("historico")}>Ver gráficos e quedas</button></article><article className="panel"><div className="panelHeader"><h2>Meu PC</h2>{machineBadge}</div><p className="muted">{metrics ? `${metrics.cpu.percent}% CPU · ${metrics.ram.percent}% RAM` : "Agente local indisponível."}</p><button className="secondaryButton" onClick={() => setSection("maquinas")}>Abrir máquina</button></article></section></>;

  return <main className="shell"><aside className="sidebar"><div className="brand"><div className="brandMark">M</div><div><strong>Maike Hub</strong><span>Tech Control</span></div></div><nav><NavButton id="inicio" icon="⌂" label="Visão geral" section={section} onSelect={setSection}/><NavButton id="servicos" icon="◉" label="Serviços" section={section} onSelect={setSection}/><NavButton id="historico" icon="▥" label="Histórico 24/7" section={section} onSelect={setSection}/><NavButton id="projetos" icon="⌘" label="Projetos" section={section} onSelect={setSection}/><NavButton id="maquinas" icon="▣" label="Máquinas" section={section} onSelect={setSection}/><NavButton id="atalhos" icon="↗" label="Atalhos" section={section} onSelect={setSection}/><NavButton id="configuracoes" icon="⚙" label="Configurações" section={section} onSelect={setSection}/></nav><div className="sidebarBottom"><div className="statusDot"/><span>Hub online</span></div></aside><section className="content">{content}</section></main>;
}

function Header({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) { return <header className="topbar"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{subtitle}</p></div><div className="avatar">M</div></header>; }
function MetricCard({ label, value, detail, percent }: { label: string; value: string; detail: string; percent?: number }) { return <div className="metricCard"><span>{label}</span><strong>{value}</strong><small>{detail}</small>{typeof percent === "number" && <div className="meter"><i style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}/></div>}</div>; }
function ChartCard({ title, values, suffix = "" }: { title: string; values: number[]; suffix?: string }) {
  const points = useMemo(() => { if (values.length < 2) return ""; const max = Math.max(...values, 1), min = Math.min(...values, 0), range = Math.max(1, max - min); return values.map((v, i) => `${(i / (values.length - 1)) * 100},${70 - ((v - min) / range) * 60}`).join(" "); }, [values]);
  const last = values.at(-1) ?? 0;
  return <div className="chartCard"><div><strong>{title}</strong><span>{last}{suffix}</span></div>{points ? <svg className="sparkline" viewBox="0 0 100 75" preserveAspectRatio="none"><polyline fill="none" vectorEffect="non-scaling-stroke" points={points}/></svg> : <p className="muted" style={{ marginTop: 16 }}>Aguardando mais pontos...</p>}</div>;
}
