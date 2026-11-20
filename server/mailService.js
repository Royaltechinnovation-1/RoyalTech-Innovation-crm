import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, "data", "mail-accounts.json");

const PRESETS = {
  titan: {
    label: "Titan Email",
    host: "smtp.titan.email",
    port: 465,
    secure: true,
  },
  personal: {
    label: "Personal / Gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
  },
  custom: {
    label: "Custom SMTP",
    host: "",
    port: 587,
    secure: false,
  },
};

function emptyAccount(kind) {
  const preset = PRESETS[kind] || PRESETS.custom;
  return {
    kind,
    label: preset.label,
    enabled: false,
    email: "",
    password: "",
    host: preset.host,
    port: preset.port,
    secure: preset.secure,
    connectedAt: null,
    lastError: null,
  };
}

function defaultConfig() {
  return {
    active: "titan",
    accounts: {
      titan: emptyAccount("titan"),
      personal: emptyAccount("personal"),
    },
  };
}

function ensureDir() {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function loadMailConfig() {
  try {
    ensureDir();
    if (!fs.existsSync(CONFIG_PATH)) {
      const cfg = defaultConfig();
      // seed from env if present
      if (process.env.MAIL_SMTP_HOST && process.env.MAIL_FROM) {
        const kind = String(process.env.MAIL_PROVIDER || "titan").toLowerCase().includes("gmail")
          ? "personal"
          : "titan";
        cfg.active = kind;
        cfg.accounts[kind] = {
          ...cfg.accounts[kind],
          enabled: true,
          email: process.env.MAIL_FROM,
          password: process.env.MAIL_SMTP_PASS || process.env.MAIL_PASSWORD || "",
          host: process.env.MAIL_SMTP_HOST,
          port: Number(process.env.MAIL_SMTP_PORT || 465),
          secure: String(process.env.MAIL_SMTP_SECURE || "true") !== "false",
          connectedAt: new Date().toISOString(),
        };
      }
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
      return cfg;
    }
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    const base = defaultConfig();
    return {
      active: raw.active === "personal" ? "personal" : "titan",
      accounts: {
        titan: { ...base.accounts.titan, ...(raw.accounts?.titan || {}) },
        personal: { ...base.accounts.personal, ...(raw.accounts?.personal || {}) },
      },
    };
  } catch {
    return defaultConfig();
  }
}

export function saveMailConfig(cfg) {
  ensureDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
  return cfg;
}

function publicAccount(acc) {
  return {
    kind: acc.kind,
    label: acc.label,
    enabled: Boolean(acc.enabled && acc.email && acc.password),
    email: acc.email || null,
    host: acc.host,
    port: acc.port,
    secure: Boolean(acc.secure),
    connectedAt: acc.connectedAt,
    lastError: acc.lastError,
    hasPassword: Boolean(acc.password),
  };
}

export function getMailStatus() {
  const cfg = loadMailConfig();
  const titan = publicAccount(cfg.accounts.titan);
  const personal = publicAccount(cfg.accounts.personal);
  const active = cfg.accounts[cfg.active] || cfg.accounts.titan;
  const connected = Boolean(active.enabled && active.email && active.password);
  return {
    mode: "file",
    connected,
    active: cfg.active,
    provider: connected ? cfg.active : "none",
    fromEmail: connected ? active.email : null,
    message: connected
      ? `Mail connected via ${active.label} (${active.email}).`
      : "Connect Titan or personal email to send event / chat messages.",
    accounts: { titan, personal },
    presets: {
      titan: PRESETS.titan,
      personal: PRESETS.personal,
    },
  };
}

export function upsertMailAccount(kind, input = {}) {
  const key = kind === "personal" ? "personal" : "titan";
  const cfg = loadMailConfig();
  const prev = cfg.accounts[key];
  const next = {
    ...prev,
    email: String(input.email || prev.email || "").trim(),
    host: String(input.host || prev.host || PRESETS[key].host).trim(),
    port: Number(input.port || prev.port || PRESETS[key].port),
    secure:
      input.secure != null
        ? Boolean(input.secure)
        : prev.secure ?? PRESETS[key].secure,
    enabled: input.enabled != null ? Boolean(input.enabled) : true,
  };
  if (input.password != null && String(input.password).length) {
    next.password = String(input.password);
  }
  if (!next.email) throw new Error("Email address is required");
  if (!next.password) throw new Error("Password / app password is required");
  next.connectedAt = new Date().toISOString();
  next.lastError = null;
  cfg.accounts[key] = next;
  if (input.setActive !== false) cfg.active = key;
  saveMailConfig(cfg);
  return getMailStatus();
}

export function setActiveMailAccount(kind) {
  const key = kind === "personal" ? "personal" : "titan";
  const cfg = loadMailConfig();
  if (!cfg.accounts[key]?.email || !cfg.accounts[key]?.password) {
    throw new Error(`Connect ${key} email first`);
  }
  cfg.active = key;
  cfg.accounts[key].enabled = true;
  saveMailConfig(cfg);
  return getMailStatus();
}

function transporterFor(account) {
  return nodemailer.createTransport({
    host: account.host,
    port: Number(account.port) || 465,
    secure: Boolean(account.secure),
    auth: {
      user: account.email,
      pass: account.password,
    },
  });
}

export async function testMailAccount(kind) {
  const key = kind === "personal" ? "personal" : "titan";
  const cfg = loadMailConfig();
  const account = cfg.accounts[key];
  if (!account?.email || !account?.password) throw new Error("Save account credentials first");
  const transporter = transporterFor(account);
  try {
    await transporter.verify();
    account.lastError = null;
    account.enabled = true;
    account.connectedAt = new Date().toISOString();
    saveMailConfig(cfg);
    return { ok: true, message: `${account.label} SMTP verified`, mail: getMailStatus() };
  } catch (err) {
    account.lastError = err.message;
    account.enabled = false;
    saveMailConfig(cfg);
    throw new Error(`${account.label} failed: ${err.message}`);
  }
}

export async function sendMail({ to, subject, text, html, accountKind } = {}) {
  const cfg = loadMailConfig();
  const key = accountKind === "personal" || accountKind === "titan" ? accountKind : cfg.active;
  const account = cfg.accounts[key];
  if (!account?.enabled || !account.email || !account.password) {
    return {
      mailed: false,
      queued: true,
      log: {
        id: `ml_${Date.now().toString(36)}`,
        to,
        subject,
        status: "queued",
        message: "Queued — connect Titan or personal email to deliver",
        at: new Date().toISOString(),
      },
      mail: getMailStatus(),
    };
  }

  const transporter = transporterFor(account);
  try {
    const info = await transporter.sendMail({
      from: `"RoyalTech HR" <${account.email}>`,
      to,
      subject,
      text,
      html: html || undefined,
    });
    account.lastError = null;
    saveMailConfig(cfg);
    return {
      mailed: true,
      queued: false,
      log: {
        id: `ml_${Date.now().toString(36)}`,
        to,
        subject,
        status: "sent",
        message: `Sent via ${account.label}`,
        messageId: info.messageId,
        at: new Date().toISOString(),
        account: key,
      },
      mail: getMailStatus(),
    };
  } catch (err) {
    account.lastError = err.message;
    saveMailConfig(cfg);
    return {
      mailed: false,
      queued: true,
      error: err.message,
      log: {
        id: `ml_${Date.now().toString(36)}`,
        to,
        subject,
        status: "failed",
        message: err.message,
        at: new Date().toISOString(),
        account: key,
      },
      mail: getMailStatus(),
    };
  }
}
