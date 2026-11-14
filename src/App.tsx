import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useCrmStore } from "./data/store";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { AllLeads } from "./pages/leads/AllLeads";
import { AddLead } from "./pages/leads/AddLead";
import { Pipeline } from "./pages/leads/Pipeline";
import { Followups } from "./pages/leads/Followups";
import { Clients } from "./pages/Clients";
import { Proposals } from "./pages/Proposals";
import { Deals } from "./pages/Deals";
import {
  SalesDashboard,
  SalesReports,
  SalesTargets,
  SalesTeam,
  SalesEmployees,
} from "./pages/sales/SalesPages";
import { Sheets } from "./pages/sales/Sheets";
import {
  Employees,
  HrAttendance,
  HrDashboard,
  HrExit,
  HrInterviews,
  HrOnboarding,
  HrPerformance,
  LeaveManagement,
  Payroll,
  Recruitment,
} from "./pages/hr/HrPages";
import {
  Milestones,
  ProjectAssignments,
  ProjectReports,
  ProjectTasks,
  Projects,
  Workload,
} from "./pages/projects/ProjectPages";
import {
  DevBugs,
  DevCalendar,
  DevDailyReport,
  DevDocuments,
  DevGithub,
  DevMessages,
  DevTaskDetails,
  DevWorkUpdates,
} from "./pages/dev/DevPages";
import {
  Enquiries,
  WebsiteDashboard,
  WebsiteModule,
} from "./pages/website/WebsitePages";
import {
  Expenses,
  FinancialReports,
  Invoices,
  Payments,
  PendingPayments,
  Revenue,
} from "./pages/finance/FinancePages";
import { Notifications } from "./pages/Notifications";
import { Reports } from "./pages/Reports";
import {
  ActivityLogs,
  GoogleSettings,
  Roles,
  SettingsHome,
  SystemConfig,
  Users,
} from "./pages/settings/SettingsPages";
import "./App.css";

export default function App() {
  const store = useCrmStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login store={store} />} />
        <Route element={<Layout store={store} />}>
          <Route index element={<Dashboard store={store} />} />

          <Route path="leads" element={<AllLeads store={store} />} />
          <Route path="leads/new" element={<AddLead store={store} />} />
          <Route path="leads/pipeline" element={<Pipeline store={store} />} />
          <Route path="leads/followups" element={<Followups store={store} />} />
          <Route path="clients" element={<Clients store={store} />} />
          <Route path="proposals" element={<Proposals store={store} />} />
          <Route path="deals" element={<Deals store={store} />} />

          <Route path="sales" element={<SalesDashboard store={store} />} />
          <Route path="sales/employees" element={<SalesEmployees store={store} />} />
          <Route path="sales/team" element={<SalesTeam store={store} />} />
          <Route path="sales/sheets" element={<Sheets store={store} />} />
          <Route path="sales/targets" element={<SalesTargets store={store} />} />
          <Route path="sales/reports" element={<SalesReports store={store} />} />

          <Route path="hr" element={<HrDashboard store={store} />} />
          <Route path="hr/employees" element={<Employees store={store} />} />
          <Route path="hr/recruitment" element={<Recruitment store={store} />} />
          <Route path="hr/interviews" element={<HrInterviews store={store} />} />
          <Route path="hr/onboarding" element={<HrOnboarding store={store} />} />
          <Route path="hr/attendance" element={<HrAttendance store={store} />} />
          <Route path="hr/leave" element={<LeaveManagement store={store} />} />
          <Route path="hr/payroll" element={<Payroll store={store} />} />
          <Route path="hr/performance" element={<HrPerformance store={store} />} />
          <Route path="hr/exit" element={<HrExit store={store} />} />

          <Route path="projects" element={<Projects store={store} />} />
          <Route path="projects/assignments" element={<ProjectAssignments store={store} />} />
          <Route path="projects/tasks" element={<ProjectTasks store={store} />} />
          <Route path="projects/milestones" element={<Milestones store={store} />} />
          <Route path="projects/workload" element={<Workload store={store} />} />
          <Route path="projects/reports" element={<ProjectReports store={store} />} />

          <Route path="dev/task-details" element={<DevTaskDetails store={store} />} />
          <Route path="dev/work-updates" element={<DevWorkUpdates store={store} />} />
          <Route path="dev/daily-report" element={<DevDailyReport store={store} />} />
          <Route path="dev/calendar" element={<DevCalendar store={store} />} />
          <Route path="dev/messages" element={<DevMessages store={store} />} />
          <Route path="dev/bugs" element={<DevBugs store={store} />} />
          <Route path="dev/documents" element={<DevDocuments store={store} />} />
          <Route path="dev/github" element={<DevGithub store={store} />} />

          <Route path="website" element={<WebsiteDashboard store={store} />} />
          <Route path="website/enquiries" element={<Enquiries store={store} />} />
          <Route
            path="website/analytics"
            element={
              <WebsiteModule
                store={store}
                permission="website.analytics"
                title="Google Analytics"
                points={["Sessions trending up 8% WoW", "Top landing: /pricing", "Bounce rate 41%"]}
              />
            }
          />
          <Route
            path="website/performance"
            element={
              <WebsiteModule
                store={store}
                permission="website.performance"
                title="Website Performance"
                points={["LCP 1.8s", "CLS 0.03", "CDN cache hit 94%"]}
              />
            }
          />
          <Route
            path="website/content"
            element={
              <WebsiteModule
                store={store}
                permission="website.content"
                title="Content & Updates"
                points={["Homepage hero refresh scheduled", "Case study draft in review"]}
              />
            }
          />
          <Route
            path="website/errors"
            element={
              <WebsiteModule
                store={store}
                permission="website.errors"
                title="Errors & Maintenance"
                points={["2 open 404 clusters", "SSL renews in 48 days", "Nightly backup OK"]}
              />
            }
          />

          <Route path="finance/revenue" element={<Revenue store={store} />} />
          <Route path="finance/expenses" element={<Expenses store={store} />} />
          <Route path="finance/payments" element={<Payments store={store} />} />
          <Route path="finance/pending" element={<PendingPayments store={store} />} />
          <Route path="finance/invoices" element={<Invoices store={store} />} />
          <Route path="finance/reports" element={<FinancialReports store={store} />} />

          <Route path="notifications" element={<Notifications store={store} />} />
          <Route path="reports" element={<Reports store={store} />} />

          <Route path="settings" element={<SettingsHome store={store} />} />
          <Route path="settings/users" element={<Users store={store} />} />
          <Route path="settings/roles" element={<Roles store={store} />} />
          <Route path="settings/logs" element={<ActivityLogs store={store} />} />
          <Route path="settings/google" element={<GoogleSettings store={store} />} />
          <Route path="settings/system" element={<SystemConfig store={store} />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
