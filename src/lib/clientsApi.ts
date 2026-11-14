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

export interface ApiClient {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  accountManagerId: string;
  accountManagerName: string;
  accountManagerInitials: string;
  status: "active" | "inactive" | string;
  createdAt: string;
}

export function fetchClients(opts?: { managerId?: string; teamManagerId?: string }) {
  const params = new URLSearchParams();
  if (opts?.managerId) params.set("managerId", opts.managerId);
  if (opts?.teamManagerId) params.set("teamManagerId", opts.teamManagerId);
  const q = params.toString() ? `?${params}` : "";
  return request<{ mode: string; scope?: string; clients: ApiClient[] }>(`/api/clients${q}`);
}

export function createClientApi(input: {
  name: string;
  company: string;
  email: string;
  phone?: string;
  accountManagerId?: string;
  status?: string;
}) {
  return request<{ mode: string; client: ApiClient }>("/api/clients", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
