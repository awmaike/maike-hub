"use client";

import { useEffect, useMemo, useState } from "react";

type Sample = { time: string; online: boolean; latencyMs: number; status: number };
type Outage = { startedAt: string; endedAt: string | null; samples: number };
type Service = {
  id: string;
  name: string;
  url: string;
  uptime: number;
  avgLatency: number;
  totalChecks: number;
  onlineChecks: number;
  offlineChecks: number;
  currentOnline: boolean;
  lastStatus: number;
  lastCheckedAt: string | null;
  outages: Outage[];
  chart: Sample[];
};
type Payload = { period: string; generatedAt: string; services: Service[] };

export default function HistoricoPage() {
  const [period, setPeriod] = useState("24h");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const response = await fetch(`/api/history?period=${period}`, { cache: "no-store" });
        const json = await response.json();
        if (alive) setData(json);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    const timer = setInterval(load, 60000);
    return () => { alive = false; clearInterval(timer); };
  }, [period]);

  return (
    <main className="historyPage">
      <div className="historyTop">
        <div>
          <p className="eyebrow">MONITORAMENTO 24/7</p>
          <h1>Histórico de uptime</h1>
          <p className="muted">Dados coletados pelo servidor mesmo com seu PC desligado.</p>
        </div>
        <a className="backButton" href="/">← Voltar ao Hub</a>
      </div>

      <div className="periodTabs">
        {["24h", "7d", "30d"].map(p => <button key={p} className={period === p ? "active" : ""} onClick={() => setPeriod(p)}>{p === "24h" ? "24 horas" : p === "7d" ? "7 dias" : "30 dias"}</button>)}
      </div>

      {loading && !data ? <article className="panel"><p className="muted">Carregando histórico...</p></article> : null}

      <div className="historyStack">
        {data?.services.map(service => <ServiceHistory key={service.id} service={service} />)}
      </div>
    </main>
  );
}

function ServiceHistory({ service }: { service: Service }) {
  const latencies = service.chart.filter(s => s.online).map(s => s.latencyMs);
  const points = useMemo(() => makePoints(latencies), [latencies]);
  const worst = latencies.length ? Math.max(...latencies) : 0;
  return <article className="panel historyService">
    <div className="panelHeader">
      <div>
        <p className="eyebrow">{service.url}</p>
        <h2>{service.name}</h2>
      </div>
      <span className={`badge ${service.currentOnline ? "ok" : "warn"}`}>{service.currentOnline ? "ONLINE" : "OFFLINE"}</span>
    </div>

    <div className="historyStats">
      <div><span>Uptime</span><strong>{service.uptime.toFixed(3)}%</strong></div>
      <div><span>Latência média</span><strong>{service.avgLatency} ms</strong></div>
      <div><span>Verificações</span><strong>{service.totalChecks}</strong></div>
      <div><span>Falhas</span><strong>{service.offlineChecks}</strong></div>
    </div>

    <div className="historyChart">
      <div className="chartTitle"><strong>Latência</strong><span>Pico {worst} ms</span></div>
      {latencies.length > 1 ? <svg viewBox="0 0 100 30" preserveAspectRatio="none"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg> : <p className="muted">Aguardando mais amostras para formar o gráfico.</p>}
    </div>

    <div className="timeline">
      {service.chart.slice(-120).map((sample, index) => <span key={`${sample.time}-${index}`} className={sample.online ? "up" : "down"} title={`${new Date(sample.time).toLocaleString("pt-BR")} · ${sample.online ? "online" : "offline"} · ${sample.latencyMs} ms`} />)}
    </div>

    <div className="outages">
      <div className="panelHeader"><h3>Quedas registradas</h3><span>{service.outages.length}</span></div>
      {service.outages.length === 0 ? <p className="muted">Nenhuma queda registrada neste período.</p> : service.outages.map((outage, i) => <div className="outageRow" key={`${outage.startedAt}-${i}`}><span className="badge warn">QUEDA</span><div><strong>{new Date(outage.startedAt).toLocaleString("pt-BR")}</strong><small>{outage.endedAt ? `Recuperado em ${new Date(outage.endedAt).toLocaleString("pt-BR")}` : "Ainda sem recuperação registrada"}</small></div></div>)}
    </div>
  </article>;
}

function makePoints(values: number[]) {
  if (values.length < 2) return "";
  const max = Math.max(...values, 1), min = Math.min(...values);
  return values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 28 - ((v - min) / Math.max(max - min, 1)) * 24;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}
