import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { CrmStore } from "../../data/store";
import { ROLE_LABELS } from "../../lib/permissions";
import {
  changeUserPassword,
  fetchUserSettings,
  saveUserSettings,
} from "../../lib/moduleApi";

type SettingsTab =
  | "profile"
  | "account"
  | "notifications"
  | "appearance"
  | "privacy"
  | "integrations"
  | "team"
  | "billing";

const tabs: { key: SettingsTab; label: string; icon: string }[] = [
  { key: "profile", label: "Profile Settings", icon: "profile" },
  { key: "account", label: "Account Settings", icon: "account" },
  { key: "notifications", label: "Notification Settings", icon: "bell" },
  { key: "appearance", label: "Appearance", icon: "appearance" },
  { key: "privacy", label: "Privacy & Security", icon: "privacy" },
  { key: "integrations", label: "Integrations", icon: "integrations" },
  { key: "team", label: "Team Management", icon: "team" },
  { key: "billing", label: "Billing & Plans", icon: "billing" },
];

function TabIcon({ name }: { name: string }) {
  if (name === "profile") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="8.5" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path
          d="M5.5 18.5c1.2-2.8 3.4-4.2 6.5-4.2s5.3 1.4 6.5 4.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (name === "account") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 8.2v4.2l2.6 1.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (name === "bell") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path
          d="M6.5 16.5h11M8 16.5V11a4 4 0 1 1 8 0v5.5M10.2 18.6a1.8 1.8 0 0 0 3.6 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (name === "appearance") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M6.8 6.8l1.4 1.4M15.8 15.8l1.4 1.4M17.2 6.8l-1.4 1.4M8.2 15.8l-1.4 1.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (name === "privacy") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 3.8 19 7v4.8c0 4.2-2.8 7.4-7 8.7-4.2-1.3-7-4.5-7-8.7V7l7-3.2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (name === "integrations") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path
          d="M8.5 7.5h-3v3h3v-3ZM18.5 7.5h-3v3h3v-3ZM8.5 13.5h-3v3h3v-3ZM18.5 13.5h-3v3h3v-3Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    );
  }
  if (name === "team") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <circle cx="9" cy="9" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="16" cy="10.2" r="2.4" fill="none" stroke="currentColor" strokeWidth="2" />
        <path
          d="M4.5 18c.8-2.2 2.5-3.3 4.5-3.3s3.7 1.1 4.5 3.3M13.2 18c.5-1.5 1.7-2.3 3-2.3 1.1 0 2 .5 2.6 1.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <rect x="4.5" y="6" width="15" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M4.5 10h15" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`sp-toggle${on ? " is-on" : ""}`}
      aria-pressed={on}
      aria-label={label}
      onClick={() => onChange(!on)}
    >
      <i />
    </button>
  );
}

function NotificationsCard({
  notifs,
  setNotifs,
}: {
  notifs: Record<"tasks" | "projects" | "bugs" | "messages" | "team", boolean>;
  setNotifs: Dispatch<
    SetStateAction<Record<"tasks" | "projects" | "bugs" | "messages" | "team", boolean>>
  >;
}) {
  return (
    <article className="sp-card">
      <header className="sp-card-head compact">
        <div className="sp-card-title">
          <span className="sp-card-ico" aria-hidden>
            <TabIcon name="bell" />
          </span>
          <div>
            <h3>Notification Settings</h3>
            <p>Choose what notifications you want to receive.</p>
          </div>
        </div>
      </header>
      <ul className="sp-toggle-list">
        {(
          [
            ["tasks", "Task Assignments", "Get notified when tasks are assigned to you."],
            ["projects", "Project Updates", "Updates on projects you are part of."],
            ["bugs", "Bug & Fixes", "Alerts when bugs are reported or resolved."],
            ["messages", "Messages", "New chat messages from your team."],
            ["team", "Team Activities", "Mentions and team-wide activity digests."],
          ] as const
        ).map(([key, title, desc]) => (
          <li key={key}>
            <div>
              <strong>{title}</strong>
              <small>{desc}</small>
            </div>
            <Toggle
              on={notifs[key]}
              label={title}
              onChange={(v) => setNotifs((prev) => ({ ...prev, [key]: v }))}
            />
          </li>
        ))}
      </ul>
    </article>
  );
}

function AccountCard({
  twoFactor,
  setTwoFactor,
  language,
  setLanguage,
  timezone,
  setTimezone,
  onPassword,
}: {
  twoFactor: boolean;
  setTwoFactor: (v: boolean) => void;
  language: string;
  setLanguage: (v: string) => void;
  timezone: string;
  setTimezone: (v: string) => void;
  onPassword: () => void;
}) {
  return (
    <article className="sp-card">
      <header className="sp-card-head compact">
        <div className="sp-card-title">
          <span className="sp-card-ico" aria-hidden>
            <TabIcon name="privacy" />
          </span>
          <div>
            <h3>Account Settings</h3>
            <p>Manage your account preferences.</p>
          </div>
        </div>
      </header>
      <ul className="sp-account-list">
        <li>
          <span className="sp-row-ico" aria-hidden>
            <svg viewBox="0 0 24 24">
              <rect x="6" y="10.5" width="12" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
              <path
                d="M8.5 10.5V8.2a3.5 3.5 0 0 1 7 0v2.3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </span>
          <div>
            <strong>Change Password</strong>
            <small>Update your login password.</small>
          </div>
          <button type="button" className="sp-chevron" onClick={onPassword} aria-label="Change password">
            ›
          </button>
        </li>
        <li>
          <span className="sp-row-ico" aria-hidden>
            <TabIcon name="privacy" />
          </span>
          <div>
            <strong>Two-Factor Authentication</strong>
            <small>Extra security for your account.</small>
          </div>
          <Toggle on={twoFactor} label="Two-factor authentication" onChange={setTwoFactor} />
        </li>
        <li>
          <span className="sp-row-ico" aria-hidden>
            <TabIcon name="appearance" />
          </span>
          <div>
            <strong>Language</strong>
            <small>Preferred language for the app.</small>
          </div>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option>English</option>
            <option>Hindi</option>
          </select>
        </li>
        <li>
          <span className="sp-row-ico" aria-hidden>
            <TabIcon name="account" />
          </span>
          <div>
            <strong>Timezone</strong>
            <small>Used for deadlines and reports.</small>
          </div>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            <option>IST (GMT+5:30)</option>
            <option>UTC</option>
            <option>EST (GMT-5)</option>
          </select>
        </li>
      </ul>
    </article>
  );
}

export function DeveloperSettings({ store }: { store: CrmStore }) {
  const user = store.currentUser;
  const [tab, setTab] = useState<SettingsTab>("profile");
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const role = ROLE_LABELS[user.role] || user.role;
  const [department, setDepartment] = useState(user.department || "Development");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dbMode, setDbMode] = useState("memory-file");
  const [language, setLanguage] = useState("English");
  const [timezone, setTimezone] = useState("IST (GMT+5:30)");
  const [theme, setTheme] = useState("Light");
  const [density, setDensity] = useState("Comfortable");
  const [twoFactor, setTwoFactor] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notifs, setNotifs] = useState({
    tasks: true,
    projects: true,
    bugs: true,
    messages: true,
    team: false,
  });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchUserSettings(user.id)
      .then((data) => {
        if (!alive) return;
        setName(data.fullName || user.name);
        setEmail(data.email || user.email);
        setDepartment(data.department || user.department || "Development");
        setLanguage(data.language || "English");
        setTimezone(data.timezone || "IST (GMT+5:30)");
        setTheme(data.theme || "Light");
        setDensity(data.density || "Comfortable");
        setTwoFactor(Boolean(data.twoFactor));
        setOnlineStatus(Boolean(data.showOnline));
        setNotifs({
          tasks: Boolean(data.notifyTasks),
          projects: Boolean(data.notifyProjects),
          bugs: Boolean(data.notifyBugs),
          messages: Boolean(data.notifyMessages),
          team: Boolean(data.notifyTeam),
        });
        setDbMode(data.mode || "memory-file");
        setError("");
      })
      .catch((err: Error) => {
        if (!alive) return;
        setError(err.message || "Could not load settings from database.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user.id, user.name, user.email, user.department]);

  const persist = async (extra?: { password?: string }) => {
    setSaving(true);
    setError("");
    try {
      const saved = await saveUserSettings({
        userId: user.id,
        fullName: name,
        email,
        department,
        language,
        timezone,
        theme,
        density,
        twoFactor,
        showOnline: onlineStatus,
        notifyTasks: notifs.tasks,
        notifyProjects: notifs.projects,
        notifyBugs: notifs.bugs,
        notifyMessages: notifs.messages,
        notifyTeam: notifs.team,
        password: extra?.password,
      });
      store.updateCurrentUser({
        name: saved.profile?.name || name,
        email: saved.profile?.email || email,
        department: saved.profile?.department || department,
        password: saved.profile?.password,
      });
      setDbMode(saved.mode || dbMode);
      setNotice(`Saved to ${saved.mode === "mysql" ? "MySQL" : "settings database"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async () => {
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await changeUserPassword({
        userId: user.id,
        currentPassword,
        newPassword,
      });
      store.updateCurrentUser({ password: saved.profile?.password || newPassword });
      setPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice("Password updated in settings database.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password update failed.");
    } finally {
      setSaving(false);
    }
  };

  const initials = useMemo(
    () =>
      name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || user.avatarInitials,
    [name, user.avatarInitials],
  );

  return (
    <div className="page sp-page">
      <header className="sp-head">
        <h2>Settings</h2>
        <p>
          Manage your profile, notifications, and account preferences.
          {loading ? " Loading…" : ` · DB: ${dbMode}`}
        </p>
      </header>

      {notice ? <p className="sp-notice">{notice}</p> : null}
      {error ? <p className="sp-error">{error}</p> : null}

      <section className="sp-shell">
        <aside className="sp-nav" aria-label="Settings sections">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              className={tab === item.key ? "is-active" : undefined}
              onClick={() => {
                setTab(item.key);
                setNotice("");
              }}
            >
              <span className="sp-nav-ico" aria-hidden>
                <TabIcon name={item.icon} />
              </span>
              {item.label}
            </button>
          ))}
        </aside>

        <div className="sp-content">
          {tab === "profile" ? (
            <>
              <article className="sp-card sp-profile-card">
                <header className="sp-card-head">
                  <div>
                    <h3>Profile Settings</h3>
                    <p>Update your personal information.</p>
                  </div>
                  <button type="button" className="sp-save" disabled={saving} onClick={() => void persist()}>
                    <svg viewBox="0 0 24 24" aria-hidden>
                      <path
                        d="M6 4.5h10.2L19.5 8v11.5a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19.5v-13A2 2 0 0 1 6 4.5Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path d="M8 19.5v-6h8v6M8 4.8v4.4h7" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </header>

                <div className="sp-profile-grid">
                  <div className="sp-avatar-wrap">
                    <span className="sp-avatar">{initials}</span>
                    <button
                      type="button"
                      className="sp-avatar-btn"
                      aria-label="Change photo"
                      title="Change photo"
                      onClick={() => setNotice("Photo upload coming soon.")}
                    >
                      <svg viewBox="0 0 24 24">
                        <path
                          d="M4.5 17.5V8.8A1.8 1.8 0 0 1 6.3 7h2l1.3-1.8h5L16 7h1.7a1.8 1.8 0 0 1 1.8 1.8v9.7A1.8 1.8 0 0 1 17.7 19.3H6.3a1.8 1.8 0 0 1-1.8-1.8Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <circle cx="12" cy="12.5" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </button>
                  </div>

                  <div className="sp-fields">
                    <label>
                      <span>Full Name</span>
                      <input value={name} onChange={(e) => setName(e.target.value)} />
                    </label>
                    <label>
                      <span>Email Address</span>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </label>
                    <label>
                      <span>Role</span>
                      <select value={role} disabled>
                        <option>{role}</option>
                      </select>
                    </label>
                    <label>
                      <span>Department</span>
                      <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                        <option>Development</option>
                        <option>Engineering</option>
                        <option>Delivery</option>
                        <option>Product</option>
                      </select>
                    </label>
                  </div>
                </div>
              </article>

              <div className="sp-bottom-row">
                <NotificationsCard notifs={notifs} setNotifs={setNotifs} />
                <AccountCard
                  twoFactor={twoFactor}
                  setTwoFactor={setTwoFactor}
                  language={language}
                  setLanguage={setLanguage}
                  timezone={timezone}
                  setTimezone={setTimezone}
                  onPassword={() => {
                    setPasswordOpen(true);
                    setError("");
                  }}
                />
              </div>
              <button type="button" className="sp-save" disabled={saving} onClick={() => void persist()}>
                {saving ? "Saving…" : "Save Preferences"}
              </button>
            </>
          ) : null}

          {tab === "notifications" ? (
            <>
              <NotificationsCard notifs={notifs} setNotifs={setNotifs} />
              <button type="button" className="sp-save" disabled={saving} onClick={() => void persist()}>
                {saving ? "Saving…" : "Save Notifications"}
              </button>
            </>
          ) : null}

          {tab === "account" ? (
            <>
              <AccountCard
                twoFactor={twoFactor}
                setTwoFactor={setTwoFactor}
                language={language}
                setLanguage={setLanguage}
                timezone={timezone}
                setTimezone={setTimezone}
                onPassword={() => {
                  setPasswordOpen(true);
                  setError("");
                }}
              />
              <button type="button" className="sp-save" disabled={saving} onClick={() => void persist()}>
                {saving ? "Saving…" : "Save Account Settings"}
              </button>
            </>
          ) : null}

          {tab === "appearance" ? (
            <article className="sp-card">
              <header className="sp-card-head">
                <div>
                  <h3>Appearance</h3>
                  <p>Choose how the workspace looks for you.</p>
                </div>
              </header>
              <div className="sp-fields single">
                <label>
                  <span>Theme</span>
                  <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                    <option>Light</option>
                    <option>Dark</option>
                    <option>System</option>
                  </select>
                </label>
                <label>
                  <span>Density</span>
                  <select value={density} onChange={(e) => setDensity(e.target.value)}>
                    <option>Comfortable</option>
                    <option>Compact</option>
                  </select>
                </label>
              </div>
              <button type="button" className="sp-save" disabled={saving} onClick={() => void persist()}>
                {saving ? "Saving…" : "Save Appearance"}
              </button>
            </article>
          ) : null}

          {tab === "privacy" ? (
            <>
              <article className="sp-card">
                <header className="sp-card-head">
                  <div>
                    <h3>Privacy & Security</h3>
                    <p>Control visibility and security options.</p>
                  </div>
                </header>
                <ul className="sp-toggle-list">
                  <li>
                    <div>
                      <strong>Show online status</strong>
                      <small>Let teammates see when you are online.</small>
                    </div>
                    <Toggle on={onlineStatus} label="Show online status" onChange={setOnlineStatus} />
                  </li>
                  <li>
                    <div>
                      <strong>Session alerts</strong>
                      <small>Email me about new sign-ins.</small>
                    </div>
                    <Toggle on={twoFactor} label="Session alerts" onChange={setTwoFactor} />
                  </li>
                </ul>
              </article>
              <button type="button" className="sp-save" disabled={saving} onClick={() => void persist()}>
                {saving ? "Saving…" : "Save Privacy Settings"}
              </button>
            </>
          ) : null}

          {tab === "integrations" ? (
            <article className="sp-card">
              <header className="sp-card-head">
                <div>
                  <h3>Integrations</h3>
                  <p>Connected tools for your developer workspace.</p>
                </div>
              </header>
              <ul className="sp-account-list">
                <li>
                  <div>
                    <strong>GitHub</strong>
                    <small>Repositories and pull requests.</small>
                  </div>
                  <span className="sp-badge ok">Connected</span>
                </li>
                <li>
                  <div>
                    <strong>Google Calendar</strong>
                    <small>Sync deadlines and meetings.</small>
                  </div>
                  <span className="sp-badge">Not linked</span>
                </li>
              </ul>
            </article>
          ) : null}

          {tab === "team" ? (
            <article className="sp-card">
              <header className="sp-card-head">
                <div>
                  <h3>Team Management</h3>
                  <p>Your delivery team contacts.</p>
                </div>
              </header>
              <ul className="sp-account-list">
                {store.data.users
                  .filter((u) => u.role === "project_manager" || u.role === "developer")
                  .slice(0, 5)
                  .map((u) => (
                    <li key={u.id}>
                      <span className="sp-mini-avatar">{u.avatarInitials}</span>
                      <div>
                        <strong>{u.name}</strong>
                        <small>{ROLE_LABELS[u.role]}</small>
                      </div>
                    </li>
                  ))}
              </ul>
            </article>
          ) : null}

          {tab === "billing" ? (
            <article className="sp-card">
              <header className="sp-card-head">
                <div>
                  <h3>Billing & Plans</h3>
                  <p>Plan details are managed by your organization admin.</p>
                </div>
              </header>
              <p className="sp-muted">
                You are on the RoyalTech Innovation workspace plan. Contact your founder or finance admin for billing
                changes.
              </p>
            </article>
          ) : null}
        </div>
      </section>

      {passwordOpen ? (
        <div className="sp-modal" role="dialog" aria-label="Change password">
          <div className="sp-modal-card">
            <header>
              <h3>Change Password</h3>
              <button type="button" onClick={() => setPasswordOpen(false)} aria-label="Close">
                ×
              </button>
            </header>
            <label>
              <span>Current password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </label>
            <label>
              <span>New password</span>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </label>
            <label>
              <span>Confirm new password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>
            <footer>
              <button type="button" className="sp-save" disabled={saving} onClick={() => void onChangePassword()}>
                {saving ? "Updating…" : "Update Password"}
              </button>
              <button type="button" className="sp-close" onClick={() => setPasswordOpen(false)}>
                Cancel
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
