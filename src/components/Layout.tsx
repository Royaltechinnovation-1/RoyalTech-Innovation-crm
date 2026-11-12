import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import {
  Bell,
  Bug,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderKanban,
  GitBranch,
  Home,
  ListTodo,
  MessageSquare,
} from "lucide-react";
import type { CrmStore } from "../data/store";
import { ROLE_LABELS } from "../lib/permissions";
import { developerNav, mainNav, navGroups, settingsNav, utilityNav } from "../lib/nav";
import { NavIcon } from "./NavIcon";

const developerLucide: Record<string, ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  "/": Home,
  "/projects/tasks": ListTodo,
  "/projects": FolderKanban,
  "/dev/daily-report": ClipboardList,
  "/dev/calendar": CalendarDays,
  "/dev/messages": MessageSquare,
  "/dev/bugs": Bug,
  "/dev/documents": FileText,
  "/dev/github": GitBranch,
  "/notifications": Bell,
};

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

  const groups = useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => store.allow(item.permission)),
        }))
        .filter((group) => store.allow(group.permission) && group.items.length > 0),
    [store],
  );

  useEffect(() => {
    const activeGroup = groups.find((group) =>
      group.items.some(
        (item) =>
          location.pathname === item.path ||
          (item.path !== "/" && location.pathname.startsWith(`${item.path}/`)),
      ),
    );
    setOpenGroups(() => {
      if (location.pathname.startsWith("/settings")) {
        return { settings: true };
      }
      if (activeGroup) {
        return { [activeGroup.label]: true };
      }
      return {};
    });
    setProfileOpen(false);
    setNotifOpen(false);
  }, [groups, location.pathname]);

  if (!store.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const utilities = utilityNav.filter((item) => store.allow(item.permission));
  const settings = settingsNav.filter((item) => store.allow(item.permission));
  const roleNotes = store.data.notifications.filter((n) =>
    n.audienceRoles.includes(store.role),
  );
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
  const flatDevNav = developerNav.filter((item) => store.allow(item.permission));

  const messageBadge = isDeveloper ? Math.max(unread, 3) : unread;

  return (
    <div className={`shell${isDeveloper ? " shell-dev" : ""}`}>
      <aside className={`sidebar${isDeveloper ? " sidebar-dev" : ""}`}>
        <div className="brand">
          <img src="/logo.jpeg" alt="RoyalTech Innovation" className="brand-logo" />
          <div>
            <p className="brand-kicker">{isDeveloper ? "RoyalTech" : "Innovation CRM"}</p>
            <h1 className="brand-name">
              {isDeveloper
                ? "Innovation"
                : store.data.organization?.name?.split(" ")[0] || "RoyalTech"}
            </h1>
          </div>
        </div>

        <nav className={`nav${isDeveloper ? " nav-flat" : ""}`}>
          {isDeveloper ? (
            flatDevNav.map((item) => {
              const Lucide = developerLucide[item.path] || Home;
              return (
                <NavLink
                  key={`${item.path}-${item.label}`}
                  to={item.path}
                  end={item.path === "/" || item.path === "/projects"}
                  className={({ isActive }) =>
                    `nav-link${isActive ? " is-active" : ""}`
                  }
                >
                  <Lucide className="nav-ico lucide" size={18} strokeWidth={2} />
                  <span>{item.label}</span>
                  {item.path === "/notifications" && unread > 0 ? (
                    <span className="nav-badge">{unread}</span>
                  ) : null}
                  {item.path === "/dev/messages" ? (
                    <span className="nav-badge">{Math.min(messageBadge, 9)}</span>
                  ) : null}
                </NavLink>
              );
            })
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

              <p className="nav-section">Pages</p>

              {groups.map((group) => {
                const open = openGroups[group.label] ?? false;
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
                        <span>{group.label}</span>
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
                            <span>{item.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              <p className="nav-section">Applications</p>

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
            <div className="session-avatar" aria-hidden>
              {store.currentUser.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
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
        <header className={`topbar${isDeveloper ? " topbar-dev" : ""}`}>
          {!isDeveloper ? (
            <div className="topbar-title">
              <p className="topbar-kicker">RoyalTech CRM</p>
              <h2>{title}</h2>
            </div>
          ) : (
            <div className="topbar-title topbar-title-spacer" aria-hidden="true" />
          )}

          <label className="topbar-search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="m20 20-3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                isDeveloper ? "Search tasks, projects..." : "Search for something"
              }
              aria-label="Search"
            />
          </label>

          <div className="topbar-actions">
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
                className={`topbar-profile${isDeveloper ? " topbar-profile-compact" : ""}`}
                aria-expanded={profileOpen}
                onClick={() => {
                  setProfileOpen((v) => !v);
                  setNotifOpen(false);
                }}
              >
                <span className="topbar-avatar">{store.currentUser.avatarInitials}</span>
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
                    <span className="topbar-avatar lg">{store.currentUser.avatarInitials}</span>
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

        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
