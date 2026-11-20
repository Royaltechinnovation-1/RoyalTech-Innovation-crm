import { useEffect, useMemo, useRef, useState } from "react";
import type { CrmStore } from "../../data/store";
import { RequirePermission } from "../../components/RequirePermission";
import { useHrmStore, type HrmEmployee } from "../../data/hrmStore";
import {
  activateMailAccount,
  fetchMailStatus,
  saveMailAccount,
  sendHrMail,
  testMailAccount,
  type MailAccountKind,
  type MailStatus,
} from "../../lib/mailApi";

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
  employeeId: string;
  name: string;
  role: string;
  department: string;
  initials: string;
  online: boolean;
  unread: number;
  preview: string;
  time: string;
  tone: Tone;
  messages: ChatMessage[];
};

const STORAGE_KEY = "royaltech-hrm-messages-v1";
const tones: Tone[] = ["cyan", "violet", "amber", "green", "rose"];

function initials(name: string) {
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

function seedThreads(employees: HrmEmployee[]): Thread[] {
  const pick = employees.filter((e) => e.status !== "Inactive" && e.status !== "Resigned").slice(0, 8);
  const starters: Array<{ preview: string; msgs: Array<{ fromMe: boolean; text: string }> }> = [
    {
      preview: "Can we confirm joining docs by Friday?",
      msgs: [
        { fromMe: false, text: "Hi — I still need to upload my bank details." },
        { fromMe: true, text: "Please send them on the portal by Friday so payroll can process." },
        { fromMe: false, text: "Can we confirm joining docs by Friday?" },
      ],
    },
    {
      preview: "Leave request for next Monday.",
      msgs: [
        { fromMe: false, text: "I’d like to take short leave next Monday morning." },
        { fromMe: true, text: "Noted — please raise it in Leave so I can approve." },
        { fromMe: false, text: "Leave request for next Monday." },
      ],
    },
    {
      preview: "Attendance marked late yesterday.",
      msgs: [
        { fromMe: true, text: "Your attendance shows Late for yesterday — traffic?" },
        { fromMe: false, text: "Yes, metro delay. Won’t repeat." },
        { fromMe: true, text: "Attendance marked late yesterday — thanks for confirming." },
      ],
    },
    {
      preview: "Offer letter follow-up.",
      msgs: [
        { fromMe: false, text: "Any update on the offer letter copy?" },
        { fromMe: true, text: "I’ll email the signed PDF today." },
      ],
    },
  ];

  return pick.map((e, i) => {
    const starter = starters[i % starters.length];
    const messages: ChatMessage[] = starter.msgs.map((m, mi) => ({
      id: `${e.id}-m${mi}`,
      fromMe: m.fromMe,
      kind: "text" as const,
      text: m.text,
      time: mi === starter.msgs.length - 1 ? "Today" : "Yesterday",
      read: m.fromMe,
    }));
    return {
      id: `chat-${e.id}`,
      employeeId: e.id,
      name: e.name,
      role: e.designation || "Employee",
      department: e.department || "",
      initials: initials(e.name),
      online: i % 3 !== 2,
      unread: i < 2 ? 1 : 0,
      preview: starter.preview,
      time: i < 2 ? "Just now" : i < 4 ? "Today" : "Mon",
      tone: toneFor(e.id),
      messages,
    };
  });
}

function loadThreads(employees: HrmEmployee[]): Thread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Thread[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  return seedThreads(employees);
}

export function HrmMessages({ store }: { store: CrmStore }) {
  const hrm = useHrmStore();
  const me = store.currentUser;
  const employees = useMemo(
    () =>
      hrm.employees.filter(
        (e) => !["Inactive", "Resigned", "Terminated"].includes(String(e.status)),
      ),
    [hrm.employees],
  );

  const [threads, setThreads] = useState<Thread[]>(() => loadThreads(employees));
  const [activeId, setActiveId] = useState(() => loadThreads(employees)[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [fileName, setFileName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [showMail, setShowMail] = useState(false);
  const [mail, setMail] = useState<MailStatus | null>(null);
  const [mailKind, setMailKind] = useState<MailAccountKind>("titan");
  const [mailForm, setMailForm] = useState({ email: "", password: "", host: "", port: "465" });
  const [mailBusy, setMailBusy] = useState(false);
  const [mailNotice, setMailNotice] = useState("");
  const [alsoEmail, setAlsoEmail] = useState(true);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const isSuperAdmin = store.role === "founder";
  const senderLabel = isSuperAdmin ? "Super Admin" : "HR";

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
  }, [threads]);

  // When HR directory loads/changes, keep chats tied to real employees.
  useEffect(() => {
    if (!employees.length) return;
    setThreads((prev) => {
      if (prev.length) {
        const byId = new Map(employees.map((e) => [e.id, e]));
        return prev
          .map((t) => {
            const emp = byId.get(t.employeeId);
            if (!emp) return t;
            return {
              ...t,
              name: emp.name,
              role: emp.designation || t.role,
              department: emp.department || t.department,
              initials: initials(emp.name),
            };
          })
          .filter((t) => byId.has(t.employeeId) || t.messages.length > 0);
      }
      const seeded = seedThreads(employees);
      setActiveId((id) => id || seeded[0]?.id || "");
      return seeded;
    });
  }, [employees]);

  useEffect(() => {
    fetchMailStatus()
      .then((status) => {
        setMail(status);
        setMailKind(status.active || "titan");
        const acc = status.accounts[status.active || "titan"];
        setMailForm({
          email: acc?.email || "",
          password: "",
          host: acc?.host || status.presets.titan.host,
          port: String(acc?.port || status.presets.titan.port),
        });
      })
      .catch(() => {
        setMailNotice("Mail API offline — start the CRM server to connect Titan / Gmail.");
      });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.role.toLowerCase().includes(q) ||
        t.department.toLowerCase().includes(q) ||
        t.preview.toLowerCase().includes(q),
    );
  }, [threads, query]);

  const people = useMemo(() => {
    const openIds = new Set(threads.map((t) => t.employeeId));
    const q = peopleQuery.trim().toLowerCase();
    return employees
      .filter((e) => !openIds.has(e.id))
      .filter(
        (e) =>
          !q ||
          e.name.toLowerCase().includes(q) ||
          String(e.designation || "").toLowerCase().includes(q) ||
          String(e.department || "").toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [employees, threads, peopleQuery]);

  const active = threads.find((t) => t.id === activeId) ?? threads[0];
  const activeEmployee = useMemo(
    () => employees.find((e) => e.id === active?.employeeId),
    [employees, active?.employeeId],
  );
  const recipientEmail = String(
    activeEmployee?.companyEmail || activeEmployee?.email || "",
  ).trim();

  const openThread = (id: string) => {
    setActiveId(id);
    setShowNew(false);
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)));
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  const startChat = (emp: HrmEmployee) => {
    const existing = threads.find((t) => t.employeeId === emp.id);
    if (existing) {
      openThread(existing.id);
      return;
    }
    const next: Thread = {
      id: `chat-${emp.id}`,
      employeeId: emp.id,
      name: emp.name,
      role: emp.designation || "Employee",
      department: emp.department || "",
      initials: initials(emp.name),
      online: true,
      unread: 0,
      preview: "New conversation",
      time: "Just now",
      tone: toneFor(emp.id),
      messages: [
        {
          id: `m${Date.now()}`,
          fromMe: true,
          kind: "text",
          text: `Hi ${emp.name.split(" ")[0]}, this is ${senderLabel}. How can we help?`,
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

  const applyMailStatus = (status: MailStatus) => {
    setMail(status);
    const acc = status.accounts[mailKind];
    setMailForm((f) => ({
      ...f,
      email: acc?.email || f.email,
      host: acc?.host || f.host,
      port: String(acc?.port || f.port),
    }));
  };

  const connectMail = async () => {
    setMailBusy(true);
    setMailNotice("");
    try {
      const status = await saveMailAccount(mailKind, {
        email: mailForm.email.trim(),
        password: mailForm.password,
        host: mailForm.host.trim() || undefined,
        port: Number(mailForm.port) || undefined,
        secure: true,
        setActive: true,
      });
      applyMailStatus(status);
      const tested = await testMailAccount(mailKind);
      applyMailStatus(tested.mail);
      setMailNotice(tested.message);
      setAlsoEmail(true);
    } catch (err) {
      setMailNotice(err instanceof Error ? err.message : "Could not connect mail");
    } finally {
      setMailBusy(false);
    }
  };

  const switchMail = async (kind: MailAccountKind) => {
    setMailKind(kind);
    const preset = mail?.presets[kind];
    const acc = mail?.accounts[kind];
    setMailForm({
      email: acc?.email || "",
      password: "",
      host: acc?.host || preset?.host || "",
      port: String(acc?.port || preset?.port || 465),
    });
    if (acc?.enabled) {
      try {
        applyMailStatus(await activateMailAccount(kind));
      } catch {
        /* keep form ready to connect */
      }
    }
  };

  const send = async () => {
    if (!active || sending) return;
    const text = draft.trim();
    if (!text && !fileName) return;
    setSending(true);
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

    if (alsoEmail && text) {
      if (!recipientEmail) {
        setMailNotice(`No email on file for ${active.name}. Add personal/company email in Employees.`);
      } else {
        try {
          const result = await sendHrMail({
            to: recipientEmail,
            subject: `${senderLabel} message · ${active.name}`,
            text: `Hi ${active.name.split(" ")[0]},\n\n${text}\n\n— ${me.name} (RoyalTech ${senderLabel})`,
            accountKind: mail?.active,
          });
          setMail(result.mail);
          nextMsgs.push({
            id: `m${Date.now() + 2}`,
            fromMe: true,
            kind: "text",
            text: result.mailed
              ? `Email delivered to ${recipientEmail} via ${result.mail.active}.`
              : `Email queued for ${recipientEmail}. Connect Titan / personal mail to deliver.`,
            time: nowLabel(),
            read: true,
          });
          setMailNotice(result.log.message);
        } catch (err) {
          // Chat still saves locally even if SMTP is offline.
          setMailNotice(
            err instanceof Error
              ? `${err.message} — message saved in chat.`
              : "Email send failed — message saved in chat.",
          );
        }
      }
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
    setSending(false);
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));

    // Lightweight local reply so the thread feels live without an AI bot.
    if (text) {
      const replyTo = active.id;
      const replyName = active.name.split(" ")[0] || "them";
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
                      text: `Thanks ${me.name.split(" ")[0]} — noted. I’ll follow up from ${replyName}.`,
                      time: nowLabel(),
                    },
                  ],
                  preview: `Thanks — noted.`,
                  time: "Just now",
                  unread: t.id === activeId ? 0 : t.unread + 1,
                }
              : t,
          ),
        );
        requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
      }, 900);
    }
  };

  const unreadTotal = threads.reduce((s, t) => s + t.unread, 0);

  return (
    <RequirePermission store={store} permission="hr">
      <div className="page msg-page hrm-msg-page">
        <header className="msg-head">
          <div>
            <nav className="rd-crumbs">
              <span>{isSuperAdmin ? "Super Admin" : "HR"}</span>
              <span>/</span>
              <strong>Messages</strong>
            </nav>
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
              Team chat
            </h2>
            <p>
              Message people from the HR directory
              {unreadTotal ? ` · ${unreadTotal} unread` : ""}.
            </p>
          </div>
          <div className="hrm-msg-head-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowMail((v) => !v)}
            >
              {mail?.connected ? "Mail connected" : "Connect email"}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setShowNew((v) => !v)}>
              {showNew ? "Close" : "+ New chat"}
            </button>
          </div>
        </header>

        {mailNotice ? (
          <div className="hrm-mail-banner" role="status">
            <span>{mailNotice}</span>
            <button type="button" onClick={() => setMailNotice("")}>
              Dismiss
            </button>
          </div>
        ) : null}

        {showMail ? (
          <section className="ps-card hrm-mail-panel">
            <header>
              <h3>Connect Titan or personal email</h3>
              <span>
                {mail?.connected
                  ? `Active: ${mail.fromEmail}`
                  : "Used for chat emails & event notices"}
              </span>
            </header>
            <div className="hrm-mail-tabs">
              <button
                type="button"
                className={mailKind === "titan" ? "is-active" : ""}
                onClick={() => switchMail("titan")}
              >
                Titan Email
                {mail?.accounts.titan.enabled ? " · on" : ""}
              </button>
              <button
                type="button"
                className={mailKind === "personal" ? "is-active" : ""}
                onClick={() => switchMail("personal")}
              >
                Personal / Gmail
                {mail?.accounts.personal.enabled ? " · on" : ""}
              </button>
            </div>
            <div className="hrm-mail-grid">
              <label>
                Email
                <input
                  className="field"
                  type="email"
                  value={mailForm.email}
                  onChange={(e) => setMailForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder={
                    mailKind === "titan" ? "hr@yourdomain.com" : "you@gmail.com"
                  }
                />
              </label>
              <label>
                Password / app password
                <input
                  className="field"
                  type="password"
                  value={mailForm.password}
                  onChange={(e) => setMailForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="SMTP password"
                  autoComplete="new-password"
                />
              </label>
              <label>
                SMTP host
                <input
                  className="field"
                  value={mailForm.host}
                  onChange={(e) => setMailForm((f) => ({ ...f, host: e.target.value }))}
                  placeholder={mailKind === "titan" ? "smtp.titan.email" : "smtp.gmail.com"}
                />
              </label>
              <label>
                Port
                <input
                  className="field"
                  value={mailForm.port}
                  onChange={(e) => setMailForm((f) => ({ ...f, port: e.target.value }))}
                />
              </label>
            </div>
            <div className="hrm-mail-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={mailBusy || !mailForm.email || !mailForm.password}
                onClick={connectMail}
              >
                {mailBusy ? "Connecting…" : `Save & test ${mailKind === "titan" ? "Titan" : "Gmail"}`}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowMail(false)}>
                Done
              </button>
            </div>
            <p className="muted hrm-mail-hint">
              Titan: smtp.titan.email · 465. Gmail: use an App Password. Messages and event notices
              send from the active account.
            </p>
          </section>
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
                placeholder="Search people or chats…"
              />
            </label>

            {showNew ? (
              <div className="hrm-msg-new">
                <label className="msg-search">
                  <input
                    value={peopleQuery}
                    onChange={(e) => setPeopleQuery(e.target.value)}
                    placeholder="Find employee to message…"
                    autoFocus
                  />
                </label>
                <ul className="msg-threads">
                  {people.map((e) => (
                    <li key={e.id}>
                      <button type="button" className="msg-thread" onClick={() => startChat(e)}>
                        <span className={`msg-avatar tone-${toneFor(e.id)}`}>
                          {initials(e.name)}
                        </span>
                        <span className="msg-thread-meta">
                          <span className="msg-thread-top">
                            <strong>{e.name}</strong>
                          </span>
                          <span className="msg-thread-bottom">
                            <em>
                              {e.designation} · {e.department}
                            </em>
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                  {people.length === 0 ? (
                    <li className="msg-empty">Everyone is already in your chats, or no match.</li>
                  ) : null}
                </ul>
              </div>
            ) : (
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
            )}
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
                        {active.online ? "Online · " : ""}
                        {active.role}
                        {active.department ? ` · ${active.department}` : ""}
                        {recipientEmail ? ` · ${recipientEmail}` : " · no email on file"}
                      </small>
                    </div>
                  </div>
                  <label className="hrm-mail-toggle">
                    <input
                      type="checkbox"
                      checked={alsoEmail}
                      onChange={(e) => setAlsoEmail(e.target.checked)}
                    />
                    Also email
                    {mail?.connected ? ` (${mail.active})` : " (connect first)"}
                  </label>
                </header>

                <div className="msg-stream" role="log" aria-live="polite">
                  {active.messages.map((m) =>
                    m.kind === "file" ? (
                      <div key={m.id} className={`msg-row${m.fromMe ? " from-me" : ""}`}>
                        <div className="msg-file">
                          <span className="msg-file-thumb" aria-hidden>
                            <svg viewBox="0 0 24 24">
                              <rect
                                x="4"
                                y="5"
                                width="16"
                                height="14"
                                rx="2"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              />
                            </svg>
                          </span>
                          <div>
                            <strong>{m.fileName}</strong>
                            <small>{m.fileSize}</small>
                          </div>
                        </div>
                        <div className="msg-meta">
                          <span>{m.time}</span>
                          {m.fromMe ? <span className="msg-ticks">✓✓</span> : null}
                        </div>
                      </div>
                    ) : (
                      <div key={m.id} className={`msg-row${m.fromMe ? " from-me" : ""}`}>
                        <div className="msg-bubble">{m.text}</div>
                        <div className="msg-meta">
                          <span>{m.time}</span>
                          {m.fromMe ? <span className="msg-ticks">✓✓</span> : null}
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
                        <button
                          type="button"
                          onClick={() => setFileName("")}
                          aria-label="Remove attachment"
                        >
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
                  <button
                    type="button"
                    className="msg-send"
                    onClick={send}
                    disabled={sending}
                    aria-label="Send"
                  >
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
                <p className="msg-signed">
                  Signed in as {me.name} · {senderLabel}
                </p>
              </>
            ) : (
              <div className="msg-empty-chat">
                <p>Select a person or start a new chat.</p>
                <button type="button" className="btn btn-primary" onClick={() => setShowNew(true)}>
                  + New chat
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </RequirePermission>
  );
}
