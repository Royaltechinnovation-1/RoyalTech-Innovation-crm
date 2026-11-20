import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CrmData,
  Lead,
  LeadStatus,
  SheetConfig,
  SyncLog,
} from "../types";
import { can } from "../lib/permissions";
import {
  HR_GOOGLE_EMAIL,
  canOpenHrCrm,
  decodeGoogleCredential,
  isHrGoogleEmail,
  loadAuthProvider,
  saveAuthProvider,
  type AuthProvider,
} from "../lib/hrAuth";
import {
  alreadyLoggedGps,
  clearGpsLogged,
  markGpsLogged,
  type CrmOpenLocation,
} from "../lib/locationTrack";
import { seedData } from "./seed";

const STORAGE_KEY = "royaltech-crm-v7";
const SESSION_KEY = "royaltech-session-v1";

function loadData(): CrmData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(seedData);
    const parsed = JSON.parse(raw) as CrmData;
    if (!parsed.users?.length || !parsed.leads) return structuredClone(seedData);
    // Ensure demo passwords exist after upgrades
    const oldHrEmails = new Set([
      "hr@ryaltehinno.in",
      "hr@royaltech.io",
      "neha@royaltech.io",
    ]);
    const users = parsed.users.map((user) => {
      const seeded = seedData.users.find((u) => u.id === user.id);
      const emailLower = String(user.email || "").toLowerCase();
      const isHrAccount =
        user.id === "u2" ||
        user.role === "hr_admin" ||
        oldHrEmails.has(emailLower) ||
        emailLower === HR_GOOGLE_EMAIL;
      const renamedHr = isHrAccount
        ? {
            name: "Vaishnavi Arora",
            avatarInitials: "VA",
            email: HR_GOOGLE_EMAIL,
            role: "hr_admin" as const,
            department: user.department || "HR",
          }
        : null;
      return {
        ...user,
        ...renamedHr,
        password: user.password || seeded?.password || "royaltech123",
      };
    });
    const notifications = (parsed.notifications || seedData.notifications).filter(
      (n) =>
        n.id !== "n1" &&
        n.id !== "n2" &&
        n.id !== "n4" &&
        n.id !== "n5" &&
        !(
          String(n.title || "").toLowerCase().includes("leave approval") &&
          String(n.body || "").toLowerCase().includes("sara khan")
        ) &&
        !(
          String(n.title || "").toLowerCase().includes("code review requested") ||
          String(n.body || "").toLowerCase().includes("inventory sync pr")
        ) &&
        !(
          String(n.title || "").toLowerCase().includes("daily report reminder") ||
          String(n.body || "").toLowerCase().includes("standup before")
        ) &&
        !(
          String(n.title || "").toLowerCase().includes("follow-up due") ||
          String(n.body || "").toLowerCase().includes("amelia hart follow-up")
        ),
    );
    const projects = (parsed.projects || seedData.projects).map((project) => {
      const seeded = seedData.projects.find((p) => p.id === project.id);
      return {
        ...seeded,
        ...project,
        description: project.description ?? seeded?.description,
        workflow: project.workflow ?? seeded?.workflow,
        flowLink: project.flowLink ?? seeded?.flowLink,
        notes: project.notes ?? seeded?.notes,
      };
    });
    const existingTaskIds = new Set((parsed.tasks || []).map((t) => t.id));
    const tasks = [
      ...(parsed.tasks || seedData.tasks),
      ...seedData.tasks.filter((t) => !existingTaskIds.has(t.id)),
    ];
    const existingReportIds = new Set((parsed.dailyReports || []).map((r) => r.id));
    const dailyReports = [
      ...(parsed.dailyReports || seedData.dailyReports || []),
      ...seedData.dailyReports.filter((r) => !existingReportIds.has(r.id)),
    ];
    return {
      ...structuredClone(seedData),
      ...parsed,
      users,
      projects,
      tasks,
      dailyReports,
      notifications,
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
  const [authProvider, setAuthProvider] = useState<AuthProvider | null>(() => loadAuthProvider());

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
  const hrCrmOpen = canOpenHrCrm({
    email: currentUser.email,
    role: currentUser.role,
    authProvider,
  });

  const login = useCallback(
    (email: string, password: string) => {
      const emailNorm = email.trim().toLowerCase();
      const user = data.users.find(
        (u) =>
          u.email.toLowerCase() === emailNorm &&
          u.password === password,
      );
      if (!user) {
        return { ok: false as const, error: "Invalid email or password." };
      }
      // Password login for now; Google Sign-In UI can be re-enabled later.
      // HR still must use the official HR mailbox email.
      if (user.role === "hr_admin" && !isHrGoogleEmail(emailNorm)) {
        return {
          ok: false as const,
          error: `HR login must use ${HR_GOOGLE_EMAIL}.`,
        };
      }
      setAuthProvider("password");
      saveAuthProvider("password");
      setSessionUserId(user.id);
      saveSession(user.id);
      setData((prev) => ({
        ...prev,
        currentUserId: user.id,
        users: prev.users.map((u) =>
          u.id === user.id && user.role === "hr_admin"
            ? { ...u, email: HR_GOOGLE_EMAIL }
            : u,
        ),
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

  const loginWithGoogle = useCallback(
    (credential: string) => {
      const profile = decodeGoogleCredential(credential);
      const emailNorm = String(profile.email || "")
        .trim()
        .toLowerCase();
      if (!emailNorm) {
        return { ok: false as const, error: "Google did not return an email address." };
      }
      if (profile.email_verified === false) {
        return {
          ok: false as const,
          error: "Please use a verified Google account.",
        };
      }

      // HR CRM: only the official HR Google mailbox.
      if (isHrGoogleEmail(emailNorm)) {
        const hrUser = data.users.find(
          (u) => u.role === "hr_admin" || isHrGoogleEmail(u.email),
        );
        if (!hrUser) {
          return { ok: false as const, error: "HR account is not configured." };
        }
        setAuthProvider("google");
        saveAuthProvider("google");
        setSessionUserId(hrUser.id);
        saveSession(hrUser.id);
        setData((prev) => ({
          ...prev,
          currentUserId: hrUser.id,
          users: prev.users.map((u) =>
            u.id === hrUser.id
              ? {
                  ...u,
                  email: HR_GOOGLE_EMAIL,
                  name: profile.name?.trim() || u.name,
                  avatarUrl: profile.picture || u.avatarUrl,
                  role: "hr_admin" as const,
                }
              : u,
          ),
          activityLogs: [
            {
              id: uid("log"),
              actorId: hrUser.id,
              action: `Google Sign-In as HR (${HR_GOOGLE_EMAIL})`,
              entity: "Session",
              createdAt: new Date().toISOString(),
            },
            ...prev.activityLogs,
          ],
        }));
        return { ok: true as const, user: hrUser };
      }

      // Everyone else: Google email must match a CRM user account.
      const user = data.users.find((u) => u.email.toLowerCase() === emailNorm);
      if (!user) {
        return {
          ok: false as const,
          error: `No CRM account for ${emailNorm}. Ask admin to add this Google email, or use your registered login email.`,
        };
      }
      if (user.role === "hr_admin") {
        return {
          ok: false as const,
          error: `HR CRM opens only with Google as ${HR_GOOGLE_EMAIL}.`,
        };
      }

      setAuthProvider("google");
      saveAuthProvider("google");
      setSessionUserId(user.id);
      saveSession(user.id);
      setData((prev) => ({
        ...prev,
        currentUserId: user.id,
        users: prev.users.map((u) =>
          u.id === user.id
            ? {
                ...u,
                name: profile.name?.trim() || u.name,
                avatarUrl: profile.picture || u.avatarUrl,
              }
            : u,
        ),
        activityLogs: [
          {
            id: uid("log"),
            actorId: user.id,
            action: `Google Sign-In as ${user.role} (${emailNorm})`,
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
    clearGpsLogged(sessionUserId);
    setSessionUserId(null);
    saveSession(null);
    setAuthProvider(null);
    saveAuthProvider(null);
    try {
      window.google?.accounts?.id?.disableAutoSelect?.();
    } catch {
      /* ignore */
    }
  }, [sessionUserId]);

  const recordCrmOpenLocation = useCallback((location: CrmOpenLocation) => {
    setData((prev) => {
      const userId = sessionUserId || prev.currentUserId;
      if (!userId || alreadyLoggedGps(userId)) return prev;
      markGpsLogged(userId);
      const place =
        location.label ||
        `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;
      return {
        ...prev,
        activityLogs: [
          {
            id: uid("log"),
            actorId: userId,
            action: `Opened CRM from ${place}`,
            entity: "GPS Tracker",
            createdAt: location.capturedAt || new Date().toISOString(),
            lat: location.lat,
            lng: location.lng,
            locationLabel: location.label,
            mapsUrl: location.mapsUrl,
            accuracyM: location.accuracy,
          },
          ...prev.activityLogs,
        ],
      };
    });
    return { ok: true as const };
  }, [sessionUserId]);

  const updateCurrentUser = useCallback(
    (
      patch: Partial<{
        name: string;
        email: string;
        department: string;
        password: string;
        avatarUrl: string | null;
      }>,
    ) => {
      setData((prev) => {
        const userId = sessionUserId || prev.currentUserId;
        const next = {
          ...prev,
          users: prev.users.map((u) => {
            if (u.id !== userId) return u;
            const name = patch.name?.trim() || u.name;
            const initials = name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase() ?? "")
              .join("");
            const nextEmail =
              u.role === "hr_admin"
                ? HR_GOOGLE_EMAIL
                : patch.email?.trim() || u.email;
            return {
              ...u,
              name,
              email: nextEmail,
              department: patch.department?.trim() || u.department,
              password: patch.password?.trim() || u.password,
              avatarInitials: initials || u.avatarInitials,
              avatarUrl:
                patch.avatarUrl === null
                  ? undefined
                  : patch.avatarUrl !== undefined
                    ? patch.avatarUrl
                    : u.avatarUrl,
            };
          }),
        };
        saveData(next);
        return next;
      });
    },
    [sessionUserId],
  );

  const changeCurrentPassword = useCallback(
    (currentPassword: string, newPassword: string) => {
      const userId = sessionUserId || data.currentUserId;
      const user = data.users.find((u) => u.id === userId);
      if (!user) return { ok: false as const, error: "User not found." };
      if (user.password !== currentPassword) {
        return { ok: false as const, error: "Current password is incorrect." };
      }
      if (newPassword.trim().length < 6) {
        return { ok: false as const, error: "New password must be at least 6 characters." };
      }
      updateCurrentUser({ password: newPassword.trim() });
      return { ok: true as const };
    },
    [data.currentUserId, data.users, sessionUserId, updateCurrentUser],
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
    if (role === "project_manager") {
      const myProjectIds = new Set(
        data.projects.filter((p) => p.managerId === currentUser.id).map((p) => p.id),
      );
      const teamIds = new Set(
        data.users
          .filter((u) => u.id === currentUser.id || u.managerId === currentUser.id)
          .map((u) => u.id),
      );
      return data.tasks.filter(
        (t) => myProjectIds.has(t.projectId) || teamIds.has(t.assigneeId),
      );
    }
    return data.tasks;
  }, [currentUser.id, data.projects, data.tasks, data.users, role]);

  const visibleProjects = useMemo(() => {
    if (role === "project_manager") {
      return data.projects.filter((p) => p.managerId === currentUser.id);
    }
    if (role === "developer") {
      const ids = new Set(
        data.tasks.filter((t) => t.assigneeId === currentUser.id).map((t) => t.projectId),
      );
      return data.projects.filter((p) => ids.has(p.id) || p.managerId === currentUser.managerId);
    }
    return data.projects;
  }, [currentUser.id, currentUser.managerId, data.projects, data.tasks, role]);

  const teamDevelopers = useMemo(() => {
    if (role === "project_manager") {
      return data.users.filter(
        (u) => u.role === "developer" && u.managerId === currentUser.id,
      );
    }
    return data.users.filter((u) => u.role === "developer");
  }, [currentUser.id, data.users, role]);

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

  const createDeveloper = useCallback(
    (input: {
      name: string;
      email: string;
      password: string;
      managerId?: string;
      id?: string;
    }) => {
      const name = input.name.trim();
      const email = input.email.trim().toLowerCase();
      const password = input.password.trim();
      if (!name || !email || !password) {
        return { ok: false as const, error: "Name, email, and password are required." };
      }
      if (password.length < 6) {
        return { ok: false as const, error: "Password must be at least 6 characters." };
      }
      if (data.users.some((u) => u.email.toLowerCase() === email)) {
        return { ok: false as const, error: "A user with this email already exists." };
      }

      const managerId = input.managerId ?? currentUser.id;
      let id = (input.id?.trim() || "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (id && data.users.some((u) => u.id === id)) {
        return { ok: false as const, error: "This developer ID is already taken." };
      }
      if (!id) id = uid("u");
      const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");
      const now = new Date().toISOString().slice(0, 10);

      setData((prev) => ({
        ...prev,
        users: [
          {
            id,
            name,
            email,
            password,
            role: "developer",
            department: "Engineering",
            avatarInitials: initials || "DV",
            managerId,
          },
          ...prev.users,
        ],
        employees: [
          {
            id: uid("e"),
            name,
            email,
            roleTitle: "Developer",
            department: "Engineering",
            status: "active",
            joinDate: now,
            managerId,
          },
          ...prev.employees,
        ],
        activityLogs: [
          {
            id: uid("log"),
            actorId: prev.currentUserId,
            action: `Created developer login for ${name}`,
            entity: "Team",
            createdAt: new Date().toISOString(),
          },
          ...prev.activityLogs,
        ],
        notifications: [
          {
            id: uid("n"),
            title: "New developer account",
            body: `${name} can sign in with ${email}.`,
            createdAt: new Date().toISOString(),
            read: false,
            audienceRoles: ["project_manager", "founder"],
          },
          ...prev.notifications,
        ],
      }));

      return { ok: true as const, userId: id, email, password, name };
    },
    [currentUser.id, data.users],
  );

  const createProject = useCallback(
    (input: {
      name: string;
      deadline: string;
      budget?: number;
      status?: CrmData["projects"][number]["status"];
      clientId?: string;
      managerId?: string;
      progress?: number;
      id?: string;
      description?: string;
      workflow?: string;
      flowLink?: string;
      notes?: string;
    }) => {
      const name = input.name.trim();
      const deadline = input.deadline.trim();
      if (!name || !deadline) {
        return { ok: false as const, error: "Project name and deadline are required." };
      }
      const id = input.id?.trim() || uid("pr");
      const managerId = input.managerId ?? currentUser.id;
      const description = input.description?.trim() || undefined;
      const workflow = input.workflow?.trim() || undefined;
      const flowLink = input.flowLink?.trim() || undefined;
      const notes = input.notes?.trim() || undefined;
      setData((prev) => ({
        ...prev,
        projects: [
          {
            id,
            name,
            clientId: input.clientId,
            managerId,
            status: input.status ?? "planned",
            progress: input.progress ?? 0,
            deadline,
            budget: Number(input.budget) || 0,
            description,
            workflow,
            flowLink,
            notes,
          },
          ...prev.projects,
        ],
        activityLogs: [
          {
            id: uid("log"),
            actorId: prev.currentUserId,
            action: `Created project ${name}`,
            entity: "Projects",
            createdAt: new Date().toISOString(),
          },
          ...prev.activityLogs,
        ],
      }));
      return { ok: true as const, projectId: id };
    },
    [currentUser.id],
  );

  const createTask = useCallback(
    (input: {
      projectId: string;
      title: string;
      assigneeId: string;
      dueDate: string;
      status?: CrmData["tasks"][number]["status"];
      id?: string;
    }) => {
      const title = input.title.trim();
      const projectId = input.projectId.trim();
      const assigneeId = input.assigneeId.trim();
      const dueDate = input.dueDate.trim();
      if (!title || !projectId || !assigneeId || !dueDate) {
        return { ok: false as const, error: "Project, title, assignee, and due date are required." };
      }
      const project = data.projects.find((p) => p.id === projectId);
      if (!project) return { ok: false as const, error: "Project not found." };
      if (
        currentUser.role === "project_manager" &&
        project.managerId !== currentUser.id
      ) {
        return { ok: false as const, error: "You can only assign tasks on your projects." };
      }
      const assignee = data.users.find((u) => u.id === assigneeId);
      if (!assignee || assignee.role !== "developer") {
        return { ok: false as const, error: "Assignee must be a developer." };
      }
      if (
        currentUser.role === "project_manager" &&
        assignee.managerId !== currentUser.id
      ) {
        return { ok: false as const, error: "Assignee must be on your team." };
      }

      const id = input.id?.trim() || uid("t");
      setData((prev) => ({
        ...prev,
        tasks: [
          {
            id,
            projectId,
            title,
            assigneeId,
            status: input.status ?? "todo",
            dueDate,
          },
          ...prev.tasks,
        ],
        activityLogs: [
          {
            id: uid("log"),
            actorId: prev.currentUserId,
            action: `Assigned "${title}" to ${assignee.name}`,
            entity: "Tasks",
            createdAt: new Date().toISOString(),
          },
          ...prev.activityLogs,
        ],
        notifications: [
          {
            id: uid("n"),
            title: "New task assigned",
            body: `${assignee.name}: ${title} · due ${dueDate}`,
            createdAt: new Date().toISOString(),
            read: false,
            audienceRoles: ["developer", "project_manager"],
          },
          ...prev.notifications,
        ],
      }));

      return { ok: true as const, taskId: id };
    },
    [currentUser.id, currentUser.role, data.projects, data.users],
  );

  const assignTask = useCallback(
    (taskId: string, assigneeId: string) => {
      const assignee = data.users.find((u) => u.id === assigneeId);
      if (!assignee || assignee.role !== "developer") {
        return { ok: false as const, error: "Assignee must be a developer." };
      }
      const task = data.tasks.find((t) => t.id === taskId);
      if (!task) return { ok: false as const, error: "Task not found." };

      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, assigneeId } : t)),
        activityLogs: [
          {
            id: uid("log"),
            actorId: prev.currentUserId,
            action: `Reassigned "${task.title}" to ${assignee.name}`,
            entity: "Tasks",
            createdAt: new Date().toISOString(),
          },
          ...prev.activityLogs,
        ],
      }));

      return { ok: true as const };
    },
    [data.tasks, data.users],
  );

  const visibleDailyReports = useMemo(() => {
    const rows = data.dailyReports || [];
    if (role === "developer") {
      return rows.filter((r) => r.developerId === currentUser.id);
    }
    if (role === "project_manager") {
      return rows.filter(
        (r) =>
          r.managerId === currentUser.id ||
          data.users.some(
            (u) =>
              u.id === r.developerId &&
              u.role === "developer" &&
              u.managerId === currentUser.id,
          ),
      );
    }
    if (role === "founder") return rows;
    return [];
  }, [currentUser.id, data.dailyReports, data.users, role]);

  const submitDailyReport = useCallback(
    (input: {
      description: string;
      workStatus: "In Progress" | "Completed" | "Blocked";
      hours: number;
      tasksCompleted?: number;
      attachmentName?: string;
      date?: string;
    }) => {
      const description = input.description.trim();
      if (!description) {
        return { ok: false as const, error: "Please describe what you worked on today." };
      }
      if (role !== "developer") {
        return { ok: false as const, error: "Only developers can submit daily reports." };
      }
      const managerId =
        currentUser.managerId ||
        data.users.find((u) => u.role === "project_manager")?.id ||
        "";
      if (!managerId) {
        return { ok: false as const, error: "No project manager is linked to your account." };
      }
      const hours = Number(input.hours) || 0;
      if (hours <= 0) {
        return { ok: false as const, error: "Hours must be greater than 0." };
      }
      const date = (input.date || new Date().toISOString().slice(0, 10)).slice(0, 10);
      const tasksCompleted =
        input.tasksCompleted ??
        data.tasks.filter(
          (t) => t.assigneeId === currentUser.id && t.status === "done",
        ).length;
      const id = uid("dr");
      const createdAt = new Date().toISOString();
      const manager = data.users.find((u) => u.id === managerId);

      setData((prev) => ({
        ...prev,
        dailyReports: [
          {
            id,
            developerId: currentUser.id,
            managerId,
            date,
            description,
            workStatus: input.workStatus,
            hours,
            tasksCompleted,
            attachmentName: input.attachmentName?.trim() || undefined,
            createdAt,
            status: "Submitted",
          },
          ...(prev.dailyReports || []),
        ],
        activityLogs: [
          {
            id: uid("log"),
            actorId: prev.currentUserId,
            action: `Submitted daily report to ${manager?.name ?? "manager"}`,
            entity: "Daily Report",
            createdAt,
          },
          ...prev.activityLogs,
        ],
        notifications: [
          {
            id: uid("n"),
            title: "Daily report received",
            body: `${currentUser.name} submitted today’s report (${input.workStatus}, ${hours}h).`,
            createdAt,
            read: false,
            audienceRoles: ["project_manager"],
            audienceUserIds: [managerId],
          },
          ...prev.notifications,
        ],
      }));

      return {
        ok: true as const,
        reportId: id,
        managerName: manager?.name ?? "Project Manager",
      };
    },
    [currentUser.id, currentUser.managerId, currentUser.name, data.tasks, data.users, role],
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
    (permission: Parameters<typeof can>[1]) => {
      if (!isAuthenticated) return false;
      // HR module unlocks only after Google Sign-In as the official HR mailbox.
      if (permission === "hr" || String(permission).startsWith("hr.")) {
        return canOpenHrCrm({
          email: currentUser.email,
          role,
          authProvider,
        });
      }
      if (
        (permission === "salary.view" || permission === "confidential.docs") &&
        role === "hr_admin"
      ) {
        return canOpenHrCrm({
          email: currentUser.email,
          role,
          authProvider,
        });
      }
      return can(role, permission);
    },
    [authProvider, currentUser.email, isAuthenticated, role],
  );

  return {
    data,
    currentUser,
    role,
    isAuthenticated,
    authProvider,
    hrCrmOpen,
    allow,
    visibleLeads,
    visibleTasks,
    visibleProjects,
    visibleDailyReports,
    teamDevelopers,
    login,
    loginWithGoogle,
    logout,
    recordCrmOpenLocation,
    updateCurrentUser,
    changeCurrentPassword,
    createOrganization,
    addLead,
    updateLead,
    updateLeadStatus,
    updateSheetConfig,
    runSheetSync,
    updateTaskStatus,
    createDeveloper,
    createProject,
    createTask,
    assignTask,
    submitDailyReport,
    decideApproval,
    markNotificationRead,
    resetData,
  };
}

export type CrmStore = ReturnType<typeof useCrmStore>;
