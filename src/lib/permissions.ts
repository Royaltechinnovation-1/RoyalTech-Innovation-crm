import type { Role } from "../types";

export type Permission =
  | "dashboard"
  | "leads"
  | "leads.write"
  | "pipeline"
  | "followups"
  | "clients"
  | "proposals"
  | "deals"
  | "sales"
  | "sales.team"
  | "sales.sheets"
  | "sales.targets"
  | "sales.reports"
  | "hr"
  | "hr.employees"
  | "hr.recruitment"
  | "hr.interviews"
  | "hr.onboarding"
  | "hr.attendance"
  | "hr.leave"
  | "hr.payroll"
  | "hr.performance"
  | "hr.exit"
  | "projects"
  | "projects.assign"
  | "projects.tasks"
  | "projects.milestones"
  | "projects.workload"
  | "projects.reports"
  | "website"
  | "website.enquiries"
  | "website.analytics"
  | "website.performance"
  | "website.content"
  | "website.errors"
  | "finance"
  | "finance.revenue"
  | "finance.expenses"
  | "finance.payments"
  | "finance.invoices"
  | "finance.reports"
  | "notifications"
  | "reports"
  | "settings"
  | "settings.users"
  | "settings.roles"
  | "settings.logs"
  | "settings.google"
  | "settings.system"
  | "salary.view"
  | "confidential.docs";

const ALL: Permission[] = [
  "dashboard",
  "leads",
  "leads.write",
  "pipeline",
  "followups",
  "clients",
  "proposals",
  "deals",
  "sales",
  "sales.team",
  "sales.sheets",
  "sales.targets",
  "sales.reports",
  "hr",
  "hr.employees",
  "hr.recruitment",
  "hr.interviews",
  "hr.onboarding",
  "hr.attendance",
  "hr.leave",
  "hr.payroll",
  "hr.performance",
  "hr.exit",
  "projects",
  "projects.assign",
  "projects.tasks",
  "projects.milestones",
  "projects.workload",
  "projects.reports",
  "website",
  "website.enquiries",
  "website.analytics",
  "website.performance",
  "website.content",
  "website.errors",
  "finance",
  "finance.revenue",
  "finance.expenses",
  "finance.payments",
  "finance.invoices",
  "finance.reports",
  "notifications",
  "reports",
  "settings",
  "settings.users",
  "settings.roles",
  "settings.logs",
  "settings.google",
  "settings.system",
  "salary.view",
  "confidential.docs",
];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  founder: ALL,
  hr_admin: [
    "dashboard",
    "hr",
    "hr.employees",
    "hr.recruitment",
    "hr.interviews",
    "hr.onboarding",
    "hr.attendance",
    "hr.leave",
    "hr.payroll",
    "hr.performance",
    "hr.exit",
    "notifications",
    "reports",
    "salary.view",
    "confidential.docs",
  ],
  sales_manager: [
    "dashboard",
    "leads",
    "leads.write",
    "pipeline",
    "followups",
    "clients",
    "proposals",
    "deals",
    "sales",
    "sales.team",
    "sales.sheets",
    "sales.targets",
    "sales.reports",
    "notifications",
    "reports",
  ],
  sales_executive: [
    "dashboard",
    "leads",
    "leads.write",
    "pipeline",
    "followups",
    "clients",
    "proposals",
    "deals",
    "sales",
    "sales.sheets",
    "notifications",
  ],
  project_manager: [
    "dashboard",
    "projects",
    "projects.assign",
    "projects.tasks",
    "projects.milestones",
    "projects.workload",
    "projects.reports",
    "clients",
    "notifications",
    "reports",
  ],
  developer: [
    "dashboard",
    "projects",
    "projects.tasks",
    "projects.milestones",
    "notifications",
  ],
  website_admin: [
    "dashboard",
    "website",
    "website.enquiries",
    "website.analytics",
    "website.performance",
    "website.content",
    "website.errors",
    "notifications",
    "reports",
  ],
  finance_admin: [
    "dashboard",
    "finance",
    "finance.revenue",
    "finance.expenses",
    "finance.payments",
    "finance.invoices",
    "finance.reports",
    "clients",
    "notifications",
    "reports",
    "salary.view",
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  founder: "Super Admin",
  hr_admin: "HR Admin",
  sales_manager: "Sales Manager",
  sales_executive: "Sales Executive",
  project_manager: "Project Manager",
  developer: "Developer",
  website_admin: "Website Admin",
  finance_admin: "Finance Admin",
};

export function can(role: Role, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsFor(role: Role) {
  return ROLE_PERMISSIONS[role];
}
