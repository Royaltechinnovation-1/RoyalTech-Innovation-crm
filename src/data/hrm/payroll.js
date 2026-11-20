import { employees } from "./employees";

export const payrollMonths = [
  { value: "2026-11", label: "November 2026", status: "In progress" },
  { value: "2026-10", label: "October 2026", status: "Completed" },
  { value: "2026-09", label: "September 2026", status: "Completed" },
];

const paidThrough = { "2026-11": 21, "2026-10": 26, "2026-09": 26 };

function buildRecord(employee, index, month) {
  // RoyalTech roster: salaries are in-hand with no deduction
  const gross = employee.salary || 0;
  const basic = gross;
  const allowances = 0;
  const deductions = 0;
  const net = gross;
  const paid = index < paidThrough[month];
  const pan =
    employee.documents?.panNumber ||
    (employee.documents?.pan === "Yes" ? "On file" : "");

  return {
    id: `${month}-${employee.id}`,
    employeeId: employee.id,
    name: employee.name,
    department: employee.department,
    designation: employee.designation,
    month,
    basic,
    allowances,
    deductions,
    gross,
    net,
    status: paid ? "Paid" : "Pending",
    paymentDate: paid ? `${month}-28` : "",
    processedOn: paid ? `${month}-26` : "",
    bank: employee.documents?.bankDetails === "Yes" ? "On file" : "Pending",
    pan,
    notes: employee.salaryNotes || "IN Hand no deduction",
  };
}

export const payrollByMonth = payrollMonths.reduce((accumulator, month) => {
  accumulator[month.value] = employees.map((employee, index) =>
    buildRecord(employee, index, month.value),
  );
  return accumulator;
}, {});

export const payrollRecords = payrollByMonth["2026-11"];

const novPayroll = employees.reduce((s, e) => s + (e.salary || 0), 0);

export const payrollTrend = [
  { month: "Jun", payroll: 180000, headcount: 6 },
  { month: "Jul", payroll: 195000, headcount: 7 },
  { month: "Aug", payroll: 210000, headcount: 8 },
  { month: "Sep", payroll: 220000, headcount: 9 },
  { month: "Oct", payroll: 230000, headcount: 10 },
  { month: "Nov", payroll: novPayroll, headcount: employees.length },
];

export const payrollBreakdown = [
  { name: "In-hand salary", value: 100, color: "#4b7bf5" },
  { name: "Allowances", value: 0, color: "#647765" },
  { name: "Statutory", value: 0, color: "#C2A878" },
  { name: "Other deductions", value: 0, color: "#B9A48A" },
];
