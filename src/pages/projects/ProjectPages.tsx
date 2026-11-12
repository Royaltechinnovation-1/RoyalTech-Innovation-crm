import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { CrmStore } from "../../data/store";
import type { TaskStatus } from "../../types";
import { formatCurrency, formatDate } from "../../lib/format";
import { fetchDevDashboard, type DevDashboardData } from "../../lib/moduleApi";
import { DbBadge, ModuleShell } from "../../components/DbWidgets";
import { PageHeader, Panel, Select, Tag, Widget } from "../../components/ui";
import { RequirePermission } from "../../components/RequirePermission";
import { DeveloperProjects } from "../dev/DeveloperProjects";
import { DeveloperTasks } from "../dev/DeveloperTasks";
import { ProjectManagerDashboard } from "../dev/ProjectManagerDashboard";

export function Projects({ store }: { store: CrmStore }) {
  const [data, setData] = useState<DevDashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (store.role === "developer" || store.role === "project_manager") return;
    fetchDevDashboard()
      .then((rows) => {
        setData(rows);
        setError("");
      })
      .catch((err: Error) => setError(err.message));
  }, [store.currentUser.id, store.role]);

  if (store.role === "developer") {
    return <DeveloperProjects store={store} />;
  }
  if (store.role === "project_manager") {
    return <ProjectManagerDashboard store={store} />;
  }

  return (
    <RequirePermission store={store} permission="projects">
      <div className="page">
        <PageHeader
          eyebrow="Project management"
          title="Development Dashboard"
          lede={
            store.role === "developer"
              ? "Your assigned projects and tasks from the database."
              : "Delivery portfolio, workload, and deadlines from MySQL."
          }
          actions={
            <>
              <DbBadge mode={data?.mode} />
              <Link className="btn btn-secondary" to="/projects/tasks">
                Tasks
              </Link>
              <Link className="btn btn-primary" to="/projects/milestones">
                Milestones
              </Link>
            </>
          }
        />

        <ModuleShell error={error} loading={!error && !data}>
          {data ? (
            <>
              <section className="stat-row sales-stat-row">
                <Widget label="Active projects" value={data.summary.activeProjects} meta={`${data.summary.projects} total`} accent="gold" />
                <Widget label="Open tasks" value={data.summary.openTasks} meta={`${data.summary.doing} in progress`} accent="sage" />
                <Widget label="Blocked" value={data.summary.blocked} meta="Needs unblock" accent="forest" />
                <Widget label="Avg progress" value={`${data.summary.avgProgress}%`} meta={formatCurrency(data.summary.budget)} accent="mist" />
              </section>

              <section className="sales-grid">
                <Panel title="Projects">
                  <div className="list">
                    {data.projects.map((project) => (
                      <div className="list-row" key={project.id}>
                        <div>
                          <p className="list-title">{project.name}</p>
                          <p className="list-sub">
                            {project.manager_name} · due {formatDate(String(project.deadline))} · {project.open_tasks} open tasks
                          </p>
                          <div className="progress" style={{ marginTop: 8 }}>
                            <span style={{ width: `${project.progress}%` }} />
                          </div>
                        </div>
                        <div className="list-end">
                          <Tag tone={project.status === "active" ? "sage" : "mist"}>{project.status}</Tag>
                          <strong>{project.progress}%</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel title="Team workload" dark>
                  <div className="list">
                    {data.workload.map((person) => (
                      <div className="list-row" key={person.id}>
                        <div>
                          <p className="list-title">{person.name}</p>
                          <p className="list-sub">{person.role.replaceAll("_", " ")}</p>
                        </div>
                        <Tag tone={person.open > 2 ? "gold" : "sage"}>{person.open} open</Tag>
                      </div>
                    ))}
                  </div>
                </Panel>
              </section>

              <Panel title="Task board" action={<Link to="/projects/tasks">Open tasks</Link>}>
                <div className="list">
                  {data.tasks.slice(0, 8).map((task) => (
                    <div className="list-row" key={task.id}>
                      <div>
                        <p className="list-title">{task.title}</p>
                        <p className="list-sub">
                          {task.project_name} · {task.assignee_name} · due {formatDate(String(task.due_date))}
                        </p>
                      </div>
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
                    </div>
                  ))}
                </div>
              </Panel>
            </>
          ) : null}
        </ModuleShell>
      </div>
    </RequirePermission>
  );
}

export function ProjectTasks({ store }: { store: CrmStore }) {
  if (store.role === "developer") {
    return <DeveloperTasks store={store} />;
  }

  const tasks = store.visibleTasks;

  return (
    <RequirePermission store={store} permission="projects.tasks">
      <div className="page">
        <PageHeader
          eyebrow="Project management"
          title="Tasks & Subtasks"
          lede="Team tasks across all projects."
        />
        <div className="task-list">
          {tasks.map((task) => {
            const project = store.data.projects.find((p) => p.id === task.projectId);
            const assignee = store.data.users.find((u) => u.id === task.assigneeId);
            return (
              <article className="task-row" key={task.id}>
                <div>
                  <p className="list-title">{task.title}</p>
                  <p className="list-sub">
                    {project?.name} · {assignee?.name} · due {formatDate(task.dueDate)}
                  </p>
                </div>
                <div className="task-end">
                  <Select
                    value={task.status}
                    onChange={(e) =>
                      store.updateTaskStatus(task.id, e.target.value as TaskStatus)
                    }
                  >
                    <option value="todo">To do</option>
                    <option value="doing">Doing</option>
                    <option value="blocked">Blocked</option>
                    <option value="done">Done</option>
                  </Select>
                  <Tag tone={task.status === "done" ? "sage" : task.status === "blocked" ? "danger" : "gold"}>
                    {task.status}
                  </Tag>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </RequirePermission>
  );
}

export function ProjectAssignments({ store }: { store: CrmStore }) {
  return (
    <RequirePermission store={store} permission="projects.assign">
      <div className="page">
        <PageHeader eyebrow="Project management" title="Project Assignments" />
        <div className="split">
          {store.data.projects.map((project) => {
            const assigned = store.data.tasks.filter((t) => t.projectId === project.id);
            return (
              <Panel key={project.id} title={project.name}>
                <div className="list">
                  {assigned.map((task) => {
                    const user = store.data.users.find((u) => u.id === task.assigneeId);
                    return (
                      <div className="list-row" key={task.id}>
                        <p className="list-title">{user?.name}</p>
                        <span className="muted">{task.title}</span>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            );
          })}
        </div>
      </div>
    </RequirePermission>
  );
}

export function Milestones({ store }: { store: CrmStore }) {
  return (
    <RequirePermission store={store} permission="projects.milestones">
      <div className="page">
        <PageHeader eyebrow="Project management" title="Deadlines & Milestones" />
        <div className="task-list">
          {[...store.data.projects]
            .sort((a, b) => a.deadline.localeCompare(b.deadline))
            .map((project) => (
              <article className="task-row" key={project.id}>
                <div>
                  <p className="list-title">{project.name}</p>
                  <p className="list-sub">{project.progress}% complete</p>
                </div>
                <Tag tone="gold">Due {formatDate(project.deadline)}</Tag>
              </article>
            ))}
        </div>
      </div>
    </RequirePermission>
  );
}

export function Workload({ store }: { store: CrmStore }) {
  const people = store.data.users.filter(
    (u) => u.role === "developer" || u.role === "project_manager",
  );

  return (
    <RequirePermission store={store} permission="projects.workload">
      <div className="page">
        <PageHeader eyebrow="Project management" title="Team Workload" />
        <section className="stat-row">
          {people.map((person) => {
            const open = store.data.tasks.filter(
              (t) => t.assigneeId === person.id && t.status !== "done",
            ).length;
            return (
              <Widget
                key={person.id}
                label={person.name}
                value={open}
                meta="Open tasks"
                accent={open > 2 ? "gold" : "sage"}
              />
            );
          })}
        </section>
      </div>
    </RequirePermission>
  );
}

export function ProjectReports({ store }: { store: CrmStore }) {
  return (
    <RequirePermission store={store} permission="projects.reports">
      <div className="page">
        <PageHeader eyebrow="Project management" title="Project Reports" />
        <section className="stat-row">
          <Widget label="Active" value={store.data.projects.filter((p) => p.status === "active").length} meta="In flight" />
          <Widget label="Planned" value={store.data.projects.filter((p) => p.status === "planned").length} meta="Upcoming" accent="gold" />
          <Widget
            label="Budget"
            value={formatCurrency(store.data.projects.reduce((s, p) => s + p.budget, 0))}
            meta="All projects"
            accent="forest"
          />
          <Widget
            label="Avg progress"
            value={`${Math.round(store.data.projects.reduce((s, p) => s + p.progress, 0) / store.data.projects.length)}%`}
            meta="Portfolio"
            accent="mist"
          />
        </section>
      </div>
    </RequirePermission>
  );
}
