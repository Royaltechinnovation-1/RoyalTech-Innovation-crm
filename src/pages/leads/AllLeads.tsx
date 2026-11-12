import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { CrmStore } from "../../data/store";
import type { LeadStatus } from "../../types";
import { formatCurrency, formatDate, leadStageLabels, pipelineStages } from "../../lib/format";
import { fetchLeads, patchLeadOwner, patchLeadStatus, type ApiLead } from "../../lib/leadsApi";
import { assignableOwners, scopeLabel, useRecordScope } from "../../lib/teamScope";
import { TeamCrmBar } from "../../components/TeamCrmBar";
import { PageHeader, Select, Tag } from "../../components/ui";
import { RequirePermission } from "../../components/RequirePermission";

export function AllLeads({ store }: { store: CrmStore }) {
  const scope = useRecordScope(store);
  const owners = assignableOwners(store);
  const canReassign = store.role === "sales_manager" || store.role === "founder";
  const [leads, setLeads] = useState<ApiLead[]>([]);
  const [mode, setMode] = useState("");
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");

  const load = () => {
    fetchLeads({ ownerId: scope.ownerId, teamManagerId: scope.teamManagerId })
      .then((res) => {
        setLeads(res.leads);
        setMode(res.mode);
        setError("");
      })
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, [scope.ownerId, scope.teamManagerId, scope.focusOwnerId, scope.mode]);

  const onStatusChange = async (lead: ApiLead, status: LeadStatus) => {
    setSavingId(lead.id);
    try {
      const res = await patchLeadStatus(lead.id, status);
      setLeads((prev) => prev.map((row) => (row.id === lead.id ? res.lead : row)));
      store.updateLeadStatus(lead.id, status);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSavingId("");
    }
  };

  const onOwnerChange = async (lead: ApiLead, ownerId: string) => {
    if (ownerId === lead.ownerId) return;
    setSavingId(lead.id);
    try {
      const res = await patchLeadOwner(lead.id, ownerId);
      setLeads((prev) => prev.map((row) => (row.id === lead.id ? res.lead : row)));
      store.updateLead(lead.id, { ownerId });
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reassign owner");
    } finally {
      setSavingId("");
    }
  };

  return (
    <RequirePermission store={store} permission="leads">
      <div className="page">
        <PageHeader
          eyebrow="Lead & client"
          title="All Leads"
          lede={
            scope.focusOwnerId
              ? "Managing this employee's lead book — update status or reassign owners anytime."
              : scope.mode === "self"
                ? "Your assigned leads. Change status anytime — updates sync to the sheet bridge."
                : scope.mode === "team"
                  ? "Leads for you and your sales employees. Update status or switch into one employee CRM."
                  : "Company-wide leads. Managers can see and update every record."
          }
          actions={
            <>
              <Tag tone="mist">{scopeLabel(scope.mode, scope.focusOwnerId)}</Tag>
              <Tag tone={mode === "mysql" ? "sage" : "gold"}>
                {mode === "mysql" ? "MySQL connected" : mode || "Connecting…"}
              </Tag>
              {store.allow("leads.write") ? (
                <Link className="btn btn-primary" to="/leads/new">
                  Add New Lead
                </Link>
              ) : null}
            </>
          }
        />

        <TeamCrmBar store={store} />

        {error ? (
          <div className="empty" style={{ marginBottom: 16 }}>
            <h3>Lead update issue</h3>
            <p>{error}</p>
          </div>
        ) : null}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Lead ID</th>
                <th>Company</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Value</th>
                <th>Follow-up</th>
                <th>Source</th>
                <th>Sheet row</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <strong>{lead.leadId}</strong>
                    <div className="muted">{lead.name}</div>
                  </td>
                  <td>{lead.company}</td>
                  <td style={{ minWidth: 150 }}>
                    {canReassign ? (
                      <Select
                        value={lead.ownerId}
                        disabled={savingId === lead.id}
                        aria-label={`Change owner for ${lead.company}`}
                        onChange={(e) => onOwnerChange(lead, e.target.value)}
                      >
                        {owners.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      lead.ownerName
                    )}
                  </td>
                  <td style={{ minWidth: 160 }}>
                    <Select
                      value={lead.status}
                      disabled={savingId === lead.id || !store.allow("pipeline")}
                      aria-label={`Change status for ${lead.company}`}
                      onChange={(e) => onStatusChange(lead, e.target.value as LeadStatus)}
                    >
                      {pipelineStages.map((stage) => (
                        <option key={stage} value={stage}>
                          {leadStageLabels[stage]}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td>{formatCurrency(lead.value)}</td>
                  <td>{lead.nextFollowUp ? formatDate(String(lead.nextFollowUp)) : "—"}</td>
                  <td>{lead.source}</td>
                  <td>
                    <Tag tone={lead.sheetRowId ? "sage" : "mist"}>
                      {lead.sheetRowId || "Not linked"}
                    </Tag>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && !error ? (
                <tr>
                  <td colSpan={8}>No leads in this CRM view.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </RequirePermission>
  );
}
