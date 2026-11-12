import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "user_settings.json");

const DEFAULT_PASSWORDS = {
  u1: "founder123",
  u2: "hr123",
  u3: "sales123",
  u4: "exec123",
  u5: "pm123",
  u6: "dev123",
  u7: "web123",
  u8: "finance123",
  u9: "exec123",
  u10: "exec123",
  u11: "exec123",
};

function ensureStore() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify({ settings: {} }, null, 2), "utf8");
  }
}

function readAll() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch {
    return { settings: {} };
  }
}

function writeAll(data) {
  ensureStore();
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf8");
}

function defaultsFromUser(user) {
  return {
    userId: user.id,
    fullName: user.name,
    email: user.email,
    department: user.department || "Engineering",
    role: user.role,
    language: "English",
    timezone: "IST (GMT+5:30)",
    theme: "Light",
    density: "Comfortable",
    twoFactor: true,
    showOnline: true,
    notifyTasks: true,
    notifyProjects: true,
    notifyBugs: true,
    notifyMessages: true,
    notifyTeam: false,
    hasPassword: true,
    updatedAt: new Date().toISOString(),
  };
}

export function getFileSettings(user) {
  const all = readAll();
  const existing = all.settings[user.id];
  if (!existing) {
    const created = defaultsFromUser(user);
    all.settings[user.id] = {
      ...created,
      password: DEFAULT_PASSWORDS[user.id] || "royaltech123",
    };
    writeAll(all);
    const { password, ...safe } = all.settings[user.id];
    return { ...safe, hasPassword: Boolean(password), mode: "file" };
  }
  const { password, ...safe } = existing;
  return {
    ...defaultsFromUser(user),
    ...safe,
    hasPassword: Boolean(password),
    mode: "file",
  };
}

export function saveFileSettings(user, patch = {}) {
  const all = readAll();
  const current = all.settings[user.id] || {
    ...defaultsFromUser(user),
    password: DEFAULT_PASSWORDS[user.id] || "royaltech123",
  };

  const next = {
    ...current,
    fullName: String(patch.fullName ?? current.fullName ?? user.name).trim() || user.name,
    email: String(patch.email ?? current.email ?? user.email).trim() || user.email,
    department: String(patch.department ?? current.department ?? user.department).trim() || "Engineering",
    language: String(patch.language ?? current.language ?? "English"),
    timezone: String(patch.timezone ?? current.timezone ?? "IST (GMT+5:30)"),
    theme: String(patch.theme ?? current.theme ?? "Light"),
    density: String(patch.density ?? current.density ?? "Comfortable"),
    twoFactor: patch.twoFactor != null ? Boolean(patch.twoFactor) : Boolean(current.twoFactor),
    showOnline: patch.showOnline != null ? Boolean(patch.showOnline) : Boolean(current.showOnline),
    notifyTasks: patch.notifyTasks != null ? Boolean(patch.notifyTasks) : Boolean(current.notifyTasks),
    notifyProjects:
      patch.notifyProjects != null ? Boolean(patch.notifyProjects) : Boolean(current.notifyProjects),
    notifyBugs: patch.notifyBugs != null ? Boolean(patch.notifyBugs) : Boolean(current.notifyBugs),
    notifyMessages:
      patch.notifyMessages != null ? Boolean(patch.notifyMessages) : Boolean(current.notifyMessages),
    notifyTeam: patch.notifyTeam != null ? Boolean(patch.notifyTeam) : Boolean(current.notifyTeam),
    userId: user.id,
    role: user.role,
    updatedAt: new Date().toISOString(),
  };

  if (patch.password) {
    const pwd = String(patch.password).trim();
    if (pwd.length < 6) throw new Error("Password must be at least 6 characters.");
    next.password = pwd;
  }

  all.settings[user.id] = next;
  writeAll(all);

  const { password, ...safe } = next;
  return {
    ...safe,
    hasPassword: Boolean(password),
    mode: "file",
    profile: {
      id: user.id,
      name: next.fullName,
      email: next.email,
      department: next.department,
      password: next.password || DEFAULT_PASSWORDS[user.id] || "royaltech123",
    },
  };
}

export function changeFilePassword(user, currentPassword, newPassword) {
  const all = readAll();
  const current = all.settings[user.id] || {
    ...defaultsFromUser(user),
    password: DEFAULT_PASSWORDS[user.id] || "royaltech123",
  };
  const expected = current.password || DEFAULT_PASSWORDS[user.id] || "royaltech123";
  if (String(currentPassword || "") !== expected) {
    throw new Error("Current password is incorrect.");
  }
  return saveFileSettings(user, { password: newPassword });
}
