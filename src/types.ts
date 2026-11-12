export type Role =
  | "founder"
  | "hr_admin"
  | "sales_manager"
  | "sales_executive"
  | "project_manager"
  | "developer"
  | "website_admin"
  | "finance_admin";

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type EmployeeStatus = "active" | "onboarding" | "on_leave" | "exited";
export type ProjectStatus = "planned" | "active" | "on_hold" | "completed";
export type TaskStatus = "todo" | "doing" | "blocked" | "done";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type EnquiryStatus = "new" | "in_progress" | "closed";
export type SyncStatus = "success" | "duplicate" | "error" | "updated";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  department: string;
  avatarInitials: string;
  /** Sales executives report to a sales manager via this id. */
  managerId?: string;
}

export interface Lead {
  id: string;
  leadId: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  status: LeadStatus;
  ownerId: string;
  value: number;
  notes: string;
  nextFollowUp?: string;
  createdAt: string;
  sheetRowId?: string;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  accountManagerId: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface Proposal {
  id: string;
  leadId: string;
  title: string;
  amount: number;
  status: "draft" | "sent" | "accepted" | "rejected";
  validUntil: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  roleTitle: string;
  department: string;
  status: EmployeeStatus;
  joinDate: string;
  salary?: number;
  managerId?: string;
}

export interface Candidate {
  id: string;
  name: string;
  role: string;
  stage: "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
  email: string;
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: string;
  from: string;
  to: string;
  status: "pending" | "approved" | "rejected";
}

export interface Project {
  id: string;
  name: string;
  clientId?: string;
  managerId: string;
  status: ProjectStatus;
  progress: number;
  deadline: string;
  budget: number;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  assigneeId: string;
  status: TaskStatus;
  dueDate: string;
  parentId?: string;
}

export interface WebsiteEnquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  status: EnquiryStatus;
  createdAt: string;
  source: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  number: string;
  amount: number;
  status: InvoiceStatus;
  dueDate: string;
  issuedAt: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  notes: string;
}

export interface Payment {
  id: string;
  clientId: string;
  invoiceId?: string;
  amount: number;
  date: string;
  status: "received" | "pending";
}

export interface SalesTarget {
  id: string;
  ownerId: string;
  period: string;
  target: number;
  achieved: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  audienceRoles: Role[];
}

export interface ApprovalItem {
  id: string;
  title: string;
  type: string;
  requestedBy: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  action: string;
  entity: string;
  createdAt: string;
}

export interface SyncLog {
  id: string;
  leadId: string;
  status: SyncStatus;
  message: string;
  createdAt: string;
}

export interface SheetConfig {
  spreadsheetId: string;
  sheetName: string;
  lastSyncedAt?: string;
  enabled: boolean;
}

export interface Organization {
  id: string;
  name: string;
  industry: string;
  website: string;
  createdAt: string;
  createdBy: string;
}

export interface CrmData {
  currentUserId: string;
  organization: Organization;
  users: User[];
  leads: Lead[];
  clients: Client[];
  proposals: Proposal[];
  employees: Employee[];
  candidates: Candidate[];
  leaveRequests: LeaveRequest[];
  projects: Project[];
  tasks: ProjectTask[];
  enquiries: WebsiteEnquiry[];
  invoices: Invoice[];
  expenses: Expense[];
  payments: Payment[];
  salesTargets: SalesTarget[];
  notifications: NotificationItem[];
  approvals: ApprovalItem[];
  activityLogs: ActivityLog[];
  syncLogs: SyncLog[];
  sheetConfig: SheetConfig;
}
