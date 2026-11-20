import { useEffect, useMemo, useRef, useState } from "react";
import type { CrmStore } from "../../data/store";
import { RequirePermission } from "../../components/RequirePermission";
import { ROLE_LABELS } from "../../lib/permissions";

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

type Tone = "cyan" | "violet" | "amber" | "green" | "rose";

type Thread = {
  id: string;
  userId: string;
  name: string;
  role: string;
  initials: string;
  online: boolean;
  unread: number;
  preview: string;
  time: string;
  tone: Tone;
  messages: ChatMessage[];
};

const STORAGE_KEY = "royaltech-dev-messages-v2";
const tones: Tone[] = ["cyan", "violet", "amber", "green", "rose"];

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function nowLabel() {
  return new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

function toneFor(id: string): Tone {
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
  return tones[n % tones.length];
}

function buildThreads(
  store: CrmStore,
): Thread[] {
  const me = store.currentUser.id;
  const people = store.data.users.filter((u) => u.id !== me);
  const starters = [
    "Can you share the latest build update?",
    "Please confirm task status before standup.",
    "Blocked on API contract — free for a quick sync?",
    "Docs uploaded for review.",
  ];

  return people.map((u, i) => {
    const preview = starters[i % starters.length];
    const messages: ChatMessage[] = [
      {
        id: `${u.id}-m0`,
        fromMe: false,
        kind: "text",
        text: preview,
        time: i < 2 ? "Today" : "Yesterday",
      },
    ];
    return {
      id: `chat-${u.id}`,
      userId: u.id,
      name: u.name,
      role: ROLE_LABELS[u.role] || u.department || u.role,
      initials: u.avatarInitials || initialsOf(u.name),
      online: i % 3 !== 2,
      unread: i < 2 ? 1 : 0,
      preview,
      time: i < 2 ? "Just now" : i < 4 ? "Today" : "Mon",
      tone: toneFor(u.id),
      messages,
    };
  });
}

function loadThreads(store: CrmStore): Thread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Thread[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  return buildThreads(store);
}

export function DeveloperMessages({ store }: { store: CrmStore }) {
  const me = store.currentUser;
  const [threads, setThreads] = useState<Thread[]>(() => loadThreads(store));
  const [activeId, setActiveId] = useState(() => loadThreads(store)[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [fileName, setFileName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [peopleQuery, setPeopleQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
  }, [threads]);

  useEffect(() => {
    const live = buildThreads(store);
    if (!live.length) return;
    setThreads((prev) => {
      if (!prev.length) {
        setActiveId(live[0]?.id ?? "");
        return live;
      }
      const byUser = new Map(live.map((t) => [t.userId, t]));
      const merged = prev.map((t) => {
        const fresh = byUser.get(t.userId);
        if (!fresh) return t;
        return {
          ...t,
          name: fresh.name,
          role: fresh.role,
          initials: fresh.initials,
        };
      });
      const known = new Set(merged.map((t) => t.userId));
      for (const t of live) {
        if (!known.has(t.userId)) merged.push({ ...t, unread: 0, messages: [] });
      }
      return merged;
    });
  }, [store]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.role.toLowerCase().includes(q) ||
        t.preview.toLowerCase().includes(q),
    );
  }, [threads, query]);

  const people = useMemo(() => {
    const open = new Set(threads.map((t) => t.userId));
    const q = peopleQuery.trim().toLowerCase();
    return store.data.users
      .filter((u) => u.id !== me.id && !open.has(u.id))
      .filter(
        (u) =>
          !q ||
          u.name.toLowerCase().includes(q) ||
          u.department.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [threads, peopleQuery, store.data.users, me.id]);

  const active = threads.find((t) => t.id === activeId) ?? threads[0];

  const openThread = (id: string) => {
    setActiveId(id);
    setShowNew(false);
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)));
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  const startChat = (userId: string) => {
    const existing = threads.find((t) => t.userId === userId);
    if (existing) {
      openThread(existing.id);
      return;
    }
    const user = store.data.users.find((u) => u.id === userId);
    if (!user) return;
    const next: Thread = {
      id: `chat-${user.id}`,
      userId: user.id,
      name: user.name,
      role: ROLE_LABELS[user.role] || user.department,
      initials: user.avatarInitials || initialsOf(user.name),
      online: true,
      unread: 0,
      preview: "New conversation",
      time: "Just now",
      tone: toneFor(user.id),
      messages: [
        {
          id: `m${Date.now()}`,
          fromMe: true,
          kind: "text",
          text: `Hi ${user.name.split(" ")[0]} — checking in from ${me.name.split(" ")[0]}.`,
          time: nowLabel(),
          read: true,
        },
      ],
    };
    setThreads((prev) => [next, ...prev]);
    setActiveId(next.id);
    setShowNew(false);
    setPeopleQuery("");
  };

  const send = () => {
    if (!active) return;
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

    if (text) {
      const replyTo = active.id;
      const replyName = active.name.split(" ")[0] || "Team";
      window.setTimeout(() => {
        setThreads((prev) =>
          prev.map((t) =>
            t.id === replyTo
              ? {
                  ...t,
                  messages: [
                    ...t.messages,
                    {
                      id: `r${Date.now()}`,
                      fromMe: false,
                      kind: "text" as const,
                      text: `Got it, ${me.name.split(" ")[0]} — ${replyName} will update you shortly.`,
                      time: nowLabel(),
                    },
                  ],
                  preview: `${replyName} will update you shortly.`,
                  time: "Just now",
                  unread: t.id === activeId ? 0 : t.unread + 1,
                }
              : t,
          ),
        );
        requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
      }, 850);
    }
  };

  const unreadTotal = threads.reduce((s, t) => s + t.unread, 0);

  return (
    <RequirePermission store={store} permission="notifications">
      <div className="page msg-page">
        <header className="msg-head">
          <div>
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
            <p>
              Chat with your CRM teammates
              {unreadTotal ? ` · ${unreadTotal} unread` : ""}.
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setShowNew((v) => !v)}>
            {showNew ? "Close" : "+ New chat"}
          </button>
        </header>

        {showNew ? (
          <div className="msg-new-panel">
            <input
              className="rt-hr-input"
              value={peopleQuery}
              onChange={(e) => setPeopleQuery(e.target.value)}
              placeholder="Search people…"
              aria-label="Search people"
            />
            <ul className="msg-people">
              {people.map((u) => (
                <li key={u.id}>
                  <button type="button" onClick={() => startChat(u.id)}>
                    <strong>{u.name}</strong>
                    <span>
                      {ROLE_LABELS[u.role]} · {u.department}
                    </span>
                  </button>
                </li>
              ))}
              {people.length === 0 ? <li className="msg-empty">No more people to start.</li> : null}
            </ul>
          </div>
        ) : null}

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
                    className={`msg-thread${t.id === active?.id ? " is-active" : ""}`}
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
            {active ? (
              <>
                <header className="msg-chat-head">
                  <div className="msg-chat-user">
                    <span className={`msg-avatar lg tone-${active.tone}`}>
                      {active.initials}
                      {active.online ? <i className="msg-online" aria-hidden /> : null}
                    </span>
                    <div>
                      <strong>{active.name}</strong>
                      <small>
                        {active.online ? "Online" : "Offline"} · {active.role}
                      </small>
                    </div>
                  </div>
                </header>

                <div className="msg-stream" role="log" aria-live="polite">
                  {active.messages.map((m) =>
                    m.kind === "file" ? (
                      <div key={m.id} className={`msg-row${m.fromMe ? " from-me" : ""}`}>
                        <div className="msg-file">
                          <strong>{m.fileName}</strong>
                          <small>{m.fileSize}</small>
                        </div>
                        <time>{m.time}</time>
                      </div>
                    ) : (
                      <div key={m.id} className={`msg-row${m.fromMe ? " from-me" : ""}`}>
                        <div className="msg-bubble">{m.text}</div>
                        <time>{m.time}</time>
                      </div>
                    ),
                  )}
                  <div ref={endRef} />
                </div>

                <footer className="msg-composer">
                  <input
                    ref={fileRef}
                    type="file"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setFileName(f?.name || "");
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    className="msg-icon-btn"
                    aria-label="Attach"
                    onClick={() => fileRef.current?.click()}
                  >
                    +
                  </button>
                  {fileName ? (
                    <span className="msg-attach-chip">
                      {fileName}
                      <button type="button" onClick={() => setFileName("")}>
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
                  />
                  <button type="button" className="btn btn-primary" onClick={send}>
                    Send
                  </button>
                </footer>
              </>
            ) : (
              <div className="msg-empty-pane">
                <p>No teammates yet — add users in Settings.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </RequirePermission>
  );
}
