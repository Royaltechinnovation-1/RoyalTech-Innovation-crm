import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { CrmStore } from "../data/store";
import { formatCurrency, formatDate } from "../lib/format";
import { fetchLeads, type ApiLead } from "../lib/leadsApi";
import {
  createProposalApi,
  fetchProposals,
  patchProposalStatus,
  sendProposalMailApi,
  type ApiProposal,
  type ProposalStatus,
  type ProposalsPayload,
} from "../lib/proposalsApi";
import { useRecordScope } from "../lib/teamScope";
import { TeamCrmBar } from "../components/TeamCrmBar";
import { Field, Input, Select, Textarea } from "../components/ui";
import { RequirePermission } from "../components/RequirePermission";

const PAGE_SIZE = 5;

function statusLabel(status: string) {
  return status.toUpperCase();
}

function defaultMailBody(proposal: ApiProposal) {
  return `Dear ${proposal.leadName},

Please find our proposal ${proposal.code}: ${proposal.title}.

Company: ${proposal.leadCompany}
Amount: ${formatCurrency(proposal.amount)}
Valid until: ${proposal.validUntil ? formatDate(proposal.validUntil) : "—"}

${proposal.body || "We look forward to partnering with you."}

Regards,
RoyalTech Sales`;
}

export function Proposals({ store }: { store: CrmStore }) {
  const scope = useRecordScope(store);
  const [data, setData] = useState<ProposalsPayload | null>(null);
  const [leads, setLeads] = useState<ApiLead[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [menuOpenId, setMenuOpenId] = useState("");
  const [reviewId, setReviewId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mailForm, setMailForm] = useState({ to: "", subject: "", message: "" });
  const [createForm, setCreateForm] = useState({
    title: "",
    leadId: "",
    amount: "",
    validUntil: "",
    body: "",
  });

  const load = () => {
    Promise.all([
      fetchProposals(),
      fetchLeads({ ownerId: scope.ownerId, teamManagerId: scope.teamManagerId }).catch(
        () => ({ leads: [] as ApiLead[] }),
      ),
    ])
      .then(([pack, leadPack]) => {
        setData(pack);
        setLeads(leadPack.leads || []);
        setError("");
      })
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, [scope.ownerId, scope.teamManagerId, scope.focusOwnerId]);

  const proposals = useMemo(() => {
    const all = data?.proposals ?? [];
    if (scope.mode === "all") return all;
    const allowedLeads = new Set(leads.map((l) => l.id));
    if (!allowedLeads.size) return all.filter((p) => scope.ownerIds.includes(p.leadId));
    return all.filter((p) => allowedLeads.has(p.leadId));
  }, [data?.proposals, leads, scope.mode, scope.ownerIds]);
  const summary = useMemo(() => {
    if (scope.mode === "all" && data?.summary) return data.summary;
    const accepted = proposals.filter((p) => p.status === "accepted");
    const pending = proposals.filter((p) => p.status === "pending" || p.status === "sent");
    return {
      total: proposals.length,
      totalValue: proposals.reduce((s, p) => s + p.amount, 0),
      accepted: accepted.length,
      pending: pending.length,
      draft: proposals.filter((p) => p.status === "draft").length,
      rejected: proposals.filter((p) => p.status === "rejected").length,
    };
  }, [data?.summary, proposals, scope.mode]);
  const mail = data?.mail;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return proposals.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      return [p.title, p.code, p.leadCode, p.leadCompany, p.leadName, p.status]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [proposals, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const from = filtered.length ? (currentPage - 1) * pageSize + 1 : 0;
  const to = Math.min(currentPage * pageSize, filtered.length);

  const review = proposals.find((p) => p.id === reviewId) ?? null;

  const openReview = (proposal: ApiProposal) => {
    setReviewId(proposal.id);
    setMenuOpenId("");
    setNotice("");
    setMailForm({
      to: proposal.leadEmail || "",
      subject: `${proposal.title} (${proposal.code})`,
      message: defaultMailBody(proposal),
    });
  };

  const onSendMail = async (e: FormEvent) => {
    e.preventDefault();
    if (!review) return;
    setSaving(true);
    try {
      const res = await sendProposalMailApi(review.id, mailForm);
      setData((prev) =>
        prev
          ? {
              ...prev,
              mail: res.mail,
              proposals: prev.proposals.map((p) => (p.id === res.proposal.id ? res.proposal : p)),
              summary: {
                ...prev.summary,
                pending: prev.proposals.filter((p) => {
                  const status = p.id === res.proposal.id ? res.proposal.status : p.status;
                  return status === "pending" || status === "sent";
                }).length,
                draft: prev.proposals.filter((p) => {
                  const status = p.id === res.proposal.id ? res.proposal.status : p.status;
                  return status === "draft";
                }).length,
              },
            }
          : prev,
      );
      setNotice(
        res.mailed
          ? `Sent to ${res.log.to}`
          : `Queued for ${res.log.to}. Connect mail later to deliver automatically.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send proposal");
    } finally {
      setSaving(false);
    }
  };

  const onStatus = async (id: string, status: ProposalStatus) => {
    try {
      const res = await patchProposalStatus(id, status);
      setData((prev) =>
        prev
          ? {
              ...prev,
              proposals: prev.proposals.map((p) => (p.id === id ? res.proposal : p)),
            }
          : prev,
      );
      setMenuOpenId("");
      setNotice(`Marked ${res.proposal.code} as ${res.proposal.status}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await createProposalApi({
        title: createForm.title,
        leadId: createForm.leadId,
        amount: Number(createForm.amount),
        validUntil: createForm.validUntil || undefined,
        body: createForm.body || undefined,
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              proposals: [res.proposal, ...prev.proposals],
              summary: {
                ...prev.summary,
                total: prev.summary.total + 1,
                totalValue: prev.summary.totalValue + res.proposal.amount,
                draft: prev.summary.draft + 1,
              },
            }
          : prev,
      );
      setShowCreate(false);
      setCreateForm({ title: "", leadId: "", amount: "", validUntil: "", body: "" });
      openReview(res.proposal);
      setNotice("Proposal created — review and send by email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create proposal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <RequirePermission store={store} permission="proposals">
      <div className="page pr-page">
        <TeamCrmBar store={store} />
        <header className="pr-header">
          <div>
            <h2>Proposals & Quotations</h2>
            <p>Linked to leads by ID — review here and send by email when mail is connected.</p>
          </div>
          <div className="pr-header-actions">
            <label className="pr-filter">
              Status
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <label className="pr-date">
              Period
              <input type="text" readOnly defaultValue="Oct 1, 2026 – Oct 31, 2026" />
            </label>
            <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + Create Proposal
            </button>
          </div>
        </header>

        <section className="pr-toolbar">
          <label className="pr-search">
            <span className="sr-only">Search proposals</span>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search proposals, clients, or leads…"
            />
          </label>
          <span className={`pr-mail-badge ${mail?.connected ? "ok" : ""}`}>
            {mail?.connected ? "Mail connected" : "Mail not connected yet"}
          </span>
          <span className={`pr-db ${data?.mode === "mysql" ? "ok" : ""}`}>
            {data?.mode === "mysql" ? "MySQL connected" : data?.mode || "Connecting…"}
          </span>
        </section>

        {error ? (
          <div className="empty" style={{ marginBottom: 16 }}>
            <h3>Proposals issue</h3>
            <p>{error}</p>
          </div>
        ) : null}
        {notice ? <p className="pr-notice">{notice}</p> : null}

        <section className="pr-kpis" aria-label="Proposal summary">
          <article className="pr-kpi">
            <p>Total Proposals</p>
            <h3>{summary?.total ?? 0}</h3>
            <span className="up">Book size</span>
          </article>
          <article className="pr-kpi">
            <p>Total Value</p>
            <h3>{formatCurrency(summary?.totalValue ?? 0)}</h3>
            <span className="up">Pipeline quotes</span>
          </article>
          <article className="pr-kpi">
            <p>Accepted</p>
            <h3>{summary?.accepted ?? 0}</h3>
            <span className="up">Won proposals</span>
          </article>
          <article className="pr-kpi">
            <p>Pending</p>
            <h3>{summary?.pending ?? 0}</h3>
            <span className="down">Awaiting reply</span>
          </article>
        </section>

        <section className="pr-layout">
          <div className="pr-panel">
            <header className="pr-panel-head">
              <h3>All Proposals</h3>
              <span>{filtered.length} shown</span>
            </header>
            <div className="pr-table-wrap">
              <table className="pr-table">
                <thead>
                  <tr>
                    <th>Proposal</th>
                    <th>Client</th>
                    <th>Lead</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Valid Until</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((proposal) => (
                    <tr key={proposal.id} className={reviewId === proposal.id ? "active" : undefined}>
                      <td>
                        <button type="button" className="pr-title-btn" onClick={() => openReview(proposal)}>
                          <strong>{proposal.title}</strong>
                          <span>{proposal.code}</span>
                        </button>
                      </td>
                      <td>{proposal.leadCompany}</td>
                      <td>
                        {proposal.leadCode} · {proposal.leadName}
                      </td>
                      <td>{formatCurrency(proposal.amount)}</td>
                      <td>
                        <span className={`pr-status ${proposal.status}`}>{statusLabel(proposal.status)}</span>
                      </td>
                      <td>{proposal.validUntil ? formatDate(proposal.validUntil) : "—"}</td>
                      <td>
                        <div className="pr-more-wrap">
                          <button
                            type="button"
                            className="pr-more"
                            aria-label={`Actions for ${proposal.code}`}
                            onClick={() => setMenuOpenId((id) => (id === proposal.id ? "" : proposal.id))}
                          >
                            ⋯
                          </button>
                          {menuOpenId === proposal.id ? (
                            <div className="pr-menu" role="menu">
                              <button type="button" role="menuitem" onClick={() => openReview(proposal)}>
                                Review & send mail
                              </button>
                              <button type="button" role="menuitem" onClick={() => onStatus(proposal.id, "accepted")}>
                                Mark accepted
                              </button>
                              <button type="button" role="menuitem" onClick={() => onStatus(proposal.id, "rejected")}>
                                Mark rejected
                              </button>
                              <button type="button" role="menuitem" onClick={() => onStatus(proposal.id, "pending")}>
                                Mark pending
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="pr-empty">
                        No proposals found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <footer className="pr-pager">
              <p>
                {from}-{to} of {filtered.length} proposals
              </p>
              <div className="pr-pager-right">
                <label>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    <option value={5}>5 / page</option>
                    <option value={8}>8 / page</option>
                    <option value={12}>12 / page</option>
                  </select>
                </label>
                <div className="pr-pages">
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
                </div>
              </div>
            </footer>
          </div>

          <aside className="pr-review">
            {review ? (
              <>
                <header>
                  <div>
                    <p className="pr-review-kicker">Review proposal</p>
                    <h3>{review.title}</h3>
                    <p>
                      {review.code} · {review.leadCode} · {review.leadCompany}
                    </p>
                  </div>
                  <span className={`pr-status ${review.status}`}>{statusLabel(review.status)}</span>
                </header>

                <dl className="pr-review-meta">
                  <div>
                    <dt>Amount</dt>
                    <dd>{formatCurrency(review.amount)}</dd>
                  </div>
                  <div>
                    <dt>Valid until</dt>
                    <dd>{review.validUntil ? formatDate(review.validUntil) : "—"}</dd>
                  </div>
                  <div>
                    <dt>Contact</dt>
                    <dd>
                      {review.leadName}
                      <br />
                      {review.leadEmail || "No email on lead"}
                    </dd>
                  </div>
                </dl>

                <div className="pr-body-box">
                  <h4>Proposal summary</h4>
                  <p>{review.body || "No summary added."}</p>
                </div>

                <form className="pr-mail-form" onSubmit={onSendMail}>
                  <h4>Send by email</h4>
                  <p className="pr-mail-hint">
                    {mail?.connected
                      ? `From ${mail.fromEmail || "CRM mail"}`
                      : "Mail not connected yet — send will queue this message until you connect SMTP."}
                  </p>
                  <Field label="To">
                    <Input
                      required
                      type="email"
                      value={mailForm.to}
                      onChange={(e) => setMailForm((f) => ({ ...f, to: e.target.value }))}
                    />
                  </Field>
                  <Field label="Subject">
                    <Input
                      required
                      value={mailForm.subject}
                      onChange={(e) => setMailForm((f) => ({ ...f, subject: e.target.value }))}
                    />
                  </Field>
                  <Field label="Message">
                    <Textarea
                      required
                      rows={8}
                      value={mailForm.message}
                      onChange={(e) => setMailForm((f) => ({ ...f, message: e.target.value }))}
                    />
                  </Field>
                  <div className="pr-mail-actions">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? "Sending…" : mail?.connected ? "Send email" : "Queue & mark sent"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="pr-review-empty">
                <h3>Review & send</h3>
                <p>Select a proposal to preview the quote and email it to the linked lead.</p>
              </div>
            )}
          </aside>
        </section>

        {showCreate ? (
          <div className="pr-modal-backdrop" role="presentation" onClick={() => setShowCreate(false)}>
            <div
              className="pr-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-proposal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <header>
                <h3 id="create-proposal-title">Create Proposal</h3>
                <button type="button" className="pr-more" onClick={() => setShowCreate(false)} aria-label="Close">
                  ✕
                </button>
              </header>
              <form className="pr-create-form" onSubmit={onCreate}>
                <Field label="Title">
                  <Input
                    required
                    value={createForm.title}
                    onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </Field>
                <Field label="Linked lead">
                  <Select
                    required
                    value={createForm.leadId}
                    onChange={(e) => setCreateForm((f) => ({ ...f, leadId: e.target.value }))}
                  >
                    <option value="">Select lead</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.leadId} · {lead.company} · {lead.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Amount">
                  <Input
                    required
                    type="number"
                    min="1"
                    value={createForm.amount}
                    onChange={(e) => setCreateForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </Field>
                <Field label="Valid until">
                  <Input
                    type="date"
                    value={createForm.validUntil}
                    onChange={(e) => setCreateForm((f) => ({ ...f, validUntil: e.target.value }))}
                  />
                </Field>
                <Field label="Summary">
                  <Textarea
                    rows={4}
                    value={createForm.body}
                    onChange={(e) => setCreateForm((f) => ({ ...f, body: e.target.value }))}
                  />
                </Field>
                <div className="pr-mail-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Creating…" : "Create"}
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
