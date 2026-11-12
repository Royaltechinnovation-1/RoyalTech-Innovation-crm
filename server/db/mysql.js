import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { buildHrDashboard } from "./hrStore.js";
import { buildDevDashboard } from "./devStore.js";
import { buildSuperAdminDashboard } from "./superAdminStore.js";
import { getFileSettings, saveFileSettings } from "./settingsStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pool = null;
let connected = false;

export function isMysqlConnected() {
  return connected;
}

export async function initMysql() {
  const config = {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    multipleStatements: true,
  };

  try {
    const boot = await mysql.createConnection(config);
    const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    await boot.query(schema);
    await boot.end();

    pool = mysql.createPool({
      ...config,
      database: process.env.MYSQL_DATABASE || "royaltech_crm",
      waitForConnections: true,
      connectionLimit: 10,
    });

    try {
      await pool.query("ALTER TABLE leads ADD COLUMN sheet_row_id VARCHAR(64) NULL");
    } catch {
      /* column already exists */
    }

    try {
      await pool.query("ALTER TABLE users ADD COLUMN manager_id VARCHAR(32) NULL");
    } catch {
      /* column already exists */
    }

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_settings (
          user_id VARCHAR(32) PRIMARY KEY,
          full_name VARCHAR(120) NOT NULL,
          email VARCHAR(160) NOT NULL,
          department VARCHAR(80) NOT NULL,
          language VARCHAR(40) NOT NULL DEFAULT 'English',
          timezone VARCHAR(80) NOT NULL DEFAULT 'IST (GMT+5:30)',
          theme VARCHAR(40) NOT NULL DEFAULT 'Light',
          density VARCHAR(40) NOT NULL DEFAULT 'Comfortable',
          two_factor TINYINT(1) NOT NULL DEFAULT 1,
          show_online TINYINT(1) NOT NULL DEFAULT 1,
          notify_tasks TINYINT(1) NOT NULL DEFAULT 1,
          notify_projects TINYINT(1) NOT NULL DEFAULT 1,
          notify_bugs TINYINT(1) NOT NULL DEFAULT 1,
          notify_messages TINYINT(1) NOT NULL DEFAULT 1,
          notify_team TINYINT(1) NOT NULL DEFAULT 0,
          password VARCHAR(120) NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);
    } catch {
      /* table may already exist */
    }

    try {
      await pool.query(
        `UPDATE users SET manager_id = 'u3'
         WHERE role = 'sales_executive' AND (manager_id IS NULL OR manager_id = '')
           AND id IN ('u4','u9','u10','u11')`,
      );
    } catch {
      /* ignore if users missing */
    }

    const [leadRows] = await pool.query("SELECT COUNT(*) AS c FROM leads");
    const [empRows] = await pool.query("SELECT COUNT(*) AS c FROM employees");
    if (Number(leadRows[0].c) === 0 || Number(empRows[0].c) === 0 || process.env.FORCE_SEED === "1") {
      const seed = fs.readFileSync(path.join(__dirname, "seed.sql"), "utf8");
      await pool.query(seed);
    }

    const [sheetCfg] = await pool.query("SELECT COUNT(*) AS c FROM sheet_config");
    if (Number(sheetCfg[0].c) === 0) {
      await pool.query(
        `INSERT INTO sheet_config (id, spreadsheet_id, sheet_name, enabled, last_synced_at)
         VALUES ('sc1', '1RoyalTechSalesLeadsSheetDemo', 'Leads', 1, NULL)`,
      );
    }

    const [mailCfg] = await pool.query("SELECT COUNT(*) AS c FROM mail_config");
    if (Number(mailCfg[0].c) === 0) {
      await pool.query(
        `INSERT INTO mail_config (id, provider, from_email, enabled, connected_at)
         VALUES ('mc1', 'smtp', 'proposals@royaltech.io', 0, NULL)`,
      );
    }

    const [proposalRows] = await pool.query("SELECT COUNT(*) AS c FROM proposals");
    if (Number(proposalRows[0].c) === 0) {
      await pool.query(
        `INSERT INTO proposals (id, proposal_code, lead_id, title, amount, status, valid_until, body_text, created_at, last_sent_at) VALUES
         ('p1', 'PROP-0012', 'l1', 'Website Development Proposal', 24000, 'sent', '2026-11-30', 'Proposal for Northpine Studio website and CRM seats.', '2026-11-01', '2026-11-02 10:00:00'),
         ('p2', 'PROP-0011', 'l2', 'ERP Solution Proposal', 58000, 'draft', '2026-12-20', 'Warehouse rollout proposal for Cedar & Co.', '2026-11-05', NULL),
         ('p3', 'PROP-0010', 'l5', 'Mobile App Proposal', 42000, 'accepted', '2026-10-15', 'Annual support and mobile module for Brightleaf Retail.', '2026-09-20', '2026-09-22 14:00:00'),
         ('p4', 'PROP-0009', 'l3', 'Custom Software Proposal', 31200, 'pending', '2026-12-05', 'Ops suite proposal for Mossline Foods.', '2026-10-25', '2026-10-28 11:30:00'),
         ('p5', 'PROP-0008', 'l4', 'Digital Marketing Proposal', 8500, 'rejected', '2026-11-10', 'Pilot marketing + CRM package for Quiet Harbor.', '2026-10-01', '2026-10-05 09:00:00'),
         ('p6', 'PROP-0007', 'l8', 'Multi-store CRM Proposal', 46500, 'sent', '2026-12-12', 'Multi-store CRM rollout for Orbit Retail.', '2026-10-29', '2026-10-30 16:00:00'),
         ('p7', 'PROP-0006', 'l7', 'Product Demo Follow-up Quote', 27500, 'draft', '2026-12-01', 'Quote following Lumen Labs product demo.', '2026-11-08', NULL),
         ('p8', 'PROP-0005', 'l12', 'NovaGrid Negotiation Quote', 38000, 'pending', '2026-11-28', 'Updated commercial terms for NovaGrid.', '2026-11-03', '2026-11-04 12:00:00')`,
      );
    }

    connected = true;
    return true;
  } catch (error) {
    connected = false;
    pool = null;
    console.warn("[mysql] unavailable:", error.message);
    return false;
  }
}

export async function query(sql, params = []) {
  if (!pool) throw new Error("MySQL pool not ready");
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function getSalesDashboard(ownerId, teamManagerId) {
  const users = await query("SELECT id, name, manager_id FROM users");
  const usersById = Object.fromEntries(users.map((u) => [u.id, u.name]));
  let teamIds = null;
  if (teamManagerId) {
    teamIds = users
      .filter((u) => u.id === teamManagerId || u.manager_id === teamManagerId)
      .map((u) => u.id);
  } else if (ownerId) {
    teamIds = [ownerId];
  }

  let leads;
  if (teamIds) {
    if (!teamIds.length) {
      leads = [];
    } else {
      const placeholders = teamIds.map(() => "?").join(",");
      leads = await query(
        `SELECT * FROM leads WHERE owner_id IN (${placeholders})`,
        teamIds,
      );
    }
  } else {
    leads = await query("SELECT * FROM leads");
  }

  const open = leads.filter((l) => l.status !== "won" && l.status !== "lost");
  const won = leads.filter((l) => l.status === "won");
  const lost = leads.filter((l) => l.status === "lost");

  const clients = teamIds?.length
    ? await query(
        `SELECT COUNT(*) AS c FROM clients WHERE account_manager_id IN (${teamIds.map(() => "?").join(",")})`,
        teamIds,
      )
    : await query("SELECT COUNT(*) AS c FROM clients");

  let recentActivities;
  if (teamIds?.length) {
    const placeholders = teamIds.map(() => "?").join(",");
    recentActivities = await query(
      `SELECT a.*, u.name AS owner_name, l.company AS lead_company
       FROM sales_activities a
       LEFT JOIN users u ON u.id = a.owner_id
       LEFT JOIN leads l ON l.id = a.lead_id
       WHERE a.owner_id IN (${placeholders})
       ORDER BY a.activity_date DESC LIMIT 6`,
      teamIds,
    );
  } else {
    recentActivities = await query(
      `SELECT a.*, u.name AS owner_name, l.company AS lead_company
       FROM sales_activities a
       LEFT JOIN users u ON u.id = a.owner_id
       LEFT JOIN leads l ON l.id = a.lead_id
       ORDER BY a.activity_date DESC LIMIT 6`,
    );
  }

  const byStatus = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] ?? 0) + 1;
    return acc;
  }, {});
  const bySource = leads.reduce((acc, lead) => {
    acc[lead.source] = (acc[lead.source] ?? 0) + 1;
    return acc;
  }, {});

  const recentLeads = [...leads]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 6)
    .map((lead) => ({ ...lead, owner_name: usersById[lead.owner_id] ?? "—" }));

  const followUps = leads
    .filter((l) => l.next_follow_up && l.status !== "won" && l.status !== "lost")
    .sort((a, b) => String(a.next_follow_up).localeCompare(String(b.next_follow_up)))
    .slice(0, 6)
    .map((lead) => ({ ...lead, owner_name: usersById[lead.owner_id] ?? "—" }));

  const pipelineValue = open.reduce((s, l) => s + Number(l.value), 0);
  const wonValue = won.reduce((s, l) => s + Number(l.value), 0);

  return {
    mode: "mysql",
    summary: {
      totalLeads: leads.length,
      openDeals: open.length,
      pipelineValue,
      wonDeals: won.length,
      wonValue,
      lostDeals: lost.length,
      conversion: leads.length ? Math.round((won.length / leads.length) * 100) : 0,
      clients: Number(clients[0].c),
      followUps: followUps.length,
    },
    byStatus,
    bySource,
    recentLeads,
    followUps,
    recentActivities,
  };
}

export async function getSalesTeam(teamManagerId) {
  const sellers = teamManagerId
    ? await query(
        `SELECT * FROM users
         WHERE id = ? OR manager_id = ?
         ORDER BY CASE WHEN role = 'sales_manager' THEN 0 ELSE 1 END, name`,
        [teamManagerId, teamManagerId],
      )
    : await query(
        `SELECT * FROM users WHERE role IN ('sales_manager', 'sales_executive')
         ORDER BY CASE WHEN role = 'sales_manager' THEN 0 ELSE 1 END, name`,
      );
  const leads = await query("SELECT * FROM leads");
  const targets = await query("SELECT * FROM sales_targets");

  return sellers.map((seller) => {
    const owned = leads.filter((l) => l.owner_id === seller.id);
    const open = owned.filter((l) => l.status !== "won" && l.status !== "lost");
    const won = owned.filter((l) => l.status === "won");
    const target = targets.find((t) => t.owner_id === seller.id);
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

export async function getSalesTargets() {
  const rows = await query(
    `SELECT t.*, u.name AS owner_name
     FROM sales_targets t
     LEFT JOIN users u ON u.id = t.owner_id`,
  );
  return rows.map((t) => ({
    id: t.id,
    ownerId: t.owner_id,
    ownerName: t.owner_name ?? "—",
    period: t.period,
    target: Number(t.target_amount),
    achieved: Number(t.achieved_amount),
    percent: Math.round((Number(t.achieved_amount) / Number(t.target_amount)) * 100),
  }));
}

export async function getSalesReports() {
  const leads = await query("SELECT * FROM leads");
  const users = await query(
    `SELECT * FROM users WHERE role IN ('sales_manager', 'sales_executive')`,
  );
  const won = leads.filter((l) => l.status === "won");
  const lost = leads.filter((l) => l.status === "lost");
  const bySource = Object.entries(
    leads.reduce((acc, lead) => {
      acc[lead.source] = (acc[lead.source] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([source, count]) => ({ source, count }));

  return {
    won: won.length,
    lost: lost.length,
    wonValue: won.reduce((s, l) => s + Number(l.value), 0),
    bySource,
    revenueByOwner: users.map((u) => ({
      owner: u.name,
      revenue: won
        .filter((l) => l.owner_id === u.id)
        .reduce((s, l) => s + Number(l.value), 0),
    })),
  };
}

export async function getHrDashboard() {
  const [employees, candidates, leaveRequests] = await Promise.all([
    query("SELECT * FROM employees"),
    query("SELECT * FROM candidates"),
    query("SELECT * FROM leave_requests"),
  ]);
  const data = buildHrDashboard({ employees, candidates, leaveRequests });
  return { ...data, mode: "mysql" };
}

export async function getDevDashboard({ assigneeId, managerId } = {}) {
  const [projects, tasks, users] = await Promise.all([
    query("SELECT * FROM projects"),
    query("SELECT * FROM project_tasks"),
    query("SELECT * FROM users"),
  ]);
  const data = buildDevDashboard({
    projects,
    tasks,
    users,
    assigneeId,
    managerOnly: managerId,
  });
  return { ...data, mode: "mysql" };
}

export async function getSuperAdminDashboard() {
  const [leads, employees, projects, payments, invoices, enquiries, users, leaveRequests, tasks] =
    await Promise.all([
      query("SELECT * FROM leads"),
      query("SELECT * FROM employees"),
      query("SELECT * FROM projects"),
      query("SELECT * FROM payments"),
      query("SELECT * FROM invoices"),
      query("SELECT * FROM website_enquiries"),
      query("SELECT * FROM users"),
      query("SELECT * FROM leave_requests"),
      query("SELECT * FROM project_tasks"),
    ]);
  const data = buildSuperAdminDashboard({
    leads,
    employees,
    projects,
    payments,
    invoices,
    enquiries,
    users,
    leaveRequests,
    tasks,
  });
  return { ...data, mode: "mysql" };
}

function toDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return null;
}

function mapLead(row, ownerName = "—") {
  return {
    id: row.id,
    leadId: row.lead_id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    source: row.source,
    status: row.status,
    ownerId: row.owner_id,
    ownerName,
    value: Number(row.value),
    notes: row.notes ?? "",
    nextFollowUp: toDateOnly(row.next_follow_up),
    createdAt: toDateOnly(row.created_at) ?? new Date().toISOString().slice(0, 10),
    sheetRowId: row.sheet_row_id ?? null,
  };
}

export async function getLeads(ownerId, teamManagerId) {
  const users = await query("SELECT id, name, manager_id FROM users");
  const byId = Object.fromEntries(users.map((u) => [u.id, u.name]));
  let rows;
  if (teamManagerId) {
    const teamIds = users
      .filter((u) => u.id === teamManagerId || u.manager_id === teamManagerId)
      .map((u) => u.id);
    if (!teamIds.length) {
      rows = [];
    } else {
      const placeholders = teamIds.map(() => "?").join(",");
      rows = await query(
        `SELECT * FROM leads WHERE owner_id IN (${placeholders}) ORDER BY created_at DESC`,
        teamIds,
      );
    }
  } else if (ownerId) {
    rows = await query("SELECT * FROM leads WHERE owner_id = ? ORDER BY created_at DESC", [ownerId]);
  } else {
    rows = await query("SELECT * FROM leads ORDER BY created_at DESC");
  }
  return {
    mode: "mysql",
    scope: teamManagerId ? "team" : ownerId ? "self" : "all",
    leads: rows.map((row) => mapLead(row, byId[row.owner_id] ?? "—")),
  };
}

function mapClient(row, managerName = "—", managerInitials = "—") {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone ?? "",
    accountManagerId: row.account_manager_id,
    accountManagerName: managerName,
    accountManagerInitials: managerInitials,
    status: row.status,
    createdAt: toDateOnly(row.created_at) ?? new Date().toISOString().slice(0, 10),
  };
}

export async function getClients(managerId, teamManagerId) {
  const users = await query("SELECT id, name, manager_id FROM users");
  const byId = Object.fromEntries(
    users.map((u) => [
      u.id,
      {
        name: u.name,
        initials: String(u.name || "")
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0]?.toUpperCase() ?? "")
          .join(""),
      },
    ]),
  );
  let rows;
  if (teamManagerId) {
    const teamIds = users
      .filter((u) => u.id === teamManagerId || u.manager_id === teamManagerId)
      .map((u) => u.id);
    if (!teamIds.length) {
      rows = [];
    } else {
      const placeholders = teamIds.map(() => "?").join(",");
      rows = await query(
        `SELECT * FROM clients WHERE account_manager_id IN (${placeholders}) ORDER BY created_at DESC`,
        teamIds,
      );
    }
  } else if (managerId) {
    rows = await query(
      "SELECT * FROM clients WHERE account_manager_id = ? ORDER BY created_at DESC",
      [managerId],
    );
  } else {
    rows = await query("SELECT * FROM clients ORDER BY created_at DESC");
  }
  return {
    mode: "mysql",
    scope: teamManagerId ? "team" : managerId ? "self" : "all",
    clients: rows.map((row) => {
      const mgr = byId[row.account_manager_id] ?? { name: "—", initials: "—" };
      return mapClient(row, mgr.name, mgr.initials);
    }),
  };
}

export async function createClient(input = {}) {
  const name = String(input.name || "").trim();
  const company = String(input.company || "").trim();
  const email = String(input.email || "").trim();
  if (!name || !company || !email) throw new Error("Name, company, and email are required");

  const existing = await query("SELECT id FROM clients WHERE email = ?", [email]);
  if (existing.length) throw new Error("A client with this email already exists");

  const id = `cl_${Date.now().toString(36)}`;
  const phone = String(input.phone || "").trim();
  const accountManagerId = String(input.accountManagerId || "u3");
  const status = input.status === "inactive" ? "inactive" : "active";
  const createdAt = toDateOnly(input.createdAt) ?? new Date().toISOString().slice(0, 10);

  await query(
    `INSERT INTO clients (id, name, company, email, phone, account_manager_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, company, email, phone, accountManagerId, status, createdAt],
  );

  const users = await query("SELECT id, name FROM users WHERE id = ?", [accountManagerId]);
  const managerName = users[0]?.name ?? "—";
  const managerInitials = managerName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  const rows = await query("SELECT * FROM clients WHERE id = ?", [id]);
  return { mode: "mysql", client: mapClient(rows[0], managerName, managerInitials) };
}

function mapProposal(row, lead) {
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
    validUntil: toDateOnly(row.valid_until),
    body: row.body_text ?? "",
    createdAt: toDateOnly(row.created_at),
    lastSentAt: row.last_sent_at
      ? row.last_sent_at instanceof Date
        ? row.last_sent_at.toISOString()
        : String(row.last_sent_at)
      : null,
  };
}

export async function getMailStatus() {
  const rows = await query("SELECT * FROM mail_config LIMIT 1");
  const envReady = Boolean(process.env.MAIL_SMTP_HOST && process.env.MAIL_FROM);
  const cfg = rows[0];
  const enabled = Boolean(cfg?.enabled) || envReady;
  return {
    mode: "mysql",
    connected: enabled,
    provider: cfg?.provider || (envReady ? "smtp" : "none"),
    fromEmail: cfg?.from_email || process.env.MAIL_FROM || null,
    message: enabled
      ? "Mail connected — proposals can be sent from CRM."
      : "Mail not connected yet. Review and queue sends here; connect SMTP later.",
  };
}

export async function getProposals() {
  const [rows, leads, mail] = await Promise.all([
    query("SELECT * FROM proposals ORDER BY created_at DESC, proposal_code DESC"),
    query("SELECT id, lead_id, name, company, email FROM leads"),
    getMailStatus(),
  ]);
  const byId = Object.fromEntries(leads.map((l) => [l.id, l]));
  const proposals = rows.map((row) => mapProposal(row, byId[row.lead_id]));
  const totalValue = proposals.reduce((s, p) => s + p.amount, 0);
  const accepted = proposals.filter((p) => p.status === "accepted");
  const pending = proposals.filter((p) => p.status === "pending" || p.status === "sent");
  return {
    mode: "mysql",
    mail: mail,
    summary: {
      total: proposals.length,
      totalValue,
      accepted: accepted.length,
      pending: pending.length,
      draft: proposals.filter((p) => p.status === "draft").length,
      rejected: proposals.filter((p) => p.status === "rejected").length,
    },
    proposals,
  };
}

export async function createProposal(input = {}) {
  const title = String(input.title || "").trim();
  const leadId = String(input.leadId || "").trim();
  const amount = Number(input.amount || 0);
  if (!title || !leadId || !(amount > 0)) throw new Error("Title, lead, and amount are required");

  const leads = await query("SELECT * FROM leads WHERE id = ? OR lead_id = ?", [leadId, leadId]);
  if (!leads.length) throw new Error("Lead not found");
  const lead = leads[0];

  const countRows = await query("SELECT COUNT(*) AS c FROM proposals");
  const next = Number(countRows[0].c) + 1;
  const id = `p_${Date.now().toString(36)}`;
  const code = `PROP-${String(next).padStart(4, "0")}`;
  const status = ["draft", "sent", "pending", "accepted", "rejected"].includes(input.status)
    ? input.status
    : "draft";
  const validUntil = toDateOnly(input.validUntil) || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const body = String(input.body || `Proposal for ${lead.company}.`).trim();
  const createdAt = new Date().toISOString().slice(0, 10);

  await query(
    `INSERT INTO proposals
     (id, proposal_code, lead_id, title, amount, status, valid_until, body_text, created_at, last_sent_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [id, code, lead.id, title, amount, status, validUntil, body, createdAt],
  );

  const rows = await query("SELECT * FROM proposals WHERE id = ?", [id]);
  return { mode: "mysql", proposal: mapProposal(rows[0], lead) };
}

export async function updateProposalStatus(id, status) {
  const allowed = ["draft", "sent", "pending", "accepted", "rejected"];
  if (!allowed.includes(status)) throw new Error("Invalid proposal status");
  const rows = await query("SELECT * FROM proposals WHERE id = ? OR proposal_code = ?", [id, id]);
  if (!rows.length) throw new Error("Proposal not found");
  await query("UPDATE proposals SET status = ? WHERE id = ?", [status, rows[0].id]);
  const leads = await query("SELECT * FROM leads WHERE id = ?", [rows[0].lead_id]);
  const refreshed = await query("SELECT * FROM proposals WHERE id = ?", [rows[0].id]);
  return { mode: "mysql", proposal: mapProposal(refreshed[0], leads[0]) };
}

export async function sendProposalMail(id, input = {}) {
  const rows = await query("SELECT * FROM proposals WHERE id = ? OR proposal_code = ?", [id, id]);
  if (!rows.length) throw new Error("Proposal not found");
  const proposal = rows[0];
  const leads = await query("SELECT * FROM leads WHERE id = ?", [proposal.lead_id]);
  if (!leads.length) throw new Error("Linked lead not found");
  const lead = leads[0];

  const to = String(input.to || lead.email || "").trim();
  const subject = String(input.subject || `${proposal.title} (${proposal.proposal_code})`).trim();
  const message = String(
    input.message ||
      proposal.body_text ||
      `Dear ${lead.name},\n\nPlease find our proposal ${proposal.proposal_code} for ${lead.company}.\n\nAmount: ${proposal.amount}\nValid until: ${toDateOnly(proposal.valid_until)}\n\nRegards,\nRoyalTech Sales`,
  ).trim();
  if (!to) throw new Error("Recipient email is required");

  const mail = await getMailStatus();
  const logId = `pml_${Date.now().toString(36)}`;
  const sendStatus = mail.connected ? "sent" : "queued";
  const logMessage = mail.connected
    ? `Sent to ${to} via ${mail.provider}`
    : `Queued for ${to} — connect mail later to deliver`;

  await query(
    `INSERT INTO proposal_mail_logs (id, proposal_id, to_email, subject, status, message, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [logId, proposal.id, to, subject, sendStatus, logMessage],
  );
  await query(
    `UPDATE proposals SET status = 'sent', last_sent_at = NOW() WHERE id = ?`,
    [proposal.id],
  );

  const refreshed = await query("SELECT * FROM proposals WHERE id = ?", [proposal.id]);
  return {
    mode: "mysql",
    mailed: mail.connected,
    queued: !mail.connected,
    mail,
    log: { id: logId, to, subject, status: sendStatus, message: logMessage },
    preview: { to, subject, message },
    proposal: mapProposal(refreshed[0], lead),
  };
}

export async function updateLeadStatus(id, status, ownerId) {
  const allowed = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];
  if (!allowed.includes(status)) throw new Error("Invalid lead status");

  const rows = await query("SELECT * FROM leads WHERE id = ? OR lead_id = ?", [id, id]);
  if (!rows.length) throw new Error("Lead not found");
  const lead = rows[0];

  if (ownerId) {
    const owners = await query("SELECT id, name FROM users WHERE id = ?", [ownerId]);
    if (!owners.length) throw new Error("Owner not found");
    await query("UPDATE leads SET status = ?, owner_id = ? WHERE id = ?", [
      status,
      ownerId,
      lead.id,
    ]);
    lead.owner_id = ownerId;
  } else {
    await query("UPDATE leads SET status = ? WHERE id = ?", [status, lead.id]);
  }

  if (status === "won") {
    const existing = await query("SELECT id FROM clients WHERE email = ?", [lead.email]);
    if (!existing.length) {
      await query(
        `INSERT INTO clients (id, name, company, email, phone, account_manager_id, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', CURDATE())`,
        [
          `cl_${Date.now().toString(36)}`,
          lead.name,
          lead.company,
          lead.email,
          lead.phone,
          lead.owner_id,
        ],
      );
    }
  }

  const logId = `sl_${Date.now().toString(36)}`;
  await query(
    `INSERT INTO sheet_sync_logs (id, lead_id, status, message, created_at)
     VALUES (?, ?, 'updated', ?, NOW())`,
    [logId, lead.lead_id, `Status changed to ${status} and queued for Google Sheet sync`],
  );

  if (!lead.sheet_row_id) {
    await query("UPDATE leads SET sheet_row_id = ? WHERE id = ?", [
      `row_${lead.lead_id}`,
      lead.id,
    ]);
  }

  const users = await query("SELECT id, name FROM users");
  const ownerName = users.find((u) => u.id === lead.owner_id)?.name ?? "—";
  const refreshed = await query("SELECT * FROM leads WHERE id = ?", [lead.id]);
  return { mode: "mysql", lead: mapLead(refreshed[0], ownerName) };
}

export async function updateLeadOwner(id, ownerId) {
  const owners = await query("SELECT id, name FROM users WHERE id = ?", [ownerId]);
  if (!owners.length) throw new Error("Owner not found");

  const rows = await query("SELECT * FROM leads WHERE id = ? OR lead_id = ?", [id, id]);
  if (!rows.length) throw new Error("Lead not found");
  const lead = rows[0];

  await query("UPDATE leads SET owner_id = ? WHERE id = ?", [ownerId, lead.id]);

  const logId = `sl_${Date.now().toString(36)}`;
  await query(
    `INSERT INTO sheet_sync_logs (id, lead_id, status, message, created_at)
     VALUES (?, ?, 'updated', ?, NOW())`,
    [logId, lead.lead_id, `Owner changed to ${owners[0].name}`],
  );

  const refreshed = await query("SELECT * FROM leads WHERE id = ?", [lead.id]);
  return { mode: "mysql", lead: mapLead(refreshed[0], owners[0].name) };
}

export async function getSheetBridge() {
  const [configRows, logs, leadPack] = await Promise.all([
    query("SELECT * FROM sheet_config LIMIT 1"),
    query("SELECT * FROM sheet_sync_logs ORDER BY created_at DESC LIMIT 40"),
    getLeads(),
  ]);
  const config = configRows[0] ?? {
    id: "sc1",
    spreadsheet_id: "",
    sheet_name: "Leads",
    enabled: 0,
    last_synced_at: null,
  };
  return {
    mode: "mysql",
    config: {
      id: config.id,
      spreadsheetId: config.spreadsheet_id,
      sheetName: config.sheet_name,
      enabled: Boolean(config.enabled),
      lastSyncedAt: toDateOnly(config.last_synced_at),
    },
    logs: logs.map((l) => ({
      id: l.id,
      leadId: l.lead_id,
      status: l.status,
      message: l.message,
      createdAt: l.created_at instanceof Date ? l.created_at.toISOString() : String(l.created_at ?? ""),
    })),
    leads: leadPack.leads,
  };
}

export async function saveSheetConfig({ spreadsheetId, sheetName, enabled = true }) {
  const rows = await query("SELECT id FROM sheet_config LIMIT 1");
  if (rows.length) {
    await query(
      `UPDATE sheet_config
       SET spreadsheet_id = ?, sheet_name = ?, enabled = ?
       WHERE id = ?`,
      [spreadsheetId, sheetName, enabled ? 1 : 0, rows[0].id],
    );
  } else {
    await query(
      `INSERT INTO sheet_config (id, spreadsheet_id, sheet_name, enabled, last_synced_at)
       VALUES ('sc1', ?, ?, ?, NULL)`,
      [spreadsheetId, sheetName, enabled ? 1 : 0],
    );
  }
  return getSheetBridge();
}

export async function runSheetSync() {
  const configRows = await query("SELECT * FROM sheet_config LIMIT 1");
  if (!configRows.length || !configRows[0].enabled) {
    throw new Error("Save and enable Google Sheet connection first");
  }

  const now = new Date();
  const stamp = now.toISOString().slice(0, 19).replace("T", " ");
  const incoming = [
    {
      leadId: "RT-1002",
      name: "Jonah Reeves",
      company: "Cedar & Co",
      email: "jonah@cedar.co",
      phone: "+1 628 441 7720",
      source: "LinkedIn",
      status: "proposal",
      value: 61000,
      notes: "Updated from Google Sheet — expanded scope",
      sheetRowId: "row_RT-1002",
    },
    {
      leadId: "RT-1010",
      name: "Omar Farooq",
      company: "BluePeak Media",
      email: "omar@bluepeak.com",
      phone: "+1 212 555 0188",
      source: "Website",
      status: "contacted",
      value: 12500,
      notes: "Status changed in sheet by sales manager",
      sheetRowId: "row_RT-1010",
    },
    {
      leadId: "RT-1021",
      name: "Aisha Khan",
      company: "Nimbus Retail",
      email: "aisha@nimbus.retail",
      phone: "+91 98100 77881",
      source: "Google Sheet",
      status: "new",
      value: 18500,
      notes: "New lead imported from sheet",
      sheetRowId: "row_RT-1021",
    },
  ];

  const logs = [];
  const users = await query("SELECT id FROM users WHERE role = 'sales_manager' LIMIT 1");
  const defaultOwner = users[0]?.id ?? "u3";

  for (const row of incoming) {
    const byId = await query("SELECT * FROM leads WHERE lead_id = ?", [row.leadId]);
    if (byId.length) {
      await query(
        `UPDATE leads
         SET status = ?, value = ?, notes = ?, sheet_row_id = ?, source = ?
         WHERE lead_id = ?`,
        [row.status, row.value, row.notes, row.sheetRowId, row.source, row.leadId],
      );
      const logId = `sl_${Date.now().toString(36)}_${logs.length}`;
      await query(
        `INSERT INTO sheet_sync_logs (id, lead_id, status, message, created_at)
         VALUES (?, ?, 'updated', ?, ?)`,
        [logId, row.leadId, `Matched ${row.leadId} from sheet and updated CRM + MySQL`, stamp],
      );
      logs.push({ leadId: row.leadId, status: "updated" });
      continue;
    }

    const byEmail = await query("SELECT * FROM leads WHERE LOWER(email) = LOWER(?)", [row.email]);
    if (byEmail.length) {
      const logId = `sl_${Date.now().toString(36)}_${logs.length}`;
      await query(
        `INSERT INTO sheet_sync_logs (id, lead_id, status, message, created_at)
         VALUES (?, ?, 'duplicate', ?, ?)`,
        [
          logId,
          byEmail[0].lead_id,
          `Duplicate email ${row.email}; kept ${byEmail[0].lead_id}`,
          stamp,
        ],
      );
      logs.push({ leadId: byEmail[0].lead_id, status: "duplicate" });
      continue;
    }

    const id = `l_${Date.now().toString(36)}_${logs.length}`;
    await query(
      `INSERT INTO leads
       (id, lead_id, name, company, email, phone, source, status, owner_id, value, notes, next_follow_up, created_at, sheet_row_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), CURDATE(), ?)`,
      [
        id,
        row.leadId,
        row.name,
        row.company,
        row.email,
        row.phone,
        row.source,
        row.status,
        defaultOwner,
        row.value,
        row.notes,
        row.sheetRowId,
      ],
    );
    const logId = `sl_${Date.now().toString(36)}_${logs.length}`;
    await query(
      `INSERT INTO sheet_sync_logs (id, lead_id, status, message, created_at)
       VALUES (?, ?, 'success', ?, ?)`,
      [logId, row.leadId, "New lead imported from Google Sheet into MySQL", stamp],
    );
    logs.push({ leadId: row.leadId, status: "success" });
  }

  // Push CRM statuses back to sheet mapping (assign sheet_row_id)
  const openLeads = await query("SELECT id, lead_id, sheet_row_id FROM leads");
  for (const lead of openLeads) {
    if (!lead.sheet_row_id) {
      await query("UPDATE leads SET sheet_row_id = ? WHERE id = ?", [
        `row_${lead.lead_id}`,
        lead.id,
      ]);
    }
  }

  await query("UPDATE sheet_config SET last_synced_at = ? WHERE id = ?", [
    stamp,
    configRows[0].id,
  ]);

  return {
    ...(await getSheetBridge()),
    syncSummary: {
      processed: incoming.length,
      results: logs,
      pushedRowLinks: openLeads.length,
    },
  };
}

function mapSettingsRow(row, user) {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    department: row.department,
    role: user.role,
    language: row.language,
    timezone: row.timezone,
    theme: row.theme,
    density: row.density,
    twoFactor: Boolean(row.two_factor),
    showOnline: Boolean(row.show_online),
    notifyTasks: Boolean(row.notify_tasks),
    notifyProjects: Boolean(row.notify_projects),
    notifyBugs: Boolean(row.notify_bugs),
    notifyMessages: Boolean(row.notify_messages),
    notifyTeam: Boolean(row.notify_team),
    hasPassword: Boolean(row.password),
    updatedAt: row.updated_at,
    mode: "mysql",
  };
}

async function ensureMysqlSettings(user) {
  const rows = await query("SELECT * FROM user_settings WHERE user_id = ?", [user.id]);
  if (rows[0]) return rows[0];
  const defaults = getFileSettings(user);
  await query(
    `INSERT INTO user_settings (
      user_id, full_name, email, department, language, timezone, theme, density,
      two_factor, show_online, notify_tasks, notify_projects, notify_bugs, notify_messages, notify_team, password
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      defaults.fullName,
      defaults.email,
      defaults.department,
      defaults.language,
      defaults.timezone,
      defaults.theme,
      defaults.density,
      defaults.twoFactor ? 1 : 0,
      defaults.showOnline ? 1 : 0,
      defaults.notifyTasks ? 1 : 0,
      defaults.notifyProjects ? 1 : 0,
      defaults.notifyBugs ? 1 : 0,
      defaults.notifyMessages ? 1 : 0,
      defaults.notifyTeam ? 1 : 0,
      "dev123",
    ],
  );
  const created = await query("SELECT * FROM user_settings WHERE user_id = ?", [user.id]);
  return created[0];
}

export async function getUserSettings(req) {
  const userId = String(req.query.userId || req.body?.userId || "").trim();
  if (!userId) throw new Error("userId is required.");
  const users = await query("SELECT * FROM users WHERE id = ?", [userId]);
  const user = users[0];
  if (!user) throw new Error("User not found.");
  const row = await ensureMysqlSettings(user);
  return mapSettingsRow(row, user);
}

export async function updateUserSettings(req) {
  const body = req.body || {};
  const userId = String(body.userId || "").trim();
  if (!userId) throw new Error("userId is required.");
  const users = await query("SELECT * FROM users WHERE id = ?", [userId]);
  const user = users[0];
  if (!user) throw new Error("User not found.");

  const current = await ensureMysqlSettings(user);
  const fullName = String(body.fullName ?? current.full_name).trim() || user.name;
  const email = String(body.email ?? current.email).trim() || user.email;
  const department = String(body.department ?? current.department).trim() || user.department;
  const language = String(body.language ?? current.language);
  const timezone = String(body.timezone ?? current.timezone);
  const theme = String(body.theme ?? current.theme);
  const density = String(body.density ?? current.density);
  const twoFactor = body.twoFactor != null ? (body.twoFactor ? 1 : 0) : current.two_factor;
  const showOnline = body.showOnline != null ? (body.showOnline ? 1 : 0) : current.show_online;
  const notifyTasks = body.notifyTasks != null ? (body.notifyTasks ? 1 : 0) : current.notify_tasks;
  const notifyProjects =
    body.notifyProjects != null ? (body.notifyProjects ? 1 : 0) : current.notify_projects;
  const notifyBugs = body.notifyBugs != null ? (body.notifyBugs ? 1 : 0) : current.notify_bugs;
  const notifyMessages =
    body.notifyMessages != null ? (body.notifyMessages ? 1 : 0) : current.notify_messages;
  const notifyTeam = body.notifyTeam != null ? (body.notifyTeam ? 1 : 0) : current.notify_team;
  let password = current.password;
  if (body.password) {
    const pwd = String(body.password).trim();
    if (pwd.length < 6) throw new Error("Password must be at least 6 characters.");
    password = pwd;
  }

  await query(
    `UPDATE user_settings SET
      full_name = ?, email = ?, department = ?, language = ?, timezone = ?, theme = ?, density = ?,
      two_factor = ?, show_online = ?, notify_tasks = ?, notify_projects = ?, notify_bugs = ?,
      notify_messages = ?, notify_team = ?, password = ?
     WHERE user_id = ?`,
    [
      fullName,
      email,
      department,
      language,
      timezone,
      theme,
      density,
      twoFactor,
      showOnline,
      notifyTasks,
      notifyProjects,
      notifyBugs,
      notifyMessages,
      notifyTeam,
      password,
      userId,
    ],
  );

  await query("UPDATE users SET name = ?, email = ?, department = ? WHERE id = ?", [
    fullName,
    email,
    department,
    userId,
  ]);

  // Keep file store mirrored for local login sync
  saveFileSettings(
    { id: userId, name: fullName, email, department, role: user.role },
    { ...body, fullName, email, department, password },
  );

  const rows = await query("SELECT * FROM user_settings WHERE user_id = ?", [userId]);
  return {
    ...mapSettingsRow(rows[0], user),
    profile: { id: userId, name: fullName, email, department, password },
  };
}

export async function changeUserPassword(req) {
  const body = req.body || {};
  const userId = String(body.userId || "").trim();
  if (!userId) throw new Error("userId is required.");
  const users = await query("SELECT * FROM users WHERE id = ?", [userId]);
  const user = users[0];
  if (!user) throw new Error("User not found.");
  const row = await ensureMysqlSettings(user);
  if (String(body.currentPassword || "") !== String(row.password || "")) {
    throw new Error("Current password is incorrect.");
  }
  return updateUserSettings({
    body: { userId, password: body.newPassword },
  });
}
