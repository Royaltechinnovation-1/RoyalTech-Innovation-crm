import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CrmStore } from "../../data/store";
import type { ProjectTask } from "../../types";
import { formatDate } from "../../lib/format";
import { RequirePermission } from "../../components/RequirePermission";

type CalView = "month" | "week" | "day";
type EventTone = "cyan" | "green" | "amber" | "violet";
type CalEvent = {
  id: string;
  date: string;
  title: string;
  time?: string;
  tone: EventTone;
  kind: "meeting" | "deadline" | "task" | "report";
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function toneForTask(task: ProjectTask): EventTone {
  if (task.status === "blocked" || /bug|fix|critical/i.test(task.title)) return "amber";
  if (task.status === "doing" || /api|deploy|docs/i.test(task.title)) return "green";
  if (/review|launch|client|feature/i.test(task.title)) return "violet";
  return "cyan";
}

function priorityFor(task: ProjectTask): "High" | "Medium" | "Low" {
  if (task.status === "blocked" || /bug|critical|auth|payment/i.test(task.title)) return "High";
  if (task.status === "doing" || /api|dashboard/i.test(task.title)) return "Medium";
  return "Low";
}

function buildMonthCells(cursor: Date) {
  const first = startOfMonth(cursor);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const cells: { date: Date; inMonth: boolean; key: string }[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    cells.push({
      date,
      inMonth: date.getMonth() === cursor.getMonth(),
      key: ymd(date),
    });
  }
  return cells;
}

export function DeveloperCalendar({ store }: { store: CrmStore }) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }, []);
  const [cursor, setCursor] = useState(() => startOfMonth(today));
  const [view, setView] = useState<CalView>("month");
  const todayKey = ymd(today);

  const seeded: CalEvent[] = useMemo(
    () => [
      {
        id: "e1",
        date: "2026-11-11",
        title: "Team Sync",
        time: "10:00 AM",
        tone: "cyan",
        kind: "meeting",
      },
      {
        id: "e2",
        date: "2026-11-12",
        title: "Update API",
        time: "Deadline: EOD",
        tone: "green",
        kind: "deadline",
      },
      {
        id: "e3",
        date: "2026-11-12",
        title: "Fix UI Bugs",
        time: "Priority: High",
        tone: "amber",
        kind: "task",
      },
      {
        id: "e4",
        date: "2026-11-13",
        title: "Submit Report",
        time: "EOD",
        tone: "green",
        kind: "report",
      },
      {
        id: "e5",
        date: "2026-11-14",
        title: "Project Review",
        time: "11:00 AM",
        tone: "cyan",
        kind: "meeting",
      },
      {
        id: "e6",
        date: "2026-11-15",
        title: "Feature Launch",
        time: "10:00 AM",
        tone: "violet",
        kind: "meeting",
      },
      {
        id: "e7",
        date: "2026-11-18",
        title: "Team Meeting",
        time: "11:00 AM",
        tone: "amber",
        kind: "meeting",
      },
      {
        id: "e8",
        date: "2026-11-20",
        title: "Deploy Update",
        time: "2:00 PM",
        tone: "green",
        kind: "deadline",
      },
      {
        id: "e9",
        date: "2026-11-22",
        title: "Client Call",
        time: "4:00 PM",
        tone: "violet",
        kind: "meeting",
      },
    ],
    [],
  );

  const taskEvents: CalEvent[] = useMemo(
    () =>
      store.visibleTasks.map((t) => ({
        id: `t-${t.id}`,
        date: String(t.dueDate).slice(0, 10),
        title: t.title,
        time: t.status === "done" ? "Done" : "Due",
        tone: toneForTask(t),
        kind: "task" as const,
      })),
    [store.visibleTasks],
  );

  const events = useMemo(() => {
    const map = new Map<string, CalEvent>();
    [...seeded, ...taskEvents].forEach((e) => {
      if (!map.has(e.id)) map.set(e.id, e);
    });
    return [...map.values()];
  }, [seeded, taskEvents]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    events.forEach((e) => {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    });
    return map;
  }, [events]);

  const cells = useMemo(() => buildMonthCells(cursor), [cursor]);

  const upcoming = useMemo(
    () =>
      events
        .filter((e) => e.date >= todayKey)
        .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
        .slice(0, 5),
    [events, todayKey],
  );

  const deadlines = useMemo(
    () =>
      [...store.visibleTasks]
        .filter((t) => t.status !== "done")
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 5),
    [store.visibleTasks],
  );

  const weekStart = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay());
    d.setHours(12, 0, 0, 0);
    return d;
  }, [today]);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  const dayEvents = eventsByDay.get(todayKey) ?? [];

  return (
    <RequirePermission store={store} permission="projects">
      <div className="page cal-page">
        <section className="cal-hero">
          <div className="cal-hero-copy">
            <h2>
              <span className="cal-title-ico" aria-hidden>
                <svg viewBox="0 0 24 24">
                  <rect
                    x="4.5"
                    y="5"
                    width="15"
                    height="15"
                    rx="2.4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.1"
                  />
                  <path
                    d="M8 3.6v2.6M16 3.6v2.6M4.5 10h15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8.2 13.2h3.2M8.2 16.2h7.2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              Calendar
            </h2>
            <p>View your tasks, meetings and important deadlines</p>
          </div>
        </section>

        <section className="cal-layout">
          <div className="cal-main">
            <header className="cal-toolbar">
              <div className="cal-view-tabs" role="tablist" aria-label="Calendar view">
                {(["month", "week", "day"] as CalView[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="tab"
                    aria-selected={view === v}
                    className={view === v ? "is-active" : undefined}
                    onClick={() => setView(v)}
                  >
                    {v[0].toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
              <div className="cal-nav">
                <button
                  type="button"
                  className="cal-nav-btn"
                  aria-label="Previous month"
                  onClick={() => setCursor((c) => addMonths(c, -1))}
                >
                  ‹
                </button>
                <span className="cal-month-label">
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <rect
                      x="4.5"
                      y="5"
                      width="15"
                      height="15"
                      rx="2.2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M8 3.6v2.4M16 3.6v2.4M4.5 10h15"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  {monthLabel(cursor)}
                </span>
                <button
                  type="button"
                  className="cal-nav-btn"
                  aria-label="Next month"
                  onClick={() => setCursor((c) => addMonths(c, 1))}
                >
                  ›
                </button>
                <button
                  type="button"
                  className="cal-today-btn"
                  onClick={() => setCursor(startOfMonth(today))}
                >
                  Today
                </button>
              </div>
            </header>

            {view === "month" ? (
              <article className="cal-card cal-month">
                <div className="cal-weekdays">
                  {WEEKDAYS.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div className="cal-days">
                  {cells.map((cell) => {
                    const key = cell.key;
                    const dayEventsList = eventsByDay.get(key) ?? [];
                    const isToday = key === todayKey;
                    return (
                      <div
                        key={key}
                        className={`cal-day${cell.inMonth ? "" : " is-muted"}${isToday ? " is-today" : ""}`}
                      >
                        <span className="cal-day-num">{cell.date.getDate()}</span>
                        <div className="cal-day-events">
                          {dayEventsList.slice(0, 3).map((ev) => (
                            <span key={ev.id} className={`cal-chip tone-${ev.tone}`} title={ev.title}>
                              {ev.title}
                              {ev.time ? ` ${ev.time}` : ""}
                            </span>
                          ))}
                          {dayEventsList.length > 3 ? (
                            <span className="cal-more">+{dayEventsList.length - 3} more</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            ) : null}

            {view === "week" ? (
              <article className="cal-card cal-week">
                {weekDays.map((d) => {
                  const key = ymd(d);
                  const list = eventsByDay.get(key) ?? [];
                  return (
                    <div key={key} className={`cal-week-col${key === todayKey ? " is-today" : ""}`}>
                      <header>
                        <strong>{WEEKDAYS[d.getDay()]}</strong>
                        <span>{d.getDate()}</span>
                      </header>
                      <div className="cal-week-events">
                        {list.length === 0 ? <p className="cal-empty">No events</p> : null}
                        {list.map((ev) => (
                          <span key={ev.id} className={`cal-chip tone-${ev.tone}`}>
                            {ev.title}
                            {ev.time ? ` · ${ev.time}` : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </article>
            ) : null}

            {view === "day" ? (
              <article className="cal-card cal-day-view">
                <header className="cal-day-view-head">
                  <h3>
                    {today.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </h3>
                </header>
                <div className="cal-day-view-list">
                  {dayEvents.length === 0 ? <p className="cal-empty">No events scheduled for today.</p> : null}
                  {dayEvents.map((ev) => (
                    <div key={ev.id} className={`cal-day-item tone-${ev.tone}`}>
                      <strong>{ev.title}</strong>
                      <span>{ev.time || "All day"}</span>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}
          </div>

          <aside className="cal-side">
            <article className="cal-card">
              <header className="cal-side-head">
                <h3>Upcoming Events</h3>
                <Link to="/dev/calendar">View All →</Link>
              </header>
              <ul className="cal-side-list">
                {upcoming.map((ev) => (
                  <li key={ev.id}>
                    <span className={`cal-side-ico tone-${ev.tone}`} aria-hidden>
                      {ev.kind === "meeting" ? (
                        <svg viewBox="0 0 24 24">
                          <path
                            d="M4.5 8.5h11v9.2a1.8 1.8 0 0 1-1.8 1.8H6.3a1.8 1.8 0 0 1-1.8-1.8V8.5Z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <path
                            d="M15.5 11.2 19.5 8.8v8.6l-4-2.4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : ev.kind === "report" ? (
                        <svg viewBox="0 0 24 24">
                          <path
                            d="M7 4.5h7.2L19 9.3v10.2a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19.5v-13A2 2 0 0 1 7 4.5Z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <path d="M14 4.8v4.5h4.5" fill="none" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24">
                          <circle cx="9" cy="9" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
                          <circle cx="16" cy="10.5" r="2.6" fill="none" stroke="currentColor" strokeWidth="2" />
                          <path
                            d="M4.5 18.5c.8-2.4 2.6-3.6 4.5-3.6s3.7 1.2 4.5 3.6M13.2 18.5c.5-1.6 1.7-2.5 3-2.5 1.1 0 2 .6 2.6 1.7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                    </span>
                    <div>
                      <strong>{ev.title}</strong>
                      <small>
                        {formatDate(ev.date)}
                        {ev.time ? ` · ${ev.time}` : ""}
                      </small>
                    </div>
                  </li>
                ))}
                {upcoming.length === 0 ? <li className="cal-empty">No upcoming events.</li> : null}
              </ul>
            </article>

            <article className="cal-card">
              <header className="cal-side-head">
                <h3>Task Deadlines</h3>
                <Link to="/projects/tasks">View All →</Link>
              </header>
              <ul className="cal-deadline-list">
                {deadlines.map((task) => {
                  const priority = priorityFor(task);
                  return (
                    <li key={task.id}>
                      <div>
                        <strong>{task.title}</strong>
                        <small>{formatDate(task.dueDate)}</small>
                      </div>
                      <span className={`cal-priority tone-${priority.toLowerCase()}`}>{priority}</span>
                    </li>
                  );
                })}
                {deadlines.length === 0 ? <li className="cal-empty">No open deadlines.</li> : null}
              </ul>
            </article>
          </aside>
        </section>
      </div>
    </RequirePermission>
  );
}
