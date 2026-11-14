import { employees } from "./employees";

export const attendanceDates = ["2026-11-11", "2026-11-10", "2026-11-09"];

const statusPattern = ["Present", "Present", "Present", "Late", "Present", "Present", "Absent"];

function buildRecord(employee, index, date, dayOffset) {
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

  const status = statusPattern[(index + dayOffset * 2) % statusPattern.length];
  if (status === "Absent") {
    return {
      id: `${date}-${employee.id}`,
      employeeId: employee.id,
      name: employee.name,
      department: employee.department,
      date,
      checkIn: "—",
      checkOut: "—",
      hours: 0,
      status: "Absent",
    };
  }

  const late = status === "Late";
  const checkIn = late ? "10:12" : index % 4 === 0 ? "09:18" : "09:02";
  const checkOut = index % 5 === 0 ? "18:42" : "18:24";
  const hours = late ? 7.8 : index % 4 === 0 ? 8.7 : 9.1;

  return {
    id: `${date}-${employee.id}`,
    employeeId: employee.id,
    name: employee.name,
    department: employee.department,
    date,
    checkIn,
    checkOut,
    hours,
    status,
  };
}

export const attendanceRecords = attendanceDates.flatMap((date, dayOffset) =>
  employees.map((employee, index) => buildRecord(employee, index, date, dayOffset)),
);

export const attendanceTrend = [
  { day: "Mon", present: 22, late: 2, absent: 1, leave: 1 },
  { day: "Tue", present: 21, late: 3, absent: 1, leave: 1 },
  { day: "Wed", present: 23, late: 1, absent: 1, leave: 1 },
  { day: "Thu", present: 22, late: 2, absent: 1, leave: 1 },
  { day: "Fri", present: 20, late: 3, absent: 2, leave: 1 },
  { day: "Mon", present: 23, late: 1, absent: 1, leave: 1 },
  { day: "Tue", present: 22, late: 2, absent: 1, leave: 1 },
];

export const monthlyAttendance = [
  { month: "Jun", present: 94, hours: 8.6 },
  { month: "Jul", present: 92, hours: 8.5 },
  { month: "Aug", present: 95, hours: 8.7 },
  { month: "Sep", present: 93, hours: 8.4 },
  { month: "Oct", present: 96, hours: 8.8 },
  { month: "Nov", present: 94, hours: 8.6 },
];

export const attendanceCalendar = {
  "2026-11-02": { label: "Present", tone: "success" },
  "2026-11-03": { label: "Present", tone: "success" },
  "2026-11-04": { label: "Late", tone: "warning" },
  "2026-11-05": { label: "Present", tone: "success" },
  "2026-11-06": { label: "Present", tone: "success" },
  "2026-11-09": { label: "Present", tone: "success" },
  "2026-11-10": { label: "Present", tone: "success" },
  "2026-11-11": { label: "Present", tone: "success" },
  "2026-11-12": { label: "Present", tone: "success" },
  "2026-11-13": { label: "Late", tone: "warning" },
  "2026-11-16": { label: "Present", tone: "success" },
  "2026-11-17": { label: "Present", tone: "success" },
  "2026-11-18": { label: "On leave", tone: "warning" },
  "2026-11-19": { label: "Present", tone: "success" },
  "2026-11-20": { label: "Present", tone: "success" },
  "2026-11-23": { label: "Present", tone: "success" },
  "2026-11-24": { label: "Present", tone: "success" },
  "2026-11-25": { label: "Present", tone: "success" },
  "2026-11-26": { label: "Holiday", tone: "info" },
  "2026-11-27": { label: "Present", tone: "success" },
  "2026-11-30": { label: "Present", tone: "success" },
};
