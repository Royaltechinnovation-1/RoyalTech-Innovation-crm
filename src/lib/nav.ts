import type { Permission } from "./permissions";

export type NavIcon =
  | "home"
  | "leads"
  | "sales"
  | "hr"
  | "projects"
  | "website"
  | "finance"
  | "notifications"
  | "reports"
  | "settings"
  | "file"
  | "pipeline"
  | "followups"
  | "clients"
  | "proposals"
  | "deals"
  | "team"
  | "sheets"
  | "targets"
  | "graph"
  | "people"
  | "recruit"
  | "calendar"
  | "leave"
  | "payroll"
  | "performance"
  | "exit"
  | "tasks"
  | "milestone"
  | "workload"
  | "enquiry"
  | "analytics"
  | "content"
  | "errors"
  | "revenue"
  | "expense"
  | "payment"
  | "invoice"
  | "users"
  | "roles"
  | "logs"
  | "google"
  | "system"
  | "bug"
  | "github"
  | "messages"
  | "documents"
  | "updates"
  | "clipboard";

export interface NavItem {
  label: string;
  path: string;
  permission: Permission;
  icon: NavIcon;
}

export interface NavGroup {
  label: string;
  permission: Permission;
  icon: NavIcon;
  items: NavItem[];
}

export const mainNav: NavItem[] = [
  { label: "dashboard", path: "/", permission: "dashboard", icon: "home" },
];

export const navGroups: NavGroup[] = [
  {
    label: "leads",
    permission: "leads",
    icon: "leads",
    items: [
      { label: "all leads", path: "/leads", permission: "leads", icon: "file" },
      { label: "add lead", path: "/leads/new", permission: "leads.write", icon: "leads" },
      { label: "lead pipeline", path: "/leads/pipeline", permission: "pipeline", icon: "pipeline" },
      { label: "follow-ups", path: "/leads/followups", permission: "followups", icon: "followups" },
    ],
  },
  {
    label: "clients",
    permission: "clients",
    icon: "clients",
    items: [
      { label: "all clients", path: "/clients", permission: "clients", icon: "clients" },
      { label: "proposals", path: "/proposals", permission: "proposals", icon: "proposals" },
      { label: "deals", path: "/deals", permission: "deals", icon: "deals" },
    ],
  },
  {
    label: "sales",
    permission: "sales",
    icon: "sales",
    items: [
      { label: "sales dashboard", path: "/sales", permission: "sales", icon: "graph" },
      { label: "employees", path: "/sales/employees", permission: "sales.team", icon: "team" },
      { label: "team performance", path: "/sales/team", permission: "sales.team", icon: "team" },
      { label: "manage enquiry", path: "/leads", permission: "leads", icon: "enquiry" },
      { label: "manage email", path: "/proposals", permission: "proposals", icon: "proposals" },
      { label: "targets", path: "/sales/targets", permission: "sales.targets", icon: "targets" },
      { label: "reports", path: "/sales/reports", permission: "sales.reports", icon: "reports" },
    ],
  },
  {
    label: "integrations",
    permission: "sales.sheets",
    icon: "sheets",
    items: [
      { label: "google sheets", path: "/sales/sheets", permission: "sales.sheets", icon: "sheets" },
      { label: "website enquiries", path: "/website/enquiries", permission: "website.enquiries", icon: "enquiry" },
    ],
  },
  {
    label: "hr",
    permission: "hr",
    icon: "hr",
    items: [
      { label: "dashboard", path: "/hr", permission: "hr", icon: "hr" },
      { label: "employees", path: "/hr/employees", permission: "hr.employees", icon: "people" },
      { label: "recruitment", path: "/hr/recruitment", permission: "hr.recruitment", icon: "recruit" },
      { label: "interviews", path: "/hr/interviews", permission: "hr.interviews", icon: "calendar" },
      { label: "onboarding", path: "/hr/onboarding", permission: "hr.onboarding", icon: "file" },
      { label: "attendance", path: "/hr/attendance", permission: "hr.attendance", icon: "calendar" },
      { label: "leave", path: "/hr/leave", permission: "hr.leave", icon: "leave" },
      { label: "payroll", path: "/hr/payroll", permission: "hr.payroll", icon: "payroll" },
      { label: "performance", path: "/hr/performance", permission: "hr.performance", icon: "performance" },
      { label: "exit", path: "/hr/exit", permission: "hr.exit", icon: "exit" },
    ],
  },
  {
    label: "projects",
    permission: "projects",
    icon: "projects",
    items: [
      { label: "all projects", path: "/projects", permission: "projects", icon: "projects" },
      { label: "assignments", path: "/projects/assignments", permission: "projects.assign", icon: "team" },
      { label: "tasks", path: "/projects/tasks", permission: "projects.tasks", icon: "tasks" },
      { label: "milestones", path: "/projects/milestones", permission: "projects.milestones", icon: "milestone" },
      { label: "workload", path: "/projects/workload", permission: "projects.workload", icon: "workload" },
      { label: "reports", path: "/projects/reports", permission: "projects.reports", icon: "reports" },
    ],
  },
  {
    label: "website",
    permission: "website",
    icon: "website",
    items: [
      { label: "dashboard", path: "/website", permission: "website", icon: "website" },
      { label: "enquiries", path: "/website/enquiries", permission: "website.enquiries", icon: "enquiry" },
      { label: "analytics", path: "/website/analytics", permission: "website.analytics", icon: "analytics" },
      { label: "performance", path: "/website/performance", permission: "website.performance", icon: "graph" },
      { label: "content", path: "/website/content", permission: "website.content", icon: "content" },
      { label: "errors", path: "/website/errors", permission: "website.errors", icon: "errors" },
    ],
  },
  {
    label: "finance",
    permission: "finance",
    icon: "finance",
    items: [
      { label: "revenue", path: "/finance/revenue", permission: "finance.revenue", icon: "revenue" },
      { label: "expenses", path: "/finance/expenses", permission: "finance.expenses", icon: "expense" },
      { label: "payments", path: "/finance/payments", permission: "finance.payments", icon: "payment" },
      { label: "pending", path: "/finance/pending", permission: "finance.payments", icon: "payment" },
      { label: "invoices", path: "/finance/invoices", permission: "finance.invoices", icon: "invoice" },
      { label: "reports", path: "/finance/reports", permission: "finance.reports", icon: "reports" },
    ],
  },
];

export const utilityNav: NavItem[] = [
  { label: "notification", path: "/notifications", permission: "notifications", icon: "notifications" },
  { label: "reports", path: "/reports", permission: "reports", icon: "reports" },
];

/** Flat developer sidebar matching the dashboard mockup. */
export const developerNav: NavItem[] = [
  { label: "Dashboard", path: "/", permission: "dashboard", icon: "home" },
  { label: "My Tasks", path: "/projects/tasks", permission: "projects.tasks", icon: "tasks" },
  { label: "My Projects", path: "/projects", permission: "projects", icon: "projects" },
  { label: "Daily Report", path: "/dev/daily-report", permission: "projects", icon: "clipboard" },
  { label: "Calendar", path: "/dev/calendar", permission: "projects", icon: "calendar" },
  { label: "Messages", path: "/dev/messages", permission: "notifications", icon: "messages" },
  { label: "Bug & Issues", path: "/dev/bugs", permission: "projects", icon: "bug" },
  { label: "Documents", path: "/dev/documents", permission: "projects", icon: "documents" },
  { label: "GitHub", path: "/dev/github", permission: "projects", icon: "github" },
  { label: "Notifications", path: "/notifications", permission: "notifications", icon: "notifications" },
];

export const settingsNav: NavItem[] = [
  { label: "users", path: "/settings/users", permission: "settings.users", icon: "users" },
  { label: "roles", path: "/settings/roles", permission: "settings.roles", icon: "roles" },
  { label: "activity logs", path: "/settings/logs", permission: "settings.logs", icon: "logs" },
  { label: "google", path: "/settings/google", permission: "settings.google", icon: "google" },
  { label: "system", path: "/settings/system", permission: "settings.system", icon: "system" },
];
