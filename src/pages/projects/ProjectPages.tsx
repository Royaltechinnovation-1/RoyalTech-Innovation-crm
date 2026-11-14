import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { CrmStore } from "../../data/store";
import type { TaskStatus } from "../../types";
import { formatCurrency, formatDate } from "../../lib/format";
import {
  assignDevTaskApi,
  createDevTaskApi,
  fetchDevDashboard,
  type DevDashboardData,
} from "../../lib/moduleApi";
import { DbBadge, ModuleShell } from "../../components/DbWidgets";
import { Field, Input, PageHeader, Panel, Select, Tag, Widget } from "../../components/ui";
import { RequirePermission } from "../../components/RequirePermission";
import { DeveloperProjects } from "../dev/DeveloperProjects";
import { DeveloperTasks } from "../dev/DeveloperTasks";
import {
  PmMilestones,
  PmProjects,
  PmReports,
  PmTasks,
  PmWorkload,
  syncCreateDeveloper,
} from "../dev/PmCrmPages";

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
    return <PmProjects store={store} />;
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
  if (store.role === "project_manager") {
    return <PmTasks store={store} />;
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
  const isPm = store.role === "project_manager";
  const managerId = store.currentUser.id;

  const myProjects = isPm
    ? store.visibleProjects
    : store.data.projects;
  const developers = isPm
    ? store.teamDevelopers
    : store.data.users.filter((u) => u.role === "developer");

  const [query, setQuery] = useState("");
  const [sortAz, setSortAz] = useState(true);
  const [modal, setModal] = useState<"developer" | "task" | null>(null);
  const [devForm, setDevForm] = useState({ name: "", email: "", password: "" });
  const [taskForm, setTaskForm] = useState({
    projectId: myProjects[0]?.id ?? "",
    title: "",
    assigneeId: developers[0]?.id ?? "",
    dueDate: new Date().toISOString().slice(0, 10),
  });
  const [devErr, setDevErr] = useState("");
  const [taskErr, setTaskErr] = useState("");
  const [toast, setToast] = useState("");
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string; name: string } | null>(
    null,
  );
  const [savingDev, setSavingDev] = useState(false);
  const [savingTask, setSavingTask] = useState(false);

  const defaultProjectId = myProjects[0]?.id ?? "";
  const defaultDevId = developers[0]?.id ?? "";
  useEffect(() => {
    setTaskForm((prev) => ({
      ...prev,
      projectId: prev.projectId || defaultProjectId,
      assigneeId: prev.assigneeId || defaultDevId,
    }));
  }, [defaultProjectId, defaultDevId]);

  const filteredDevs = [...developers]
    .filter((d) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return `${d.id} ${d.name} ${d.email}`.toLowerCase().includes(q);
    })
    .sort((a, b) => (sortAz ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));

  const assignmentRows = myProjects.flatMap((project) =>
    store.data.tasks
      .filter((t) => t.projectId === project.id)
      .map((task) => ({
        task,
        project,
        user: store.data.users.find((u) => u.id === task.assigneeId),
      })),
  );

  const onCreateDeveloper = async (e: FormEvent) => {
    e.preventDefault();
    setSavingDev(true);
    setDevErr("");
    const local = await syncCreateDeveloper(store, { ...devForm, managerId });
    if (!local.ok) {
      setDevErr(local.error);
      setSavingDev(false);
      return;
    }
    setCreatedCreds({ name: local.name, email: local.email, password: local.password });
    setToast(`Developer login created for ${local.name}`);
    setDevForm({ name: "", email: "", password: "" });
    setSavingDev(false);
    setModal(null);
  };

  const onAssignTask = async (e: FormEvent) => {
    e.preventDefault();
    setSavingTask(true);
    setTaskErr("");
    let apiId: string | undefined;
    try {
      const api = await createDevTaskApi(taskForm);
      apiId = api.task.id;
    } catch {
      /* local still works */
    }
    const local = store.createTask({ ...taskForm, id: apiId });
    if (!local.ok) {
      setTaskErr(local.error);
      setSavingTask(false);
      return;
    }
    const who = store.data.users.find((u) => u.id === taskForm.assigneeId)?.name ?? "developer";
    setToast(`Task assigned to ${who}`);
    setTaskForm((prev) => ({
      ...prev,
      title: "",
      dueDate: new Date().toISOString().slice(0, 10),
    }));
    setSavingTask(false);
    setModal(null);
  };

  return (
    <RequirePermission store={store} permission="projects.assign">
      <div className="page ai-page">
        <div className="ai-page-head">
          <div>
            <p className="muted">Delivery / Team</p>
            <h2>Developer Database</h2>
            <p>Clean team list — create logins and assign tasks without heavy color.</p>
          </div>
          <div className="ai-page-actions">
            <button className="btn btn-secondary" type="button" onClick={() => setModal("task")}>
              Assign task
            </button>
            <button className="btn btn-primary" type="button" onClick={() => setModal("developer")}>
              + Add developer
            </button>
          </div>
        </div>

        {toast ? (
          <div className="toast-banner">
            <span className="toast-banner-dot" />
            {toast}
            <a href="#task-list" onClick={() => setToast("")}>
              Dismiss
            </a>
          </div>
        ) : null}

        {createdCreds ? (
          <div className="toast-banner">
            <span className="toast-banner-dot" />
            Share login: {createdCreds.email} / {createdCreds.password}
            <a href="#task-list" onClick={() => setCreatedCreds(null)}>
              Done
            </a>
          </div>
        ) : null}

        <div className="ai-toolbar">
          <div className="ai-toolbar-left">
            <input
              className="ai-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search developers…"
            />
            <button className="ai-chip-btn" type="button">
              Filter
            </button>
            <select
              className="ai-sort"
              value={sortAz ? "az" : "za"}
              onChange={(e) => setSortAz(e.target.value === "az")}
            >
              <option value="az">Sort By A-Z</option>
              <option value="za">Sort By Z-A</option>
            </select>
          </div>
          <div className="ai-toolbar-right">
            <span className="muted">{filteredDevs.length} members</span>
          </div>
        </div>

        <section className="ai-grid">
          {filteredDevs.map((dev) => {
            const open = store.data.tasks.filter(
              (t) => t.assigneeId === dev.id && t.status !== "done",
            ).length;
            return (
              <article className="ai-person" key={dev.id}>
                <div className="ai-person-top">
                  <span className="ai-id">{dev.id.toUpperCase()}</span>
                  <button className="ai-menu" type="button" aria-label="Actions">
                    ⋮
                  </button>
                </div>
                <div className="ai-person-main">
                  <span className="ai-av">{dev.avatarInitials}</span>
                  <div>
                    <strong>{dev.name}</strong>
                    <small>Engineering · {open} open tasks</small>
                  </div>
                </div>
                <div className="ai-person-meta">
                  <div>
                    <span>Email</span>
                    <strong>{dev.email}</strong>
                  </div>
                  <div>
                    <span>Login</span>
                    <strong>Active</strong>
                  </div>
                </div>
                <div className="ai-person-foot">
                  <span className="ai-status on">+ Active</span>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => {
                      setTaskForm((f) => ({ ...f, assigneeId: dev.id }));
                      setModal("task");
                    }}
                  >
                    Assign task
                  </button>
                </div>
              </article>
            );
          })}
          {filteredDevs.length === 0 ? (
            <article className="ai-person">
              <div className="ai-person-main">
                <span className="ai-av">+</span>
                <div>
                  <strong>No developers yet</strong>
                  <small>Create a login with + Add developer</small>
                </div>
              </div>
            </article>
          ) : null}
        </section>

        <section className="ai-table-card" id="task-list">
          <header>
            <h3>Task assignment list</h3>
            <button className="btn btn-secondary" type="button" onClick={() => setModal("task")}>
              + Add task
            </button>
          </header>
          <div className="ai-table-wrap">
            <table className="ai-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Developer</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {assignmentRows.map(({ task, project, user }) => (
                  <tr key={task.id}>
                    <td>
                      <span className="link-id">{task.id.toUpperCase()}</span>
                    </td>
                    <td>{task.title}</td>
                    <td>{project.name}</td>
                    <td>
                      <div className="ai-cell-user">
                        <span className="ai-av">{user?.avatarInitials ?? "?"}</span>
                        <span>{user?.name ?? "—"}</span>
                      </div>
                    </td>
                    <td>{formatDate(task.dueDate)}</td>
                    <td>
                      <span
                        className={`ai-status ${task.status === "done" ? "on" : task.status === "blocked" ? "off" : "on"}`}
                        style={
                          task.status === "doing" || task.status === "todo"
                            ? { background: "#eef3ff", color: "#4b7bf5" }
                            : undefined
                        }
                      >
                        {task.status === "done" ? "+ Done" : task.status}
                      </span>
                    </td>
                    <td>
                      <Select
                        value={task.assigneeId}
                        onChange={async (e) => {
                          const assigneeId = e.target.value;
                          store.assignTask(task.id, assigneeId);
                          try {
                            await assignDevTaskApi(task.id, assigneeId);
                          } catch {
                            /* local still applied */
                          }
                        }}
                      >
                        {developers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </Select>
                    </td>
                  </tr>
                ))}
                {assignmentRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted">
                      No tasks yet. Use Assign task to create one.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        {modal ? (
          <div className="ai-modal-backdrop" role="presentation" onClick={() => setModal(null)}>
            <div
              className="ai-modal"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <header>
                <h3>{modal === "developer" ? "Add developer login" : "Assign task"}</h3>
                <button className="ai-menu" type="button" onClick={() => setModal(null)}>
                  ×
                </button>
              </header>

              {modal === "developer" ? (
                <form className="form-grid" onSubmit={onCreateDeveloper}>
                  <Field label="Full name">
                    <Input
                      value={devForm.name}
                      onChange={(e) => setDevForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Kabir Das"
                      required
                    />
                  </Field>
                  <Field label="Login email">
                    <Input
                      type="email"
                      value={devForm.email}
                      onChange={(e) => setDevForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="name@royaltech.io"
                      required
                    />
                  </Field>
                  <Field label="Temporary password">
                    <Input
                      type="text"
                      value={devForm.password}
                      onChange={(e) => setDevForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="Min 6 characters"
                      minLength={6}
                      required
                    />
                  </Field>
                  <div className="form-actions">
                    <button className="btn btn-secondary" type="button" onClick={() => setModal(null)}>
                      Cancel
                    </button>
                    <button className="btn btn-primary" type="submit" disabled={savingDev}>
                      {savingDev ? "Creating…" : "Create login"}
                    </button>
                  </div>
                  {devErr ? <p className="form-error">{devErr}</p> : null}
                </form>
              ) : (
                <form className="form-grid" onSubmit={onAssignTask}>
                  <Field label="Project">
                    <Select
                      value={taskForm.projectId}
                      onChange={(e) => setTaskForm((f) => ({ ...f, projectId: e.target.value }))}
                      required
                    >
                      {myProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Task title">
                    <Input
                      value={taskForm.title}
                      onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="What should they do?"
                      required
                    />
                  </Field>
                  <Field label="Developer">
                    <Select
                      value={taskForm.assigneeId}
                      onChange={(e) => setTaskForm((f) => ({ ...f, assigneeId: e.target.value }))}
                      required
                    >
                      {developers.length === 0 ? (
                        <option value="">Create a developer first</option>
                      ) : (
                        developers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))
                      )}
                    </Select>
                  </Field>
                  <Field label="Due date">
                    <Input
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))}
                      required
                    />
                  </Field>
                  <div className="form-actions">
                    <button className="btn btn-secondary" type="button" onClick={() => setModal(null)}>
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      type="submit"
                      disabled={savingTask || !developers.length || !myProjects.length}
                    >
                      {savingTask ? "Assigning…" : "Assign task"}
                    </button>
                  </div>
                  {taskErr ? <p className="form-error">{taskErr}</p> : null}
                </form>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </RequirePermission>
  );
}

export function Milestones({ store }: { store: CrmStore }) {
  if (store.role === "project_manager") {
    return <PmMilestones store={store} />;
  }
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
  if (store.role === "project_manager") {
    return <PmWorkload store={store} />;
  }
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
  if (store.role === "project_manager") {
    return <PmReports store={store} />;
  }
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
