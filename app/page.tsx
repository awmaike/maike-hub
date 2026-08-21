"use client";

import { useMemo, useState } from "react";

type Task = {
  id: number;
  title: string;
  done: boolean;
};

type Note = {
  id: number;
  title: string;
  text: string;
};

const initialTasks: Task[] = [
  { id: 1, title: "Revisar projeto pessoal", done: false },
  { id: 2, title: "Organizar downloads", done: true },
  { id: 3, title: "Anotar ideias para o Hub", done: false }
];

const initialNotes: Note[] = [
  {
    id: 1,
    title: "Ideias",
    text: "Adicionar calendário, arquivos e integração com o PC."
  },
  {
    id: 2,
    title: "Próximos passos",
    text: "Conectar banco PostgreSQL e autenticação."
  }
];

export default function Home() {
  const [tasks, setTasks] = useState(initialTasks);
  const [notes, setNotes] = useState(initialNotes);
  const [taskText, setTaskText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [command, setCommand] = useState("");

  const doneCount = useMemo(
    () => tasks.filter((task) => task.done).length,
    [tasks]
  );

  function addTask() {
    const title = taskText.trim();
    if (!title) return;
    setTasks((current) => [
      ...current,
      { id: Date.now(), title, done: false }
    ]);
    setTaskText("");
  }

  function addNote() {
    const text = noteText.trim();
    if (!text) return;
    setNotes((current) => [
      { id: Date.now(), title: "Nota rápida", text },
      ...current
    ]);
    setNoteText("");
  }

  function runCommand() {
    const value = command.trim().toLowerCase();
    if (!value) return;

    if (value.startsWith("tarefa ")) {
      const title = command.slice(7).trim();
      if (title) {
        setTasks((current) => [
          ...current,
          { id: Date.now(), title, done: false }
        ]);
      }
    } else if (value.startsWith("nota ")) {
      const text = command.slice(5).trim();
      if (text) {
        setNotes((current) => [
          { id: Date.now(), title: "Criada por comando", text },
          ...current
        ]);
      }
    }

    setCommand("");
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">M</div>
          <div>
            <strong>Maike Hub</strong>
            <span>Personal OS</span>
          </div>
        </div>

        <nav>
          <button className="navItem active">⌂ <span>Início</span></button>
          <button className="navItem">✓ <span>Tarefas</span></button>
          <button className="navItem">✎ <span>Notas</span></button>
          <button className="navItem">◫ <span>Calendário</span></button>
          <button className="navItem">⌁ <span>Arquivos</span></button>
          <button className="navItem">⚙ <span>Configurações</span></button>
        </nav>

        <div className="sidebarBottom">
          <div className="statusDot" />
          <span>Sistema local online</span>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">CENTRAL PESSOAL</p>
            <h1>Bom dia, Maike.</h1>
            <p className="muted">Tudo importante em um só lugar.</p>
          </div>
          <div className="avatar">M</div>
        </header>

        <section className="commandBox">
          <span>⌘</span>
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runCommand()}
            placeholder='Digite "tarefa comprar..." ou "nota lembrar..."'
          />
          <button onClick={runCommand}>Executar</button>
        </section>

        <section className="stats">
          <article className="statCard">
            <span>Tarefas</span>
            <strong>{tasks.length}</strong>
            <small>{doneCount} concluídas</small>
          </article>
          <article className="statCard">
            <span>Notas</span>
            <strong>{notes.length}</strong>
            <small>salvas nesta sessão</small>
          </article>
          <article className="statCard">
            <span>CPU</span>
            <strong>18%</strong>
            <small>dados simulados</small>
          </article>
          <article className="statCard">
            <span>RAM</span>
            <strong>42%</strong>
            <small>dados simulados</small>
          </article>
        </section>

        <section className="grid">
          <article className="panel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">HOJE</p>
                <h2>Tarefas</h2>
              </div>
              <span>{doneCount}/{tasks.length}</span>
            </div>

            <div className="quickInput">
              <input
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="Adicionar tarefa..."
              />
              <button onClick={addTask}>+</button>
            </div>

            <div className="taskList">
              {tasks.map((task) => (
                <label className="task" key={task.id}>
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() =>
                      setTasks((current) =>
                        current.map((item) =>
                          item.id === task.id
                            ? { ...item, done: !item.done }
                            : item
                        )
                      )
                    }
                  />
                  <span className={task.done ? "done" : ""}>{task.title}</span>
                </label>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">CAPTURA RÁPIDA</p>
                <h2>Notas</h2>
              </div>
            </div>

            <div className="noteComposer">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Escreva qualquer coisa..."
              />
              <button onClick={addNote}>Salvar nota</button>
            </div>

            <div className="noteList">
              {notes.slice(0, 3).map((note) => (
                <div className="note" key={note.id}>
                  <strong>{note.title}</strong>
                  <p>{note.text}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="panel shortcutsPanel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">ACESSO RÁPIDO</p>
                <h2>Atalhos</h2>
              </div>
            </div>

            <div className="shortcuts">
              <a href="https://github.com" target="_blank">GitHub</a>
              <a href="https://mail.google.com" target="_blank">Gmail</a>
              <a href="https://drive.google.com" target="_blank">Drive</a>
              <a href="https://youtube.com" target="_blank">YouTube</a>
            </div>
          </article>

          <article className="panel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">MÁQUINA</p>
                <h2>Status do PC</h2>
              </div>
              <span className="online">ONLINE</span>
            </div>

            <div className="metrics">
              <div>
                <span>CPU</span>
                <div className="meter"><i style={{ width: "18%" }} /></div>
                <b>18%</b>
              </div>
              <div>
                <span>RAM</span>
                <div className="meter"><i style={{ width: "42%" }} /></div>
                <b>42%</b>
              </div>
              <div>
                <span>Disco</span>
                <div className="meter"><i style={{ width: "61%" }} /></div>
                <b>61%</b>
              </div>
            </div>
            <p className="hint">
              Na próxima etapa, estes dados poderão vir de um agente real instalado no Windows.
            </p>
          </article>
        </section>
      </section>
    </main>
  );
}
