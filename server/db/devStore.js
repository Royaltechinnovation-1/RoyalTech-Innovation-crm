export function buildDevDashboard({
  projects,
  tasks,
  users,
  assigneeId,
  managerOnly,
}) {
  const usersById = Object.fromEntries(users.map((u) => [u.id, u]));
  let scopedProjects = projects;
  let scopedTasks = tasks;

  if (assigneeId) {
    scopedTasks = tasks.filter((t) => t.assignee_id === assigneeId);
    const projectIds = new Set(scopedTasks.map((t) => t.project_id));
    scopedProjects = projects.filter((p) => projectIds.has(p.id));
  } else if (managerOnly) {
    scopedProjects = projects.filter((p) => p.manager_id === managerOnly);
    const ids = new Set(scopedProjects.map((p) => p.id));
    scopedTasks = tasks.filter((t) => ids.has(t.project_id));
  }

  const openTasks = scopedTasks.filter((t) => t.status !== "done");
  const blocked = scopedTasks.filter((t) => t.status === "blocked");
  const doing = scopedTasks.filter((t) => t.status === "doing");
  const activeProjects = scopedProjects.filter((p) => p.status === "active");

  return {
    mode: "memory",
    summary: {
      projects: scopedProjects.length,
      activeProjects: activeProjects.length,
      tasks: scopedTasks.length,
      openTasks: openTasks.length,
      doing: doing.length,
      blocked: blocked.length,
      avgProgress: scopedProjects.length
        ? Math.round(
            scopedProjects.reduce((s, p) => s + Number(p.progress), 0) /
              scopedProjects.length,
          )
        : 0,
      budget: scopedProjects.reduce((s, p) => s + Number(p.budget), 0),
    },
    projects: scopedProjects.map((p) => ({
      ...p,
      manager_name: usersById[p.manager_id]?.name ?? "—",
      open_tasks: tasks.filter(
        (t) => t.project_id === p.id && t.status !== "done",
      ).length,
    })),
    tasks: scopedTasks
      .slice()
      .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
      .map((t) => ({
        ...t,
        project_name: projects.find((p) => p.id === t.project_id)?.name ?? "—",
        assignee_name: usersById[t.assignee_id]?.name ?? "—",
      })),
    workload: users
      .filter((u) => u.role === "developer" || u.role === "project_manager")
      .map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        open: tasks.filter((t) => t.assignee_id === u.id && t.status !== "done")
          .length,
      })),
  };
}
