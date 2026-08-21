"use client";

import { useEffect, useState } from "react";

type Section = "inicio" | "servicos" | "projetos" | "maquinas" | "atalhos" | "configuracoes";
type LinkItem = { id: number; name: string; url: string; category: string };

const LINKS_KEY = "maike-hub:tech-links";
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

  useEffect(() => {
    try { const saved = localStorage.getItem(LINKS_KEY); if (saved) setLinks(JSON.parse(saved)); }
    catch (e) { console.error(e); }
    finally { setHydrated(true); }
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(LINKS_KEY, JSON.stringify(links)); }, [links, hydrated]);

  function addLink() {
    const cleanName = name.trim(); let cleanUrl = url.trim();
    if (!cleanName || !cleanUrl) return;
    if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = `https://${cleanUrl}`;
    setLinks(c => [...c, { id: Date.now(), name: cleanName, url: cleanUrl, category: "Personalizado" }]);
    setName(""); setUrl("");
  }

  const services = <div className="serviceGrid">
    <article className="serviceCard"><div className="serviceTop"><strong>Maike Hub</strong><span className="badge ok">ONLINE</span></div><p>hub.maikedev.com.br</p><small>Hospedado na Vercel</small></article>
    <article className="serviceCard"><div className="serviceTop"><strong>Domínio principal</strong><span className="badge neutral">DNS</span></div><p>maikedev.com.br</p><small>Gerenciado no Registro.br</small></article>
    <article className="serviceCard"><div className="serviceTop"><strong>GitHub</strong><span className="badge ok">CONECTADO</span></div><p>awmaike/maike-hub</p><small>Deploy automático pela branch main</small></article>
    <article className="serviceCard"><div className="serviceTop"><strong>Monitoramento</strong><span className="badge warn">PRÓXIMO</span></div><p>Uptime e latência</p><small>Vamos conectar checagens reais depois</small></article>
  </div>;

  const machines = <div className="serviceGrid">
    <article className="serviceCard"><div className="serviceTop"><strong>Meu PC Windows</strong><span className="badge warn">SEM AGENTE</span></div><p>CPU · RAM · Disco · Rede</p><small>Instalaremos um agente local para dados reais.</small></article>
    <article className="serviceCard"><div className="serviceTop"><strong>Nova máquina</strong><span className="badge neutral">+</span></div><p>Servidor, notebook ou PC</p><small>Estrutura pronta para adicionar outras máquinas.</small></article>
  </div>;

  const projects = <div className="serviceGrid">
    <article className="serviceCard"><div className="serviceTop"><strong>Maike Hub</strong><span className="badge ok">PRODUÇÃO</span></div><p>Next.js · GitHub · Vercel</p><small>Central técnica pessoal</small></article>
    <article className="serviceCard"><div className="serviceTop"><strong>Projetos futuros</strong><span className="badge neutral">DEV</span></div><p>Repositórios e deploys</p><small>Aqui mostraremos commits, branches e builds.</small></article>
  </div>;

  const shortcuts = <><div className="linkComposer"><input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do atalho"/><input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && addLink()} placeholder="https://..."/><button onClick={addLink}>Adicionar</button></div><div className="techLinks">{links.map(link => <a key={link.id} href={link.url} target="_blank" rel="noreferrer"><span>{link.category}</span><strong>{link.name}</strong><small>{link.url.replace(/^https?:\/\//, "")}</small></a>)}</div></>;

  let content;
  if (section === "servicos") content = <><Header eyebrow="INFRAESTRUTURA" title="Serviços" subtitle="Sites, domínios, deploys e disponibilidade." />{services}</>;
  else if (section === "projetos") content = <><Header eyebrow="DESENVOLVIMENTO" title="Projetos" subtitle="Seu código, builds e deploys em um único painel." />{projects}</>;
  else if (section === "maquinas") content = <><Header eyebrow="HARDWARE" title="Máquinas" subtitle="Status dos seus computadores e servidores." />{machines}</>;
  else if (section === "atalhos") content = <><Header eyebrow="FERRAMENTAS" title="Atalhos" subtitle="Sua central de acessos técnicos." />{shortcuts}</>;
  else if (section === "configuracoes") content = <><Header eyebrow="SISTEMA" title="Configurações" subtitle="Integrações e preferências do Hub." /><article className="panel"><h2>Próximas integrações</h2><div className="roadmap"><p>01 — Agente Windows para CPU, RAM, disco e serviços</p><p>02 — Status real dos sites e latência</p><p>03 — GitHub: último commit e estado dos repositórios</p><p>04 — Vercel: último deploy e status do build</p></div></article></>;
  else content = <><Header eyebrow="CENTRAL TÉCNICA" title="Maike Hub" subtitle="Infraestrutura, desenvolvimento e máquinas. Sem duplicar o Tiflux." />
    <section className="stats"><article className="statCard"><span>Serviços</span><strong>4</strong><small>centralizados</small></article><article className="statCard"><span>Sites</span><strong>1</strong><small>em produção</small></article><article className="statCard"><span>Máquinas</span><strong>1</strong><small>aguardando agente</small></article><article className="statCard"><span>Deploy</span><strong>Auto</strong><small>GitHub → Vercel</small></article></section>
    <section className="dashboardGrid"><article className="panel wide"><div className="panelHeader"><div><p className="eyebrow">VISÃO GERAL</p><h2>Infraestrutura</h2></div><span className="badge ok">OPERACIONAL</span></div>{services}</article><article className="panel"><div className="panelHeader"><div><p className="eyebrow">ACESSO RÁPIDO</p><h2>Ferramentas</h2></div></div><div className="compactLinks">{links.slice(0,4).map(l => <a key={l.id} href={l.url} target="_blank" rel="noreferrer"><strong>{l.name}</strong><span>↗</span></a>)}</div></article><article className="panel"><div className="panelHeader"><div><p className="eyebrow">MÁQUINA</p><h2>Meu PC</h2></div><span className="badge warn">AGENTE OFF</span></div><p className="muted">O navegador não consegue ler CPU e RAM reais sozinho. A próxima etapa será conectar um pequeno agente Windows ao Hub.</p><button className="primaryButton" onClick={() => setSection("maquinas")}>Ver máquinas</button></article></section></>;

  return <main className="shell"><aside className="sidebar"><div className="brand"><div className="brandMark">M</div><div><strong>Maike Hub</strong><span>Tech Control</span></div></div><nav><NavButton id="inicio" icon="⌂" label="Visão geral" section={section} onSelect={setSection}/><NavButton id="servicos" icon="◉" label="Serviços" section={section} onSelect={setSection}/><NavButton id="projetos" icon="⌘" label="Projetos" section={section} onSelect={setSection}/><NavButton id="maquinas" icon="▣" label="Máquinas" section={section} onSelect={setSection}/><NavButton id="atalhos" icon="↗" label="Atalhos" section={section} onSelect={setSection}/><NavButton id="configuracoes" icon="⚙" label="Configurações" section={section} onSelect={setSection}/></nav><div className="sidebarBottom"><div className="statusDot"/><span>Hub online</span></div></aside><section className="content">{content}</section></main>;
}

function Header({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <header className="topbar"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{subtitle}</p></div><div className="avatar">M</div></header>;
}
