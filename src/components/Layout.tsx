import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import type { CrmStore } from "../data/store";
import { ROLE_LABELS } from "../lib/permissions";
import {
  developerNav,
  hrAdminNav,
  mainNav,
  navGroups,
  projectManagerNav,
  salesExecutiveNav,
  salesManagerNav,
  settingsNav,
  utilityNav,
} from "../lib/nav";
import { NavIcon } from "./NavIcon";
import { LiveClock } from "./LiveClock";

function pageTitle(pathname: string) {
  const map: Array<[string, string]> = [
    ["/", "Dashboard"],
    ["/sales/employees", "Employees of Sales Manager"],
    ["/sales/team", "Sales Team"],
    ["/sales/sheets", "Sheets"],
    ["/sales/targets", "Sales Targets"],
    ["/sales/reports", "Sales Reports"],
    ["/sales", "Sales Dashboard"],
    ["/leads/new", "Add Lead"],
    ["/leads/pipeline", "Pipeline"],
    ["/leads/followups", "Follow-ups"],
    ["/leads", "All Leads"],
    ["/clients", "Clients"],
    ["/proposals", "Proposals"],
    ["/deals", "Deals"],
    ["/hr/employees", "Employees"],
    ["/hr/recruitment", "Recruitment"],
    ["/hr/interviews", "Interviews"],
    ["/hr/onboarding", "Onboarding"],
    ["/hr/attendance", "Attendance"],
    ["/hr/leave", "Leave"],
    ["/hr/payroll", "Payroll"],
    ["/hr/performance", "Performance"],
    ["/hr/exit", "Exit"],
    ["/hr/reports", "HR Reports"],
    ["/hr/messages", "Messages"],
    ["/hr/events", "Events"],
    ["/hr", "HR Dashboard"],
    ["/projects/tasks", "My Tasks"],
    ["/projects", "My Projects"],
    ["/dev/task-details", "Task Details"],
    ["/dev/work-updates", "Work Updates"],
    ["/dev/daily-report", "Daily Report"],
    ["/dev/calendar", "Calendar"],
    ["/dev/messages", "Messages"],
    ["/dev/bugs", "Bug & Issues"],
    ["/dev/documents", "Documents"],
    ["/dev/github", "GitHub"],
    ["/website", "Website"],
    ["/finance", "Finance"],
    ["/notifications", "Notifications"],
    ["/reports", "Reports"],
    ["/settings", "Settings"],
  ];
  const hit = map.find(([path]) =>
    path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`),
  );
  return hit?.[1] ?? "Dashboard";
}

export function Layout({ store }: { store: CrmStore }) {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const allow = store.allow;
  const role = store.role;
  const isAuthenticated = store.isAuthenticated;

  const groups = useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => allow(item.permission)),
        }))
        .filter((group) => allow(group.permission) && group.items.length > 0),
    [allow, role, isAuthenticated],
  );

  useEffect(() => {
    const activeGroup = groups.find((group) =>
      group.items.some(
        (item) =>
          location.pathname === item.path ||
          (item.path !== "/" && location.pathname.startsWith(`${item.path}/`)),
      ),
    );
    setOpenGroups((): Record<string, boolean> => {
      if (location.pathname.startsWith("/settings")) {
        return { settings: true };
      }
      // Keep HR submenu expanded whenever browsing HR pages (founder / multi-role).
      if (location.pathname === "/hr" || location.pathname.startsWith("/hr/")) {
        const next: Record<string, boolean> = { hr: true };
        if (activeGroup) next[activeGroup.label] = true;
        return next;
      }
      if (activeGroup) {
        return { [activeGroup.label]: true };
      }
      return {};
    });
    setProfileOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  if (!store.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const utilities = utilityNav.filter((item) => store.allow(item.permission));
  const settings = settingsNav.filter((item) => store.allow(item.permission));
  const roleNotes = store.data.notifications.filter((n) => {
    const byUser =
      Array.isArray(n.audienceUserIds) && n.audienceUserIds.length > 0
        ? n.audienceUserIds.includes(store.currentUser.id)
        : false;
    const byRole = n.audienceRoles.includes(store.role);
    // Prefer user targeting when present; otherwise role.
    if (Array.isArray(n.audienceUserIds) && n.audienceUserIds.length > 0) return byUser;
    return byRole;
  });
  const unreadNotes = roleNotes.filter((n) => !n.read);
  const unread = unreadNotes.length;
  const recentNotes = [...roleNotes]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 6);
  const title = pageTitle(location.pathname);
  const firstName = store.currentUser.name.split(" ")[0];

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const nextOpen = !prev[key];
      if (!nextOpen) return { ...prev, [key]: false };
      return { [key]: true };
    });
  };

  const isDeveloper = store.role === "developer";
  const isHrAdmin = store.role === "hr_admin";
  const isProjectManager = store.role === "project_manager";
  const isSalesManager = store.role === "sales_manager";
  const isSalesExecutive = store.role === "sales_executive";
  const isFounder = store.role === "founder";
  const isFinanceAdmin = store.role === "finance_admin";
  const isWebsiteAdmin = store.role === "website_admin";
  // Super Admin + HR + PM + Developer + Sales + Finance + Website share pine chrome.
  // Founder keeps grouped module nav (command-center style); others use flat lists.
  const useEnterpriseFlat =
    isFounder ||
    isHrAdmin ||
    isProjectManager ||
    isDeveloper ||
    isSalesManager ||
    isSalesExecutive ||
    isFinanceAdmin ||
    isWebsiteAdmin;
  const useFlatNav = useEnterpriseFlat && !isFounder;
  const flatDevNav = developerNav.filter((item) => store.allow(item.permission));
  const flatHrNav = hrAdminNav.filter((item) => store.allow(item.permission));
  const flatPmNav = projectManagerNav.filter((item) => store.allow(item.permission));
  const flatSalesNav = salesManagerNav.filter((item) => store.allow(item.permission));
  const flatSalesExecNav = salesExecutiveNav.filter((item) => store.allow(item.permission));

  const messageBadge = unread;

  const orgName = store.data.organization?.name || "RoyalTech Innovation";

  return (
    <div
      className={`shell shell-preskool${useEnterpriseFlat ? " shell-hr" : ""}`}
    >
      <aside
        className={`sidebar sidebar-preskool${useEnterpriseFlat ? " sidebar-hr" : ""}`}
      >
        <div className="brand">
          <img src="/logo.jpeg" alt="RoyalTech Innovation" className="brand-logo" />
          <div>
            <p className="brand-kicker">RoyalTech</p>
            <h1 className="brand-name">{isFounder ? "Admin Panel" : "Innovation"}</h1>
          </div>
        </div>

        <button type="button" className="org-switcher" aria-label="Organization">
          <span className="org-switcher-av" aria-hidden>
            {orgName
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <span className="org-switcher-meta">
            <strong>{orgName}</strong>
            <small>{ROLE_LABELS[store.role]}</small>
          </span>
          <span className="org-switcher-chev" aria-hidden>
            ▾
          </span>
        </button>

        <nav className={`nav${useFlatNav ? " nav-flat" : ""}`}>
          {isDeveloper ? (
            flatDevNav.map((item) => (
              <NavLink
                key={`${item.path}-${item.label}`}
                to={item.path}
                end={item.path === "/" || item.path === "/projects"}
                className={({ isActive }) =>
                  `nav-link${isActive ? " is-active" : ""}`
                }
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
                {item.path === "/notifications" && unread > 0 ? (
                  <span className="nav-badge">{unread}</span>
                ) : null}
                {item.path === "/dev/messages" && messageBadge > 0 ? (
                  <span className="nav-badge">{Math.min(messageBadge, 9)}</span>
                ) : null}
              </NavLink>
            ))
          ) : isHrAdmin ? (
            flatHrNav.map((item) => (
              <NavLink
                key={`${item.path}-${item.label}`}
                to={item.path}
                end={item.path === "/" || item.path === "/hr"}
                className={({ isActive }) =>
                  `nav-link${isActive ? " is-active" : ""}`
                }
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
                {item.path === "/notifications" && unread > 0 ? (
                  <span className="nav-badge">{unread}</span>
                ) : null}
              </NavLink>
            ))
          ) : isProjectManager ? (
            flatPmNav.map((item) => (
              <NavLink
                key={`${item.path}-${item.label}`}
                to={item.path}
                end={
                  item.path === "/" ||
                  item.path === "/projects" ||
                  item.path === "/settings"
                }
                className={({ isActive }) =>
                  `nav-link${isActive ? " is-active" : ""}`
                }
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
                {item.path === "/notifications" && unread > 0 ? (
                  <span className="nav-badge">{unread}</span>
                ) : null}
                {item.path === "/dev/messages" && unread > 0 ? (
                  <span className="nav-badge">{Math.min(unread, 9)}</span>
                ) : null}
              </NavLink>
            ))
          ) : isSalesManager ? (
            flatSalesNav.map((item) => (
              <NavLink
                key={`${item.path}-${item.label}`}
                to={item.path}
                end={
                  item.path === "/" ||
                  item.path === "/leads" ||
                  item.path === "/clients" ||
                  item.path === "/settings"
                }
                className={({ isActive }) =>
                  `nav-link${isActive ? " is-active" : ""}`
                }
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
                {item.path === "/notifications" && unread > 0 ? (
                  <span className="nav-badge">{unread}</span>
                ) : null}
              </NavLink>
            ))
          ) : isSalesExecutive ? (
            flatSalesExecNav.map((item) => (
              <NavLink
                key={`${item.path}-${item.label}`}
                to={item.path}
                end={
                  item.path === "/" ||
                  item.path === "/leads" ||
                  item.path === "/clients" ||
                  item.path === "/settings"
                }
                className={({ isActive }) =>
                  `nav-link${isActive ? " is-active" : ""}`
                }
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
                {item.path === "/notifications" && unread > 0 ? (
                  <span className="nav-badge">{unread}</span>
                ) : null}
              </NavLink>
            ))
          ) : (
            <>
              {mainNav
                .filter((item) => store.allow(item.permission))
                .map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end
                    className={({ isActive }) =>
                      `nav-link${isActive ? " is-active" : ""}`
                    }
                  >
                    <NavIcon name={item.icon} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}

              <p className="nav-section">{isFounder ? "Modules" : "Pages"}</p>

              {groups.map((group) => {
                const open = openGroups[group.label] ?? false;
                const groupTitle = isFounder
                  ? group.label.replace(/\b\w/g, (c) => c.toUpperCase())
                  : group.label;
                return (
                  <div className={`nav-group${open ? " is-open" : ""}`} key={group.label}>
                    <button
                      type="button"
                      className="nav-group-toggle"
                      aria-expanded={open}
                      onClick={() => toggleGroup(group.label)}
                    >
                      <span className="nav-group-label">
                        <NavIcon name={group.icon} />
                        <span>{groupTitle}</span>
                      </span>
                      <span className={`nav-chevron${open ? " is-open" : ""}`} aria-hidden="true">
                        ▾
                      </span>
                    </button>
                    {open ? (
                      <div className="nav-sub">
                        {group.items.map((item) => (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            end={
                              item.path === "/sales" ||
                              item.path === "/hr" ||
                              item.path === "/website" ||
                              item.path === "/projects"
                            }
                            className={({ isActive }) =>
                              `nav-link sub${isActive ? " is-active" : ""}`
                            }
                          >
                            <NavIcon name={item.icon} />
                            <span>
                              {isFounder
                                ? item.label.replace(/\b\w/g, (c) => c.toUpperCase())
                                : item.label}
                            </span>
                          </NavLink>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              <p className="nav-section">{isFounder ? "System" : "Applications"}</p>

              {utilities.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `nav-link${isActive ? " is-active" : ""}`
                  }
                >
                  <NavIcon name={item.icon} />
                  <span>{item.label}</span>
                  {item.path === "/notifications" && unread > 0 ? (
                    <span className="nav-badge">{unread}</span>
                  ) : null}
                </NavLink>
              ))}

              {settings.length > 0 ? (
                <div className={`nav-group${openGroups.settings ? " is-open" : ""}`}>
                  <button
                    type="button"
                    className="nav-group-toggle"
                    aria-expanded={!!openGroups.settings}
                    onClick={() => toggleGroup("settings")}
                  >
                    <span className="nav-group-label">
                      <NavIcon name="settings" />
                      <span>settings</span>
                    </span>
                    <span
                      className={`nav-chevron${openGroups.settings ? " is-open" : ""}`}
                      aria-hidden="true"
                    >
                      ▾
                    </span>
                  </button>
                  {openGroups.settings ? (
                    <div className="nav-sub">
                      <NavLink
                        to="/settings"
                        end
                        className={({ isActive }) =>
                          `nav-link sub${isActive ? " is-active" : ""}`
                        }
                      >
                        <NavIcon name="settings" />
                        <span>overview</span>
                      </NavLink>
                      {settings.map((item) => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={({ isActive }) =>
                            `nav-link sub${isActive ? " is-active" : ""}`
                          }
                        >
                          <NavIcon name={item.icon} />
                          <span>{item.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-user">
            {store.currentUser.avatarUrl ? (
              <img
                className="session-avatar session-avatar-img"
                src={store.currentUser.avatarUrl}
                alt=""
              />
            ) : (
              <div className="session-avatar" aria-hidden>
                {store.currentUser.avatarInitials ||
                  store.currentUser.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
              </div>
            )}
            <div className="sidebar-user-meta">
              <strong>{store.currentUser.name}</strong>
              <span>{ROLE_LABELS[store.role] || store.role}</span>
            </div>
          </div>
          <button className="btn btn-ghost sidebar-reset" onClick={store.logout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className={`topbar topbar-preskool${useEnterpriseFlat ? " topbar-hr" : ""}`}>
          <label className="topbar-search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="m20 20-3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                useEnterpriseFlat ? "Search…" : "Search"
              }
              aria-label="Search"
            />
          </label>

          <div className="topbar-brand-center" aria-label="RoyalTech Innovation Management System">
            <strong>RoyalTech Innovation</strong>
            <span>Management System</span>
          </div>

          <div className="topbar-actions">
            <LiveClock />

            <Link
              to="/settings"
              className="topbar-icon"
              aria-label="Settings"
              title="Settings"
              onClick={() => {
                setNotifOpen(false);
                setProfileOpen(false);
              }}
            >
              <NavIcon name="settings" />
            </Link>

            <div className="topbar-notif-wrap">
              <button
                type="button"
                className="topbar-icon"
                aria-label="Notifications"
                title="Notifications"
                aria-expanded={notifOpen}
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setProfileOpen(false);
                }}
              >
                <NavIcon name="notifications" />
                {unread > 0 ? <span className="topbar-dot">{unread > 9 ? "9+" : unread}</span> : null}
              </button>

              {notifOpen ? (
                <div className="topbar-notif-panel" role="dialog" aria-label="Notifications">
                  <header className="topbar-notif-head">
                    <div>
                      <h3>Notifications</h3>
                      <p>{unread ? `${unread} unread` : "You're all caught up"}</p>
                    </div>
                    <Link to="/notifications" onClick={() => setNotifOpen(false)}>
                      View all
                    </Link>
                  </header>
                  <ul className="topbar-notif-list">
                    {recentNotes.map((note) => (
                      <li key={note.id} className={note.read ? "read" : "unread"}>
                        <button
                          type="button"
                          className="topbar-notif-item"
                          onClick={() => {
                            if (!note.read) store.markNotificationRead(note.id);
                          }}
                        >
                          <span className="topbar-notif-dot" aria-hidden />
                          <span>
                            <strong>{note.title}</strong>
                            <small>{note.body}</small>
                          </span>
                        </button>
                      </li>
                    ))}
                    {recentNotes.length === 0 ? (
                      <li className="topbar-notif-empty">No notifications yet</li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="topbar-profile-wrap">
              <button
                type="button"
                className="topbar-profile"
                aria-expanded={profileOpen}
                onClick={() => {
                  setProfileOpen((v) => !v);
                  setNotifOpen(false);
                }}
              >
                {store.currentUser.avatarUrl ? (
                  <img
                    className="topbar-avatar topbar-avatar-img"
                    src={store.currentUser.avatarUrl}
                    alt=""
                  />
                ) : (
                  <span className="topbar-avatar">{store.currentUser.avatarInitials}</span>
                )}
                {!isDeveloper ? (
                  <span className="topbar-profile-meta">
                    <strong>{firstName}</strong>
                    <small>{ROLE_LABELS[store.role]}</small>
                  </span>
                ) : null}
              </button>

              {profileOpen ? (
                <div className="topbar-menu">
                  <div className="topbar-menu-head">
                    {store.currentUser.avatarUrl ? (
                      <img
                        className="topbar-avatar lg topbar-avatar-img"
                        src={store.currentUser.avatarUrl}
                        alt=""
                      />
                    ) : (
                      <span className="topbar-avatar lg">{store.currentUser.avatarInitials}</span>
                    )}
                    <div>
                      <p>{store.currentUser.name}</p>
                      <small>{store.currentUser.email}</small>
                    </div>
                  </div>
                  <p className="topbar-menu-role">
                    {ROLE_LABELS[store.role]} · {store.currentUser.department}
                  </p>
                  <Link to="/settings" className="topbar-menu-link" onClick={() => setProfileOpen(false)}>
                    Account settings
                  </Link>
                  <button type="button" className="topbar-menu-link danger" onClick={store.logout}>
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {!useEnterpriseFlat ? (
          <div className="page-toolbar">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <span>{ROLE_LABELS[store.role]} Dashboard</span>
              <span aria-hidden>/</span>
              <strong>{title}</strong>
            </nav>
            <div className="page-toolbar-actions">
              {store.allow("leads.write") ? (
                <Link className="btn btn-primary" to="/leads/new">
                  Add New Lead
                </Link>
              ) : null}
              {store.allow("sales.reports") ? (
                <Link className="btn btn-secondary" to="/sales/reports">
                  Sales Details
                </Link>
              ) : store.allow("finance") ? (
                <Link className="btn btn-secondary" to="/finance">
                  Finance Details
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        {unreadNotes[0] ? (
          <div className="toast-banner" role="status">
            <span className="toast-banner-dot" aria-hidden />
            <p>
              <strong>{unreadNotes[0].title}</strong>
              {unreadNotes[0].body ? ` — ${unreadNotes[0].body}` : ""}
            </p>
          </div>
        ) : null}

        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
