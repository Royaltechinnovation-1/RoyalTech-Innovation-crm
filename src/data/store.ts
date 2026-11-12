import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CrmData,
  Lead,
  LeadStatus,
  SheetConfig,
  SyncLog,
} from "../types";
import { can } from "../lib/permissions";
import { seedData } from "./seed";

const STORAGE_KEY = "royaltech-crm-v5";
const SESSION_KEY = "royaltech-session-v1";

function loadData(): CrmData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(seedData);
    const parsed = JSON.parse(raw) as CrmData;
    if (!parsed.users?.length || !parsed.leads) return structuredClone(seedData);
    // Ensure demo passwords exist after upgrades
    const users = parsed.users.map((user) => {
      const seeded = seedData.users.find((u) => u.id === user.id);
      return {
        ...user,
        password: user.password || seeded?.password || "royaltech123",
      };
    });
    return {
      ...structuredClone(seedData),
      ...parsed,
      users,
      organization: parsed.organization ?? seedData.organization,
    };
  } catch {
    return structuredClone(seedData);
  }
}

function saveData(data: CrmData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadSession(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

function saveSession(userId: string | null) {
  if (!userId) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, userId);
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function nextLeadId(leads: Lead[]) {
  const nums = leads
    .map((l) => Number(l.leadId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 1000) + 1;
  return `RT-${next}`;
}

export function useCrmStore() {
  const [data, setData] = useState<CrmData>(() => loadData());
  const [sessionUserId, setSessionUserId] = useState<string | null>(() => loadSession());

  useEffect(() => {
    saveData(data);
  }, [data]);

  const isAuthenticated = Boolean(sessionUserId);
  const currentUser = useMemo(
    () =>
      data.users.find((u) => u.id === sessionUserId) ??
      data.users.find((u) => u.id === data.currentUserId) ??
      data.users[0],
    [data.currentUserId, data.users, sessionUserId],
  );

  const role = currentUser.role;

  const login = useCallback(
    (email: string, password: string) => {
      const user = data.users.find(
        (u) =>
          u.email.toLowerCase() === email.trim().toLowerCase() &&
          u.password === password,
      );
      if (!user) {
        return { ok: false as const, error: "Invalid email or password." };
      }
      setSessionUserId(user.id);
      saveSession(user.id);
      setData((prev) => ({
        ...prev,
        currentUserId: user.id,
        activityLogs: [
          {
            id: uid("log"),
            actorId: user.id,
            action: `Logged in as ${user.role}`,
            entity: "Session",
            createdAt: new Date().toISOString(),
          },
          ...prev.activityLogs,
        ],
      }));
      return { ok: true as const, user };
    },
    [data.users],
  );

  const logout = useCallback(() => {
    setSessionUserId(null);
    saveSession(null);
  }, []);

  const updateCurrentUser = useCallback(
    (patch: Partial<{ name: string; email: string; department: string; password: string }>) => {
      setData((prev) => {
        const userId = sessionUserId || prev.currentUserId;
        const next = {
          ...prev,
          users: prev.users.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  name: patch.name?.trim() || u.name,
                  email: patch.email?.trim() || u.email,
                  department: patch.department?.trim() || u.department,
                  password: patch.password?.trim() || u.password,
                }
              : u,
          ),
        };
        saveData(next);
        return next;
      });
    },
    [sessionUserId],
  );

  const createOrganization = useCallback(
    (input: {
      organizationName: string;
      industry: string;
      website: string;
      founderName: string;
      email: string;
      password: string;
    }) => {
      const email = input.email.trim().toLowerCase();
      if (data.users.some((u) => u.email.toLowerCase() === email)) {
        return {
          ok: false as const,
          error: "An account with this email already exists. Please sign in.",
        };
      }
      if (input.password.trim().length < 6) {
        return {
          ok: false as const,
          error: "Password must be at least 6 characters.",
        };
      }

      const founderId = uid("u");
      const orgId = uid("org");
      const now = new Date().toISOString();
      const initials = input.founderName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");

      setData((prev) => ({
        ...prev,
        currentUserId: founderId,
        organization: {
          id: orgId,
          name: input.organizationName.trim(),
          industry: input.industry.trim() || "General",
          website: input.website.trim(),
          createdAt: now.slice(0, 10),
          createdBy: founderId,
        },
        users: [
          {
            id: founderId,
            name: input.founderName.trim(),
            email,
            password: input.password,
            role: "founder",
            department: "Super Admin",
            avatarInitials: initials || "RT",
          },
          ...prev.users,
        ],
        employees: [
          {
            id: uid("e"),
            name: input.founderName.trim(),
            email,
            roleTitle: "Super Admin",
            department: "Leadership",
            status: "active",
            joinDate: now.slice(0, 10),
          },
          ...prev.employees,
        ],
        activityLogs: [
          {
            id: uid("log"),
            actorId: founderId,
            action: `Created organization ${input.organizationName.trim()}`,
            entity: "Organization",
            createdAt: now,
          },
          ...prev.activityLogs,
        ],
        notifications: [
          {
            id: uid("n"),
            title: "Workspace ready",
            body: `${input.organizationName.trim()} CRM is live. Invite your team from Settings.`,
            createdAt: now,
            read: false,
            audienceRoles: ["founder"],
          },
          ...prev.notifications,
        ],
      }));

      setSessionUserId(founderId);
      saveSession(founderId);
      return { ok: true as const };
    },
    [data.users],
  );

  const visibleLeads = useMemo(() => {
    if (role === "sales_executive") {
      return data.leads.filter((l) => l.ownerId === currentUser.id);
    }
    if (role === "sales_manager") {
      const teamIds = new Set(
        data.users
          .filter((u) => u.id === currentUser.id || u.managerId === currentUser.id)
          .map((u) => u.id),
      );
      return data.leads.filter((l) => teamIds.has(l.ownerId));
    }
    return data.leads;
  }, [currentUser.id, data.leads, data.users, role]);

  const visibleTasks = useMemo(() => {
    if (role === "developer") {
      return data.tasks.filter((t) => t.assigneeId === currentUser.id);
    }
    return data.tasks;
  }, [currentUser.id, data.tasks, role]);

  const addLead = useCallback(
    (input: Omit<Lead, "id" | "leadId" | "createdAt" | "ownerId"> & { ownerId?: string }) => {
      setData((prev) => {
        const lead: Lead = {
          ...input,
          id: uid("l"),
          leadId: nextLeadId(prev.leads),
          ownerId: input.ownerId ?? prev.currentUserId,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        return {
          ...prev,
          leads: [lead, ...prev.leads],
          activityLogs: [
            {
              id: uid("log"),
              actorId: prev.currentUserId,
              action: `Created lead ${lead.leadId}`,
              entity: lead.company,
              createdAt: new Date().toISOString(),
            },
            ...prev.activityLogs,
          ],
        };
      });
    },
    [],
  );

  const updateLead = useCallback((id: string, patch: Partial<Lead>) => {
    setData((prev) => ({
      ...prev,
      leads: prev.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  }, []);

  const updateLeadStatus = useCallback((id: string, status: LeadStatus) => {
    setData((prev) => {
      const lead = prev.leads.find((l) => l.id === id);
      let clients = prev.clients;
      if (status === "won" && lead) {
        const exists = clients.some((c) => c.email === lead.email);
        if (!exists) {
          clients = [
            {
              id: uid("cl"),
              name: lead.name,
              company: lead.company,
              email: lead.email,
              phone: lead.phone,
              accountManagerId: lead.ownerId,
              status: "active",
              createdAt: new Date().toISOString().slice(0, 10),
            },
            ...clients,
          ];
        }
      }
      return {
        ...prev,
        clients,
        leads: prev.leads.map((l) => (l.id === id ? { ...l, status } : l)),
        activityLogs: [
          {
            id: uid("log"),
            actorId: prev.currentUserId,
            action: `Moved ${lead?.leadId ?? id} to ${status}`,
            entity: "Pipeline",
            createdAt: new Date().toISOString(),
          },
          ...prev.activityLogs,
        ],
      };
    });
  }, []);

  const updateSheetConfig = useCallback((patch: Partial<SheetConfig>) => {
    setData((prev) => ({
      ...prev,
      sheetConfig: { ...prev.sheetConfig, ...patch },
    }));
  }, []);

  const runSheetSync = useCallback(() => {
    setData((prev) => {
      const now = new Date().toISOString();
      const incoming = [
        {
          leadId: "RT-1002",
          name: "Jonah Reeves",
          company: "Cedar & Co",
          email: "jonah@cedar.co",
          phone: "+1 628 441 7720",
          source: "Google Sheet",
          status: "proposal" as LeadStatus,
          value: 61000,
          notes: "Updated from sheet — expanded scope.",
          sheetRowId: "row_18",
        },
        {
          leadId: "RT-1008",
          name: "Maya Chen",
          company: "Lumen Labs",
          email: "maya@lumenlabs.io",
          phone: "+1 415 900 2211",
          source: "Google Sheet",
          status: "new" as LeadStatus,
          value: 15000,
          notes: "Imported from sheet.",
          sheetRowId: "row_33",
        },
        {
          leadId: "RT-DUP",
          name: "Amelia Hart",
          company: "Northpine Studio",
          email: "amelia@northpine.co",
          phone: "+1 415 220 0198",
          source: "Google Sheet",
          status: "negotiation" as LeadStatus,
          value: 24000,
          notes: "Duplicate attempt.",
          sheetRowId: "row_99",
        },
      ];

      const logs: SyncLog[] = [];
      let leads = [...prev.leads];

      for (const row of incoming) {
        const byId = leads.find((l) => l.leadId === row.leadId);
        const byEmail = leads.find(
          (l) => l.email.toLowerCase() === row.email.toLowerCase(),
        );

        if (byId) {
          leads = leads.map((l) =>
            l.leadId === row.leadId
              ? {
                  ...l,
                  value: row.value,
                  notes: row.notes,
                  status: row.status,
                  sheetRowId: row.sheetRowId,
                }
              : l,
          );
          logs.push({
            id: uid("sl"),
            leadId: row.leadId,
            status: "updated",
            message: "Matched by unique leadId and updated CRM record.",
            createdAt: now,
          });
          continue;
        }

        if (byEmail) {
          logs.push({
            id: uid("sl"),
            leadId: byEmail.leadId,
            status: "duplicate",
            message: `Duplicate email ${row.email}; kept existing ${byEmail.leadId}.`,
            createdAt: now,
          });
          continue;
        }

        const created: Lead = {
          id: uid("l"),
          leadId: row.leadId.startsWith("RT-") ? row.leadId : nextLeadId(leads),
          name: row.name,
          company: row.company,
          email: row.email,
          phone: row.phone,
          source: row.source,
          status: row.status,
          ownerId: prev.currentUserId,
          value: row.value,
          notes: row.notes,
          createdAt: now.slice(0, 10),
          sheetRowId: row.sheetRowId,
        };
        leads = [created, ...leads];
        logs.push({
          id: uid("sl"),
          leadId: created.leadId,
          status: "success",
          message: "New lead imported from Google Sheet.",
          createdAt: now,
        });
      }

      return {
        ...prev,
        leads,
        syncLogs: [...logs, ...prev.syncLogs],
        sheetConfig: { ...prev.sheetConfig, lastSyncedAt: now },
        activityLogs: [
          {
            id: uid("log"),
            actorId: prev.currentUserId,
            action: "Ran Google Sheets synchronization",
            entity: "Sheets",
            createdAt: now,
          },
          ...prev.activityLogs,
        ],
      };
    });
  }, []);

  const updateTaskStatus = useCallback(
    (id: string, status: CrmData["tasks"][number]["status"]) => {
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
      }));
    },
    [],
  );

  const decideApproval = useCallback(
    (id: string, status: "approved" | "rejected") => {
      setData((prev) => {
        const approval = prev.approvals.find((a) => a.id === id);
        return {
          ...prev,
          approvals: prev.approvals.map((a) =>
            a.id === id ? { ...a, status } : a,
          ),
          leaveRequests:
            approval?.type === "Leave"
              ? prev.leaveRequests.map((lr) =>
                  lr.status === "pending" ? { ...lr, status } : lr,
                )
              : prev.leaveRequests,
          activityLogs: [
            {
              id: uid("log"),
              actorId: prev.currentUserId,
              action: `${status} approval: ${approval?.title ?? id}`,
              entity: "Approvals",
              createdAt: new Date().toISOString(),
            },
            ...prev.activityLogs,
          ],
        };
      });
    },
    [],
  );

  const markNotificationRead = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    }));
  }, []);

  const resetData = useCallback(() => {
    const next = structuredClone(seedData);
    setData(next);
    saveData(next);
  }, []);

  const allow = useCallback(
    (permission: Parameters<typeof can>[1]) =>
      isAuthenticated ? can(role, permission) : false,
    [isAuthenticated, role],
  );

  return {
    data,
    currentUser,
    role,
    isAuthenticated,
    allow,
    visibleLeads,
    visibleTasks,
    login,
    logout,
    updateCurrentUser,
    createOrganization,
    addLead,
    updateLead,
    updateLeadStatus,
    updateSheetConfig,
    runSheetSync,
    updateTaskStatus,
    decideApproval,
    markNotificationRead,
    resetData,
  };
}

export type CrmStore = ReturnType<typeof useCrmStore>;
