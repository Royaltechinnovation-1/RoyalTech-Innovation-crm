 export function buildHrDashboard({ employees, candidates, leaveRequests }) {
  const active = employees.filter((e) => e.status === "active");
  const onboarding = employees.filter((e) => e.status === "onboarding");
  const pendingLeave = leaveRequests.filter((l) => l.status === "pending");
  const byDepartment = employees.reduce((acc, e) => {
    acc[e.department] = (acc[e.department] ?? 0) + 1;
    return acc;
  }, {});
  const empById = Object.fromEntries(employees.map((e) => [e.id, e]));

  return {
    mode: "memory",
    summary: {
      employees: employees.length,
      active: active.length,
      onboarding: onboarding.length,
      candidates: candidates.length,
      pendingLeave: pendingLeave.length,
      payrollMonthly: Math.round(
        employees.reduce((s, e) => s + Number(e.salary || 0), 0) / 12,
      ),
    },
    byDepartment,
    recruitment: Object.entries(
      candidates.reduce((acc, c) => {
        acc[c.stage] = (acc[c.stage] ?? 0) + 1;
        return acc;
      }, {}),
    ).map(([stage, count]) => ({ stage, count })),
    recentEmployees: [...employees]
      .sort((a, b) => String(b.join_date).localeCompare(String(a.join_date)))
      .slice(0, 6),
    leaveQueue: leaveRequests.map((l) => ({
      ...l,
      employee_name: empById[l.employee_id]?.name ?? "—",
      leave_type: l.leave_type ?? l.type,
      date_from: l.date_from ?? l.from,
      date_to: l.date_to ?? l.to,
    })),
    candidates: candidates.slice(0, 6),
  };
}
