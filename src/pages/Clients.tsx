import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { CrmStore } from "../data/store";
import { formatDate } from "../lib/format";
import { createClientApi, fetchClients, type ApiClient } from "../lib/clientsApi";
import { assignableOwners, scopeLabel, useRecordScope } from "../lib/teamScope";
import { TeamCrmBar } from "../components/TeamCrmBar";
import { Field, Input, Select } from "../components/ui";
import { RequirePermission } from "../components/RequirePermission";

const PAGE_SIZE = 6;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function avatarTone(id: string) {
  const tones = ["forest", "mint", "sky", "amber", "violet", "teal"];
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i) * (i + 1)) % tones.length;
  return tones[hash];
}

export function Clients({ store }: { store: CrmStore }) {
  const scope = useRecordScope(store);
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [mode, setMode] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [menuOpenId, setMenuOpenId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    accountManagerId: store.currentUser.id,
  });

  const load = () => {
    fetchClients({ managerId: scope.ownerId, teamManagerId: scope.teamManagerId })
      .then((res) => {
        setClients(res.clients);
        setMode(res.mode);
        setError("");
      })
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, [scope.ownerId, scope.teamManagerId, scope.focusOwnerId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.email, c.company, c.accountManagerName, c.phone, c.status]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [clients, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const from = filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(currentPage * PAGE_SIZE, filtered.length);

  const managers = assignableOwners(store);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await createClientApi({
        ...form,
        accountManagerId: form.accountManagerId || store.currentUser.id,
      });
      setClients((prev) => [res.client, ...prev]);
      setShowForm(false);
      setForm({
        name: "",
        company: "",
        email: "",
        phone: "",
        accountManagerId: store.currentUser.id,
      });
      setError("");
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add client");
    } finally {
      setSaving(false);
    }
  };

  return (
    <RequirePermission store={store} permission="clients">
      <div className="page cl-page">
        <TeamCrmBar store={store} />
        <header className="cl-header">
          <div>
            <p className="cl-eyebrow">
              <span className="cl-eyebrow-ico" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 9v-1c0-2.5 3.1-4 7-4s7 1.5 7 4v1"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              Lead & Client
            </p>
            <h2>Clients</h2>
            <p className="cl-lede">Won leads become clients in the same central database.</p>
          </div>
          <div className="cl-header-actions">
            <label className="cl-search">
              <span className="cl-search-ico" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="m21 21-4.3-4.3M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search clients…"
              />
            </label>
            <span className="cl-db ok">{scopeLabel(scope.mode, scope.focusOwnerId)}</span>
            <span className={`cl-db ${mode === "mysql" ? "ok" : ""}`}>
              {mode === "mysql" ? "MySQL connected" : mode || "Connecting…"}
            </span>
            <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
              + Add Client
            </button>
          </div>
        </header>

        {error ? (
          <div className="empty" style={{ marginBottom: 16 }}>
            <h3>Clients issue</h3>
            <p>{error}</p>
          </div>
        ) : null}

        <section className="cl-panel">
          <div className="cl-table-wrap">
            <table className="cl-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Company</th>
                  <th>Account Manager</th>
                  <th>Status</th>
                  <th>Since</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <div className="cl-identity">
                        <span className={`cl-avatar tone-${avatarTone(client.id)}`}>
                          {initials(client.name)}
                        </span>
                        <div>
                          <strong>{client.name}</strong>
                          <p>{client.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="cl-company">
                        <span className="cl-mini-ico" aria-hidden>
                          <svg viewBox="0 0 24 24" fill="none">
                            <path
                              d="M4 21V5a1 1 0 0 1 1-1h8v17M13 9h6a1 1 0 0 1 1 1v11M8 8h1M8 12h1M8 16h1M16 13h1M16 17h1"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                            />
                          </svg>
                        </span>
                        <span>{client.company}</span>
                      </div>
                    </td>
                    <td>
                      <div className="cl-manager">
                        <span className="cl-manager-avatar">{client.accountManagerInitials}</span>
                        <span>{client.accountManagerName}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`cl-status ${client.status}`}>
                        <i />
                        {client.status === "active" ? "Active" : client.status}
                      </span>
                    </td>
                    <td>
                      <div className="cl-since">
                        <span className="cl-mini-ico" aria-hidden>
                          <svg viewBox="0 0 24 24" fill="none">
                            <path
                              d="M8 7V3m8 4V3M4 11h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                            />
                          </svg>
                        </span>
                        <span>{formatDate(client.createdAt)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="cl-more-wrap">
                        <button
                          type="button"
                          className="cl-more"
                          aria-label={`More actions for ${client.name}`}
                          aria-expanded={menuOpenId === client.id}
                          onClick={() => setMenuOpenId((id) => (id === client.id ? "" : client.id))}
                        >
                          ⋯
                        </button>
                        {menuOpenId === client.id ? (
                          <div className="cl-menu" role="menu">
                            <a role="menuitem" href={`mailto:${client.email}`}>
                              Email client
                            </a>
                            <a role="menuitem" href={`tel:${client.phone}`}>
                              Call client
                            </a>
                            <button type="button" role="menuitem" onClick={() => setMenuOpenId("")}>
                              Close
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="cl-empty">
                      No clients found. Win a deal or add a client to populate this list.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <footer className="cl-pager">
            <p>
              Showing {from}–{to} of {filtered.length} clients
            </p>
            <div className="cl-pager-controls">
              <button
                type="button"
                aria-label="Previous page"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={n === currentPage ? "active" : undefined}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                aria-label="Next page"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                ›
              </button>
            </div>
          </footer>
        </section>

        {showForm ? (
          <div className="cl-modal-backdrop" role="presentation" onClick={() => setShowForm(false)}>
            <div
              className="cl-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-client-title"
              onClick={(e) => e.stopPropagation()}
            >
              <header>
                <h3 id="add-client-title">Add Client</h3>
                <button type="button" className="cl-more" onClick={() => setShowForm(false)} aria-label="Close">
                  ✕
                </button>
              </header>
              <form className="cl-form" onSubmit={onSubmit}>
                <Field label="Full name">
                  <Input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </Field>
                <Field label="Company">
                  <Input
                    required
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  />
                </Field>
                <Field label="Email">
                  <Input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </Field>
                <Field label="Account manager">
                  <Select
                    value={form.accountManagerId}
                    onChange={(e) => setForm((f) => ({ ...f, accountManagerId: e.target.value }))}
                  >
                    {managers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="cl-form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Saving…" : "Save client"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </RequirePermission>
  );
}
