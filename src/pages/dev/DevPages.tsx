import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { CrmStore } from "../../data/store";
import { formatDate } from "../../lib/format";
import { RequirePermission } from "../../components/RequirePermission";
import { PageHeader, Tag } from "../../components/ui";
import type { Permission } from "../../lib/permissions";

function DevShell({
  store,
  permission,
  title,
  lede,
  children,
}: {
  store: CrmStore;
  permission: Permission;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <RequirePermission store={store} permission={permission}>
      <div className="page">
        <PageHeader eyebrow="Developer workspace" title={title} lede={lede} />
        {children}
      </div>
    </RequirePermission>
  );
}

export function DevTaskDetails({ store }: { store: CrmStore }) {
  const tasks = store.visibleTasks;
  return (
    <DevShell
      store={store}
      permission="projects.tasks"
      title="Task Details"
      lede="Full detail for every task assigned to you."
    >
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Project</th>
              <th>Status</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const project = store.data.projects.find((p) => p.id === task.projectId);
              return (
                <tr key={task.id}>
                  <td>
                    <strong>{task.title}</strong>
                  </td>
                  <td>{project?.name ?? "—"}</td>
                  <td>
                    <Tag
                      tone={
                        task.status === "done"
                          ? "sage"
                          : task.status === "blocked"
                            ? "danger"
                            : "gold"
                      }
                    >
                      {task.status}
                    </Tag>
                  </td>
                  <td>{formatDate(task.dueDate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: 12 }}>
        <Link className="btn btn-secondary" to="/projects/tasks">
          Open task board
        </Link>
      </p>
    </DevShell>
  );
}

export function DevWorkUpdates({ store }: { store: CrmStore }) {
  const updates = store.visibleTasks.slice(0, 6).map((t) => ({
    id: t.id,
    text: `Status set to ${t.status} · ${t.title}`,
    when: formatDate(t.dueDate),
  }));
  return (
    <DevShell
      store={store}
      permission="projects"
      title="Work Updates"
      lede="Recent progress notes from your assigned work."
    >
      <div className="list">
        {updates.map((u) => (
          <div className="list-row" key={u.id}>
            <div>
              <p className="list-title">{u.text}</p>
              <p className="list-sub">{u.when}</p>
            </div>
          </div>
        ))}
        {updates.length === 0 ? <p className="muted">No updates yet.</p> : null}
      </div>
    </DevShell>
  );
}

export { DeveloperDailyReport as DevDailyReport } from "./DeveloperDailyReport";
export { DeveloperCalendar as DevCalendar } from "./DeveloperCalendar";
export { DeveloperMessages as DevMessages } from "./DeveloperMessages";

export { DeveloperBugs as DevBugs } from "./DeveloperBugs";

export { DeveloperDocuments as DevDocuments } from "./DeveloperDocuments";

export { DeveloperGithub as DevGithub } from "./DeveloperGithub";
