/* Ambient typings for HRM mock data modules imported into the CRM. */
declare module "../../data/hrm/employees.js" {
  export const employees: Array<Record<string, any>>;
  export const departments: string[];
  export const employmentStatuses: string[];
}

declare module "../../data/hrm/dashboard.js" {
  export const recentActivities: Array<Record<string, any>>;
  export const upcomingBirthdays: Array<Record<string, any>>;
  export const announcements: Array<Record<string, any>>;
}

declare module "../../data/hrm/attendance.js" {
  export const attendanceRecords: Array<Record<string, any>>;
  export const attendanceTrend: Array<Record<string, any>>;
}

declare module "../../data/hrm/leave.js" {
  export const leaveTypes: Array<Record<string, any>>;
  export const leaveRequests: Array<Record<string, any>>;
}

declare module "../../data/hrm/recruitment.js" {
  export const jobs: Array<Record<string, any>>;
  export const candidates: Array<Record<string, any>>;
}

declare module "../../data/hrm/interviews.js" {
  export const interviews: Array<Record<string, any>>;
}

declare module "../../data/hrm/onboarding.js" {
  export const onboardingPrograms: Array<Record<string, any>>;
  export const documents: Array<Record<string, any>>;
}

declare module "../../data/hrm/payroll.js" {
  export const payrollRecords: Array<Record<string, any>>;
  export const payrollTrend: Array<Record<string, any>>;
}

declare module "../../data/hrm/performance.js" {
  export const performanceRatings: Array<Record<string, any>>;
}

declare module "../../data/hrm/exit.js" {
  export const resignations: Array<Record<string, any>>;
}
