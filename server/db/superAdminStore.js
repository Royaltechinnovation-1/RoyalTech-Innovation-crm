export function buildSuperAdminDashboard({
  leads,
  employees,
  projects,
  payments,
  invoices,
  enquiries,
  users,
  leaveRequests,
  tasks,
}) {
  const openLeads = leads.filter((l) => l.status !== "won" && l.status !== "lost");
  const revenue = payments
    .filter((p) => p.status === "received")
    .reduce((s, p) => s + Number(p.amount), 0);
  const pendingPay = payments
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + Number(p.amount), 0);
  const activeProjects = projects.filter((p) => p.status === "active");
  const openTasks = tasks.filter((t) => t.status !== "done");

  return {
    mode: "memory",
    summary: {
      leads: leads.length,
      pipeline: openLeads.reduce((s, l) => s + Number(l.value), 0),
      employees: employees.filter((e) => e.status !== "exited").length,
      activeProjects: activeProjects.length,
      revenue,
      pendingPayments: pendingPay,
      enquiries: enquiries.filter((e) => e.status === "new").length,
      users: users.length,
      pendingLeave: leaveRequests.filter((l) => l.status === "pending").length,
      openTasks: openTasks.length,
    },
    modules: [
      { key: "sales", label: "Sales", value: leads.length, meta: "Leads in CRM" },
      { key: "hr", label: "HR", value: employees.length, meta: "Employees" },
      { key: "projects", label: "Development", value: activeProjects.length, meta: "Active projects" },
      { key: "finance", label: "Finance", value: invoices.length, meta: "Invoices" },
      { key: "website", label: "Website", value: enquiries.length, meta: "Enquiries" },
      { key: "users", label: "Users", value: users.length, meta: "Accounts" },
    ],
    recentLeads: [...leads]
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 5),
    projectPulse: activeProjects.slice(0, 5),
    alerts: [
      ...leaveRequests
        .filter((l) => l.status === "pending")
        .map((l) => ({ type: "HR", title: "Leave approval pending", id: l.id })),
      ...invoices
        .filter((i) => i.status === "overdue")
        .map((i) => ({ type: "Finance", title: `${i.number} overdue`, id: i.id })),
      ...tasks
        .filter((t) => t.status === "blocked")
        .map((t) => ({ type: "Dev", title: t.title, id: t.id })),
      ...enquiries
        .filter((e) => e.status === "new")
        .map((e) => ({ type: "Website", title: e.subject, id: e.id })),
    ].slice(0, 8),
  };
}
