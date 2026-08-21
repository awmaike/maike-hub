"use client";

import { useEffect, useMemo, useState } from "react";

type Task = { id: number; title: string; done: boolean };
type Note = { id: number; title: string; text: string };
type Section = "inicio" | "tarefas" | "notas" | "calendario" | "arquivos" | "configuracoes";

const initialTasks: Task[] = [
  { id: 1, title: "Revisar projeto pessoal", done: false },
  { id: 2, title: "Organizar downloads", done: true },
  { id: 3, title: "Anotar ideias para o Hub", done: false }
];
const initialNotes: Note[] = [
  { id: 1, title: "Ideias", text: "Adicionar calendário, arquivos e integração com o PC." },
  { id: 2, title: "Próximos passos", text: "Conectar banco PostgreSQL e autenticação." }
];
const TASKS_STORAGE_KEY = "maike-hub:tasks";
const NOTES_STORAGE_KEY = "maike-hub:notes";

function NavButton({ id, icon, label, section, onSelect }: { id: Section; icon: string; label: string; section: Section; onSelect: (id: Section) => void }) {
  return <button className={`navItem ${section === id ? "active" : ""}`} onClick={() => onSelect(id)}>{icon} <span>{label}</span></button>;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [taskText, setTaskText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [command, setCommand] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [section, setSection] = useState<Section>("inicio");

  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
      const savedNotes = localStorage.getItem(NOTES_STORAGE_KEY);
      if (savedTasks) setTasks(JSON.parse(savedTasks));
      if (savedNotes) setNotes(JSON.parse(savedNotes));
    } catch (error) { console.error("Não foi possível carregar os dados locais do Maike Hub.", error); }
    finally { setHydrated(true); }
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks)); }, [tasks, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes)); }, [notes, hydrated]);

  const doneCount = useMemo(() => tasks.filter((task) => task.done).length, [tasks]);
  function addTask() { const title = taskText.trim(); if (!title) return; setTasks(c => [...c, { id: Date.now(), title, done: false }]); setTaskText(""); }
  function addNote() { const text = noteText.trim(); if (!text) return; setNotes(c => [{ id: Date.now(), title: "Nota rápida", text }, ...c]); setNoteText(""); }
  function runCommand() {
    const value = command.trim().toLowerCase(); if (!value) return;
    if (value.startsWith("tarefa ")) { const title = command.slice(7).trim(); if (title) setTasks(c => [...c, { id: Date.now(), title, done: false }]); }
    else if (value.startsWith("nota ")) { const text = command.slice(5).trim(); if (text) setNotes(c => [{ id: Date.now(), title: "Criada por comando", text }, ...c]); }
    setCommand("");
  }
  function toggleTask(id: number) { setTasks(c => c.map(item => item.id === id ? { ...item, done: !item.done } : item)); }

  const taskPanel = (
    <article className="panel">
      <div className="panelHeader"><div><p className="eyebrow">HOJE</p><h2>Tarefas</h2></div><span>{doneCount}/{tasks.length}</span></div>
      <div className="quickInput"><input value={taskText} onChange={e => setTaskText(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()} placeholder="Adicionar tarefa..." /><button onClick={addTask}>+</button></div>
      <div className="taskList">{tasks.map(task => <label className="task" key={task.id}><input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} /><span className={task.done ? "done" : ""}>{task.title}</span></label>)}</div>
    </article>
  );
  const notesPanel = (
    <article className="panel">
      <div className="panelHeader"><div><p className="eyebrow">CAPTURA RÁPIDA</p><h2>Notas</h2></div></div>
      <div className="noteComposer"><textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Escreva qualquer coisa..." /><button onClick={addNote}>Salvar nota</button></div>
      <div className="noteList">{notes.map(note => <div className="note" key={note.id}><strong>{note.title}</strong><p>{note.text}</p></div>)}</div>
    </article>
  );

  let content;
  if (section === "tarefas") content = <><header className="topbar"><div><p className="eyebrow">ORGANIZAÇÃO</p><h1>Tarefas</h1><p className="muted">Crie, acompanhe e conclua suas tarefas.</p></div></header><section className="grid">{taskPanel}</section></>;
  else if (section === "notas") content = <><header className="topbar"><div><p className="eyebrow">ANOTAÇÕES</p><h1>Notas</h1><p className="muted">Suas ideias e lembretes em um só lugar.</p></div></header><section className="grid">{notesPanel}</section></>;
  else if (section === "calendario") content = <><header className="topbar"><div><p className="eyebrow">AGENDA</p><h1>Calendário</h1><p className="muted">Este módulo está pronto para receber sua agenda.</p></div></header><article className="panel"><h2>Calendário em construção</h2><p className="hint">Na próxima evolução vamos colocar visual mensal, eventos e integração com suas tarefas.</p></article></>;
  else if (section === "arquivos") content = <><header className="topbar"><div><p className="eyebrow">CENTRAL DE ARQUIVOS</p><h1>Arquivos</h1><p className="muted">Um espaço para organizar documentos e atalhos importantes.</p></div></header><article className="panel"><h2>Arquivos em construção</h2><p className="hint">Aqui vamos adicionar upload, categorias, pesquisa e acesso rápido aos seus documentos.</p></article></>;
  else if (section === "configuracoes") content = <><header className="topbar"><div><p className="eyebrow">PREFERÊNCIAS</p><h1>Configurações</h1><p className="muted">Personalize o comportamento do Maike Hub.</p></div></header><article className="panel"><h2>Configurações em construção</h2><p className="hint">Em breve: tema, atalhos personalizados, integrações e preferências do painel.</p></article></>;
  else content = <>
    <header className="topbar"><div><p className="eyebrow">CENTRAL PESSOAL</p><h1>Bom dia, Maike.</h1><p className="muted">Tudo importante em um só lugar.</p></div><div className="avatar">M</div></header>
    <section className="commandBox"><span>⌘</span><input value={command} onChange={e => setCommand(e.target.value)} onKeyDown={e => e.key === "Enter" && runCommand()} placeholder='Digite "tarefa comprar..." ou "nota lembrar..."' /><button onClick={runCommand}>Executar</button></section>
    <section className="stats"><article className="statCard"><span>Tarefas</span><strong>{tasks.length}</strong><small>{doneCount} concluídas</small></article><article className="statCard"><span>Notas</span><strong>{notes.length}</strong><small>{hydrated ? "salvas neste navegador" : "carregando..."}</small></article><article className="statCard"><span>CPU</span><strong>18%</strong><small>dados simulados</small></article><article className="statCard"><span>RAM</span><strong>42%</strong><small>dados simulados</small></article></section>
    <section className="grid">{taskPanel}{notesPanel}<article className="panel shortcutsPanel"><div className="panelHeader"><div><p className="eyebrow">ACESSO RÁPIDO</p><h2>Atalhos</h2></div></div><div className="shortcuts"><a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a><a href="https://mail.google.com" target="_blank" rel="noreferrer">Gmail</a><a href="https://drive.google.com" target="_blank" rel="noreferrer">Drive</a><a href="https://youtube.com" target="_blank" rel="noreferrer">YouTube</a></div></article><article className="panel"><div className="panelHeader"><div><p className="eyebrow">MÁQUINA</p><h2>Status do PC</h2></div><span className="online">ONLINE</span></div><div className="metrics"><div><span>CPU</span><div className="meter"><i style={{ width: "18%" }} /></div><b>18%</b></div><div><span>RAM</span><div className="meter"><i style={{ width: "42%" }} /></div><b>42%</b></div><div><span>Disco</span><div className="meter"><i style={{ width: "61%" }} /></div><b>61%</b></div></div><p className="hint">Na próxima etapa, estes dados poderão vir de um agente real instalado no Windows.</p></article></section>
  </>;

  return <main className="shell"><aside className="sidebar"><div className="brand"><div className="brandMark">M</div><div><strong>Maike Hub</strong><span>Personal OS</span></div></div><nav><NavButton id="inicio" icon="⌂" label="Início" section={section} onSelect={setSection} /><NavButton id="tarefas" icon="✓" label="Tarefas" section={section} onSelect={setSection} /><NavButton id="notas" icon="✎" label="Notas" section={section} onSelect={setSection} /><NavButton id="calendario" icon="◫" label="Calendário" section={section} onSelect={setSection} /><NavButton id="arquivos" icon="⌁" label="Arquivos" section={section} onSelect={setSection} /><NavButton id="configuracoes" icon="⚙" label="Configurações" section={section} onSelect={setSection} /></nav><div className="sidebarBottom"><div className="statusDot" /><span>Sistema online</span></div></aside><section className="content">{content}</section></main>;
}
