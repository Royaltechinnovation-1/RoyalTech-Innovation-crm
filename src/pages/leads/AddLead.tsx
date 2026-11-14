import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { CrmStore } from "../../data/store";
import type { LeadStatus } from "../../types";
import { assignableOwners, useRecordScope } from "../../lib/teamScope";
import { TeamCrmBar } from "../../components/TeamCrmBar";
import { Button, Field, Input, PageHeader, Select, Textarea } from "../../components/ui";
import { RequirePermission } from "../../components/RequirePermission";

export function AddLead({ store }: { store: CrmStore }) {
  const navigate = useNavigate();
  const scope = useRecordScope(store);
  const owners = useMemo(() => assignableOwners(store), [store]);
  const defaultOwner =
    scope.focusOwnerId && owners.some((u) => u.id === scope.focusOwnerId)
      ? scope.focusOwnerId
      : store.currentUser.id;
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    source: "Website",
    status: "new" as LeadStatus,
    value: "",
    notes: "",
    nextFollowUp: "",
    ownerId: defaultOwner,
  });

  useEffect(() => {
    setForm((prev) => ({ ...prev, ownerId: defaultOwner }));
  }, [defaultOwner]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    store.addLead({
      name: form.name,
      company: form.company,
      email: form.email,
      phone: form.phone,
      source: form.source,
      status: form.status,
      value: Number(form.value) || 0,
      notes: form.notes,
      nextFollowUp: form.nextFollowUp || undefined,
      ownerId: form.ownerId,
    });
    navigate("/leads");
  }

  return (
    <RequirePermission store={store} permission="leads.write">
      <div className="page">
        <PageHeader
          eyebrow="Lead & client"
          title="Add New Lead"
          lede={
            scope.focusOwnerId
              ? "Creates a lead in the selected employee's CRM book."
              : "Creates a unique lead ID in the central database."
          }
        />
        <TeamCrmBar store={store} />
        <form className="form panel" onSubmit={onSubmit}>
          <div className="form-grid">
            <Field label="Name">
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Company">
              <Input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Source">
              <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                <option>Website</option>
                <option>Google Sheet</option>
                <option>Referral</option>
                <option>Cold outreach</option>
              </Select>
            </Field>
            <Field label="Value (USD)">
              <Input type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </Field>
            <Field label="Owner">
              <Select
                value={form.ownerId}
                onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
                disabled={store.role === "sales_executive"}
              >
                {owners.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Follow-up date">
              <Input type="date" value={form.nextFollowUp} onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })} />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => navigate("/leads")}>
              Cancel
            </Button>
            <Button type="submit">Create lead</Button>
          </div>
        </form>
      </div>
    </RequirePermission>
  );
}
