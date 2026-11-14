import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CrmStore } from "../../data/store";
import { formatDate } from "../../lib/format";
import { fetchLeads, type ApiLead } from "../../lib/leadsApi";
import { useRecordScope } from "../../lib/teamScope";
import { TeamCrmBar } from "../../components/TeamCrmBar";
import { RequirePermission } from "../../components/RequirePermission";

type FollowKind = "upcoming" | "overdue" | "completed";

const serviceCatalog = [
  "Website Development",
  "CRM Solutions",
  "Warehouse Management",
  "POS Systems",
  "Custom Software",
  "Cloud Migration",
  "Mobile App",
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function avatarTone(id: string) {
  const tones = ["sky", "mint", "violet", "amber", "rose", "teal"];
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i) * (i + 1)) % tones.length;
  return tones[hash];
}

function serviceInterest(lead: ApiLead) {
  const note = (lead.notes || "").trim();
  if (note && note.length < 48 && !/^new lead/i.test(note)) return note;
  const fromSource: Record<string, string> = {
    Website: "Website Development",
    Referral: "CRM Solutions",
    Upwork: "Custom Software",
    LinkedIn: "Cloud Migration",
    "Google Sheet": "CRM Solutions",
    Event: "POS Systems",
  };
  if (fromSource[lead.source]) return fromSource[lead.source];
  const idx = Math.abs(lead.leadId.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % serviceCatalog.length;
  return serviceCatalog[idx];
}

function followKind(dateStr: string, completed: boolean): FollowKind {
  if (completed) return "completed";
  const due = new Date(dateStr.includes("T") ? dateStr : `${dateStr.slice(0, 10)}T10:00:00`);
  if (Number.isNaN(due.getTime())) return "upcoming";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(due);
  day.setHours(0, 0, 0, 0);
  if (day.getTime() < today.getTime()) return "overdue";
  return "upcoming";
}

function followDateLabel(dateStr: string) {
  const base = dateStr.includes("T") ? dateStr : `${dateStr.slice(0, 10)}T10:00:00`;
  const due = new Date(base);
  if (Number.isNaN(due.getTime())) return formatDate(dateStr);
  const date = formatDate(dateStr.slice(0, 10));
  const time = due.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

export function Followups({ store }: { store: CrmStore }) {
  const scope = useRecordScope(store);
  const [leads, setLeads] = useState<ApiLead[]>([]);
  const [error, setError] = useState("");
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [menuOpenId, setMenuOpenId] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchLeads({ ownerId: scope.ownerId, teamManagerId: scope.teamManagerId })
      .then((res) => {
        setLeads(res.leads);
        setError("");
      })
      .catch((err: Error) => setError(err.message));
  }, [scope.ownerId, scope.teamManagerId, scope.focusOwnerId]);

  const queue = useMemo(() => {
    return [...leads]
      .filter((l) => l.nextFollowUp && l.status !== "won" && l.status !== "lost")
      .sort((a, b) => String(a.nextFollowUp).localeCompare(String(b.nextFollowUp)))
      .map((lead) => {
        const kind = followKind(String(lead.nextFollowUp), completedIds.has(lead.id));
        return { lead, kind, service: serviceInterest(lead) };
      });
  }, [leads, completedIds]);

  const stats = useMemo(() => {
    const total = queue.length;
    const completed = queue.filter((r) => r.kind === "completed").length;
    const overdue = queue.filter((r) => r.kind === "overdue").length;
    const upcoming = queue.filter((r) => r.kind === "upcoming").length;
    return { total, completed, overdue, upcoming };
  }, [queue]);

  const visible = showAll ? queue : queue.slice(0, 5);

  const markComplete = (id: string) => {
    setCompletedIds((prev) => new Set(prev).add(id));
    setMenuOpenId("");
  };

  return (
    <RequirePermission store={store} permission="followups">
      <div className="page fu-page">
        <TeamCrmBar store={store} />
        <header className="fu-hero">
          <div className="fu-hero-copy">
            <h2>Follow-ups & Reminders</h2>
            <p>Keep conversations going and never miss a follow-up.</p>
          </div>

          <div className="fu-hero-main">
            <div className="fu-stats" aria-label="Follow-up summary">
              <article className="fu-stat tone-total">
                <span className="fu-stat-ico" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M8 7V3m8 4V3M4 11h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                <div>
                  <p>Total Follow-ups</p>
                  <h3>{stats.total}</h3>
                </div>
              </article>
              <article className="fu-stat tone-done">
                <span className="fu-stat-ico" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <p>Completed</p>
                  <h3>{stats.completed}</h3>
                </div>
              </article>
              <article className="fu-stat tone-overdue">
                <span className="fu-stat-ico" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 8v5m0 3h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                <div>
                  <p>Overdue</p>
                  <h3>{stats.overdue}</h3>
                </div>
              </article>
              <article className="fu-stat tone-upcoming">
                <span className="fu-stat-ico" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                <div>
                  <p>Upcoming</p>
                  <h3>{stats.upcoming}</h3>
                </div>
              </article>
            </div>

            <aside className="fu-art" aria-hidden>
              <div className="fu-cal">
                <div className="fu-cal-top">
                  <span />
                  <span />
                </div>
                <div className="fu-cal-grid">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <i key={i} className={i === 8 ? "active" : undefined} />
                  ))}
                </div>
              </div>
              <div className="fu-bell">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M15 17H9m9-3V10a6 6 0 1 0-12 0v4l-2 2h16l-2-2Zm-4 3a2 2 0 1 1-4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <em>1</em>
              </div>
            </aside>
          </div>
        </header>

        {error ? (
          <div className="empty" style={{ marginBottom: 16 }}>
            <h3>Follow-ups issue</h3>
            <p>{error}</p>
          </div>
        ) : null}

        <section className="fu-panel">
          <header className="fu-panel-head">
            <h3>Upcoming Follow-ups</h3>
            <button type="button" className="fu-link" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show less" : "View all"}
            </button>
          </header>

          <ul className="fu-list">
            {visible.map(({ lead, kind, service }) => (
              <li className={`fu-row kind-${kind}`} key={lead.id}>
                <div className="fu-identity">
                  <span className={`fu-avatar tone-${avatarTone(lead.id)}`}>{initials(lead.name)}</span>
                  <div>
                    <strong>{lead.name}</strong>
                    <p>
                      {lead.company} · {lead.leadId}
                    </p>
                  </div>
                </div>

                <div className="fu-service">
                  <span className="fu-mini-ico" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-10 0h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span>{service}</span>
                </div>

                <div className="fu-when">
                  <span className="fu-mini-ico" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M8 7V3m8 4V3M4 11h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span>{followDateLabel(String(lead.nextFollowUp))}</span>
                </div>

                <div className={`fu-status ${kind}`}>
                  {kind === "overdue" ? (
                    <>
                      <span aria-hidden>!</span> Overdue
                    </>
                  ) : kind === "completed" ? (
                    <>
                      <span aria-hidden>✓</span> Completed
                    </>
                  ) : (
                    <>
                      <span aria-hidden>◷</span> Upcoming
                    </>
                  )}
                </div>

                <div className="fu-row-actions">
                  <a className="fu-contact" href={`tel:${lead.phone}`}>
                    <span aria-hidden>☎</span> Contact
                  </a>
                  <div className="fu-more-wrap">
                    <button
                      type="button"
                      className="fu-more"
                      aria-label={`More actions for ${lead.name}`}
                      aria-expanded={menuOpenId === lead.id}
                      onClick={() => setMenuOpenId((id) => (id === lead.id ? "" : lead.id))}
                    >
                      ⋯
                    </button>
                    {menuOpenId === lead.id ? (
                      <div className="fu-menu" role="menu">
                        <a role="menuitem" href={`mailto:${lead.email}`}>
                          Email
                        </a>
                        <Link role="menuitem" to="/leads/pipeline" onClick={() => setMenuOpenId("")}>
                          Open pipeline
                        </Link>
                        {kind !== "completed" ? (
                          <button type="button" role="menuitem" onClick={() => markComplete(lead.id)}>
                            Mark completed
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
            {visible.length === 0 ? (
              <li className="fu-empty">No follow-ups scheduled. Add one to keep the pipeline warm.</li>
            ) : null}
          </ul>
        </section>

        <footer className="fu-footer">
          <p className="fu-tip">
            <span aria-hidden>💡</span>
            Tip: Set up automatic reminders to stay on top of your follow-ups.
          </p>
          <Link className="btn btn-primary fu-add" to="/leads/new">
            <span aria-hidden>📅</span> + Add Follow-up
          </Link>
        </footer>
      </div>
    </RequirePermission>
  );
}
