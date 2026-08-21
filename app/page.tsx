"use client";

import { useEffect, useState } from "react";

type Section = "inicio" | "servicos" | "projetos" | "maquinas" | "atalhos" | "configuracoes";
type LinkItem = { id: number; name: string; url: string; category: string };
type Metrics = {
  online: boolean;
  hostname: string;
  username: string;
  os: string;
  cpu: { percent: number; name: string };
  ram: { percent: number; usedGb: number; totalGb: number };
  disk: { percent: number; usedGb: number; totalGb: number; freeGb: number };
  gpu: string[];
  uptimeHours: number;
  timestamp: string;
  agentVersion: string;
};

const LINKS_KEY = "maike-hub:tech-links";
const AGENT_URL = "http://127.0.0.1:43123/status";
const initialLinks: LinkItem[] = [
  { id: 1, name: "GitHub", url: "https://github.com", category: "Dev" },
  { id: 2, name: "Vercel", url: "https://vercel.com", category: "Deploy" },
  { id: 3, name: "Registro.br", url: "https://registro.br", category: "Domínios" },
  { id: 4, name: "Tiflux", url: "https://tiflux.com", category: "Trabalho" }
];

function NavButton({ id, icon, label, section, onSelect }: { id: Section; icon: string; label: string; section: Section; onSelect: (id: Section) => void }) {
  return <button className={`navItem ${section === id ? "active" : ""}`} onClick={() => onSelect(id)}>{icon} <span>{label}</span></button>;
}

export default function Home() {
  const [section, setSection] = useState<Section>("inicio");
  const [links, setLinks] = useState<LinkItem[]>(initialLinks);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [agentChecked, setAgentChecked] = useState(false);

  useEffect(() => {
    try { const saved = localStorage.getItem(LINKS_KEY); if (saved) setLinks(JSON.parse(saved)); }
    catch (e) { console.error(e); }
    finally { setHydrated(true); }
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(LINKS_KEY, JSON.stringify(links)); }, [links, hydrated]);

  useEffect(() => {
    let alive = true;
    async function pollAgent() {
      try {
        const res = await fetch(AGENT_URL, { cache: "no-store" });
        if (!res.ok) throw new Error("agent offline");
        const data = await res.json();
        if (alive) setMetrics(data);
      } catch {
        if (alive) setMetrics(null);
      } finally {
        if (alive) setAgentChecked(true);
      }
    }
    pollAgent();
    const timer = setInterval(pollAgent, 3000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  function addLink() {
    const cleanName = name.trim(); let cleanUrl = url.trim();
    if (!cleanName || !cleanUrl) return;
    if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = `https://${cleanUrl}`;
    setLinks(c => [...c, { id: Date.now(), name: cleanName, url: cleanUrl, category: "Personalizado" }]);
    setName(""); setUrl("");
  }

  const agentBadge = metrics ? <span className="badge ok">AGENTE ONLINE</span> : <span className="badge warn">AGENTE OFF</span>;
  const machineDetails = metrics ? <>
    <div className="machineHeader"><div><strong>{metrics.hostname}</strong><small>{metrics.os}</small></div>{agentBadge}</div>
    <div className="metricCards">
      <MetricCard label="CPU" value={`${metrics.cpu.percent}%`} detail={metrics.cpu.name} percent={metrics.cpu.percent}/>
      <MetricCard label="RAM" value={`${metrics.ram.percent}%`} detail={`${metrics.ram.usedGb} / ${metrics.ram.totalGb} GB`} percent={metrics.ram.percent}/>
      <MetricCard label="Disco C:" value={`${metrics.disk.percent}%`} detail={`${metrics.disk.freeGb} GB livres`} percent={metrics.disk.percent}/>
      <MetricCard label="Uptime" value={`${metrics.uptimeHours}h`} detail={metrics.gpu?.[0] || "GPU não detectada"}/>
    </div>
  </> : <div className="agentEmpty"><div className="agentIcon">▣</div><div><strong>{agentChecked ? "Agente Windows não detectado" : "Procurando agente..."}</strong><p>Inicie <code>agent/start-agent.bat</code> no seu PC. O Hub consulta somente <code>127.0.0.1</code>, sem abrir seu computador para a internet.</p></div></div>;

  const services = <div className="serviceGrid">
    <article className="serviceCard"><div className="serviceTop"><strong>Maike Hub</strong><span className="badge ok">ONLINE</span></div><p>hub.maikedev.com.br</p><small>Hospedado na Vercel</small></article>
    <article className="serviceCard"><div className="serviceTop"><strong>Domínio principal</strong><span className="badge neutral">DNS</span></div><p>maikedev.com.br</p><small>Gerenciado no Registro.br</small></article>
    <article className="serviceCard"><div className="serviceTop"><strong>GitHub</strong><span className="badge ok">CONECTADO</span></div><p>awmaike/maike-hub</p><small>Deploy automático pela branch main</small></article>
    <article className="serviceCard"><div className="serviceTop"><strong>Agente Windows</strong>{agentBadge}</div><p>{metrics ? metrics.hostname : "127.0.0.1:43123"}</p><small>{metrics ? `v${metrics.agentVersion} · atualização a cada 3s` : "Execute o agente local para métricas reais"}</small></article>
  </div>;

  const machines = <><article className="panel"><div className="panelHeader"><div><p className="eyebrow">PC LOCAL</p><h2>Meu Windows</h2></div>{agentBadge}</div>{machineDetails}</article><article className="panel"><h2>Como conectar</h2><div className="roadmap"><p>01 — No PC, abra a pasta do projeto e rode <b>git pull</b></p><p>02 — Entre em <b>agent</b> e dê dois cliques em <b>start-agent.bat</b></p><p>03 — Deixe a janela aberta e volte ao Hub</p><p>04 — Se o navegador pedir acesso à rede local, permita</p></div></article></>;

  const projects = <div className="serviceGrid"><article className="serviceCard"><div className="serviceTop"><strong>Maike Hub</strong><span className="badge ok">PRODUÇÃO</span></div><p>Next.js · GitHub · Vercel</p><small>Central técnica pessoal</small></article><article className="serviceCard"><div className="serviceTop"><strong>Agente Windows</strong>{agentBadge}</div><p>PowerShell · localhost</p><small>Métricas locais sem expor porta pública</small></article></div>;
  const shortcuts = <><div className="linkComposer"><input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do atalho"/><input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && addLink()} placeholder="https://..."/><button onClick={addLink}>Adicionar</button></div><div className="techLinks">{links.map(link => <a key={link.id} href={link.url} target="_blank" rel="noreferrer"><span>{link.category}</span><strong>{link.name}</strong><small>{link.url.replace(/^https?:\/\//, "")}</small></a>)}</div></>;

  let content;
  if (section === "servicos") content = <><Header eyebrow="INFRAESTRUTURA" title="Serviços" subtitle="Sites, domínios, deploys e disponibilidade." />{services}</>;
  else if (section === "projetos") content = <><Header eyebrow="DESENVOLVIMENTO" title="Projetos" subtitle="Seu código, builds e deploys em um único painel." />{projects}</>;
  else if (section === "maquinas") content = <><Header eyebrow="HARDWARE" title="Máquinas" subtitle="Status real do seu computador, atualizado localmente." /><div className="stack">{machines}</div></>;
  else if (section === "atalhos") content = <><Header eyebrow="FERRAMENTAS" title="Atalhos" subtitle="Sua central de acessos técnicos." />{shortcuts}</>;
  else if (section === "configuracoes") content = <><Header eyebrow="SISTEMA" title="Configurações" subtitle="Integrações e preferências do Hub." /><article className="panel"><h2>Roadmap técnico</h2><div className="roadmap"><p>01 — Agente Windows: CPU, RAM, disco, GPU e uptime ✅</p><p>02 — Status real dos sites e latência</p><p>03 — GitHub: último commit e estado dos repositórios</p><p>04 — Vercel: último deploy e status do build</p></div></article></>;
  else content = <><Header eyebrow="CENTRAL TÉCNICA" title="Maike Hub" subtitle="Infraestrutura, desenvolvimento e máquinas. Sem duplicar o Tiflux." />
    <section className="stats"><article className="statCard"><span>Serviços</span><strong>4</strong><small>centralizados</small></article><article className="statCard"><span>Sites</span><strong>1</strong><small>em produção</small></article><article className="statCard"><span>Máquina</span><strong>{metrics ? "Online" : "Offline"}</strong><small>{metrics ? metrics.hostname : "aguardando agente"}</small></article><article className="statCard"><span>Deploy</span><strong>Auto</strong><small>GitHub → Vercel</small></article></section>
    <section className="dashboardGrid"><article className="panel wide"><div className="panelHeader"><div><p className="eyebrow">VISÃO GERAL</p><h2>Infraestrutura</h2></div><span className="badge ok">OPERACIONAL</span></div>{services}</article><article className="panel"><div className="panelHeader"><div><p className="eyebrow">ACESSO RÁPIDO</p><h2>Ferramentas</h2></div></div><div className="compactLinks">{links.slice(0,4).map(l => <a key={l.id} href={l.url} target="_blank" rel="noreferrer"><strong>{l.name}</strong><span>↗</span></a>)}</div></article><article className="panel"><div className="panelHeader"><div><p className="eyebrow">MÁQUINA</p><h2>Meu PC</h2></div>{agentBadge}</div>{metrics ? <><div className="miniMetrics"><span>CPU <b>{metrics.cpu.percent}%</b></span><span>RAM <b>{metrics.ram.percent}%</b></span><span>Disco <b>{metrics.disk.percent}%</b></span></div><button className="primaryButton" onClick={() => setSection("maquinas")}>Detalhes</button></> : <><p className="muted">O agente local já está pronto no repositório. Rode-o no Windows para ver métricas reais aqui.</p><button className="primaryButton" onClick={() => setSection("maquinas")}>Como conectar</button></>}</article></section></>;

  return <main className="shell"><aside className="sidebar"><div className="brand"><div className="brandMark">M</div><div><strong>Maike Hub</strong><span>Tech Control</span></div></div><nav><NavButton id="inicio" icon="⌂" label="Visão geral" section={section} onSelect={setSection}/><NavButton id="servicos" icon="◉" label="Serviços" section={section} onSelect={setSection}/><NavButton id="projetos" icon="⌘" label="Projetos" section={section} onSelect={setSection}/><NavButton id="maquinas" icon="▣" label="Máquinas" section={section} onSelect={setSection}/><NavButton id="atalhos" icon="↗" label="Atalhos" section={section} onSelect={setSection}/><NavButton id="configuracoes" icon="⚙" label="Configurações" section={section} onSelect={setSection}/></nav><div className="sidebarBottom"><div className="statusDot"/><span>Hub online</span></div></aside><section className="content">{content}</section></main>;
}

function Header({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) { return <header className="topbar"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{subtitle}</p></div><div className="avatar">M</div></header>; }
function MetricCard({ label, value, detail, percent }: { label: string; value: string; detail: string; percent?: number }) { return <div className="metricCard"><span>{label}</span><strong>{value}</strong><small>{detail}</small>{typeof percent === "number" && <div className="meter"><i style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}/></div>}</div>; }
