const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface SalesDashboardData {
  mode: "mysql" | "memory";
  summary: {
    totalLeads: number;
    openDeals: number;
    pipelineValue: number;
    wonDeals: number;
    wonValue: number;
    lostDeals: number;
    conversion: number;
    clients: number;
    followUps: number;
  };
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  recentLeads: Array<{
    id: string;
    lead_id: string;
    company: string;
    name: string;
    status: string;
    value: number;
    owner_name: string;
    next_follow_up?: string | null;
  }>;
  followUps: Array<{
    id: string;
    lead_id: string;
    company: string;
    name: string;
    next_follow_up: string;
    owner_name: string;
    value: number;
  }>;
  recentActivities: Array<{
    id: string;
    title: string;
    activity_type: string;
    activity_date: string;
    owner_name: string;
    lead_company: string;
  }>;
}

export interface SalesTeamRow {
  id: string;
  name: string;
  role: string;
  managerId?: string | null;
  openLeads: number;
  wonLeads: number;
  pipelineValue: number;
  wonValue: number;
  target: number;
  achieved: number;
  period: string;
}

export interface SalesTargetRow {
  id: string;
  ownerId: string;
  ownerName: string;
  period: string;
  target: number;
  achieved: number;
  percent: number;
}

export interface SalesReportsData {
  won: number;
  lost: number;
  wonValue: number;
  bySource: Array<{ source: string; count: number }>;
  revenueByOwner: Array<{ owner: string; revenue: number }>;
}

export function fetchSalesDashboard(opts?: { ownerId?: string; teamManagerId?: string }) {
  const params = new URLSearchParams();
  if (opts?.ownerId) params.set("ownerId", opts.ownerId);
  if (opts?.teamManagerId) params.set("teamManagerId", opts.teamManagerId);
  const q = params.toString() ? `?${params}` : "";
  return getJson<SalesDashboardData>(`/api/sales/dashboard${q}`);
}

export function fetchSalesTeam(opts?: { teamManagerId?: string }) {
  const q = opts?.teamManagerId
    ? `?teamManagerId=${encodeURIComponent(opts.teamManagerId)}`
    : "";
  return getJson<SalesTeamRow[]>(`/api/sales/team${q}`);
}

export function fetchSalesTargets() {
  return getJson<SalesTargetRow[]>("/api/sales/targets");
}

export function fetchSalesReports() {
  return getJson<SalesReportsData>("/api/sales/reports");
}

export function fetchHealth() {
  return getJson<{ ok: boolean; database: string; message: string }>("/api/health");
}
