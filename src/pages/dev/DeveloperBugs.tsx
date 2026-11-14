import { useMemo, useState } from "react";
import type { CrmStore } from "../../data/store";
import { formatDate } from "../../lib/format";
import { RequirePermission } from "../../components/RequirePermission";

type BugStatus = "open" | "progress" | "resolved";
type BugPriority = "High" | "Medium" | "Low";
type DetailTab = "details" | "comments" | "activity";

type BugItem = {
  id: string;
  title: string;
  module: string;
  priority: BugPriority;
  status: BugStatus;
  when: string;
  description: string;
  reportedBy: string;
  reportedOn: string;
  assignedTo: string;
  assignedOn: string;
  dueDate: string;
  progress: number;
  comments: { id: string; author: string; text: string; when: string }[];
  activity: { id: string; text: string; when: string }[];
};

const seedBugs: BugItem[] = [
  {
    id: "b1",
    title: "Calendar not syncing with API",
    module: "Calendar Module",
    priority: "High",
    status: "progress",
    when: "2h ago",
    description:
      "Calendar events are not syncing properly with the backend API. Events added from the API are not showing in the calendar view.",
    reportedBy: "Amit Sharma",
    reportedOn: "11 Nov 2026",
    assignedTo: "Ananya Iyer",
    assignedOn: "11 Nov 2026",
    dueDate: "12 Nov 2026",
    progress: 70,
    comments: [
      {
        id: "c1",
        author: "Amit Sharma",
        text: "Reproduced on staging — refresh still misses new events.",
        when: "2h ago",
      },
      {
        id: "c2",
        author: "Ananya Iyer",
        text: "Checking poll interval and cache invalidation now.",
        when: "1h ago",
      },
    ],
    activity: [
      { id: "a1", text: "Status set to In Progress", when: "Today 10:12" },
      { id: "a2", text: "Assigned to Ananya Iyer", when: "Today 09:40" },
      { id: "a3", text: "Bug reported by Amit Sharma", when: "11 Nov 2026" },
    ],
  },
  {
    id: "b2",
    title: "Login form validation edge cases",
    module: "Auth Module",
    priority: "High",
    status: "open",
    when: "4h ago",
    description:
      "Empty email and special characters in password are not handled cleanly. Error states flicker and submit stays enabled.",
    reportedBy: "Priya Mehta",
    reportedOn: "12 Nov 2026",
    assignedTo: "Ananya Iyer",
    assignedOn: "12 Nov 2026",
    dueDate: "13 Nov 2026",
    progress: 15,
    comments: [
      {
        id: "c3",
        author: "Priya Mehta",
        text: "Also fails when pasting email with trailing space.",
        when: "3h ago",
      },
    ],
    activity: [
      { id: "a4", text: "Priority marked High", when: "Today 08:20" },
      { id: "a5", text: "Bug reported by Priya Mehta", when: "Today 07:55" },
    ],
  },
  {
    id: "b3",
    title: "Dashboard cards overflow on mobile",
    module: "Dashboard",
    priority: "Medium",
    status: "progress",
    when: "Yesterday",
    description:
      "KPI cards wrap incorrectly under 420px width. Horizontal scroll appears on the greet strip.",
    reportedBy: "Vikram Shah",
    reportedOn: "10 Nov 2026",
    assignedTo: "Ananya Iyer",
    assignedOn: "10 Nov 2026",
    dueDate: "14 Nov 2026",
    progress: 45,
    comments: [],
    activity: [
      { id: "a6", text: "Moved to In Progress", when: "Yesterday" },
      { id: "a7", text: "Bug reported by Vikram Shah", when: "10 Nov 2026" },
    ],
  },
  {
    id: "b4",
    title: "Daily report upload rejects ZIP",
    module: "Daily Report",
    priority: "Medium",
    status: "open",
    when: "Yesterday",
    description:
      "ZIP attachments fail silently even though the UI says ZIP is supported.",
    reportedBy: "Omar Siddiqui",
    reportedOn: "10 Nov 2026",
    assignedTo: "Ananya Iyer",
    assignedOn: "11 Nov 2026",
    dueDate: "15 Nov 2026",
    progress: 10,
    comments: [],
    activity: [{ id: "a8", text: "Bug reported by Omar Siddiqui", when: "10 Nov 2026" }],
  },
  {
    id: "b5",
    title: "Notification badge count stale",
    module: "Notifications",
    priority: "Low",
    status: "open",
    when: "2d ago",
    description:
      "Unread badge does not decrement until a full page refresh after opening a thread.",
    reportedBy: "Neha Kapoor",
    reportedOn: "09 Nov 2026",
    assignedTo: "Ananya Iyer",
    assignedOn: "09 Nov 2026",
    dueDate: "18 Nov 2026",
    progress: 5,
    comments: [],
    activity: [{ id: "a9", text: "Bug reported by Neha Kapoor", when: "09 Nov 2026" }],
  },
  {
    id: "b6",
    title: "API inventory sync timeout",
    module: "Integrations",
    priority: "High",
    status: "progress",
    when: "3d ago",
    description:
      "Inventory sync request times out after 15s on large catalogs. Needs retry + batching.",
    reportedBy: "Vikram Shah",
    reportedOn: "08 Nov 2026",
    assignedTo: "Ananya Iyer",
    assignedOn: "08 Nov 2026",
    dueDate: "16 Nov 2026",
    progress: 55,
    comments: [
      {
        id: "c4",
        author: "Ananya Iyer",
        text: "Batch size lowered to 200; still profiling slow queries.",
        when: "2d ago",
      },
    ],
    activity: [
      { id: "a10", text: "Progress updated to 55%", when: "2d ago" },
      { id: "a11", text: "Status set to In Progress", when: "3d ago" },
    ],
  },
  {
    id: "b7",
    title: "Project filter chip misaligned",
    module: "My Tasks",
    priority: "Low",
    status: "resolved",
    when: "4d ago",
    description: "Active filter chip sat 4px too high on desktop toolbar.",
    reportedBy: "Amit Sharma",
    reportedOn: "06 Nov 2026",
    assignedTo: "Ananya Iyer",
    assignedOn: "06 Nov 2026",
    dueDate: "07 Nov 2026",
    progress: 100,
    comments: [],
    activity: [
      { id: "a12", text: "Marked as Resolved", when: "4d ago" },
      { id: "a13", text: "Bug reported by Amit Sharma", when: "06 Nov 2026" },
    ],
  },
  {
    id: "b8",
    title: "GitHub PR link opens blank tab",
    module: "GitHub",
    priority: "Medium",
    status: "resolved",
    when: "5d ago",
    description: "External PR links lost the URL when opening from the GitHub page.",
    reportedBy: "Vikram Shah",
    reportedOn: "05 Nov 2026",
    assignedTo: "Ananya Iyer",
    assignedOn: "05 Nov 2026",
    dueDate: "06 Nov 2026",
    progress: 100,
    comments: [],
    activity: [{ id: "a14", text: "Marked as Resolved", when: "5d ago" }],
  },
  {
    id: "b9",
    title: "Messages attach button double-fires",
    module: "Messages",
    priority: "Low",
    status: "resolved",
    when: "1w ago",
    description: "Rapid clicks opened two file pickers on some browsers.",
    reportedBy: "Priya Mehta",
    reportedOn: "03 Nov 2026",
    assignedTo: "Ananya Iyer",
    assignedOn: "03 Nov 2026",
    dueDate: "04 Nov 2026",
    progress: 100,
    comments: [],
    activity: [{ id: "a15", text: "Marked as Resolved", when: "1w ago" }],
  },
];

type FilterTab = "all" | BugStatus;

function statusLabel(s: BugStatus) {
  if (s === "progress") return "In Progress";
  if (s === "resolved") return "Resolved";
  return "Open";
}

function priorityTone(p: BugPriority) {
  if (p === "High") return "high";
  if (p === "Medium") return "medium";
  return "low";
}

export function DeveloperBugs({ store }: { store: CrmStore }) {
  const taskBugs: BugItem[] = useMemo(
    () =>
      store.visibleTasks
        .filter((t) => t.status === "blocked" || /bug|fix|issue/i.test(t.title))
        .map((t, i) => ({
          id: `task-${t.id}`,
          title: t.title,
          module: store.data.projects.find((p) => p.id === t.projectId)?.name || "Project",
          priority: (t.status === "blocked" ? "High" : "Medium") as BugPriority,
          status: (t.status === "done" ? "resolved" : t.status === "doing" ? "progress" : "open") as BugStatus,
          when: formatDate(t.dueDate),
          description: `Tracked from task board. Current status: ${t.status}.`,
          reportedBy: "Task Board",
          reportedOn: formatDate(t.dueDate),
          assignedTo: store.currentUser.name,
          assignedOn: formatDate(t.dueDate),
          dueDate: formatDate(t.dueDate),
          progress: t.status === "done" ? 100 : t.status === "doing" ? 50 : 20,
          comments: [],
          activity: [{ id: `ta-${i}`, text: "Imported from My Tasks", when: formatDate(t.dueDate) }],
        })),
    [store],
  );

  const [bugs, setBugs] = useState<BugItem[]>(() => {
    const ids = new Set(seedBugs.map((b) => b.title.toLowerCase()));
    const extra = taskBugs.filter((b) => !ids.has(b.title.toLowerCase()));
    return [...seedBugs, ...extra];
  });
  const [tab, setTab] = useState<FilterTab>("all");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(bugs[0]?.id ?? "");
  const [detailTab, setDetailTab] = useState<DetailTab>("details");
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState("");

  const counts = useMemo(
    () => ({
      all: bugs.length,
      open: bugs.filter((b) => b.status === "open").length,
      progress: bugs.filter((b) => b.status === "progress").length,
      resolved: bugs.filter((b) => b.status === "resolved").length,
    }),
    [bugs],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bugs.filter((b) => {
      if (tab !== "all" && b.status !== tab) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.module.toLowerCase().includes(q) ||
        b.priority.toLowerCase().includes(q)
      );
    });
  }, [bugs, tab, query]);

  const active = bugs.find((b) => b.id === activeId) ?? filtered[0] ?? bugs[0];

  const setStatus = (status: BugStatus) => {
    if (!active) return;
    setBugs((prev) =>
      prev.map((b) =>
        b.id === active.id
          ? {
              ...b,
              status,
              progress: status === "resolved" ? 100 : status === "progress" ? Math.max(b.progress, 40) : b.progress,
              activity: [
                {
                  id: `act-${Date.now()}`,
                  text: `Status set to ${statusLabel(status)}`,
                  when: "Just now",
                },
                ...b.activity,
              ],
            }
          : b,
      ),
    );
    setNotice(status === "resolved" ? "Marked as resolved." : `Status updated to ${statusLabel(status)}.`);
  };

  const addComment = () => {
    if (!active || !comment.trim()) return;
    const text = comment.trim();
    setBugs((prev) =>
      prev.map((b) =>
        b.id === active.id
          ? {
              ...b,
              comments: [
                {
                  id: `c-${Date.now()}`,
                  author: store.currentUser.name,
                  text,
                  when: "Just now",
                },
                ...b.comments,
              ],
              activity: [
                { id: `act-${Date.now()}`, text: "Comment added", when: "Just now" },
                ...b.activity,
              ],
            }
          : b,
      ),
    );
    setComment("");
    setDetailTab("comments");
    setNotice("Comment added.");
  };

  if (!active) {
    return (
      <RequirePermission store={store} permission="projects">
        <div className="page bug-page">
          <p className="muted">No bugs found.</p>
        </div>
      </RequirePermission>
    );
  }

  return (
    <RequirePermission store={store} permission="projects">
      <div className="page bug-page">
        <header className="bug-head">
          <h2>
            <span className="bug-title-ico" aria-hidden>
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="13" r="5.2" fill="none" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M12 5.2V3.5M7.2 7.6 5.8 6.2M16.8 7.6l1.4-1.4M5.2 13H3.5M20.5 13h-1.7M8.2 17.8 6.8 19.2M15.8 17.8l1.4 1.4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            Bug & Fixes
          </h2>
          <p>Track and manage issues across the CRM.</p>
        </header>

        {notice ? <p className="bug-notice">{notice}</p> : null}

        <section className="bug-shell">
          <aside className="bug-list-pane">
            <div className="bug-tabs" role="tablist">
              {(
                [
                  ["all", "All Issues", counts.all],
                  ["open", "Open", counts.open],
                  ["progress", "In Progress", counts.progress],
                  ["resolved", "Resolved", counts.resolved],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  className={tab === key ? "is-active" : undefined}
                  onClick={() => setTab(key)}
                >
                  {label} <span>{count}</span>
                </button>
              ))}
            </div>

            <div className="bug-tools">
              <label className="bug-search">
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
                  placeholder="Search bugs, issues..."
                />
              </label>
              <button type="button" className="bug-filter-btn" aria-label="Filter">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M4 6h16M7 12h10M10 18h4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <ul className="bug-list">
              {filtered.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    className={`bug-item${b.id === active.id ? " is-active" : ""}`}
                    onClick={() => {
                      setActiveId(b.id);
                      setDetailTab("details");
                      setNotice("");
                    }}
                  >
                    <span className={`bug-item-ico tone-${priorityTone(b.priority)}`} aria-hidden>
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="13" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path
                          d="M12 5.5V4M7.5 8 6.2 6.7M16.5 8l1.3-1.3M5.5 13H4M20 13h-1.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <span className="bug-item-body">
                      <strong>{b.title}</strong>
                      <em>{b.module}</em>
                      <span className="bug-item-foot">
                        <span className={`bug-priority tone-${priorityTone(b.priority)}`}>{b.priority}</span>
                        <small>{b.when}</small>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 ? <li className="bug-empty">No matching issues.</li> : null}
            </ul>
          </aside>

          <article className="bug-detail-pane">
            <header className="bug-detail-head">
              <div>
                <h3>{active.title}</h3>
                <div className="bug-badges">
                  <span className="bug-module-badge">{active.module}</span>
                  <span className={`bug-priority tone-${priorityTone(active.priority)}`}>
                    {active.priority} Priority
                  </span>
                </div>
              </div>
              <label className="bug-status-select">
                <span className="sr-only">Status</span>
                <select
                  value={active.status}
                  onChange={(e) => setStatus(e.target.value as BugStatus)}
                >
                  <option value="open">Open</option>
                  <option value="progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </label>
            </header>

            <div className="bug-detail-tabs" role="tablist">
              {(
                [
                  ["details", "Details"],
                  ["comments", `Comments (${active.comments.length})`],
                  ["activity", "Activity"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={detailTab === key}
                  className={detailTab === key ? "is-active" : undefined}
                  onClick={() => setDetailTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {detailTab === "details" ? (
              <div className="bug-detail-body">
                <section>
                  <h4>Description</h4>
                  <p>{active.description}</p>
                </section>
                <div className="bug-meta-row">
                  <div>
                    <h4>Reported By</h4>
                    <p>
                      {active.reportedBy}
                      <small>{active.reportedOn}</small>
                    </p>
                  </div>
                  <div>
                    <h4>Assigned To</h4>
                    <p>
                      {active.assignedTo}
                      <small>{active.assignedOn}</small>
                    </p>
                  </div>
                  <div>
                    <h4>Due Date</h4>
                    <p>{active.dueDate}</p>
                  </div>
                </div>
                <section>
                  <div className="bug-progress-head">
                    <h4>Progress</h4>
                    <strong>{active.progress}%</strong>
                  </div>
                  <div className="bug-progress-track" aria-hidden>
                    <i style={{ width: `${active.progress}%` }} />
                  </div>
                </section>
              </div>
            ) : null}

            {detailTab === "comments" ? (
              <div className="bug-detail-body">
                <div className="bug-comment-box">
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write a comment..."
                  />
                  <button type="button" className="bug-btn primary" onClick={addComment}>
                    Post Comment
                  </button>
                </div>
                <ul className="bug-comment-list">
                  {active.comments.map((c) => (
                    <li key={c.id}>
                      <strong>{c.author}</strong>
                      <small>{c.when}</small>
                      <p>{c.text}</p>
                    </li>
                  ))}
                  {active.comments.length === 0 ? <li className="bug-empty">No comments yet.</li> : null}
                </ul>
              </div>
            ) : null}

            {detailTab === "activity" ? (
              <div className="bug-detail-body">
                <ul className="bug-activity-list">
                  {active.activity.map((a) => (
                    <li key={a.id}>
                      <span />
                      <div>
                        <strong>{a.text}</strong>
                        <small>{a.when}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <footer className="bug-actions">
              <button
                type="button"
                className="bug-btn primary"
                onClick={() => setStatus("resolved")}
                disabled={active.status === "resolved"}
              >
                Mark as Resolved
              </button>
              <button
                type="button"
                className="bug-btn ghost"
                onClick={() => {
                  setDetailTab("comments");
                  setNotice("");
                }}
              >
                Add Comment
              </button>
              <label className="bug-btn ghost bug-attach">
                Attach File
                <input type="file" onChange={(e) => setNotice(e.target.files?.[0] ? `Attached ${e.target.files[0].name}` : "")} />
              </label>
            </footer>
          </article>
        </section>
      </div>
    </RequirePermission>
  );
}
