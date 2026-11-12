/** In-memory MySQL-shaped store used until MySQL/MariaDB is available. */

import { buildHrDashboard } from "./hrStore.js";
import { buildDevDashboard } from "./devStore.js";
import { buildSuperAdminDashboard } from "./superAdminStore.js";
import {
  changeFilePassword,
  getFileSettings,
  saveFileSettings,
} from "./settingsStore.js";

const users = [
  { id: "u1", name: "Aryan Mehta", email: "aryan@royaltech.io", role: "founder", department: "Super Admin", avatar_initials: "AM", manager_id: null },
  { id: "u2", name: "Neha Kapoor", email: "neha@royaltech.io", role: "hr_admin", department: "HR", avatar_initials: "NK", manager_id: null },
  { id: "u3", name: "Rahul Verma", email: "rahul@royaltech.io", role: "sales_manager", department: "Sales", avatar_initials: "RV", manager_id: null },
  { id: "u4", name: "Sara Khan", email: "sara@royaltech.io", role: "sales_executive", department: "Sales", avatar_initials: "SK", manager_id: "u3" },
  { id: "u5", name: "Vikram Shah", email: "vikram@royaltech.io", role: "project_manager", department: "Delivery", avatar_initials: "VS", manager_id: null },
  { id: "u6", name: "Ananya Iyer", email: "ananya@royaltech.io", role: "developer", department: "Engineering", avatar_initials: "AI", manager_id: null },
  { id: "u7", name: "Omar Siddiqui", email: "omar@royaltech.io", role: "website_admin", department: "Marketing", avatar_initials: "OS", manager_id: null },
  { id: "u8", name: "Meera Joshi", email: "meera@royaltech.io", role: "finance_admin", department: "Finance", avatar_initials: "MJ", manager_id: null },
  { id: "u9", name: "Simran Kaur", email: "simran@royaltech.io", role: "sales_executive", department: "Sales", avatar_initials: "SK", manager_id: "u3" },
  { id: "u10", name: "Aditi Rao", email: "aditi@royaltech.io", role: "sales_executive", department: "Sales", avatar_initials: "AR", manager_id: "u3" },
  { id: "u11", name: "Pankaj Mehta", email: "pankaj@royaltech.io", role: "sales_executive", department: "Sales", avatar_initials: "PM", manager_id: "u3" },
];

const leads = [
  { id: "l1", lead_id: "RT-1001", name: "Amelia Hart", company: "Northpine Studio", email: "amelia@northpine.co", phone: "+1 415 220 0198", source: "Website", status: "negotiation", owner_id: "u4", value: 24000, notes: "Annual CRM seats", next_follow_up: "2026-11-12", created_at: "2026-09-12" },
  { id: "l2", lead_id: "RT-1002", name: "Jonah Reeves", company: "Cedar & Co", email: "jonah@cedar.co", phone: "+1 628 441 7720", source: "Google Sheet", status: "proposal", owner_id: "u3", value: 58000, notes: "Warehouse rollout", next_follow_up: "2026-11-14", created_at: "2026-10-03" },
  { id: "l3", lead_id: "RT-1003", name: "Priya Nair", company: "Mossline Foods", email: "priya@mossline.com", phone: "+1 312 908 4411", source: "Referral", status: "qualified", owner_id: "u4", value: 31200, notes: "Ops suite", next_follow_up: "2026-11-16", created_at: "2026-10-18" },
  { id: "l4", lead_id: "RT-1004", name: "Leo Marsh", company: "Quiet Harbor", email: "leo@quietharbor.io", phone: "+1 206 555 0190", source: "Cold outreach", status: "new", owner_id: "u4", value: 8500, notes: "Pilot interest", next_follow_up: "2026-11-20", created_at: "2026-08-22" },
  { id: "l5", lead_id: "RT-1005", name: "Helena Ortiz", company: "Brightleaf Retail", email: "helena@brightleaf.com", phone: "+1 917 444 2201", source: "Website", status: "won", owner_id: "u3", value: 42000, notes: "Annual support", next_follow_up: null, created_at: "2026-07-14" },
  { id: "l6", lead_id: "RT-1006", name: "Tom Ellis", company: "Harborline Logistics", email: "tom@harborline.com", phone: "+1 503 771 0091", source: "Google Sheet", status: "lost", owner_id: "u4", value: 19000, notes: "Budget deferred", next_follow_up: null, created_at: "2026-06-02" },
  { id: "l7", lead_id: "RT-1007", name: "Maya Chen", company: "Lumen Labs", email: "maya@lumenlabs.io", phone: "+1 415 900 2211", source: "Website", status: "contacted", owner_id: "u3", value: 27500, notes: "Demo booked", next_follow_up: "2026-11-18", created_at: "2026-11-01" },
  { id: "l8", lead_id: "RT-1008", name: "Ravi Patel", company: "Orbit Retail", email: "ravi@orbitretail.in", phone: "+91 98765 11223", source: "Referral", status: "proposal", owner_id: "u4", value: 46500, notes: "Multi-store CRM", next_follow_up: "2026-11-21", created_at: "2026-10-28" },
  { id: "l9", lead_id: "RT-1009", name: "Nina Bose", company: "Greenfield Mills", email: "nina@greenfield.in", phone: "+91 98111 22001", source: "Referral", status: "qualified", owner_id: "u9", value: 22000, notes: "POS rollout", next_follow_up: "2026-11-15", created_at: "2026-10-20" },
  { id: "l10", lead_id: "RT-1010", name: "Chris Doyle", company: "Peakline Soft", email: "chris@peakline.io", phone: "+1 646 555 0188", source: "Website", status: "proposal", owner_id: "u10", value: 33500, notes: "CRM seats", next_follow_up: "2026-11-17", created_at: "2026-10-25" },
  { id: "l11", lead_id: "RT-1011", name: "Farah Qureshi", company: "Silkroad Traders", email: "farah@silkroad.co", phone: "+91 98222 33011", source: "Cold outreach", status: "contacted", owner_id: "u11", value: 15800, notes: "Warehouse pilot", next_follow_up: "2026-11-19", created_at: "2026-11-02" },
  { id: "l12", lead_id: "RT-1012", name: "Owen Blake", company: "Northwind Apps", email: "owen@northwindapps.com", phone: "+1 212 555 0162", source: "Website", status: "won", owner_id: "u9", value: 27000, notes: "Annual CRM", next_follow_up: null, created_at: "2026-08-12" },
];

const clients = [
  { id: "cl1", name: "Helena Ortiz", company: "Brightleaf Retail", email: "helena@brightleaf.com", phone: "+1 917 444 2201", account_manager_id: "u3", status: "active", created_at: "2026-07-20" },
  { id: "cl2", name: "Priya Nair", company: "Mossline Foods", email: "priya@mossline.com", phone: "+1 312 908 4411", account_manager_id: "u4", status: "active", created_at: "2026-10-30" },
  { id: "cl3", name: "Kabir Singh", company: "Plainfield Labs", email: "kabir@plainfield.io", phone: "+1 408 555 7721", account_manager_id: "u3", status: "active", created_at: "2026-08-25" },
  { id: "cl4", name: "Meera Nair", company: "Atlas Works", email: "meera@atlasworks.in", phone: "+91 99001 11223", account_manager_id: "u4", status: "active", created_at: "2026-09-10" },
  { id: "cl5", name: "Ben Torres", company: "Copperline", email: "ben@copperline.co", phone: "+1 720 555 0144", account_manager_id: "u3", status: "active", created_at: "2026-08-15" },
];

let mailConfig = {
  id: "mc1",
  provider: "smtp",
  from_email: "proposals@royaltech.io",
  enabled: 0,
  connected_at: null,
};

let proposals = [
  { id: "p1", proposal_code: "PROP-0012", lead_id: "l1", title: "Website Development Proposal", amount: 24000, status: "sent", valid_until: "2026-11-30", body_text: "Proposal for Northpine Studio website and CRM seats.", created_at: "2026-11-01", last_sent_at: "2026-11-02T10:00:00.000Z" },
  { id: "p2", proposal_code: "PROP-0011", lead_id: "l2", title: "ERP Solution Proposal", amount: 58000, status: "draft", valid_until: "2026-12-20", body_text: "Warehouse rollout proposal for Cedar & Co.", created_at: "2026-11-05", last_sent_at: null },
  { id: "p3", proposal_code: "PROP-0010", lead_id: "l5", title: "Mobile App Proposal", amount: 42000, status: "accepted", valid_until: "2026-10-15", body_text: "Annual support and mobile module for Brightleaf Retail.", created_at: "2026-09-20", last_sent_at: "2026-09-22T14:00:00.000Z" },
  { id: "p4", proposal_code: "PROP-0009", lead_id: "l3", title: "Custom Software Proposal", amount: 31200, status: "pending", valid_until: "2026-12-05", body_text: "Ops suite proposal for Mossline Foods.", created_at: "2026-10-25", last_sent_at: "2026-10-28T11:30:00.000Z" },
  { id: "p5", proposal_code: "PROP-0008", lead_id: "l4", title: "Digital Marketing Proposal", amount: 8500, status: "rejected", valid_until: "2026-11-10", body_text: "Pilot marketing + CRM package for Quiet Harbor.", created_at: "2026-10-01", last_sent_at: "2026-10-05T09:00:00.000Z" },
];

let proposalMailLogs = [];

const salesTargets = [
  { id: "st1", owner_id: "u3", period: "Q4 2026", target_amount: 180000, achieved_amount: 124000 },
  { id: "st2", owner_id: "u4", period: "Q4 2026", target_amount: 90000, achieved_amount: 63500 },
  { id: "st3", owner_id: "u9", period: "Q4 2026", target_amount: 75000, achieved_amount: 42000 },
  { id: "st4", owner_id: "u10", period: "Q4 2026", target_amount: 70000, achieved_amount: 28000 },
  { id: "st5", owner_id: "u11", period: "Q4 2026", target_amount: 65000, achieved_amount: 12000 },
];

const activities = [
  { id: "a1", lead_id: "l1", owner_id: "u4", activity_type: "call", title: "Negotiation call with Amelia", activity_date: "2026-11-10" },
  { id: "a2", lead_id: "l2", owner_id: "u3", activity_type: "proposal", title: "Sent revised warehouse proposal", activity_date: "2026-11-09" },
  { id: "a3", lead_id: "l7", owner_id: "u3", activity_type: "demo", title: "Product demo for Lumen Labs", activity_date: "2026-11-08" },
  { id: "a4", lead_id: "l3", owner_id: "u4", activity_type: "email", title: "Follow-up email to Priya", activity_date: "2026-11-07" },
  { id: "a5", lead_id: "l8", owner_id: "u4", activity_type: "meeting", title: "Discovery meeting with Orbit Retail", activity_date: "2026-11-06" },
];

function userMap() {
  return Object.fromEntries(users.map((u) => [u.id, u]));
}

function teamIdsFor(managerId) {
  return users
    .filter((u) => u.id === managerId || u.manager_id === managerId)
    .map((u) => u.id);
}

export function getSalesDashboard(ownerId, teamManagerId) {
  const ids = teamManagerId ? teamIdsFor(teamManagerId) : ownerId ? [ownerId] : null;
  const scopedLeads = ids ? leads.filter((l) => ids.includes(l.owner_id)) : leads;
  const open = scopedLeads.filter((l) => l.status !== "won" && l.status !== "lost");
  const won = scopedLeads.filter((l) => l.status === "won");
  const lost = scopedLeads.filter((l) => l.status === "lost");
  const pipelineValue = open.reduce((s, l) => s + Number(l.value), 0);
  const wonValue = won.reduce((s, l) => s + Number(l.value), 0);
  const conversion = scopedLeads.length
    ? Math.round((won.length / scopedLeads.length) * 100)
    : 0;

  const byStatus = scopedLeads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] ?? 0) + 1;
    return acc;
  }, {});

  const bySource = scopedLeads.reduce((acc, lead) => {
    acc[lead.source] = (acc[lead.source] ?? 0) + 1;
    return acc;
  }, {});

  const usersById = userMap();
  const recentLeads = [...scopedLeads]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 6)
    .map((lead) => ({
      ...lead,
      owner_name: usersById[lead.owner_id]?.name ?? "—",
    }));

  const followUps = scopedLeads
    .filter((l) => l.next_follow_up && l.status !== "won" && l.status !== "lost")
    .sort((a, b) => a.next_follow_up.localeCompare(b.next_follow_up))
    .slice(0, 6)
    .map((lead) => ({
      ...lead,
      owner_name: usersById[lead.owner_id]?.name ?? "—",
    }));

  const recentActivities = activities
    .filter((a) => !ids || ids.includes(a.owner_id))
    .sort((a, b) => b.activity_date.localeCompare(a.activity_date))
    .slice(0, 6)
    .map((a) => ({
      ...a,
      owner_name: usersById[a.owner_id]?.name ?? "—",
      lead_company: leads.find((l) => l.id === a.lead_id)?.company ?? "—",
    }));

  const scopedClients = ids
    ? clients.filter((c) => ids.includes(c.account_manager_id))
    : clients;

  return {
    mode: "memory",
    summary: {
      totalLeads: scopedLeads.length,
      openDeals: open.length,
      pipelineValue,
      wonDeals: won.length,
      wonValue,
      lostDeals: lost.length,
      conversion,
      clients: scopedClients.length,
      followUps: followUps.length,
    },
    byStatus,
    bySource,
    recentLeads,
    followUps,
    recentActivities,
  };
}

export function getSalesTeam(teamManagerId) {
  const sellers = teamManagerId
    ? users.filter((u) => u.id === teamManagerId || u.manager_id === teamManagerId)
    : users.filter((u) => u.role === "sales_manager" || u.role === "sales_executive");
  return sellers.map((seller) => {
    const owned = leads.filter((l) => l.owner_id === seller.id);
    const open = owned.filter((l) => l.status !== "won" && l.status !== "lost");
    const won = owned.filter((l) => l.status === "won");
    const target = salesTargets.find((t) => t.owner_id === seller.id);
    return {
      id: seller.id,
      name: seller.name,
      role: seller.role,
      managerId: seller.manager_id ?? null,
      openLeads: open.length,
      wonLeads: won.length,
      pipelineValue: open.reduce((s, l) => s + Number(l.value), 0),
      wonValue: won.reduce((s, l) => s + Number(l.value), 0),
      target: target ? Number(target.target_amount) : 0,
      achieved: target ? Number(target.achieved_amount) : 0,
      period: target?.period ?? "—",
    };
  });
}

export function getSalesTargets() {
  const usersById = userMap();
  return salesTargets.map((t) => ({
    id: t.id,
    ownerId: t.owner_id,
    ownerName: usersById[t.owner_id]?.name ?? "—",
    period: t.period,
    target: Number(t.target_amount),
    achieved: Number(t.achieved_amount),
    percent: Math.round((Number(t.achieved_amount) / Number(t.target_amount)) * 100),
  }));
}

export function getSalesReports() {
  const won = leads.filter((l) => l.status === "won");
  const lost = leads.filter((l) => l.status === "lost");
  const bySource = Object.entries(
    leads.reduce((acc, lead) => {
      acc[lead.source] = (acc[lead.source] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([source, count]) => ({ source, count }));

  const revenueByOwner = users
    .filter((u) => u.role === "sales_manager" || u.role === "sales_executive")
    .map((u) => ({
      owner: u.name,
      revenue: leads
        .filter((l) => l.owner_id === u.id && l.status === "won")
        .reduce((s, l) => s + Number(l.value), 0),
    }));

  return {
    won: won.length,
    lost: lost.length,
    wonValue: won.reduce((s, l) => s + Number(l.value), 0),
    bySource,
    revenueByOwner,
  };
}

const employees = [
  { id: "e1", name: "Neha Kapoor", email: "neha@royaltech.io", role_title: "HR Admin", department: "HR", status: "active", join_date: "2023-03-01", salary: 92000 },
  { id: "e2", name: "Rahul Verma", email: "rahul@royaltech.io", role_title: "Sales Manager", department: "Sales", status: "active", join_date: "2022-08-15", salary: 110000 },
  { id: "e3", name: "Sara Khan", email: "sara@royaltech.io", role_title: "Sales Executive", department: "Sales", status: "active", join_date: "2024-01-10", salary: 68000, manager_id: "e2" },
  { id: "e4", name: "Vikram Shah", email: "vikram@royaltech.io", role_title: "Project Manager", department: "Delivery", status: "active", join_date: "2021-11-02", salary: 105000 },
  { id: "e5", name: "Ananya Iyer", email: "ananya@royaltech.io", role_title: "Full-stack Developer", department: "Engineering", status: "active", join_date: "2023-06-20", salary: 86000, manager_id: "e4" },
  { id: "e6", name: "Dev Patel", email: "dev@royaltech.io", role_title: "Junior Developer", department: "Engineering", status: "onboarding", join_date: "2026-11-03", salary: 52000, manager_id: "e4" },
];

const candidates = [
  { id: "cand1", name: "Ishaan Bose", role_title: "React Developer", stage: "interview", email: "ishaan@mail.com", created_at: "2026-10-28" },
  { id: "cand2", name: "Lina Fernandes", role_title: "Sales Executive", stage: "screening", email: "lina@mail.com", created_at: "2026-11-02" },
  { id: "cand3", name: "Kabir Singh", role_title: "QA Engineer", stage: "applied", email: "kabir@mail.com", created_at: "2026-11-08" },
];

const leaveRequests = [
  { id: "lv1", employee_id: "e3", leave_type: "Annual", date_from: "2026-11-18", date_to: "2026-11-20", status: "pending" },
  { id: "lv2", employee_id: "e5", leave_type: "Sick", date_from: "2026-11-08", date_to: "2026-11-08", status: "approved" },
  { id: "lv3", employee_id: "e6", leave_type: "Casual", date_from: "2026-11-25", date_to: "2026-11-25", status: "pending" },
];

const projects = [
  { id: "pr1", name: "Website Redesign", client_id: "cl1", manager_id: "u5", status: "active", progress: 70, deadline: "2026-12-15", budget: 42000 },
  { id: "pr2", name: "Mobile App Development", client_id: "cl2", manager_id: "u5", status: "active", progress: 45, deadline: "2027-01-20", budget: 31200 },
  { id: "pr3", name: "E-commerce Platform", client_id: null, manager_id: "u5", status: "active", progress: 80, deadline: "2026-12-01", budget: 18000 },
];

const projectTasks = [
  { id: "t1", project_id: "pr1", title: "Develop user authentication API", assignee_id: "u6", status: "doing", due_date: "2026-11-13" },
  { id: "t2", project_id: "pr1", title: "QA permissions matrix", assignee_id: "u6", status: "todo", due_date: "2026-11-18" },
  { id: "t3", project_id: "pr2", title: "Client kickoff deck", assignee_id: "u5", status: "done", due_date: "2026-11-05" },
  { id: "t4", project_id: "pr2", title: "API contract for inventory sync", assignee_id: "u6", status: "blocked", due_date: "2026-11-22" },
  { id: "t5", project_id: "pr3", title: "Homepage wireframes", assignee_id: "u5", status: "todo", due_date: "2026-11-30" },
  { id: "t6", project_id: "pr1", title: "Fix responsive issues on dashboard", assignee_id: "u6", status: "todo", due_date: "2026-11-14" },
  { id: "t7", project_id: "pr2", title: "Database optimization pass", assignee_id: "u6", status: "doing", due_date: "2026-11-15" },
  { id: "t8", project_id: "pr1", title: "API integration for sheets sync", assignee_id: "u6", status: "done", due_date: "2026-11-10" },
  { id: "t9", project_id: "pr2", title: "Review inventory sync PR", assignee_id: "u5", status: "done", due_date: "2026-11-12" },
];

const invoices = [
  { id: "inv1", client_id: "cl1", number: "INV-2041", amount: 14000, status: "paid", due_date: "2026-10-01", issued_at: "2026-09-15" },
  { id: "inv2", client_id: "cl1", number: "INV-2055", amount: 14000, status: "sent", due_date: "2026-12-01", issued_at: "2026-11-01" },
  { id: "inv3", client_id: "cl2", number: "INV-2058", amount: 8500, status: "overdue", due_date: "2026-11-01", issued_at: "2026-10-10" },
];

const payments = [
  { id: "pay1", client_id: "cl1", invoice_id: "inv1", amount: 14000, payment_date: "2026-09-28", status: "received" },
  { id: "pay2", client_id: "cl2", invoice_id: "inv3", amount: 8500, payment_date: "2026-11-15", status: "pending" },
];

const enquiries = [
  { id: "w1", name: "Jordan Lee", email: "jordan@acme.io", subject: "Product demo request", status: "new", source: "Contact form", created_at: "2026-11-09" },
  { id: "w2", name: "Sofia Alvarez", email: "sofia@bloom.co", subject: "Pricing for 40 seats", status: "in_progress", source: "Pricing page", created_at: "2026-11-07" },
];

export function getHrDashboard() {
  return buildHrDashboard({ employees, candidates, leaveRequests });
}

export function getDevDashboard({ assigneeId, managerId } = {}) {
  return buildDevDashboard({
    projects,
    tasks: projectTasks,
    users,
    assigneeId,
    managerOnly: managerId,
  });
}

export function getSuperAdminDashboard() {
  return buildSuperAdminDashboard({
    leads,
    employees,
    projects,
    payments,
    invoices,
    enquiries,
    users,
    leaveRequests,
    tasks: projectTasks,
  });
}

let sheetConfig = {
  id: "sc1",
  spreadsheet_id: "1RoyalTechSalesLeadsSheetDemo",
  sheet_name: "Leads",
  enabled: 1,
  last_synced_at: null,
};
let sheetLogs = [];

export function getLeads(ownerId, teamManagerId) {
  const ids = teamManagerId ? teamIdsFor(teamManagerId) : ownerId ? [ownerId] : null;
  const scoped = ids ? leads.filter((l) => ids.includes(l.owner_id)) : leads;
  return {
    mode: "memory",
    scope: teamManagerId ? "team" : ownerId ? "self" : "all",
    leads: scoped.map((row) => ({
      id: row.id,
      leadId: row.lead_id,
      name: row.name,
      company: row.company,
      email: row.email,
      phone: row.phone,
      source: row.source,
      status: row.status,
      ownerId: row.owner_id,
      ownerName: users.find((u) => u.id === row.owner_id)?.name ?? "—",
      value: Number(row.value),
      notes: row.notes ?? "",
      nextFollowUp: row.next_follow_up,
      createdAt: row.created_at,
      sheetRowId: row.sheet_row_id ?? `row_${row.lead_id}`,
    })),
  };
}

function initials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function getClients(managerId, teamManagerId) {
  const ids = teamManagerId ? teamIdsFor(teamManagerId) : managerId ? [managerId] : null;
  const scoped = ids
    ? clients.filter((c) => ids.includes(c.account_manager_id))
    : clients;
  return {
    mode: "memory",
    scope: teamManagerId ? "team" : managerId ? "self" : "all",
    clients: scoped.map((row) => {
      const manager = users.find((u) => u.id === row.account_manager_id);
      return {
        id: row.id,
        name: row.name,
        company: row.company,
        email: row.email,
        phone: row.phone ?? "",
        accountManagerId: row.account_manager_id,
        accountManagerName: manager?.name ?? "—",
        accountManagerInitials: initials(manager?.name ?? "—"),
        status: row.status,
        createdAt: row.created_at,
      };
    }),
  };
}

export function createClient(input = {}) {
  const name = String(input.name || "").trim();
  const company = String(input.company || "").trim();
  const email = String(input.email || "").trim();
  if (!name || !company || !email) throw new Error("Name, company, and email are required");
  if (clients.some((c) => c.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("A client with this email already exists");
  }
  const row = {
    id: `cl_${Date.now().toString(36)}`,
    name,
    company,
    email,
    phone: String(input.phone || "").trim(),
    account_manager_id: String(input.accountManagerId || "u3"),
    status: input.status === "inactive" ? "inactive" : "active",
    created_at: new Date().toISOString().slice(0, 10),
  };
  clients.unshift(row);
  return { mode: "memory", client: getClients().clients.find((c) => c.id === row.id) };
}

function mapProposalMemory(row) {
  const lead = leads.find((l) => l.id === row.lead_id);
  return {
    id: row.id,
    code: row.proposal_code,
    leadId: row.lead_id,
    leadCode: lead?.lead_id ?? "—",
    leadName: lead?.name ?? "—",
    leadCompany: lead?.company ?? "—",
    leadEmail: lead?.email ?? "",
    title: row.title,
    amount: Number(row.amount),
    status: row.status,
    validUntil: row.valid_until,
    body: row.body_text ?? "",
    createdAt: row.created_at,
    lastSentAt: row.last_sent_at,
  };
}

export function getMailStatus() {
  const envReady = Boolean(process.env.MAIL_SMTP_HOST && process.env.MAIL_FROM);
  const connected = Boolean(mailConfig.enabled) || envReady;
  return {
    mode: "memory",
    connected,
    provider: mailConfig.provider || (envReady ? "smtp" : "none"),
    fromEmail: mailConfig.from_email || process.env.MAIL_FROM || null,
    message: connected
      ? "Mail connected — proposals can be sent from CRM."
      : "Mail not connected yet. Review and queue sends here; connect SMTP later.",
  };
}

export function getProposals() {
  const list = proposals.map(mapProposalMemory);
  return {
    mode: "memory",
    mail: getMailStatus(),
    summary: {
      total: list.length,
      totalValue: list.reduce((s, p) => s + p.amount, 0),
      accepted: list.filter((p) => p.status === "accepted").length,
      pending: list.filter((p) => p.status === "pending" || p.status === "sent").length,
      draft: list.filter((p) => p.status === "draft").length,
      rejected: list.filter((p) => p.status === "rejected").length,
    },
    proposals: list,
  };
}

export function createProposal(input = {}) {
  const title = String(input.title || "").trim();
  const leadId = String(input.leadId || "").trim();
  const amount = Number(input.amount || 0);
  if (!title || !leadId || !(amount > 0)) throw new Error("Title, lead, and amount are required");
  const lead = leads.find((l) => l.id === leadId || l.lead_id === leadId);
  if (!lead) throw new Error("Lead not found");
  const row = {
    id: `p_${Date.now().toString(36)}`,
    proposal_code: `PROP-${String(proposals.length + 1).padStart(4, "0")}`,
    lead_id: lead.id,
    title,
    amount,
    status: "draft",
    valid_until: String(input.validUntil || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)),
    body_text: String(input.body || `Proposal for ${lead.company}.`),
    created_at: new Date().toISOString().slice(0, 10),
    last_sent_at: null,
  };
  proposals.unshift(row);
  return { mode: "memory", proposal: mapProposalMemory(row) };
}

export function updateProposalStatus(id, status) {
  const allowed = ["draft", "sent", "pending", "accepted", "rejected"];
  if (!allowed.includes(status)) throw new Error("Invalid proposal status");
  const row = proposals.find((p) => p.id === id || p.proposal_code === id);
  if (!row) throw new Error("Proposal not found");
  row.status = status;
  return { mode: "memory", proposal: mapProposalMemory(row) };
}

export function sendProposalMail(id, input = {}) {
  const row = proposals.find((p) => p.id === id || p.proposal_code === id);
  if (!row) throw new Error("Proposal not found");
  const lead = leads.find((l) => l.id === row.lead_id);
  if (!lead) throw new Error("Linked lead not found");
  const mail = getMailStatus();
  const to = String(input.to || lead.email || "").trim();
  const subject = String(input.subject || `${row.title} (${row.proposal_code})`).trim();
  const message = String(
    input.message ||
      row.body_text ||
      `Dear ${lead.name},\n\nPlease find our proposal ${row.proposal_code}.\n\nRegards,\nRoyalTech Sales`,
  ).trim();
  if (!to) throw new Error("Recipient email is required");
  const log = {
    id: `pml_${Date.now().toString(36)}`,
    to,
    subject,
    status: mail.connected ? "sent" : "queued",
    message: mail.connected ? `Sent to ${to}` : `Queued for ${to} — connect mail later to deliver`,
  };
  proposalMailLogs.unshift(log);
  row.status = "sent";
  row.last_sent_at = new Date().toISOString();
  return {
    mode: "memory",
    mailed: mail.connected,
    queued: !mail.connected,
    mail,
    log,
    preview: { to, subject, message },
    proposal: mapProposalMemory(row),
  };
}

export function updateLeadStatus(id, status, ownerId) {
  const lead = leads.find((l) => l.id === id || l.lead_id === id);
  if (!lead) throw new Error("Lead not found");
  lead.status = status;
  if (ownerId) {
    const owner = users.find((u) => u.id === ownerId);
    if (!owner) throw new Error("Owner not found");
    lead.owner_id = ownerId;
  }
  sheetLogs.unshift({
    id: `sl_${Date.now()}`,
    lead_id: lead.lead_id,
    status: "updated",
    message: ownerId
      ? `Status changed to ${status}; reassigned to ${users.find((u) => u.id === ownerId)?.name || ownerId}`
      : `Status changed to ${status}`,
    created_at: new Date().toISOString(),
  });
  return {
    mode: "memory",
    lead: getLeads().leads.find((l) => l.id === lead.id),
  };
}

export function updateLeadOwner(id, ownerId) {
  const lead = leads.find((l) => l.id === id || l.lead_id === id);
  if (!lead) throw new Error("Lead not found");
  const owner = users.find((u) => u.id === ownerId);
  if (!owner) throw new Error("Owner not found");
  lead.owner_id = ownerId;
  sheetLogs.unshift({
    id: `sl_${Date.now()}`,
    lead_id: lead.lead_id,
    status: "updated",
    message: `Owner changed to ${owner.name}`,
    created_at: new Date().toISOString(),
  });
  return {
    mode: "memory",
    lead: getLeads().leads.find((l) => l.id === lead.id),
  };
}

export function getSheetBridge() {
  return {
    mode: "memory",
    config: {
      id: sheetConfig.id,
      spreadsheetId: sheetConfig.spreadsheet_id,
      sheetName: sheetConfig.sheet_name,
      enabled: Boolean(sheetConfig.enabled),
      lastSyncedAt: sheetConfig.last_synced_at,
    },
    logs: sheetLogs.slice(0, 40).map((l) => ({
      id: l.id,
      leadId: l.lead_id,
      status: l.status,
      message: l.message,
      createdAt: l.created_at,
    })),
    leads: getLeads().leads,
  };
}

export function saveSheetConfig({ spreadsheetId, sheetName, enabled = true }) {
  sheetConfig = {
    ...sheetConfig,
    spreadsheet_id: spreadsheetId,
    sheet_name: sheetName,
    enabled: enabled ? 1 : 0,
  };
  return getSheetBridge();
}

export function runSheetSync() {
  sheetConfig.last_synced_at = new Date().toISOString();
  sheetLogs.unshift({
    id: `sl_${Date.now()}`,
    lead_id: "ALL",
    status: "success",
    message: "Synced memory leads with sheet bridge",
    created_at: sheetConfig.last_synced_at,
  });
  return { ...getSheetBridge(), syncSummary: { processed: leads.length } };
}

function findUser(userId) {
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error("User not found.");
  return user;
}

export function getUserSettings(req) {
  const userId = String(req.query.userId || req.body?.userId || "").trim();
  if (!userId) throw new Error("userId is required.");
  const user = findUser(userId);
  const settings = getFileSettings(user);
  return { ...settings, mode: "memory-file" };
}

export function updateUserSettings(req) {
  const userId = String(req.body?.userId || "").trim();
  if (!userId) throw new Error("userId is required.");
  const user = findUser(userId);
  const saved = saveFileSettings(user, req.body || {});
  // Keep in-memory users table in sync for dashboards
  user.name = saved.profile.name;
  user.email = saved.profile.email;
  user.department = saved.profile.department;
  return { ...saved, mode: "memory-file" };
}

export function changeUserPassword(req) {
  const userId = String(req.body?.userId || "").trim();
  if (!userId) throw new Error("userId is required.");
  const user = findUser(userId);
  const saved = changeFilePassword(user, req.body?.currentPassword, req.body?.newPassword);
  return { ...saved, mode: "memory-file", message: "Password updated." };
}
