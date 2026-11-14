import { useMemo, useRef, useState } from "react";
import type { CrmStore } from "../../data/store";
import { RequirePermission } from "../../components/RequirePermission";

type MsgKind = "text" | "file";
type ChatMessage = {
  id: string;
  fromMe: boolean;
  kind: MsgKind;
  text?: string;
  fileName?: string;
  fileSize?: string;
  time: string;
  read?: boolean;
};

type Thread = {
  id: string;
  name: string;
  role: string;
  initials: string;
  online: boolean;
  unread: number;
  preview: string;
  time: string;
  tone: "cyan" | "violet" | "amber" | "green" | "rose";
  messages: ChatMessage[];
};

const seedThreads: Thread[] = [
  {
    id: "t1",
    name: "Amit Sharma",
    role: "Frontend Lead",
    initials: "AS",
    online: true,
    unread: 2,
    preview: "Can you share the latest build screenshot?",
    time: "10:42 AM",
    tone: "cyan",
    messages: [
      {
        id: "m1",
        fromMe: false,
        kind: "text",
        text: "Hey! Are you free for a quick sync on the dashboard UI?",
        time: "10:30 AM",
      },
      {
        id: "m2",
        fromMe: true,
        kind: "text",
        text: "Yes, give me 5 mins. Wrapping up the card layout now.",
        time: "10:32 AM",
        read: true,
      },
      {
        id: "m3",
        fromMe: false,
        kind: "text",
        text: "Can you share the latest build screenshot?",
        time: "10:40 AM",
      },
      {
        id: "m4",
        fromMe: true,
        kind: "file",
        fileName: "build-screenshot.png",
        fileSize: "245 KB",
        time: "10:41 AM",
        read: true,
      },
      {
        id: "m5",
        fromMe: true,
        kind: "text",
        text: "Here it is — let me know if spacing looks off on mobile.",
        time: "10:42 AM",
        read: true,
      },
    ],
  },
  {
    id: "t2",
    name: "Priya Mehta",
    role: "QA Engineer",
    initials: "PM",
    online: true,
    unread: 1,
    preview: "Found two edge cases on the login form.",
    time: "9:18 AM",
    tone: "violet",
    messages: [
      {
        id: "p1",
        fromMe: false,
        kind: "text",
        text: "Found two edge cases on the login form.",
        time: "9:15 AM",
      },
      {
        id: "p2",
        fromMe: false,
        kind: "text",
        text: "Empty email + special chars in password — can you patch today?",
        time: "9:18 AM",
      },
    ],
  },
  {
    id: "t3",
    name: "Vikram Shah",
    role: "Project Manager",
    initials: "VS",
    online: false,
    unread: 0,
    preview: "Please update progress before Friday standup.",
    time: "Yesterday",
    tone: "amber",
    messages: [
      {
        id: "v1",
        fromMe: false,
        kind: "text",
        text: "Please update progress on blocked API sync before Friday standup.",
        time: "Yesterday",
      },
      {
        id: "v2",
        fromMe: true,
        kind: "text",
        text: "On it — auth endpoints are done, sync contract next.",
        time: "Yesterday",
        read: true,
      },
    ],
  },
  {
    id: "t4",
    name: "Neha Kapoor",
    role: "HR Admin",
    initials: "NK",
    online: false,
    unread: 0,
    preview: "Timesheet reminder for this week.",
    time: "Mon",
    tone: "green",
    messages: [
      {
        id: "n1",
        fromMe: false,
        kind: "text",
        text: "Timesheet reminder for this week — submit by Thursday EOD.",
        time: "Mon",
      },
    ],
  },
  {
    id: "t5",
    name: "Delivery Bot",
    role: "Automation",
    initials: "DB",
    online: true,
    unread: 0,
    preview: "Milestone reminder: Brightleaf CRM rollout.",
    time: "Sun",
    tone: "rose",
    messages: [
      {
        id: "b1",
        fromMe: false,
        kind: "text",
        text: "Milestone reminder: Brightleaf CRM rollout due Dec 15.",
        time: "Sun",
      },
    ],
  },
];

function nowLabel() {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function DeveloperMessages({ store }: { store: CrmStore }) {
  const me = store.currentUser;
  const [threads, setThreads] = useState<Thread[]>(seedThreads);
  const [activeId, setActiveId] = useState(seedThreads[0].id);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (t) => t.name.toLowerCase().includes(q) || t.preview.toLowerCase().includes(q),
    );
  }, [threads, query]);

  const active = threads.find((t) => t.id === activeId) ?? threads[0];

  const openThread = (id: string) => {
    setActiveId(id);
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)),
    );
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  const send = () => {
    const text = draft.trim();
    if (!text && !fileName) return;
    const nextMsgs: ChatMessage[] = [];
    if (fileName) {
      nextMsgs.push({
        id: `f${Date.now()}`,
        fromMe: true,
        kind: "file",
        fileName,
        fileSize: "128 KB",
        time: nowLabel(),
        read: true,
      });
    }
    if (text) {
      nextMsgs.push({
        id: `m${Date.now() + 1}`,
        fromMe: true,
        kind: "text",
        text,
        time: nowLabel(),
        read: true,
      });
    }
    setThreads((prev) =>
      prev.map((t) =>
        t.id === active.id
          ? {
              ...t,
              messages: [...t.messages, ...nextMsgs],
              preview: text || fileName,
              time: "Just now",
              unread: 0,
            }
          : t,
      ),
    );
    setDraft("");
    setFileName("");
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  return (
    <RequirePermission store={store} permission="notifications">
      <div className="page msg-page">
        <header className="msg-head">
          <h2>
            <span className="msg-title-ico" aria-hidden>
              <svg viewBox="0 0 24 24">
                <path
                  d="M5 6.5h14a1.8 1.8 0 0 1 1.8 1.8v7.4A1.8 1.8 0 0 1 19 17.5H9.2L5 20.2V8.3A1.8 1.8 0 0 1 6.8 6.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Messages
          </h2>
          <p>Chat with your team about delivery work.</p>
        </header>

        <section className="msg-shell">
          <aside className="msg-list-pane">
            <label className="msg-search">
              <svg viewBox="0 0 24 24" aria-hidden>
                <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                <path
                  d="m20 20-3.5-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations..."
              />
            </label>

            <ul className="msg-threads">
              {filtered.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className={`msg-thread${t.id === active.id ? " is-active" : ""}`}
                    onClick={() => openThread(t.id)}
                  >
                    <span className={`msg-avatar tone-${t.tone}`}>
                      {t.initials}
                      {t.online ? <i className="msg-online" aria-hidden /> : null}
                    </span>
                    <span className="msg-thread-meta">
                      <span className="msg-thread-top">
                        <strong>{t.name}</strong>
                        <small>{t.time}</small>
                      </span>
                      <span className="msg-thread-bottom">
                        <em>{t.preview}</em>
                        {t.unread > 0 ? <b>{t.unread}</b> : null}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 ? <li className="msg-empty">No conversations found.</li> : null}
            </ul>
          </aside>

          <div className="msg-chat-pane">
            <header className="msg-chat-head">
              <div className="msg-chat-user">
                <span className={`msg-avatar lg tone-${active.tone}`}>
                  {active.initials}
                  {active.online ? <i className="msg-online" aria-hidden /> : null}
                </span>
                <div>
                  <strong>{active.name}</strong>
                  <small>{active.online ? "Online" : active.role}</small>
                </div>
              </div>
              <div className="msg-chat-actions">
                <button type="button" className="msg-icon-btn" aria-label="Video call" title="Video call">
                  <svg viewBox="0 0 24 24">
                    <rect
                      x="3.5"
                      y="7"
                      width="11.5"
                      height="10"
                      rx="2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="m15 10.2 5-2.4v8.4l-5-2.4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button type="button" className="msg-icon-btn" aria-label="Voice call" title="Voice call">
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M8.2 4.8c.6-.6 1.6-.5 2 .3l1.3 2.4c.3.6.1 1.3-.4 1.7l-1.2.9a10.5 10.5 0 0 0 4 4l.9-1.2c.4-.5 1.1-.7 1.7-.4l2.4 1.3c.8.4.9 1.4.3 2l-1.1 1.1c-.5.5-1.2.8-1.9.7-3.3-.4-6.4-2.5-8.7-4.8S4.7 8.5 4.3 5.2c-.1-.7.2-1.4.7-1.9L6 4.8Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button type="button" className="msg-icon-btn" aria-label="More" title="More">
                  <svg viewBox="0 0 24 24">
                    <circle cx="6.5" cy="12" r="1.5" fill="currentColor" />
                    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                    <circle cx="17.5" cy="12" r="1.5" fill="currentColor" />
                  </svg>
                </button>
              </div>
            </header>

            <div className="msg-stream" role="log" aria-live="polite">
              {active.messages.map((m) =>
                m.kind === "file" ? (
                  <div key={m.id} className={`msg-row${m.fromMe ? " from-me" : ""}`}>
                    <div className="msg-file">
                      <span className="msg-file-thumb" aria-hidden>
                        <svg viewBox="0 0 24 24">
                          <rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                          <path d="M8 15.5 10.5 12l2 2.2L15.5 9.5 20 15.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <div>
                        <strong>{m.fileName}</strong>
                        <small>{m.fileSize}</small>
                      </div>
                      <span className="msg-file-dl" aria-hidden>
                        <svg viewBox="0 0 24 24">
                          <path
                            d="M12 5v10M8.5 11.5 12 15l3.5-3.5M6 19h12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </div>
                    <div className="msg-meta">
                      <span>{m.time}</span>
                      {m.fromMe ? (
                        <span className="msg-ticks" aria-label="Read">
                          ✓✓
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className={`msg-row${m.fromMe ? " from-me" : ""}`}>
                    <div className="msg-bubble">{m.text}</div>
                    <div className="msg-meta">
                      <span>{m.time}</span>
                      {m.fromMe ? (
                        <span className="msg-ticks" aria-label="Read">
                          ✓✓
                        </span>
                      ) : null}
                    </div>
                  </div>
                ),
              )}
              <div ref={endRef} />
            </div>

            <footer className="msg-composer">
              <input
                ref={fileRef}
                type="file"
                className="msg-file-input"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
              />
              <button
                type="button"
                className="msg-icon-btn"
                aria-label="Attach file"
                title="Attach file"
                onClick={() => fileRef.current?.click()}
              >
                <svg viewBox="0 0 24 24">
                  <path
                    d="M15.5 8.5 9.2 14.8a2.6 2.6 0 1 0 3.7 3.7l7.4-7.4a4.2 4.2 0 0 0-5.9-5.9l-7.8 7.8a5.7 5.7 0 0 0 8.1 8.1l6.1-6.1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div className="msg-input-wrap">
                {fileName ? (
                  <span className="msg-attach-chip">
                    {fileName}
                    <button type="button" onClick={() => setFileName("")} aria-label="Remove attachment">
                      ×
                    </button>
                  </span>
                ) : null}
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={`Message ${active.name.split(" ")[0]}…`}
                  aria-label="Type a message"
                />
              </div>
              <button type="button" className="msg-icon-btn" aria-label="Emoji" title="Emoji">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle cx="9.2" cy="10.2" r="1" fill="currentColor" />
                  <circle cx="14.8" cy="10.2" r="1" fill="currentColor" />
                  <path
                    d="M8.8 14c.9 1.2 2 1.8 3.2 1.8s2.3-.6 3.2-1.8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button type="button" className="msg-send" onClick={send} aria-label="Send">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M4.5 11.2 19.2 4.8 12.4 19.4l-1.8-6.2-6.1-2Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </footer>
            <p className="msg-signed">Signed in as {me.name}</p>
          </div>
        </section>
      </div>
    </RequirePermission>
  );
}
