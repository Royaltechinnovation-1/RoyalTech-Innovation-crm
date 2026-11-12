const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface ApiLead {
  id: string;
  leadId: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  ownerId: string;
  ownerName: string;
  value: number;
  notes: string;
  nextFollowUp?: string | null;
  createdAt: string;
  sheetRowId?: string | null;
}

export interface SheetBridgeData {
  mode: "mysql" | "memory";
  config: {
    id: string;
    spreadsheetId: string;
    sheetName: string;
    enabled: boolean;
    lastSyncedAt?: string | null;
  };
  logs: Array<{
    id: string;
    leadId: string;
    status: string;
    message: string;
    createdAt: string;
  }>;
  leads: ApiLead[];
  syncSummary?: {
    processed: number;
    results?: Array<{ leadId: string; status: string }>;
    pushedRowLinks?: number;
  };
}

export function fetchLeads(opts?: { ownerId?: string; teamManagerId?: string }) {
  const params = new URLSearchParams();
  if (opts?.ownerId) params.set("ownerId", opts.ownerId);
  if (opts?.teamManagerId) params.set("teamManagerId", opts.teamManagerId);
  const q = params.toString() ? `?${params}` : "";
  return request<{ mode: string; scope?: string; leads: ApiLead[] }>(`/api/leads${q}`);
}

export function patchLeadStatus(id: string, status: string, ownerId?: string) {
  return request<{ mode: string; lead: ApiLead }>(`/api/leads/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...(ownerId ? { ownerId } : {}) }),
  });
}

export function patchLeadOwner(id: string, ownerId: string) {
  return request<{ mode: string; lead: ApiLead }>(`/api/leads/${encodeURIComponent(id)}/owner`, {
    method: "PATCH",
    body: JSON.stringify({ ownerId }),
  });
}

export function fetchSheetBridge() {
  return request<SheetBridgeData>("/api/sheets");
}

export function saveSheetConfig(input: {
  spreadsheetId: string;
  sheetName: string;
  enabled?: boolean;
}) {
  return request<SheetBridgeData>("/api/sheets/config", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function runSheetSyncApi() {
  return request<SheetBridgeData>("/api/sheets/sync", { method: "POST" });
}
