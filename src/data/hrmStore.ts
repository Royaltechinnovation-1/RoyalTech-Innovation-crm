import { useSyncExternalStore } from "react";
import { employees as seedEmployees, departments, employmentStatuses } from "./hrm/employees.js";
import { candidates as seedCandidates, jobs as seedJobs } from "./hrm/recruitment.js";
import { interviews as seedInterviews } from "./hrm/interviews.js";
import { documents as seedDocuments, onboardingPrograms as seedOnboarding } from "./hrm/onboarding.js";
import { attendanceRecords as seedAttendance, attendanceTrend } from "./hrm/attendance.js";
import { leaveRequests as seedLeave, leaveTypes } from "./hrm/leave.js";
import { payrollRecords as seedPayroll, payrollTrend } from "./hrm/payroll.js";
import { performanceRatings as seedPerformance } from "./hrm/performance.js";
import { resignations as seedResignations } from "./hrm/exit.js";
import {
  announcements,
  recentActivities,
  upcomingBirthdays,
} from "./hrm/dashboard.js";

const STORAGE_KEY = "royaltech-hrm-data-v1";

export type HrmEmployee = (typeof seedEmployees)[number];
export type HrmCandidate = (typeof seedCandidates)[number];
export type HrmInterview = (typeof seedInterviews)[number];
export type HrmLeave = (typeof seedLeave)[number];
export type HrmOnboarding = (typeof seedOnboarding)[number];
export type HrmDocument = (typeof seedDocuments)[number];
export type HrmAttendance = (typeof seedAttendance)[number];
export type HrmPayroll = (typeof seedPayroll)[number];
export type HrmPerformance = (typeof seedPerformance)[number];
export type HrmResignation = (typeof seedResignations)[number];
export type HrmJob = (typeof seedJobs)[number];

export type HrmData = {
  employees: HrmEmployee[];
  candidates: HrmCandidate[];
  jobs: HrmJob[];
  interviews: HrmInterview[];
  leaveRequests: HrmLeave[];
  onboardingPrograms: HrmOnboarding[];
  documents: HrmDocument[];
  attendanceRecords: HrmAttendance[];
  payrollRecords: HrmPayroll[];
  performanceRatings: HrmPerformance[];
  resignations: HrmResignation[];
};

function seedData(): HrmData {
  return {
    employees: structuredClone(seedEmployees) as HrmEmployee[],
    candidates: structuredClone(seedCandidates) as HrmCandidate[],
    jobs: structuredClone(seedJobs) as HrmJob[],
    interviews: structuredClone(seedInterviews) as HrmInterview[],
    leaveRequests: structuredClone(seedLeave) as HrmLeave[],
    onboardingPrograms: structuredClone(seedOnboarding) as HrmOnboarding[],
    documents: structuredClone(seedDocuments) as HrmDocument[],
    attendanceRecords: structuredClone(seedAttendance) as HrmAttendance[],
    payrollRecords: structuredClone(seedPayroll) as HrmPayroll[],
    performanceRatings: structuredClone(seedPerformance) as HrmPerformance[],
    resignations: structuredClone(seedResignations) as HrmResignation[],
  };
}

function load(): HrmData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedData();
    const parsed = JSON.parse(raw) as Partial<HrmData>;
    const base = seedData();
    return {
      ...base,
      ...parsed,
      employees: parsed.employees?.length ? parsed.employees : base.employees,
      candidates: parsed.candidates?.length ? parsed.candidates : base.candidates,
      jobs: parsed.jobs?.length ? parsed.jobs : base.jobs,
      interviews: parsed.interviews?.length ? parsed.interviews : base.interviews,
      leaveRequests: parsed.leaveRequests?.length ? parsed.leaveRequests : base.leaveRequests,
      onboardingPrograms: parsed.onboardingPrograms?.length
        ? parsed.onboardingPrograms
        : base.onboardingPrograms,
      documents: parsed.documents?.length ? parsed.documents : base.documents,
      attendanceRecords: parsed.attendanceRecords?.length
        ? parsed.attendanceRecords
        : base.attendanceRecords,
      payrollRecords: parsed.payrollRecords?.length ? parsed.payrollRecords : base.payrollRecords,
      performanceRatings: parsed.performanceRatings?.length
        ? parsed.performanceRatings
        : base.performanceRatings,
      resignations: parsed.resignations?.length ? parsed.resignations : base.resignations,
    };
  } catch {
    return seedData();
  }
}

let data = load();
const listeners = new Set<() => void>();

function emit() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  listeners.forEach((l) => l());
}

function setData(next: HrmData | ((prev: HrmData) => HrmData)) {
  data = typeof next === "function" ? next(data) : next;
  emit();
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export const hrmActions = {
  reset() {
    data = seedData();
    emit();
  },

  upsertEmployee(row: Partial<HrmEmployee> & { name: string; email: string }) {
    setData((prev) => {
      const id = row.id || uid("EMP");
      const existing = prev.employees.find((e) => e.id === id);
      const nextRow = {
        ...(existing ?? {
          id,
          phone: "",
          department: "People",
          designation: "Employee",
          joiningDate: new Date().toISOString().slice(0, 10),
          status: "Active",
          employmentType: "Full-time",
          location: "Bengaluru",
          manager: "",
          dob: "",
          gender: "",
          salary: 0,
          skills: [],
          address: "",
          emergency: { name: "", relation: "", phone: "" },
          about: "",
        }),
        ...row,
        id,
      } as HrmEmployee;
      const employees = existing
        ? prev.employees.map((e) => (e.id === id ? nextRow : e))
        : [nextRow, ...prev.employees];
      return { ...prev, employees };
    });
  },

  removeEmployee(id: string) {
    setData((prev) => ({
      ...prev,
      employees: prev.employees.filter((e) => e.id !== id),
      attendanceRecords: prev.attendanceRecords.filter((r) => r.employeeId !== id),
      payrollRecords: prev.payrollRecords.filter((r) => r.employeeId !== id),
      performanceRatings: prev.performanceRatings.filter((r) => r.employeeId !== id),
    }));
  },

  upsertCandidate(row: Partial<HrmCandidate> & { name: string; email: string }) {
    setData((prev) => {
      const id = row.id || uid("CAND");
      const existing = prev.candidates.find((c) => c.id === id);
      const nextRow = {
        ...(existing ?? {
          id,
          phone: "",
          jobId: prev.jobs[0]?.id ?? "",
          stage: "Applied",
          appliedDate: new Date().toISOString().slice(0, 10),
          experience: "",
          location: "",
          source: "Direct",
          rating: 0,
          skills: [],
          notes: "",
        }),
        ...row,
        id,
      } as HrmCandidate;
      const candidates = existing
        ? prev.candidates.map((c) => (c.id === id ? nextRow : c))
        : [nextRow, ...prev.candidates];
      return { ...prev, candidates };
    });
  },

  removeCandidate(id: string) {
    setData((prev) => ({
      ...prev,
      candidates: prev.candidates.filter((c) => c.id !== id),
      interviews: prev.interviews.filter((i) => i.candidateId !== id),
    }));
  },

  upsertInterview(row: Partial<HrmInterview> & { candidateName: string }) {
    setData((prev) => {
      const id = row.id || uid("INT");
      const existing = prev.interviews.find((i) => i.id === id);
      const nextRow = {
        ...(existing ?? {
          id,
          candidateId: "",
          jobTitle: "",
          department: "",
          interviewer: "",
          interviewerRole: "",
          date: new Date().toISOString().slice(0, 10),
          time: "10:00",
          duration: 45,
          type: "Video",
          round: "Screen",
          status: "Scheduled",
          score: 0,
          feedback: "",
          strengths: [],
          concerns: [],
        }),
        ...row,
        id,
      } as HrmInterview;
      const interviews = existing
        ? prev.interviews.map((i) => (i.id === id ? nextRow : i))
        : [nextRow, ...prev.interviews];
      return { ...prev, interviews };
    });
  },

  removeInterview(id: string) {
    setData((prev) => ({
      ...prev,
      interviews: prev.interviews.filter((i) => i.id !== id),
    }));
  },

  upsertLeave(row: Partial<HrmLeave> & { employeeName: string; type: string }) {
    setData((prev) => {
      const id = row.id || uid("LV");
      const existing = prev.leaveRequests.find((l) => l.id === id);
      const nextRow = {
        ...(existing ?? {
          id,
          employeeId: "",
          department: "",
          startDate: new Date().toISOString().slice(0, 10),
          endDate: new Date().toISOString().slice(0, 10),
          days: 1,
          reason: "",
          appliedOn: new Date().toISOString().slice(0, 10),
          status: "Pending",
          approver: "",
          comment: "",
        }),
        ...row,
        id,
      } as HrmLeave;
      const leaveRequests = existing
        ? prev.leaveRequests.map((l) => (l.id === id ? nextRow : l))
        : [nextRow, ...prev.leaveRequests];
      return { ...prev, leaveRequests };
    });
  },

  removeLeave(id: string) {
    setData((prev) => ({
      ...prev,
      leaveRequests: prev.leaveRequests.filter((l) => l.id !== id),
    }));
  },

  upsertOnboarding(row: Partial<HrmOnboarding> & { name: string; role: string }) {
    setData((prev) => {
      const id = row.id || uid("ONB");
      const existing = prev.onboardingPrograms.find((o) => o.id === id);
      const nextRow = {
        ...(existing ?? {
          id,
          employeeId: null,
          department: "People",
          startDate: new Date().toISOString().slice(0, 10),
          buddy: "",
          manager: "",
          status: "In progress",
        }),
        ...row,
        id,
      } as HrmOnboarding;
      const onboardingPrograms = existing
        ? prev.onboardingPrograms.map((o) => (o.id === id ? nextRow : o))
        : [nextRow, ...prev.onboardingPrograms];
      return { ...prev, onboardingPrograms };
    });
  },

  removeOnboarding(id: string) {
    setData((prev) => ({
      ...prev,
      onboardingPrograms: prev.onboardingPrograms.filter((o) => o.id !== id),
    }));
  },

  removeDocument(id: string) {
    setData((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== id),
    }));
  },

  updateAttendance(id: string, patch: Partial<HrmAttendance>) {
    setData((prev) => ({
      ...prev,
      attendanceRecords: prev.attendanceRecords.map((r) =>
        r.id === id ? ({ ...r, ...patch } as HrmAttendance) : r,
      ),
    }));
  },

  removeAttendance(id: string) {
    setData((prev) => ({
      ...prev,
      attendanceRecords: prev.attendanceRecords.filter((r) => r.id !== id),
    }));
  },

  updatePayroll(id: string, patch: Partial<HrmPayroll>) {
    setData((prev) => ({
      ...prev,
      payrollRecords: prev.payrollRecords.map((r) =>
        r.id === id ? ({ ...r, ...patch } as HrmPayroll) : r,
      ),
    }));
  },

  removePayroll(id: string) {
    setData((prev) => ({
      ...prev,
      payrollRecords: prev.payrollRecords.filter((r) => r.id !== id),
    }));
  },

  upsertPerformance(row: Partial<HrmPerformance> & { name: string; employeeId: string }) {
    setData((prev) => {
      const existing = prev.performanceRatings.find((p) => p.employeeId === row.employeeId);
      const nextRow = {
        ...(existing ?? {
          department: "",
          role: "",
          score: 0,
          goalsCompleted: 0,
          goalsTotal: 0,
          lastReview: new Date().toISOString().slice(0, 10),
          reviewer: "",
          potential: "Medium",
          metrics: { quality: 0, delivery: 0, collaboration: 0, ownership: 0 },
          feedback: "",
        }),
        ...row,
      } as HrmPerformance;
      const performanceRatings = existing
        ? prev.performanceRatings.map((p) =>
            p.employeeId === row.employeeId ? nextRow : p,
          )
        : [nextRow, ...prev.performanceRatings];
      return { ...prev, performanceRatings };
    });
  },

  removePerformance(employeeId: string) {
    setData((prev) => ({
      ...prev,
      performanceRatings: prev.performanceRatings.filter((p) => p.employeeId !== employeeId),
    }));
  },

  upsertResignation(row: Partial<HrmResignation> & { name: string }) {
    setData((prev) => {
      const id = row.id || uid("EX");
      const existing = prev.resignations.find((r) => r.id === id);
      const nextRow = {
        ...(existing ?? {
          id,
          employeeId: "",
          department: "",
          designation: "",
          manager: "",
          resignationDate: new Date().toISOString().slice(0, 10),
          lastWorkingDay: new Date().toISOString().slice(0, 10),
          noticePeriod: 30,
          reason: "",
          exitInterview: "Pending",
          approvalStatus: "Pending",
          approvedBy: "",
          clearance: [],
          documents: [],
        }),
        ...row,
        id,
      } as HrmResignation;
      const resignations = existing
        ? prev.resignations.map((r) => (r.id === id ? nextRow : r))
        : [nextRow, ...prev.resignations];
      return { ...prev, resignations };
    });
  },

  removeResignation(id: string) {
    setData((prev) => ({
      ...prev,
      resignations: prev.resignations.filter((r) => r.id !== id),
    }));
  },
};

export function useHrmStore() {
  const snapshot = useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    () => data,
    () => data,
  );

  return {
    ...snapshot,
    departments,
    employmentStatuses,
    leaveTypes,
    attendanceTrend,
    payrollTrend,
    announcements,
    recentActivities,
    upcomingBirthdays,
    actions: hrmActions,
  };
}
