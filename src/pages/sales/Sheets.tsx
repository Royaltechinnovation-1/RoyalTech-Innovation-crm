import { useEffect, useState, type FormEvent } from "react";
import type { CrmStore } from "../../data/store";
import type { LeadStatus } from "../../types";
import { formatCurrency, formatDateTime, leadStageLabels, pipelineStages } from "../../lib/format";
import {
  fetchSheetBridge,
  patchLeadStatus,
  runSheetSyncApi,
  saveSheetConfig,
  type ApiLead,
  type SheetBridgeData,
} from "../../lib/leadsApi";
import { Button, Field, Input, PageHeader, Panel, Select, Tag } from "../../components/ui";
import { RequirePermission } from "../../components/RequirePermission";

export function Sheets({ store }: { store: CrmStore }) {
  const [bridge, setBridge] = useState<SheetBridgeData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savingId, setSavingId] = useState("");

  const load = () => {
    fetchSheetBridge()
      .then((data) => {
        setBridge(data);
        setError("");
      })
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, []);

  const onSaveConfig = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const data = await saveSheetConfig({
        spreadsheetId: String(form.get("spreadsheetId") || ""),
        sheetName: String(form.get("sheetName") || "Leads"),
        enabled: true,
      });
      setBridge(data);
      store.updateSheetConfig({
        spreadsheetId: data.config.spreadsheetId,
        sheetName: data.config.sheetName,
        enabled: data.config.enabled,
        lastSyncedAt: data.config.lastSyncedAt ?? undefined,
      });
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save sheet config");
    } finally {
      setBusy(false);
    }
  };

  const onSync = async () => {
    setBusy(true);
    try {
      const data = await runSheetSyncApi();
      setBridge(data);
      store.runSheetSync();
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  };

  const onStatusChange = async (lead: ApiLead, status: LeadStatus) => {
    setSavingId(lead.id);
    try {
      const res = await patchLeadStatus(lead.id, status);
      setBridge((prev) =>
        prev
          ? {
              ...prev,
              leads: prev.leads.map((row) => (row.id === lead.id ? res.lead : row)),
            }
          : prev,
      );
      store.updateLeadStatus(lead.id, status);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setSavingId("");
    }
  };

  return (
    <RequirePermission store={store} permission="sales.sheets">
      <div className="page">
        <PageHeader
          eyebrow="Sales management"
          title="Google Sheets Integration"
          lede="Sales manager MySQL leads stay linked by unique lead ID. Change status here or in All Leads — sync pushes updates to the sheet bridge."
          actions={
            <>
              <Tag tone={bridge?.mode === "mysql" ? "sage" : "gold"}>
                {bridge?.mode === "mysql" ? "MySQL connected" : bridge?.mode || "Connecting…"}
              </Tag>
              <Button onClick={onSync} disabled={busy}>
                {busy ? "Syncing…" : "Run sync now"}
              </Button>
            </>
          }
        />

        {error ? (
          <div className="empty" style={{ marginBottom: 16 }}>
            <h3>Sheet bridge issue</h3>
            <p>{error}</p>
          </div>
        ) : null}

        <div className="split">
          <Panel title="Sheet connection">
            <form className="form" onSubmit={onSaveConfig}>
              <Field label="Spreadsheet ID">
                <Input
                  name="spreadsheetId"
                  defaultValue={bridge?.config.spreadsheetId || store.data.sheetConfig.spreadsheetId}
                  required
                />
              </Field>
              <Field label="Sheet name">
                <Input
                  name="sheetName"
                  defaultValue={bridge?.config.sheetName || store.data.sheetConfig.sheetName || "Leads"}
                  required
                />
              </Field>
              <p className="muted">
                Last synced:{" "}
                {bridge?.config.lastSyncedAt
                  ? formatDateTime(String(bridge.config.lastSyncedAt))
                  : store.data.sheetConfig.lastSyncedAt
                    ? formatDateTime(store.data.sheetConfig.lastSyncedAt)
                    : "Never"}
              </p>
              <div className="form-actions">
                <Button type="submit" variant="secondary" disabled={busy}>
                  Save connection
                </Button>
              </div>
            </form>
          </Panel>

          <Panel title="How sync works" dark>
            <div className="list">
              <div className="list-row">
                <div>
                  <p className="list-title">Unique lead IDs</p>
                  <p className="list-sub">RT-1001 style keys match sheet rows to MySQL CRM records.</p>
                </div>
              </div>
              <div className="list-row">
                <div>
                  <p className="list-title">Status changes</p>
                  <p className="list-sub">Edit status below or in All Leads — logged and linked to sheet rows.</p>
                </div>
              </div>
              <div className="list-row">
                <div>
                  <p className="list-title">Duplicate detection</p>
                  <p className="list-sub">Same email without matching ID is logged, not duplicated.</p>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <Panel title="Leads linked to sheet (change status)" action={<span className="muted">{bridge?.leads.length ?? 0} rows</span>}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Lead ID</th>
                  <th>Company</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Value</th>
                  <th>Sheet row</th>
                </tr>
              </thead>
              <tbody>
                {(bridge?.leads ?? []).map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <strong>{lead.leadId}</strong>
                      <div className="muted">{lead.name}</div>
                    </td>
                    <td>{lead.company}</td>
                    <td>{lead.ownerName}</td>
                    <td style={{ minWidth: 160 }}>
                      <Select
                        value={lead.status}
                        disabled={savingId === lead.id}
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
                    <td>
                      <Tag tone="sage">{lead.sheetRowId || `row_${lead.leadId}`}</Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="table-wrap" style={{ marginTop: 24 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Lead ID</th>
                <th>Status</th>
                <th>Message</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {(bridge?.logs ?? []).map((log) => (
                <tr key={log.id}>
                  <td>
                    <strong>{log.leadId}</strong>
                  </td>
                  <td>
                    <Tag
                      tone={
                        log.status === "success" || log.status === "updated"
                          ? "sage"
                          : log.status === "duplicate"
                            ? "gold"
                            : "danger"
                      }
                    >
                      {log.status}
                    </Tag>
                  </td>
                  <td>{log.message}</td>
                  <td>{formatDateTime(String(log.createdAt))}</td>
                </tr>
              ))}
              {!bridge?.logs?.length ? (
                <tr>
                  <td colSpan={4}>No sync logs yet. Save connection and run sync.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </RequirePermission>
  );
}
