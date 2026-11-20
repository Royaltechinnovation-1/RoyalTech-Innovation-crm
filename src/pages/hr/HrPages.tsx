import type { CrmStore } from "../../data/store";
import { HrmDashboard } from "./HrmDashboard";
import { HrmEvents } from "./HrmEvents";
import { HrmMessages } from "./HrmMessages";
import { HrmReports } from "./HrmReports";
import {
  HrmAttendance,
  HrmEmployees,
  HrmExit,
  HrmInterviews,
  HrmLeave,
  HrmOnboarding,
  HrmPayroll,
  HrmPerformance,
  HrmRecruitment,
} from "./HrmModules";

export function HrDashboard({ store }: { store: CrmStore }) {
  return <HrmDashboard store={store} />;
}

export function Employees({ store }: { store: CrmStore }) {
  return <HrmEmployees store={store} />;
}

export function Recruitment({ store }: { store: CrmStore }) {
  return <HrmRecruitment store={store} />;
}

export function LeaveManagement({ store }: { store: CrmStore }) {
  return <HrmLeave store={store} />;
}

export function Payroll({ store }: { store: CrmStore }) {
  return <HrmPayroll store={store} />;
}

export function HrInterviews({ store }: { store: CrmStore }) {
  return <HrmInterviews store={store} />;
}

export function HrOnboarding({ store }: { store: CrmStore }) {
  return <HrmOnboarding store={store} />;
}

export function HrAttendance({ store }: { store: CrmStore }) {
  return <HrmAttendance store={store} />;
}

export function HrPerformance({ store }: { store: CrmStore }) {
  return <HrmPerformance store={store} />;
}

export function HrExit({ store }: { store: CrmStore }) {
  return <HrmExit store={store} />;
}

export function HrReports({ store }: { store: CrmStore }) {
  return <HrmReports store={store} />;
}

export function HrMessages({ store }: { store: CrmStore }) {
  return <HrmMessages store={store} />;
}

export function HrEvents({ store }: { store: CrmStore }) {
  return <HrmEvents store={store} />;
}

/** @deprecated placeholders replaced by full HRM modules */
export function HrPlaceholder({
  store,
  permission,
  title,
}: {
  store: CrmStore;
  permission: Parameters<CrmStore["allow"]>[0];
  title: string;
  body?: string;
}) {
  if (title.toLowerCase().includes("interview")) return <HrmInterviews store={store} />;
  if (title.toLowerCase().includes("onboarding")) return <HrmOnboarding store={store} />;
  if (title.toLowerCase().includes("attendance")) return <HrmAttendance store={store} />;
  if (title.toLowerCase().includes("performance")) return <HrmPerformance store={store} />;
  if (title.toLowerCase().includes("exit") || title.toLowerCase().includes("resignation")) {
    return <HrmExit store={store} />;
  }
  void permission;
  return <HrmDashboard store={store} />;
}
