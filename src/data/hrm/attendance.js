import { employees } from "./employees";

/** Seed months with full calendars */
export const attendanceSeedMonths = ["2026-09", "2026-10", "2026-11", "2026-12"];

const statusPattern = [
  "Present",
  "Present",
  "Present",
  "Late",
  "Present",
  "Absent",
  "Present",
  "Halfday",
  "Present",
  "Holiday",
];

function daysInMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function isoDay(ym, day) {
  return `${ym}-${String(day).padStart(2, "0")}`;
}

function buildRecord(employee, index, ym, day) {
  const date = isoDay(ym, day);
  if (employee.status === "On Leave") {
    return {
      id: `${date}-${employee.id}`,
      employeeId: employee.id,
      name: employee.name,
      department: employee.department,
      date,
      checkIn: "—",
      checkOut: "—",
      hours: 0,
      status: "On Leave",
    };
  }

  const status = statusPattern[(index + day + ym.length) % statusPattern.length];
  const presentLike = status === "Present" || status === "Late" || status === "Halfday";

  return {
    id: `${date}-${employee.id}`,
    employeeId: employee.id,
    name: employee.name,
    department: employee.department,
    date,
    checkIn: presentLike ? (status === "Late" ? "10:12" : "09:05") : "—",
    checkOut: presentLike ? (status === "Halfday" ? "13:30" : "18:30") : "—",
    hours: status === "Present" ? 9 : status === "Late" ? 7.8 : status === "Halfday" ? 4.5 : 0,
    status,
  };
}

export const attendanceDates = attendanceSeedMonths.flatMap((ym) => {
  const n = daysInMonth(ym);
  return Array.from({ length: n }, (_, i) => isoDay(ym, i + 1));
});

export const attendanceRecords = attendanceSeedMonths.flatMap((ym) => {
  const n = daysInMonth(ym);
  return Array.from({ length: n }, (_, i) => i + 1).flatMap((day) =>
    employees.map((employee, index) => buildRecord(employee, index, ym, day)),
  );
});

export const attendanceTrend = [
  { day: "Mon", present: 10, late: 1, absent: 1, leave: 0 },
  { day: "Tue", present: 11, late: 0, absent: 1, leave: 0 },
  { day: "Wed", present: 9, late: 2, absent: 1, leave: 0 },
  { day: "Thu", present: 10, late: 1, absent: 1, leave: 0 },
  { day: "Fri", present: 8, late: 2, absent: 2, leave: 0 },
  { day: "Mon", present: 11, late: 0, absent: 1, leave: 0 },
  { day: "Tue", present: 10, late: 1, absent: 1, leave: 0 },
];

export const monthlyAttendance = [
  { month: "Jun", present: 94, hours: 8.6 },
  { month: "Jul", present: 92, hours: 8.5 },
  { month: "Aug", present: 95, hours: 8.7 },
  { month: "Sep", present: 93, hours: 8.4 },
  { month: "Oct", present: 96, hours: 8.8 },
  { month: "Nov", present: 94, hours: 8.6 },
];
