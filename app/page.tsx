"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Section = "inicio" | "servicos" | "projetos" | "maquinas" | "alertas" | "atalhos" | "configuracoes";
type LinkItem = { id: number; name: string; url: string; category: string };
type SiteStatus = { id: string; name: string; url: string; online: boolean; status: number; latencyMs: number; checkedAt: string };
type SiteSample = { time: number; services: Record<string, { online: boolean; latencyMs: number }> };
type MachineSample = { time: number; cpu: number; ram: number };
type AlertItem = { id: number; time: number; title: string; text: string; level: "ok" | "warn" };
type GitHubData = { repository: { name: string; branch: string; visibility: string; stars: number; forks: number; openIssues: number; updatedAt: string }; commits: { sha: string; shortSha: string; message: string; author: string; date: string; url: string }[] };
type DeployData = { provider: string; online: boolean; environment: string; deploymentUrl: string; branch: string; commitSha: string; shortSha: string; commitMessage: string; region: string; checkedAt: string };
type Metrics = { online: boolean; hostname: string; os: string; cpu: { percent: number; name: string; cores: number; threads: number }; ram: { percent: number; usedGb: number; totalGb: number }; disk: { percent: number; freeGb: number }; gpu?: { name: string; vramGb: number }[]; network?: { adapters: { name: string; speed: string }[]; ipv4: string[] }; processes?: { name: string; pid: number; ramMb: number; cpuSeconds: number }[]; services?: { name: string; displayName: string }[]; uptimeHours: number; agentVersion: string };

const AGENT_URL = "http://127.0.0.1:43123/status";
const LINKS_KEY = "maike-hub:tech-links";
const SITE_HISTORY_KEY = "maike-hub:site-history";
const MACHINE_HISTORY_KEY = "maike-hub:machine-history";
const ALERTS_KEY = "maike-hub:alerts";
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
  const [links, setLinks] = useState<LinkItem[]>(initialLinks);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [sites, setSites] = useState<SiteStatus[]>([]);
  const [siteHistory, setSiteHistory] = useState<SiteSample[]>([]);
  const [machineHistory, setMachineHistory] = useState<MachineSample[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [github, setGithub] = useState<GitHubData | null>(null);
  const [deploy, setDeploy] = useState<DeployData | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<string>("default");
  const previousSites = useRef<Record<string, boolean>>({});
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const l = localStorage.getItem(LINKS_KEY); if (l) setLinks(JSON.parse(l));
      const sh = localStorage.getItem(SITE_HISTORY_KEY); if (sh) setSiteHistory(JSON.parse(sh));
      const mh = localStorage.getItem(MACHINE_HISTORY_KEY); if (mh) setMachineHistory(JSON.parse(mh));
      const a = localStorage.getItem(ALERTS_KEY); if (a) setAlerts(JSON.parse(a));
      if ("Notification" in window) setNotificationPermission(Notification.permission);
    } finally { hydrated.current = true; }
  }, []);

  useEffect(() => { if (hydrated.current) localStorage.setItem(LINKS_KEY, JSON.stringify(links)); }, [links]);
  useEffect(() => { if (hydrated.current) localStorage.setItem(SITE_HISTORY_KEY, JSON.stringify(siteHistory)); }, [siteHistory]);
  useEffect(() => { if (hydrated.current) localStorage.setItem(MACHINE_HISTORY_KEY, JSON.stringify(machineHistory)); }, [machineHistory]);
  useEffect(() => { if (hydrated.current) localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts)); }, [alerts]);

  useEffect(() => {
    let alive = true;
    async function pollAgent() {
      try {
        const r = await fetch(AGENT_URL, { cache: "no-store" });
        if (!r.ok) throw new Error();
        const data: Metrics = await r.json();
        if (!alive) return;
        setMetrics(data);
        setMachineHistory(current => [...current, { time: Date.now(), cpu: Number(data.cpu.percent || 0), ram: Number(data.ram.percent || 0) }].slice(-60));
      } catch { if (alive) setMetrics(null); }
    }
    pollAgent();
    const timer = setInterval(pollAgent, 3000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  useEffect(() => {
    let alive = true;
    async function pollCloud() {
      try {
        const [statusRes, githubRes, deployRes] = await Promise.all([
          fetch("/api/status", { cache: "no-store" }),
          fetch("/api/github", { cache: "no-store" }),
          fetch("/api/deploy", { cache: "no-store" }),
        ]);
        const statusData = statusRes.ok ? await statusRes.json() : null;
        const githubData = githubRes.ok ? await githubRes.json() : null;
        const deployData = deployRes.ok ? await deployRes.json() : null;
        if (!alive) return;
        if (githubData) setGithub(githubData);
        if (deployData) setDeploy(deployData);
        if (statusData?.services) {
          const nextSites: SiteStatus[] = statusData.services;
          setSites(nextSites);
          const compact: Record<string, { online: boolean; latencyMs: number }> = {};
          nextSites.forEach(s => compact[s.id] = { online: s.online, latencyMs: s.latencyMs });
          setSiteHistory(current => [...current, { time: Date.now(), services: compact }].slice(-120));
          nextSites.forEach(s => {
            const previous = previousSites.current[s.id];
            if (typeof previous === "boolean" && previous !== s.online) {
              const item: AlertItem = { id: Date.now() + Math.random(), time: Date.now(), title: `${s.name} ${s.online ? "voltou" : "caiu"}`, text: s.online ? `Serviço online novamente · ${s.latencyMs} ms` : `Falha detectada · HTTP ${s.status || "sem resposta"}`, level: s.online ? "ok" : "warn" };
              setAlerts(current => [item, ...current].slice(0, 50));
              if ("Notification" in window && Notification.permission === "granted") new Notification(`Maike Hub — ${item.title}`, { body: item.text });
            }
            previousSites.current[s.id] = s.online;
          });
        }
      } catch {}
    }
    pollCloud();
    const timer = setInterval(pollCloud, 60000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  async function enableNotifications() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setNotificationPermission(result);
  }

  function addLink() {
    const n = linkName.trim(); let u = linkUrl.trim();
    if (!n || !u) return;
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    setLinks(c => [...c, { id: Date.now(), name: n, url: u, category: "Personalizado" }]);
    setLinkName(""); setLinkUrl("");
  }

  const site = (id: string) => sites.find(s => s.id === id);
  const hub = site("hub"), domain = site("domain");
  const machineBadge = metrics ? <span className="badge ok">AGENTE ONLINE</span> : <span className="badge warn">AGENTE OFF</span>;
  const statusBadge = (s?: SiteStatus) => !s ? <span className="badge neutral">VERIFICANDO</span> : s.online ? <span className="badge ok">ONLINE</span> : <span className="badge warn">OFFLINE</span>;
  const uptime = (id: string) => {
    const samples = siteHistory.filter(x => x.services[id]);
    if (!samples.length) return null;
    return Math.round(samples.filter(x => x.services[id].online).length / samples.length * 1000) / 10;
  };
  const hubUptime = uptime("hub"), domainUptime = uptime("domain");
  const hubLatency = siteHistory.map(x => x.services.hub?.latencyMs).filter((x): x is number => typeof x === "number");
  const cpuHistory = machineHistory.map(x => x.cpu), ramHistory = machineHistory.map(x => x.ram);

  const services = <div className="serviceGrid">
    <article className="serviceCard"><div className="serviceTop"><strong>Maike Hub</strong>{statusBadge(hub)}</div><p>hub.maikedev.com.br</p><small>{hub ? `HTTP ${hub.status} · ${hub.latencyMs} ms · uptime local ${hubUptime ?? "—"}%` : "Verificando..."}</small></article>
    <article className="serviceCard"><div className="serviceTop"><strong>Domínio principal</strong>{statusBadge(domain)}</div><p>maikedev.com.br</p><small>{domain ? `${domain.status ? `HTTP ${domain.status} · ` : ""}${domain.latencyMs} ms · uptime local ${domainUptime ?? "—"}%` : "Verificando..."}</small></article>
    <article className="serviceCard"><div className="serviceTop"><strong>GitHub</strong>{github ? <span className="badge ok">CONECTADO</span> : <span className="badge neutral">...</span>}</div><p>{github?.repository.name || "awmaike/maike-hub"}</p><small>{github ? `${github.repository.branch} · ${github.commits?.[0]?.shortSha || "—"}` : "Carregando GitHub..."}</small></article>
    <article className="serviceCard"><div className="serviceTop"><strong>Vercel</strong>{deploy ? <span className="badge ok">DEPLOY OK</span> : <span className="badge neutral">...</span>}</div><p>{deploy?.environment || "production"}</p><small>{deploy ? `${deploy.branch} · ${deploy.shortSha} · região ${deploy.region}` : "Carregando deploy..."}</small></article>
  </div>;

  const machinePanel = metrics ? <div className="stack">
    <article className="panel"><div className="panelHeader"><div><p className="eyebrow">TELEMETRIA AO VIVO</p><h2>{metrics.hostname}</h2></div>{machineBadge}</div><div className="metricCards"><MetricCard label="CPU" value={`${metrics.cpu.percent}%`} detail={`${metrics.cpu.cores || "—"} cores · ${metrics.cpu.threads || "—"} threads`} percent={metrics.cpu.percent}/><MetricCard label="RAM" value={`${metrics.ram.percent}%`} detail={`${metrics.ram.usedGb} / ${metrics.ram.totalGb} GB`} percent={metrics.ram.percent}/><MetricCard label="Disco C:" value={`${metrics.disk.percent}%`} detail={`${metrics.disk.freeGb} GB livres`} percent={metrics.disk.percent}/><MetricCard label="Uptime" value={`${metrics.uptimeHours}h`} detail={metrics.os}/></div><div className="chartGrid"><ChartCard title="CPU — últimos 3 min" values={cpuHistory}/><ChartCard title="RAM — últimos 3 min" values={ramHistory}/></div></article>
    {metrics.processes && <article className="panel"><div className="panelHeader"><div><p className="eyebrow">PROCESSOS</p><h2>Maior uso de memória</h2></div><span className="badge neutral">TOP {metrics.processes.length}</span></div><div className="processTable"><div className="processRow head"><span>Processo</span><span>PID</span><span>RAM</span><span>CPU</span></div>{metrics.processes.map(p => <div className="processRow" key={p.pid}><strong>{p.name}</strong><span>{p.pid}</span><span>{p.ramMb} MB</span><span>{p.cpuSeconds}s</span></div>)}</div></article>}
  </div> : <article className="panel"><h2>Agente local offline</h2><p className="muted">Na segunda, após o reinício, a versão nova do agente deve carregar automaticamente.</p></article>;

  const projects = <div className="stack">
    <article className="panel"><div className="panelHeader"><div><p className="eyebrow">GITHUB REAL</p><h2>{github?.repository.name || "Maike Hub"}</h2></div><span className="badge ok">{github?.repository.visibility || "PUBLIC"}</span></div>{github ? <><div className="repoStats"><span>Branch <b>{github.repository.branch}</b></span><span>Issues <b>{github.repository.openIssues}</b></span><span>Stars <b>{github.repository.stars}</b></span><span>Forks <b>{github.repository.forks}</b></span></div><div className="commitList">{github.commits.map(c => <a key={c.sha} href={c.url} target="_blank" rel="noreferrer"><code>{c.shortSha}</code><div><strong>{c.message}</strong><small>{c.author} · {new Date(c.date).toLocaleString("pt-BR")}</small></div></a>)}</div></> : <p className="muted">Carregando GitHub...</p>}</article>
    <article className="panel"><div className="panelHeader"><div><p className="eyebrow">VERCEL REAL</p><h2>Deploy atual</h2></div>{deploy ? <span className="badge ok">ONLINE</span> : <span className="badge neutral">...</span>}</div>{deploy ? <div className="deployGrid"><span>Ambiente <b>{deploy.environment}</b></span><span>Branch <b>{deploy.branch}</b></span><span>Commit <b>{deploy.shortSha}</b></span><span>Região <b>{deploy.region}</b></span><span className="full">Mensagem <b>{deploy.commitMessage}</b></span><span className="full">URL <b>{deploy.deploymentUrl}</b></span></div> : <p className="muted">Carregando Vercel...</p>}</article>
  </div>;

  const shortcuts = <><div className="linkComposer"><input value={linkName} onChange={e => setLinkName(e.target.value)} placeholder="Nome"/><input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && addLink()} placeholder="https://..."/><button onClick={addLink}>Adicionar</button></div><div className="techLinks">{links.map(l => <a key={l.id} href={l.url} target="_blank" rel="noreferrer"><span>{l.category}</span><strong>{l.name}</strong><small>{l.url.replace(/^https?:\/\//, "")}</small></a>)}</div></>;

  let content;
  if (section === "servicos") content = <><Header eyebrow="MONITORAMENTO" title="Serviços" subtitle="Status, latência e histórico local das verificações."/><div className="stack"><article className="panel">{services}</article><article className="panel"><div className="panelHeader"><div><p className="eyebrow">HISTÓRICO</p><h2>Latência do Hub</h2></div><span className="badge neutral">{siteHistory.length} amostras</span></div><ChartCard title="Latência em ms" values={hubLatency} maxAuto/></article></div></>;
  else if (section === "projetos") content = <><Header eyebrow="DESENVOLVIMENTO" title="Projetos" subtitle="GitHub e Vercel em tempo real."/>{projects}</>;
  else if (section === "maquinas") content = <><Header eyebrow="HARDWARE" title="Máquinas" subtitle="Telemetria, gráficos e processos do Windows."/>{machinePanel}</>;
  else if (section === "alertas") content = <><Header eyebrow="EVENTOS" title="Alertas" subtitle="Mudanças de disponibilidade detectadas enquanto o Hub está aberto."/><article className="panel"><div className="panelHeader"><h2>Histórico</h2><button className="secondaryButton" onClick={() => setAlerts([])}>Limpar</button></div>{alerts.length ? <div className="alertList">{alerts.map(a => <div className={`alertItem ${a.level}`} key={a.id}><span>●</span><div><strong>{a.title}</strong><p>{a.text}</p><small>{new Date(a.time).toLocaleString("pt-BR")}</small></div></div>)}</div> : <p className="muted">Nenhuma mudança de status registrada ainda.</p>}</article></>;
  else if (section === "atalhos") content = <><Header eyebrow="FERRAMENTAS" title="Atalhos" subtitle="Sua central de acessos."/>{shortcuts}</>;
  else if (section === "configuracoes") content = <><Header eyebrow="SISTEMA" title="Configurações" subtitle="Alertas e estado das integrações."/><div className="stack"><article className="panel"><div className="panelHeader"><div><h2>Notificações do navegador</h2><p className="muted">Funcionam enquanto o navegador/Hub estiver ativo.</p></div><span className={`badge ${notificationPermission === "granted" ? "ok" : "neutral"}`}>{notificationPermission.toUpperCase()}</span></div><button className="primaryButton" onClick={enableNotifications}>Ativar notificações</button></article><article className="panel"><h2>Integrações</h2><div className="roadmap"><p>01 — Telemetria Windows avançada ✅</p><p>02 — Monitoramento real de sites ✅</p><p>03 — GitHub: commits e repositório ✅</p><p>04 — Vercel: deploy atual ✅</p><p>05 — Histórico e gráficos ✅</p><p>06 — Alertas no navegador ✅</p></div></article></div>;
  else content = <><Header eyebrow="CENTRAL TÉCNICA" title="Maike Hub" subtitle="Infraestrutura, deploys, desenvolvimento e máquinas em um único painel."/><section className="stats"><article className="statCard"><span>Hub</span><strong>{hub?.online ? "Online" : hub ? "Offline" : "..."}</strong><small>{hub ? `${hub.latencyMs} ms · ${hubUptime ?? "—"}% uptime` : "verificando"}</small></article><article className="statCard"><span>Máquina</span><strong>{metrics ? "Online" : "Offline"}</strong><small>{metrics?.hostname || "agente local"}</small></article><article className="statCard"><span>GitHub</span><strong>{github?.commits?.[0]?.shortSha || "..."}</strong><small>{github?.repository.branch || "carregando"}</small></article><article className="statCard"><span>Deploy</span><strong>{deploy ? "OK" : "..."}</strong><small>{deploy ? `${deploy.branch} · ${deploy.shortSha}` : "Vercel"}</small></article></section><section className="dashboardGrid"><article className="panel wide"><div className="panelHeader"><div><p className="eyebrow">INFRAESTRUTURA</p><h2>Status geral</h2></div></div>{services}</article><article className="panel"><div className="panelHeader"><h2>CPU / RAM</h2>{machineBadge}</div>{metrics ? <><Sparkline values={cpuHistory}/><div className="miniValues"><span>CPU <b>{metrics.cpu.percent}%</b></span><span>RAM <b>{metrics.ram.percent}%</b></span></div></> : <p className="muted">Sem telemetria local agora.</p>}</article><article className="panel"><div className="panelHeader"><h2>Último commit</h2><span className="badge neutral">GITHUB</span></div>{github?.commits?.[0] ? <><p>{github.commits[0].message}</p><small className="muted">{github.commits[0].shortSha} · {new Date(github.commits[0].date).toLocaleString("pt-BR")}</small></> : <p className="muted">Carregando...</p>}</article></section></>;

  return <main className="shell"><aside className="sidebar"><div className="brand"><div className="brandMark">M</div><div><strong>Maike Hub</strong><span>Tech Control</span></div></div><nav><NavButton id="inicio" icon="⌂" label="Visão geral" section={section} onSelect={setSection}/><NavButton id="servicos" icon="◉" label="Serviços" section={section} onSelect={setSection}/><NavButton id="projetos" icon="⌘" label="Projetos" section={section} onSelect={setSection}/><NavButton id="maquinas" icon="▣" label="Máquinas" section={section} onSelect={setSection}/><NavButton id="alertas" icon="!" label="Alertas" section={section} onSelect={setSection}/><NavButton id="atalhos" icon="↗" label="Atalhos" section={section} onSelect={setSection}/><NavButton id="configuracoes" icon="⚙" label="Configurações" section={section} onSelect={setSection}/></nav><div className="sidebarBottom"><div className="statusDot"/><span>Hub online</span></div></aside><section className="content">{content}</section></main>;
}

function Header({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) { return <header className="topbar"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{subtitle}</p></div><div className="avatar">M</div></header>; }
function MetricCard({ label, value, detail, percent }: { label: string; value: string; detail: string; percent?: number }) { return <div className="metricCard"><span>{label}</span><strong>{value}</strong><small>{detail}</small>{typeof percent === "number" && <div className="meter"><i style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}/></div>}</div>; }
function Sparkline({ values, maxAuto = false }: { values: number[]; maxAuto?: boolean }) { const max = maxAuto ? Math.max(...values, 1) : 100; const pts = values.length ? values.map((v, i) => `${values.length === 1 ? 0 : i / (values.length - 1) * 100},${32 - Math.min(32, Math.max(0, v / max * 30))}`).join(" ") : "0,31 100,31"; return <svg className="sparkline" viewBox="0 0 100 32" preserveAspectRatio="none"><polyline points={pts} fill="none" vectorEffect="non-scaling-stroke"/></svg>; }
function ChartCard({ title, values, maxAuto = false }: { title: string; values: number[]; maxAuto?: boolean }) { return <div className="chartCard"><div><strong>{title}</strong><span>{values.length ? `${values[values.length - 1]}${maxAuto ? " ms" : "%"}` : "sem dados"}</span></div><Sparkline values={values} maxAuto={maxAuto}/></div>; }
