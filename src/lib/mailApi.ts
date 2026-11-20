const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type MailAccountKind = "titan" | "personal";

export interface MailAccountPublic {
  kind: MailAccountKind;
  label: string;
  enabled: boolean;
  email: string | null;
  host: string;
  port: number;
  secure: boolean;
  connectedAt: string | null;
  lastError: string | null;
  hasPassword: boolean;
}

export interface MailStatus {
  mode: string;
  connected: boolean;
  active: MailAccountKind;
  provider: string;
  fromEmail: string | null;
  message: string;
  accounts: {
    titan: MailAccountPublic;
    personal: MailAccountPublic;
  };
  presets: {
    titan: { label: string; host: string; port: number; secure: boolean };
    personal: { label: string; host: string; port: number; secure: boolean };
  };
}

export function fetchMailStatus() {
  return request<MailStatus>("/api/mail/status");
}

export function saveMailAccount(
  kind: MailAccountKind,
  input: {
    email: string;
    password?: string;
    host?: string;
    port?: number;
    secure?: boolean;
    enabled?: boolean;
    setActive?: boolean;
  },
) {
  return request<MailStatus>(`/api/mail/accounts/${kind}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function activateMailAccount(kind: MailAccountKind) {
  return request<MailStatus>(`/api/mail/accounts/${kind}/activate`, {
    method: "POST",
    body: "{}",
  });
}

export function testMailAccount(kind: MailAccountKind) {
  return request<{ ok: boolean; message: string; mail: MailStatus }>(
    `/api/mail/accounts/${kind}/test`,
    { method: "POST", body: "{}" },
  );
}

export function sendHrMail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  accountKind?: MailAccountKind;
}) {
  return request<{
    mailed: boolean;
    queued: boolean;
    error?: string;
    log: { id: string; to: string; subject: string; status: string; message: string };
    mail: MailStatus;
  }>("/api/mail/send", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
