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

export type ProposalStatus = "draft" | "sent" | "pending" | "accepted" | "rejected";

export interface ApiProposal {
  id: string;
  code: string;
  leadId: string;
  leadCode: string;
  leadName: string;
  leadCompany: string;
  leadEmail: string;
  title: string;
  amount: number;
  status: ProposalStatus | string;
  validUntil: string | null;
  body: string;
  createdAt: string | null;
  lastSentAt?: string | null;
}

export interface ProposalsPayload {
  mode: string;
  mail: {
    connected: boolean;
    provider: string;
    fromEmail: string | null;
    message: string;
  };
  summary: {
    total: number;
    totalValue: number;
    accepted: number;
    pending: number;
    draft: number;
    rejected: number;
  };
  proposals: ApiProposal[];
}

export function fetchProposals() {
  return request<ProposalsPayload>("/api/proposals");
}

export function createProposalApi(input: {
  title: string;
  leadId: string;
  amount: number;
  validUntil?: string;
  body?: string;
}) {
  return request<{ mode: string; proposal: ApiProposal }>("/api/proposals", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function patchProposalStatus(id: string, status: ProposalStatus) {
  return request<{ mode: string; proposal: ApiProposal }>(
    `/api/proposals/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

export function sendProposalMailApi(
  id: string,
  input: { to: string; subject: string; message: string },
) {
  return request<{
    mode: string;
    mailed: boolean;
    queued: boolean;
    mail: ProposalsPayload["mail"];
    log: { id: string; to: string; subject: string; status: string; message: string };
    preview: { to: string; subject: string; message: string };
    proposal: ApiProposal;
  }>(`/api/proposals/${encodeURIComponent(id)}/send`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
