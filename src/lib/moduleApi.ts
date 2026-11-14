const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchHrDashboard() {
  return getJson<HrDashboardData>("/api/hr/dashboard");
}

export function fetchDevDashboard(params?: { assigneeId?: string; managerId?: string }) {
  const q = new URLSearchParams();
  if (params?.assigneeId) q.set("assigneeId", params.assigneeId);
  if (params?.managerId) q.set("managerId", params.managerId);
  const suffix = q.toString() ? `?${q}` : "";
  return getJson<DevDashboardData>(`/api/dev/dashboard${suffix}`);
}

export function createDeveloperApi(input: {
  name: string;
  email: string;
  password: string;
  managerId: string;
}) {
  return sendJson<{
    mode: string;
    developer: {
      id: string;
      name: string;
      email: string;
      role: string;
      department: string;
      avatarInitials: string;
      managerId: string;
      managerName: string;
    };
    credentials: { email: string; password: string };
  }>("/api/dev/developers", "POST", input);
}

export function createDevTaskApi(input: {
  projectId: string;
  title: string;
  assigneeId: string;
  dueDate: string;
  status?: string;
}) {
  return sendJson<{
    mode: string;
    task: {
      id: string;
      projectId: string;
      title: string;
      assigneeId: string;
      status: string;
      dueDate: string;
      projectName: string;
      assigneeName: string;
    };
  }>("/api/dev/tasks", "POST", input);
}

export function assignDevTaskApi(taskId: string, assigneeId: string) {
  return sendJson<{
    mode: string;
    task: {
      id: string;
      projectId: string;
      title: string;
      assigneeId: string;
      status: string;
      dueDate: string;
      projectName: string;
      assigneeName: string;
    };
  }>(`/api/dev/tasks/${encodeURIComponent(taskId)}`, "PATCH", { assigneeId });
}

export function fetchSuperAdminDashboard() {
  return getJson<SuperAdminDashboardData>("/api/superadmin/dashboard");
}

export type UserSettingsData = {
  userId: string;
  fullName: string;
  email: string;
  department: string;
  role?: string;
  language: string;
  timezone: string;
  theme: string;
  density: string;
  twoFactor: boolean;
  showOnline: boolean;
  notifyTasks: boolean;
  notifyProjects: boolean;
  notifyBugs: boolean;
  notifyMessages: boolean;
  notifyTeam: boolean;
  hasPassword?: boolean;
  updatedAt?: string;
  mode?: string;
  profile?: {
    id: string;
    name: string;
    email: string;
    department: string;
    password?: string;
  };
  message?: string;
};

async function sendJson<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data as T;
}

export function fetchUserSettings(userId: string) {
  return getJson<UserSettingsData>(`/api/settings/user?userId=${encodeURIComponent(userId)}`);
}

export function saveUserSettings(payload: Partial<UserSettingsData> & { userId: string; password?: string }) {
  return sendJson<UserSettingsData>("/api/settings/user", "PUT", payload);
}

export function changeUserPassword(payload: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}) {
  return sendJson<UserSettingsData>("/api/settings/password", "POST", payload);
}

export interface HrDashboardData {
  mode: string;
  summary: {
    employees: number;
    active: number;
    onboarding: number;
    candidates: number;
    pendingLeave: number;
    payrollMonthly: number;
  };
  byDepartment: Record<string, number>;
  recruitment: Array<{ stage: string; count: number }>;
  recentEmployees: Array<{
    id: string;
    name: string;
    role_title: string;
    department: string;
    status: string;
    join_date: string;
  }>;
  leaveQueue: Array<{
    id: string;
    employee_name: string;
    leave_type: string;
    date_from: string;
    date_to: string;
    status: string;
  }>;
  candidates: Array<{
    id: string;
    name: string;
    role_title: string;
    stage: string;
    email: string;
  }>;
}

export interface DevDashboardData {
  mode: string;
  summary: {
    projects: number;
    activeProjects: number;
    tasks: number;
    openTasks: number;
    doing: number;
    blocked: number;
    completed?: number;
    pending?: number;
    overdue?: number;
    dueSoon?: number;
    teamSize?: number;
    pendingApprovals?: number;
    avgProgress: number;
    budget: number;
    completionRate?: number;
  };
  projects: Array<{
    id: string;
    name: string;
    status: string;
    progress: number;
    deadline: string;
    budget: number;
    manager_name: string;
    open_tasks: number;
    done_tasks?: number;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    due_date: string;
    project_name: string;
    assignee_name: string;
  }>;
  workload: Array<{
    id: string;
    name: string;
    role: string;
    open: number;
    done?: number;
    blocked?: number;
    total?: number;
    availability?: string;
  }>;
  weekPerformance?: Array<{ day: string; value: number }>;
  pendingApprovals?: Array<{
    id: string;
    title: string;
    status: string;
    who: string;
    project: string;
    due_date: string;
  }>;
  dueSoon?: Array<{
    id: string;
    title: string;
    due_date: string;
    status: string;
    project_name: string;
    assignee_name: string;
  }>;
}

export interface SuperAdminDashboardData {
  mode: string;
  summary: {
    leads: number;
    pipeline: number;
    employees: number;
    activeProjects: number;
    revenue: number;
    pendingPayments: number;
    enquiries: number;
    users: number;
    pendingLeave: number;
    openTasks: number;
  };
  modules: Array<{ key: string; label: string; value: number; meta: string }>;
  recentLeads: Array<{
    id: string;
    lead_id: string;
    company: string;
    status: string;
    value: number;
  }>;
  projectPulse: Array<{
    id: string;
    name: string;
    progress: number;
    deadline: string;
    status: string;
  }>;
  alerts: Array<{ type: string; title: string; id: string }>;
}
