import type { Role } from "../types";

export interface RoleWorkspace {
  greeting: string;
  title: string;
  summary: string;
  sees: string[];
  shortcuts: { label: string; path: string }[];
}

export const roleWorkspaces: Record<Role, RoleWorkspace> = {
  founder: {
    greeting: "Welcome Super Admin",
    title: "Full company control",
    summary: "You see everything — sales, HR, projects, website, finance, and settings.",
    sees: [
      "All modules unlocked",
      "Total leads & pipeline",
      "Employees, payroll & HR",
      "Projects & team workload",
      "Revenue, invoices & reports",
      "Users, roles & system settings",
    ],
    shortcuts: [
      { label: "All leads", path: "/leads" },
      { label: "Finance reports", path: "/finance/reports" },
      { label: "Employees", path: "/hr/employees" },
      { label: "Settings", path: "/settings" },
    ],
  },
  hr_admin: {
    greeting: "Welcome back",
    title: "People operations",
    summary: "Employees, hiring, leave, and payroll in one place.",
    sees: [
      "Employee directory",
      "Recruitment & candidates",
      "Leave approvals",
      "Payroll & salary",
      "Onboarding documents",
    ],
    shortcuts: [
      { label: "Employees", path: "/hr/employees" },
      { label: "Recruitment", path: "/hr/recruitment" },
      { label: "Leave", path: "/hr/leave" },
      { label: "Payroll", path: "/hr/payroll" },
    ],
  },
  sales_manager: {
    greeting: "Welcome back",
    title: "Sales Manager dashboard",
    summary: "Team CRM command — employees, team pipeline, targets, and performance.",
    sees: [
      "Whole team leads",
      "Employee CRM books",
      "Team performance",
      "Targets & conversion",
      "Google Sheets sync",
    ],
    shortcuts: [
      { label: "Team dashboard", path: "/" },
      { label: "Employees", path: "/sales/employees" },
      { label: "Team performance", path: "/sales/team" },
      { label: "Pipeline", path: "/leads/pipeline" },
    ],
  },
  sales_executive: {
    greeting: "Welcome back",
    title: "Sales Executive desk",
    summary: "Your personal CRM — only your leads, follow-ups, and clients.",
    sees: [
      "Leads assigned to you",
      "Your follow-ups",
      "Your clients",
      "Your proposals",
      "Personal target",
    ],
    shortcuts: [
      { label: "My desk", path: "/" },
      { label: "My leads", path: "/leads" },
      { label: "Follow-ups", path: "/leads/followups" },
      { label: "Add lead", path: "/leads/new" },
    ],
  },
  project_manager: {
    greeting: "Welcome back",
    title: "Project Manager dashboard",
    summary: "Team performance, workload, deadlines, and approvals.",
    sees: [
      "Team & active projects",
      "Task completion & overdue",
      "Developer availability",
      "Pending approvals",
      "Delivery reports",
    ],
    shortcuts: [
      { label: "Manager home", path: "/" },
      { label: "Projects", path: "/projects" },
      { label: "Team", path: "/projects/assignments" },
      { label: "Tasks", path: "/projects/tasks" },
      { label: "Workload", path: "/projects/workload" },
      { label: "Reports", path: "/projects/reports" },
    ],
  },
  developer: {
    greeting: "Welcome back",
    title: "Developer dashboard",
    summary: "My tasks, projects, work progress, and manager feedback.",
    sees: [
      "Assigned / in-progress / completed tasks",
      "My project cards",
      "Work progress ring",
      "Manager feedback",
      "Quick actions",
    ],
    shortcuts: [
      { label: "My dashboard", path: "/" },
      { label: "My tasks", path: "/projects/tasks" },
      { label: "My projects", path: "/projects" },
      { label: "Milestones", path: "/projects/milestones" },
    ],
  },
  website_admin: {
    greeting: "Welcome back",
    title: "Website ops",
    summary: "Enquiries, analytics, content, and maintenance.",
    sees: [
      "Website enquiries",
      "Google Analytics",
      "Performance scores",
      "Content updates",
      "Errors & maintenance",
    ],
    shortcuts: [
      { label: "Enquiries", path: "/website/enquiries" },
      { label: "Analytics", path: "/website/analytics" },
      { label: "Performance", path: "/website/performance" },
      { label: "Errors", path: "/website/errors" },
    ],
  },
  finance_admin: {
    greeting: "Welcome back",
    title: "Finance desk",
    summary: "Revenue, expenses, invoices, and pending payments.",
    sees: [
      "Revenue received",
      "Expenses",
      "Client payments",
      "Pending collections",
      "Invoices & reports",
    ],
    shortcuts: [
      { label: "Revenue", path: "/finance/revenue" },
      { label: "Invoices", path: "/finance/invoices" },
      { label: "Pending", path: "/finance/pending" },
      { label: "Reports", path: "/finance/reports" },
    ],
  },
};
