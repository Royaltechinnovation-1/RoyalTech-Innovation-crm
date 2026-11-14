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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const openTasks = scopedTasks.filter((t) => t.status !== "done");
  const blocked = scopedTasks.filter((t) => t.status === "blocked");
  const doing = scopedTasks.filter((t) => t.status === "doing");
  const completed = scopedTasks.filter((t) => t.status === "done");
  const pending = scopedTasks.filter((t) => t.status === "todo" || t.status === "blocked");
  const activeProjects = scopedProjects.filter((p) => p.status === "active");
  const overdue = openTasks.filter((t) => {
    const due = new Date(`${String(t.due_date).slice(0, 10)}T12:00:00`);
    return !Number.isNaN(due.getTime()) && due.getTime() < today.getTime();
  });
  const dueSoon = openTasks.filter((t) => {
    const due = new Date(`${String(t.due_date).slice(0, 10)}T12:00:00`);
    if (Number.isNaN(due.getTime())) return false;
    const diff = (due.getTime() - today.getTime()) / 86400000;
    return diff >= 0 && diff <= 7;
  });

  const teamUsers = managerOnly
    ? users.filter(
        (u) =>
          u.role === "developer" &&
          (u.manager_id === managerOnly ||
            scopedTasks.some((t) => t.assignee_id === u.id)),
      )
    : users.filter((u) => u.role === "developer" || u.role === "project_manager");

  const workload = teamUsers.map((u) => {
    const mine = tasks.filter((t) => t.assignee_id === u.id);
    const open = mine.filter((t) => t.status !== "done").length;
    const done = mine.filter((t) => t.status === "done").length;
    const blockedCount = mine.filter((t) => t.status === "blocked").length;
    return {
      id: u.id,
      name: u.name,
      role: u.role,
      open,
      done,
      blocked: blockedCount,
      total: mine.length,
      availability: blockedCount > 0 ? "busy" : open >= 4 ? "busy" : open > 0 ? "online" : "offline",
    };
  });

  // Synthetic weekly delivery pulse for charts (stable from task mix)
  const weekBase = Math.max(openTasks.length * 8, 24);
  const weekPerformance = [
    { day: "Mon", value: weekBase + 6 },
    { day: "Tue", value: weekBase + 14 },
    { day: "Wed", value: weekBase + 8 },
    { day: "Thu", value: weekBase + 22 },
    { day: "Fri", value: weekBase + 16 },
    { day: "Sat", value: Math.round(weekBase * 0.55) },
    { day: "Sun", value: Math.round(weekBase * 0.4) },
  ];

  const pendingApprovals = scopedTasks
    .filter((t) => t.status === "done" || t.status === "blocked")
    .slice(0, 8)
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      who: usersById[t.assignee_id]?.name ?? "—",
      project: projects.find((p) => p.id === t.project_id)?.name ?? "—",
      due_date: t.due_date,
    }));

  return {
    mode: "memory",
    summary: {
      projects: scopedProjects.length,
      activeProjects: activeProjects.length,
      tasks: scopedTasks.length,
      openTasks: openTasks.length,
      doing: doing.length,
      blocked: blocked.length,
      completed: completed.length,
      pending: pending.length,
      overdue: overdue.length,
      dueSoon: dueSoon.length,
      teamSize: workload.length,
      pendingApprovals: pendingApprovals.length,
      avgProgress: scopedProjects.length
        ? Math.round(
            scopedProjects.reduce((s, p) => s + Number(p.progress), 0) /
              scopedProjects.length,
          )
        : 0,
      budget: scopedProjects.reduce((s, p) => s + Number(p.budget), 0),
      completionRate: scopedTasks.length
        ? Math.round((completed.length / scopedTasks.length) * 100)
        : 0,
    },
    projects: scopedProjects.map((p) => ({
      ...p,
      manager_name: usersById[p.manager_id]?.name ?? "—",
      open_tasks: tasks.filter(
        (t) => t.project_id === p.id && t.status !== "done",
      ).length,
      done_tasks: tasks.filter(
        (t) => t.project_id === p.id && t.status === "done",
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
    workload,
    weekPerformance,
    pendingApprovals,
    dueSoon: dueSoon
      .slice()
      .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
      .map((t) => ({
        id: t.id,
        title: t.title,
        due_date: t.due_date,
        status: t.status,
        project_name: projects.find((p) => p.id === t.project_id)?.name ?? "—",
        assignee_name: usersById[t.assignee_id]?.name ?? "—",
      })),
  };
}
