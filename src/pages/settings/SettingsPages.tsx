import { useRef, useState, type FormEvent } from "react";
import type { CrmStore } from "../../data/store";
import { ROLE_LABELS, permissionsFor } from "../../lib/permissions";
import { formatDateTime } from "../../lib/format";
import { PageHeader, Panel, Tag } from "../../components/ui";
import { RequirePermission } from "../../components/RequirePermission";
import { Link } from "react-router-dom";
import { DeveloperSettings } from "../dev/DeveloperSettings";

function initialsFrom(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function AccountSettings({ store }: { store: CrmStore }) {
  const user = store.currentUser;
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [department, setDepartment] = useState(user.department);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const preview = avatarUrl || "";
  const initials = initialsFrom(name) || user.avatarInitials;

  const onPickPhoto = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG, or WebP).");
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      setError("Image must be under 2.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      setAvatarUrl(url);
      setError("");
      setNotice("Photo ready — click Save profile to keep it.");
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Profile name is required.");
      return;
    }
    store.updateCurrentUser({
      name: name.trim(),
      email: email.trim(),
      department: department.trim(),
      avatarUrl: avatarUrl || null,
    });
    setError("");
    setNotice("Profile saved.");
  };

  const savePassword = (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    const result = store.changeCurrentPassword(currentPassword, newPassword);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPwOpen(false);
    setError("");
    setNotice("Password updated.");
  };

  return (
    <section className="acc-settings">
      {notice ? (
        <div className="acc-banner ok" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")}>
            Dismiss
          </button>
        </div>
      ) : null}
      {error ? (
        <div className="acc-banner bad" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      ) : null}

      <form className="acc-card" onSubmit={saveProfile}>
        <header className="acc-card-head">
          <div>
            <h3>Account profile</h3>
            <p>Change your name, photo, and login email.</p>
          </div>
          <button type="submit" className="btn btn-primary">
            Save profile
          </button>
        </header>

        <div className="acc-profile-grid">
          <div className="acc-avatar-wrap">
            {preview ? (
              <img className="acc-avatar-img" src={preview} alt="" />
            ) : (
              <span className="acc-avatar">{initials}</span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="acc-file"
              onChange={(e) => onPickPhoto(e.target.files?.[0])}
            />
            <div className="acc-avatar-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileRef.current?.click()}
              >
                Upload photo
              </button>
              {preview ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setAvatarUrl("");
                    setNotice("Photo removed — save profile to apply.");
                  }}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>

          <div className="acc-fields">
            <label>
              <span>Profile name</span>
              <input
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label>
              <span>Email</span>
              <input
                className="field"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={store.role === "hr_admin"}
                title={
                  store.role === "hr_admin"
                    ? "HR opens only via Google as hr@royaltechinnovation.co.in"
                    : undefined
                }
              />
              {store.role === "hr_admin" ? (
                <small className="muted">
                  Google-only login: hr@royaltechinnovation.co.in
                </small>
              ) : null}
            </label>
            <label>
              <span>Role</span>
              <input className="field" value={ROLE_LABELS[store.role] || store.role} disabled />
            </label>
            <label>
              <span>Department</span>
              <input
                className="field"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </label>
          </div>
        </div>
      </form>

      <article className="acc-card">
        <header className="acc-card-head">
          <div>
            <h3>Password</h3>
            <p>Update the password you use to sign in.</p>
          </div>
          {!pwOpen ? (
            <button type="button" className="btn btn-secondary" onClick={() => setPwOpen(true)}>
              Change password
            </button>
          ) : null}
        </header>

        {pwOpen ? (
          <form className="acc-pw-form" onSubmit={savePassword}>
            <label>
              <span>Current password</span>
              <input
                className="field"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            <label>
              <span>New password</span>
              <input
                className="field"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </label>
            <label>
              <span>Confirm new password</span>
              <input
                className="field"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </label>
            <div className="acc-pw-actions">
              <button type="submit" className="btn btn-primary">
                Update password
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setPwOpen(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setError("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <p className="muted acc-pw-hint">Use at least 6 characters for a new password.</p>
        )}
      </article>
    </section>
  );
}

export function SettingsHome({ store }: { store: CrmStore }) {
  if (store.role === "developer") {
    return <DeveloperSettings store={store} />;
  }

  const canAdmin = store.allow("settings");

  return (
    <div className="page acc-page">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        lede="Update your profile name, photo, and password."
      />
      <AccountSettings store={store} />

      {canAdmin ? (
        <>
          <h3 className="acc-admin-title">Administration</h3>
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
        </>
      ) : null}
    </div>
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
        <PageHeader
          eyebrow="Administration"
          title="Activity Logs"
          lede="Includes GPS open locations for CRM tracking."
        />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Location</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {store.data.activityLogs.map((log) => {
                const actor = store.data.users.find((u) => u.id === log.actorId);
                const place =
                  log.locationLabel ||
                  (log.lat != null && log.lng != null
                    ? `${log.lat.toFixed(5)}, ${log.lng.toFixed(5)}`
                    : "—");
                return (
                  <tr key={log.id}>
                    <td>{actor?.name ?? "System"}</td>
                    <td>{log.action}</td>
                    <td>{log.entity}</td>
                    <td>
                      {log.mapsUrl ? (
                        <a href={log.mapsUrl} target="_blank" rel="noreferrer">
                          {place}
                        </a>
                      ) : (
                        place
                      )}
                    </td>
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
