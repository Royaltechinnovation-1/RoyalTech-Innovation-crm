import type { CrmStore } from "../../data/store";
import { ROLE_LABELS, permissionsFor } from "../../lib/permissions";
import { formatDateTime } from "../../lib/format";
import { PageHeader, Panel, Tag } from "../../components/ui";
import { RequirePermission } from "../../components/RequirePermission";
import { Link } from "react-router-dom";
import { DeveloperSettings } from "../dev/DeveloperSettings";

export function SettingsHome({ store }: { store: CrmStore }) {
  if (store.role === "developer") {
    return <DeveloperSettings store={store} />;
  }

  return (
    <RequirePermission store={store} permission="settings">
      <div className="page">
        <PageHeader
          eyebrow="Administration"
          title="Settings & Administration"
          lede="Users, roles, logs, Google, and system configuration."
        />
        <div className="split">
          {[
            ["User Management", "/settings/users"],
            ["Roles & Permissions", "/settings/roles"],
            ["Activity Logs", "/settings/logs"],
            ["Google Integrations", "/settings/google"],
            ["System Configuration", "/settings/system"],
          ].map(([label, path]) => (
            <Panel key={path} title={label}>
              <Link className="btn btn-secondary" to={path}>
                Open
              </Link>
            </Panel>
          ))}
        </div>
      </div>
    </RequirePermission>
  );
}

export function Users({ store }: { store: CrmStore }) {
  return (
    <RequirePermission store={store} permission="settings.users">
      <div className="page">
        <PageHeader eyebrow="Administration" title="User Management" />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Department</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {store.data.users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                  </td>
                  <td>
                    <Tag tone="sage">{ROLE_LABELS[user.role]}</Tag>
                  </td>
                  <td>{user.department}</td>
                  <td>{user.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RequirePermission>
  );
}

export function Roles({ store }: { store: CrmStore }) {
  return (
    <RequirePermission store={store} permission="settings.roles">
      <div className="page">
        <PageHeader
          eyebrow="Administration"
          title="Roles & Permissions"
          lede="HR salary, founder finance, and confidential docs stay role-gated."
        />
        <div className="split">
          {store.data.users.map((user) => (
            <Panel key={user.id} title={ROLE_LABELS[user.role]}>
              <p className="muted" style={{ marginBottom: 12 }}>
                {permissionsFor(user.role).length} permissions
              </p>
              <div className="tag-cloud">
                {permissionsFor(user.role)
                  .slice(0, 10)
                  .map((perm) => (
                    <Tag key={perm}>{perm}</Tag>
                  ))}
                {permissionsFor(user.role).length > 10 ? (
                  <Tag tone="gold">+{permissionsFor(user.role).length - 10} more</Tag>
                ) : null}
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </RequirePermission>
  );
}

export function ActivityLogs({ store }: { store: CrmStore }) {
  return (
    <RequirePermission store={store} permission="settings.logs">
      <div className="page">
        <PageHeader eyebrow="Administration" title="Activity Logs" />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {store.data.activityLogs.map((log) => {
                const actor = store.data.users.find((u) => u.id === log.actorId);
                return (
                  <tr key={log.id}>
                    <td>{actor?.name ?? "System"}</td>
                    <td>{log.action}</td>
                    <td>{log.entity}</td>
                    <td>{formatDateTime(log.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </RequirePermission>
  );
}

export function GoogleSettings({ store }: { store: CrmStore }) {
  return (
    <RequirePermission store={store} permission="settings.google">
      <div className="page">
        <PageHeader eyebrow="Administration" title="Google Integrations" />
        <Panel title="Connected services">
          <div className="list">
            <div className="list-row">
              <div>
                <p className="list-title">Google Sheets — Sales leads</p>
                <p className="list-sub">
                  {store.data.sheetConfig.spreadsheetId} / {store.data.sheetConfig.sheetName}
                </p>
              </div>
              <Tag tone={store.data.sheetConfig.enabled ? "sage" : "cold"}>
                {store.data.sheetConfig.enabled ? "Enabled" : "Disabled"}
              </Tag>
            </div>
            <div className="list-row">
              <div>
                <p className="list-title">Google Analytics</p>
                <p className="list-sub">Website module reads property summaries.</p>
              </div>
              <Tag tone="gold">Configured</Tag>
            </div>
          </div>
        </Panel>
      </div>
    </RequirePermission>
  );
}

export function SystemConfig({ store }: { store: CrmStore }) {
  return (
    <RequirePermission store={store} permission="settings.system">
      <div className="page">
        <PageHeader eyebrow="Administration" title="System Configuration" />
        <Panel title="Environment">
          <div className="list">
            <div className="list-row">
              <p className="list-title">Organization</p>
              <strong>{store.data.organization?.name || "RoyalTech"}</strong>
            </div>
            <div className="list-row">
              <p className="list-title">Industry</p>
              <strong>{store.data.organization?.industry || "—"}</strong>
            </div>
            <div className="list-row">
              <p className="list-title">Website</p>
              <strong>{store.data.organization?.website || "—"}</strong>
            </div>
            <div className="list-row">
              <p className="list-title">Product</p>
              <strong>Innovation CRM</strong>
            </div>
            <div className="list-row">
              <p className="list-title">Theme</p>
              <strong>RoyalTech site palette</strong>
            </div>
          </div>
        </Panel>
      </div>
    </RequirePermission>
  );
}
