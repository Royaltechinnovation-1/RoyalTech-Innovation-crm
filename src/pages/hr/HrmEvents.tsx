import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { CrmStore } from "../../data/store";
import {
  useHrmStore,
  type HrmEvent,
  type HrmEventGuest,
} from "../../data/hrmStore";
import {
  activateMailAccount,
  fetchMailStatus,
  saveMailAccount,
  sendHrMail,
  testMailAccount,
  type MailAccountKind,
  type MailStatus,
} from "../../lib/mailApi";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function eventInviteBody(event: HrmEvent, guestName: string) {
  return [
    `Hi ${guestName || "there"},`,
    "",
    `You are invited to: ${event.title}`,
    `Type: ${event.type}`,
    `Date: ${event.date}`,
    `Time: ${event.time}`,
    `Location: ${event.location || "TBA"}`,
    "",
    event.description || "Please confirm your attendance.",
    "",
    "— RoyalTech HR",
  ].join("\n");
}

export function HrmEvents({ store }: { store: CrmStore }) {
  const hrm = useHrmStore();
  const [activeId, setActiveId] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [showMail, setShowMail] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [mail, setMail] = useState<MailStatus | null>(null);
  const [mailKind, setMailKind] = useState<MailAccountKind>("titan");
  const [mailForm, setMailForm] = useState({
    email: "",
    password: "",
    host: "",
    port: "465",
  });
  const [mailBusy, setMailBusy] = useState(false);

  const [form, setForm] = useState({
    title: "",
    type: "Meeting",
    date: new Date().toISOString().slice(0, 10),
    time: "10:00",
    location: "",
    description: "",
  });
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [employeePick, setEmployeePick] = useState("");
  const [sendAccount, setSendAccount] = useState<MailAccountKind>("titan");

  useEffect(() => {
    fetchMailStatus()
      .then((status) => {
        setMail(status);
        setMailKind(status.active);
        setSendAccount(status.active);
        const acc = status.accounts[status.active];
        setMailForm({
          email: acc?.email || "",
          password: "",
          host: acc?.host || status.presets[status.active].host,
          port: String(acc?.port || status.presets[status.active].port),
        });
      })
      .catch(() => {
        setNotice("Mail API offline — start the CRM server to connect Titan / Gmail.");
      });
  }, []);

  const events = Array.isArray(hrm.events) ? hrm.events : [];
  const firstEventId = events[0]?.id || "";

  useEffect(() => {
    if (!activeId && firstEventId) setActiveId(firstEventId);
  }, [activeId, firstEventId]);

  const active = useMemo(
    () => events.find((e) => e.id === activeId) || events[0] || null,
    [activeId, events],
  );

  const applyMailStatus = (status: MailStatus) => {
    setMail(status);
    setMailKind(status.active);
    setSendAccount(status.active);
    const acc = status.accounts[status.active];
    setMailForm((f) => ({
      ...f,
      email: acc?.email || f.email,
      host: acc?.host || f.host,
      port: String(acc?.port || f.port),
      password: "",
    }));
  };

  const switchMail = async (kind: MailAccountKind) => {
    setMailKind(kind);
    setSendAccount(kind);
    const preset = mail?.presets[kind];
    const acc = mail?.accounts[kind];
    setMailForm({
      email: acc?.email || "",
      password: "",
      host: acc?.host || preset?.host || (kind === "titan" ? "smtp.titan.email" : "smtp.gmail.com"),
      port: String(acc?.port || preset?.port || 465),
    });
    if (acc?.enabled) {
      try {
        const status = await activateMailAccount(kind);
        applyMailStatus(status);
      } catch {
        /* keep local selection */
      }
    }
  };

  const connectMail = async () => {
    setMailBusy(true);
    try {
      const status = await saveMailAccount(mailKind, {
        email: mailForm.email.trim(),
        password: mailForm.password,
        host: mailForm.host.trim() || undefined,
        port: Number(mailForm.port) || undefined,
        enabled: true,
        setActive: true,
      });
      applyMailStatus(status);
      const tested = await testMailAccount(mailKind);
      applyMailStatus(tested.mail);
      setNotice(tested.message || `${mailKind === "titan" ? "Titan" : "Gmail"} connected.`);
      setShowMail(false);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not connect mail");
    } finally {
      setMailBusy(false);
    }
  };

  const createEvent = (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setNotice("Event title is required.");
      return;
    }
    const id = `EV-${Date.now().toString(36)}`;
    hrm.actions.upsertEvent({
      id,
      title: form.title.trim(),
      type: form.type,
      date: form.date,
      time: form.time,
      location: form.location.trim(),
      description: form.description.trim(),
      guests: [],
    });
    setActiveId(id);
    setShowForm(false);
    setForm({
      title: "",
      type: "Meeting",
      date: new Date().toISOString().slice(0, 10),
      time: "10:00",
      location: "",
      description: "",
    });
    setNotice("Event created. Add guests and send email invites.");
  };

  const addGuest = () => {
    if (!active) return;
    let name = guestName.trim();
    let email = guestEmail.trim().toLowerCase();
    let employeeId: string | undefined;

    if (employeePick) {
      const emp = hrm.employees.find((x) => x.id === employeePick);
      if (emp) {
        name = emp.name;
        email = String(emp.companyEmail || emp.email || "").trim().toLowerCase();
        employeeId = emp.id;
      }
    }

    if (!email || !email.includes("@")) {
      setNotice("Add a valid guest email (or pick an employee with email on file).");
      return;
    }
    if (active.guests.some((g) => g.email.toLowerCase() === email)) {
      setNotice("That guest is already on this event.");
      return;
    }

    const guests: HrmEventGuest[] = [
      ...active.guests,
      { name: name || email.split("@")[0], email, employeeId, status: "pending" },
    ];
    hrm.actions.patchEventGuests(active.id, guests);
    setGuestEmail("");
    setGuestName("");
    setEmployeePick("");
    setNotice("Guest added.");
  };

  const removeGuest = (email: string) => {
    if (!active) return;
    hrm.actions.patchEventGuests(
      active.id,
      active.guests.filter((g) => g.email !== email),
    );
  };

  const sendInvites = async (onlyPending = true) => {
    if (!active) return;
    if (!mail?.connected) {
      setShowMail(true);
      setNotice("Connect Titan or Gmail first, then send invites.");
      return;
    }
    const targets = active.guests.filter((g) =>
      onlyPending ? g.status !== "sent" : true,
    );
    if (!targets.length) {
      setNotice("No guests to email. Add people first.");
      return;
    }

    setBusy(true);
    const nextGuests = [...active.guests];
    let sent = 0;
    let failed = 0;

    for (const guest of targets) {
      try {
        const result = await sendHrMail({
          to: guest.email,
          subject: `Invite: ${active.title} — ${active.date} ${active.time}`,
          text: eventInviteBody(active, guest.name),
          accountKind: sendAccount,
        });
        setMail(result.mail);
        const idx = nextGuests.findIndex((g) => g.email === guest.email);
        if (idx >= 0) {
          nextGuests[idx] = {
            ...nextGuests[idx],
            status: result.mailed ? "sent" : "pending",
            sentAt: new Date().toISOString(),
          };
        }
        if (result.mailed) sent += 1;
        else failed += 1;
      } catch {
        const idx = nextGuests.findIndex((g) => g.email === guest.email);
        if (idx >= 0) nextGuests[idx] = { ...nextGuests[idx], status: "failed" };
        failed += 1;
      }
    }

    hrm.actions.patchEventGuests(active.id, nextGuests, sendAccount);
    setBusy(false);
    setNotice(
      `Invites: ${sent} sent${failed ? `, ${failed} failed/queued` : ""} via ${sendAccount === "titan" ? "Titan" : "Gmail"}.`,
    );
  };

  return (
    <div className="page hrm-page hrm-events-page">
      <header className="hrm-page-head">
        <div>
          <p className="eyebrow">People ops · {store.currentUser.name}</p>
          <h2>Events & email invites</h2>
          <p className="muted">
            Create events anytime and email guests via Titan or Gmail.
          </p>
        </div>
        <div className="hrm-page-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowMail((v) => !v)}
          >
            {mail?.connected ? `Mail: ${mail.fromEmail}` : "Connect Titan / Gmail"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Close" : "+ New event"}
          </button>
        </div>
      </header>

      {notice ? (
        <div className="hrm-mail-banner" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")}>
            Dismiss
          </button>
        </div>
      ) : null}

      {showMail ? (
        <section className="ps-card hrm-mail-panel">
          <header>
            <h3>Connect Titan or Gmail</h3>
            <span>
              {mail?.connected
                ? `Active: ${mail.fromEmail}`
                : "Used to send event invites to any email"}
            </span>
          </header>
          <div className="hrm-mail-tabs">
            <button
              type="button"
              className={mailKind === "titan" ? "is-active" : ""}
              onClick={() => switchMail("titan")}
            >
              Titan Email
              {mail?.accounts?.titan?.enabled ? " · on" : ""}
            </button>
            <button
              type="button"
              className={mailKind === "personal" ? "is-active" : ""}
              onClick={() => switchMail("personal")}
            >
              Personal / Gmail
              {mail?.accounts?.personal?.enabled ? " · on" : ""}
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
              {mailBusy
                ? "Connecting…"
                : `Save & test ${mailKind === "titan" ? "Titan" : "Gmail"}`}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowMail(false)}>
              Done
            </button>
          </div>
          <p className="muted hrm-mail-hint">
            Titan: smtp.titan.email · 465. Gmail: use an App Password from Google Account →
            Security.
          </p>
        </section>
      ) : null}

      {showForm ? (
        <form className="ps-card hrm-event-form" onSubmit={createEvent}>
          <h3>New event</h3>
          <div className="hrm-event-form-grid">
            <label>
              Title
              <input
                className="field"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </label>
            <label>
              Type
              <select
                className="field"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option>Meeting</option>
                <option>Interview</option>
                <option>Onboarding</option>
                <option>Training</option>
                <option>Celebration</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Date
              <input
                className="field"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
            </label>
            <label>
              Time
              <input
                className="field"
                type="time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                required
              />
            </label>
            <label className="span-2">
              Location
              <input
                className="field"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Office / Zoom / address"
              />
            </label>
            <label className="span-2">
              Description
              <textarea
                className="field"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Agenda or notes for the invite email"
              />
            </label>
          </div>
          <div className="hrm-mail-actions">
            <button type="submit" className="btn btn-primary">
              Save event
            </button>
          </div>
        </form>
      ) : null}

      <div className="hrm-events-layout">
        <aside className="ps-card hrm-events-list">
          <header>
            <h3>Upcoming</h3>
            <span>{events.length}</span>
          </header>
          <ul>
            {events
              .slice()
              .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
              .map((ev) => (
                <li key={ev.id}>
                  <button
                    type="button"
                    className={active?.id === ev.id ? "is-active" : ""}
                    onClick={() => setActiveId(ev.id)}
                  >
                    <strong>{ev.title}</strong>
                    <small>
                      {ev.date} · {ev.time} · {ev.type}
                    </small>
                  </button>
                </li>
              ))}
            {events.length === 0 ? <li className="muted">No events yet.</li> : null}
          </ul>
        </aside>

        <section className="ps-card hrm-event-detail">
          {active ? (
            <>
              <header className="hrm-event-detail-head">
                <div>
                  <p className="eyebrow">{active.type}</p>
                  <h3>{active.title}</h3>
                  <p className="muted">
                    {active.date} at {active.time}
                    {active.location ? ` · ${active.location}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    hrm.actions.removeEvent(active.id);
                    setActiveId("");
                    setNotice("Event removed.");
                  }}
                >
                  Delete
                </button>
              </header>

              {active.description ? <p className="hrm-event-desc">{active.description}</p> : null}

              <div className="hrm-event-sendbar">
                <label>
                  Send via
                  <select
                    className="field"
                    value={sendAccount}
                    onChange={(e) => setSendAccount(e.target.value as MailAccountKind)}
                  >
                    <option value="titan">
                      Titan{mail?.accounts?.titan?.enabled ? "" : " (connect first)"}
                    </option>
                    <option value="personal">
                      Gmail / personal
                      {mail?.accounts?.personal?.enabled ? "" : " (connect first)"}
                    </option>
                  </select>
                </label>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || !active.guests.length}
                  onClick={() => sendInvites(true)}
                >
                  {busy ? "Sending…" : "Send invites"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy || !active.guests.length}
                  onClick={() => sendInvites(false)}
                >
                  Resend all
                </button>
              </div>

              <div className="hrm-event-add-guest">
                <h4>Add guest</h4>
                <div className="hrm-event-guest-grid">
                  <label>
                    From employees
                    <select
                      className="field"
                      value={employeePick}
                      onChange={(e) => setEmployeePick(e.target.value)}
                    >
                      <option value="">Select employee…</option>
                      {hrm.employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.companyEmail || emp.email || "no email"})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Or name
                    <input
                      className="field"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Guest name"
                      disabled={Boolean(employeePick)}
                    />
                  </label>
                  <label>
                    Or any email
                    <input
                      className="field"
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="name@example.com"
                      disabled={Boolean(employeePick)}
                    />
                  </label>
                  <button type="button" className="btn btn-secondary" onClick={addGuest}>
                    Add
                  </button>
                </div>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Guest</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {active.guests.map((g) => (
                      <tr key={g.email}>
                        <td>
                          <span className="hrm-event-guest-av">{initials(g.name)}</span> {g.name}
                        </td>
                        <td>{g.email}</td>
                        <td>
                          <span className={`hrm-event-status is-${g.status || "pending"}`}>
                            {g.status || "pending"}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => removeGuest(g.email)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {active.guests.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="muted">
                          No guests yet — add people, then send invites.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="muted">Create an event to get started.</p>
          )}
        </section>
      </div>
    </div>
  );
}
