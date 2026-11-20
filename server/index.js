import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import * as memory from "./db/memoryStore.js";
import * as mysqlDb from "./db/mysql.js";
import * as mailService from "./mailService.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.API_PORT || 4000);

app.use(cors());
app.use(express.json());

let usingMysql = false;

function pick(mysqlFn, memoryFn) {
  return async (req, res) => {
    try {
      const data = usingMysql ? await mysqlFn(req) : memoryFn(req);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    database: usingMysql ? "mysql" : "memory",
    message: usingMysql
      ? "Connected to MySQL/MariaDB"
      : "Using in-memory store. Start MySQL and restart API to switch.",
  });
});

app.get(
  "/api/sales/dashboard",
  pick(
    (req) =>
      mysqlDb.getSalesDashboard(
        req.query.ownerId ? String(req.query.ownerId) : undefined,
        req.query.teamManagerId ? String(req.query.teamManagerId) : undefined,
      ),
    (req) =>
      memory.getSalesDashboard(
        req.query.ownerId ? String(req.query.ownerId) : undefined,
        req.query.teamManagerId ? String(req.query.teamManagerId) : undefined,
      ),
  ),
);

app.get(
  "/api/sales/team",
  pick(
    (req) =>
      mysqlDb.getSalesTeam(
        req.query.teamManagerId ? String(req.query.teamManagerId) : undefined,
      ),
    (req) =>
      memory.getSalesTeam(
        req.query.teamManagerId ? String(req.query.teamManagerId) : undefined,
      ),
  ),
);

app.get(
  "/api/sales/targets",
  pick(
    () => mysqlDb.getSalesTargets(),
    () => memory.getSalesTargets(),
  ),
);

app.get(
  "/api/sales/reports",
  pick(
    () => mysqlDb.getSalesReports(),
    () => memory.getSalesReports(),
  ),
);

app.get(
  "/api/hr/dashboard",
  pick(
    () => mysqlDb.getHrDashboard(),
    () => memory.getHrDashboard(),
  ),
);

app.get(
  "/api/dev/dashboard",
  pick(
    (req) =>
      mysqlDb.getDevDashboard({
        assigneeId: req.query.assigneeId ? String(req.query.assigneeId) : undefined,
        managerId: req.query.managerId ? String(req.query.managerId) : undefined,
      }),
    (req) =>
      memory.getDevDashboard({
        assigneeId: req.query.assigneeId ? String(req.query.assigneeId) : undefined,
        managerId: req.query.managerId ? String(req.query.managerId) : undefined,
      }),
  ),
);

app.post("/api/dev/developers", async (req, res) => {
  try {
    const data = usingMysql
      ? await mysqlDb.createDeveloper(req.body || {})
      : memory.createDeveloper(req.body || {});
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/dev/tasks", async (req, res) => {
  try {
    const data = usingMysql
      ? await mysqlDb.createProjectTask(req.body || {})
      : memory.createProjectTask(req.body || {});
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch("/api/dev/tasks/:id", async (req, res) => {
  try {
    const assigneeId = String(req.body?.assigneeId || "");
    const data = usingMysql
      ? await mysqlDb.assignProjectTask(req.params.id, assigneeId)
      : memory.assignProjectTask(req.params.id, assigneeId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get(
  "/api/superadmin/dashboard",
  pick(
    () => mysqlDb.getSuperAdminDashboard(),
    () => memory.getSuperAdminDashboard(),
  ),
);

app.get(
  "/api/leads",
  pick(
    (req) =>
      mysqlDb.getLeads(
        req.query.ownerId ? String(req.query.ownerId) : undefined,
        req.query.teamManagerId ? String(req.query.teamManagerId) : undefined,
      ),
    (req) =>
      memory.getLeads(
        req.query.ownerId ? String(req.query.ownerId) : undefined,
        req.query.teamManagerId ? String(req.query.teamManagerId) : undefined,
      ),
  ),
);

app.patch("/api/leads/:id/status", async (req, res) => {
  try {
    const status = String(req.body?.status || "");
    const ownerId = req.body?.ownerId ? String(req.body.ownerId) : undefined;
    const data = usingMysql
      ? await mysqlDb.updateLeadStatus(req.params.id, status, ownerId)
      : memory.updateLeadStatus(req.params.id, status, ownerId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch("/api/leads/:id/owner", async (req, res) => {
  try {
    const ownerId = String(req.body?.ownerId || "");
    const data = usingMysql
      ? await mysqlDb.updateLeadOwner(req.params.id, ownerId)
      : memory.updateLeadOwner(req.params.id, ownerId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get(
  "/api/clients",
  pick(
    (req) =>
      mysqlDb.getClients(
        req.query.managerId ? String(req.query.managerId) : undefined,
        req.query.teamManagerId ? String(req.query.teamManagerId) : undefined,
      ),
    (req) =>
      memory.getClients(
        req.query.managerId ? String(req.query.managerId) : undefined,
        req.query.teamManagerId ? String(req.query.teamManagerId) : undefined,
      ),
  ),
);

app.post("/api/clients", async (req, res) => {
  try {
    const data = usingMysql
      ? await mysqlDb.createClient(req.body || {})
      : memory.createClient(req.body || {});
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get(
  "/api/proposals",
  pick(
    () => mysqlDb.getProposals(),
    () => memory.getProposals(),
  ),
);

app.get("/api/mail/status", (_req, res) => {
  try {
    res.json(mailService.getMailStatus());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/mail/accounts/:kind", async (req, res) => {
  try {
    const data = mailService.upsertMailAccount(req.params.kind, req.body || {});
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/mail/accounts/:kind/activate", (req, res) => {
  try {
    res.json(mailService.setActiveMailAccount(req.params.kind));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/mail/accounts/:kind/test", async (req, res) => {
  try {
    const data = await mailService.testMailAccount(req.params.kind);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/mail/send", async (req, res) => {
  try {
    const to = String(req.body?.to || "").trim();
    const subject = String(req.body?.subject || "").trim();
    const text = String(req.body?.text || req.body?.message || "").trim();
    if (!to || !subject || !text) {
      res.status(400).json({ error: "to, subject, and text are required" });
      return;
    }
    const data = await mailService.sendMail({
      to,
      subject,
      text,
      html: req.body?.html,
      accountKind: req.body?.accountKind,
    });
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/proposals", async (req, res) => {
  try {
    const data = usingMysql
      ? await mysqlDb.createProposal(req.body || {})
      : memory.createProposal(req.body || {});
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch("/api/proposals/:id/status", async (req, res) => {
  try {
    const status = String(req.body?.status || "");
    const data = usingMysql
      ? await mysqlDb.updateProposalStatus(req.params.id, status)
      : memory.updateProposalStatus(req.params.id, status);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/proposals/:id/send", async (req, res) => {
  try {
    const data = usingMysql
      ? await mysqlDb.sendProposalMail(req.params.id, req.body || {})
      : await memory.sendProposalMail(req.params.id, req.body || {});
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get(
  "/api/sheets",
  pick(
    () => mysqlDb.getSheetBridge(),
    () => memory.getSheetBridge(),
  ),
);

app.put("/api/sheets/config", async (req, res) => {
  try {
    const data = usingMysql
      ? await mysqlDb.saveSheetConfig(req.body || {})
      : memory.saveSheetConfig(req.body || {});
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/sheets/sync", async (_req, res) => {
  try {
    const data = usingMysql ? await mysqlDb.runSheetSync() : memory.runSheetSync();
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/settings/user", async (req, res) => {
  try {
    const data = usingMysql
      ? await mysqlDb.getUserSettings(req)
      : memory.getUserSettings(req);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/settings/user", async (req, res) => {
  try {
    const data = usingMysql
      ? await mysqlDb.updateUserSettings(req)
      : memory.updateUserSettings(req);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/settings/password", async (req, res) => {
  try {
    const data = usingMysql
      ? await mysqlDb.changeUserPassword(req)
      : memory.changeUserPassword(req);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

async function start() {
  usingMysql = await mysqlDb.initMysql();
  app.listen(PORT, () => {
    console.log(`RoyalTech API on http://localhost:${PORT}`);
    console.log(`Database mode: ${usingMysql ? "MySQL" : "memory (fallback)"}`);
  });
}

start();
