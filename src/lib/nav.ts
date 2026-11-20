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
      { label: "messages", path: "/hr/messages", permission: "hr", icon: "messages" },
      { label: "events", path: "/hr/events", permission: "hr", icon: "calendar" },
      { label: "reports", path: "/hr/reports", permission: "hr", icon: "reports" },
    ],
  },
  {
    label: "projects",
    permission: "projects",
    icon: "projects",
    items: [
      { label: "projects", path: "/projects", permission: "projects", icon: "projects" },
      { label: "team", path: "/projects/assignments", permission: "projects.assign", icon: "team" },
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
  { label: "messages", path: "/hr/messages", permission: "hr", icon: "messages" },
  { label: "notification", path: "/notifications", permission: "notifications", icon: "notifications" },
  { label: "reports", path: "/reports", permission: "reports", icon: "reports" },
];

/** Flat developer sidebar matching the dashboard mockup. */
export const developerNav: NavItem[] = [
  { label: "Developer Dashboard", path: "/", permission: "dashboard", icon: "home" },
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

/** Flat HR sidebar — all modules visible (not nested under an HR group). */
export const hrAdminNav: NavItem[] = [
  { label: "HR Dashboard", path: "/", permission: "dashboard", icon: "home" },
  { label: "Employees", path: "/hr/employees", permission: "hr.employees", icon: "people" },
  { label: "Recruitment", path: "/hr/recruitment", permission: "hr.recruitment", icon: "recruit" },
  { label: "Interviews", path: "/hr/interviews", permission: "hr.interviews", icon: "calendar" },
  { label: "Onboarding", path: "/hr/onboarding", permission: "hr.onboarding", icon: "file" },
  { label: "Attendance", path: "/hr/attendance", permission: "hr.attendance", icon: "calendar" },
  { label: "Leave", path: "/hr/leave", permission: "hr.leave", icon: "leave" },
  { label: "Payroll", path: "/hr/payroll", permission: "hr.payroll", icon: "payroll" },
  { label: "Performance", path: "/hr/performance", permission: "hr.performance", icon: "performance" },
  { label: "Exit", path: "/hr/exit", permission: "hr.exit", icon: "exit" },
  { label: "Messages", path: "/hr/messages", permission: "hr", icon: "messages" },
  { label: "Events", path: "/hr/events", permission: "hr", icon: "calendar" },
  { label: "Reports", path: "/hr/reports", permission: "hr", icon: "reports" },
  { label: "Notifications", path: "/notifications", permission: "notifications", icon: "notifications" },
];

/** Flat Sales Executive sidebar — personal book only. */
export const salesExecutiveNav: NavItem[] = [
  { label: "Executive Dashboard", path: "/", permission: "dashboard", icon: "home" },
  { label: "My Leads", path: "/leads", permission: "leads", icon: "enquiry" },
  { label: "Pipeline", path: "/leads/pipeline", permission: "pipeline", icon: "pipeline" },
  { label: "Follow-ups", path: "/leads/followups", permission: "followups", icon: "followups" },
  { label: "Clients", path: "/clients", permission: "clients", icon: "clients" },
  { label: "Proposals", path: "/proposals", permission: "proposals", icon: "proposals" },
  { label: "Deals", path: "/deals", permission: "deals", icon: "deals" },
  { label: "Notifications", path: "/notifications", permission: "notifications", icon: "notifications" },
  { label: "Settings", path: "/settings", permission: "dashboard", icon: "settings" },
];

/** Flat Sales Manager sidebar — same style as HR / PM. */
export const salesManagerNav: NavItem[] = [
  { label: "Sales Dashboard", path: "/", permission: "dashboard", icon: "home" },
  { label: "Leads", path: "/leads", permission: "leads", icon: "enquiry" },
  { label: "Pipeline", path: "/leads/pipeline", permission: "pipeline", icon: "pipeline" },
  { label: "Follow-ups", path: "/leads/followups", permission: "followups", icon: "followups" },
  { label: "Clients", path: "/clients", permission: "clients", icon: "clients" },
  { label: "Team", path: "/sales/team", permission: "sales.team", icon: "team" },
  { label: "Employees", path: "/sales/employees", permission: "sales.team", icon: "people" },
  { label: "Targets", path: "/sales/targets", permission: "sales.targets", icon: "targets" },
  { label: "Reports", path: "/sales/reports", permission: "sales.reports", icon: "reports" },
  { label: "Sheets", path: "/sales/sheets", permission: "sales.sheets", icon: "sheets" },
  { label: "Notifications", path: "/notifications", permission: "notifications", icon: "notifications" },
  { label: "Settings", path: "/settings", permission: "dashboard", icon: "settings" },
];

/** Flat Project Manager sidebar — same style as HR (not nested groups). */
export const projectManagerNav: NavItem[] = [
  { label: "Manager Dashboard", path: "/", permission: "dashboard", icon: "home" },
  { label: "Projects", path: "/projects", permission: "projects", icon: "projects" },
  { label: "Team", path: "/projects/assignments", permission: "projects.assign", icon: "team" },
  { label: "Tasks", path: "/projects/tasks", permission: "projects.tasks", icon: "tasks" },
  { label: "Milestones", path: "/projects/milestones", permission: "projects.milestones", icon: "milestone" },
  { label: "Workload", path: "/projects/workload", permission: "projects.workload", icon: "workload" },
  { label: "Reports", path: "/projects/reports", permission: "projects.reports", icon: "reports" },
  { label: "Calendar", path: "/dev/calendar", permission: "projects", icon: "calendar" },
  { label: "Messages", path: "/dev/messages", permission: "notifications", icon: "messages" },
  { label: "Documents", path: "/dev/documents", permission: "projects", icon: "documents" },
  { label: "Notifications", path: "/notifications", permission: "notifications", icon: "notifications" },
  { label: "Settings", path: "/settings", permission: "dashboard", icon: "settings" },
];

export const settingsNav: NavItem[] = [
  { label: "users", path: "/settings/users", permission: "settings.users", icon: "users" },
  { label: "roles", path: "/settings/roles", permission: "settings.roles", icon: "roles" },
  { label: "activity logs", path: "/settings/logs", permission: "settings.logs", icon: "logs" },
  { label: "google", path: "/settings/google", permission: "settings.google", icon: "google" },
  { label: "system", path: "/settings/system", permission: "settings.system", icon: "system" },
];
