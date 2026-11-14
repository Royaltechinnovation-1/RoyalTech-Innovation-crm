import { employees } from "./employees";

export const payrollMonths = [
  { value: "2026-11", label: "November 2026", status: "In progress" },
  { value: "2026-10", label: "October 2026", status: "Completed" },
  { value: "2026-09", label: "September 2026", status: "Completed" },
];

const paidThrough = { "2026-11": 21, "2026-10": 26, "2026-09": 26 };

function buildRecord(employee, index, month) {
  const basic = Math.round(employee.salary * 0.5);
  const hra = Math.round(employee.salary * 0.2);
  const special = Math.round(employee.salary * 0.18);
  const transport = Math.round(employee.salary * 0.12);
  const allowances = hra + special + transport;
  const pf = Math.round(basic * 0.12);
  const tax = Math.round(employee.salary * 0.1);
  const insurance = 1200;
  const deductions = pf + tax + insurance;
  const net = employee.salary - deductions;
  const paid = index < paidThrough[month];

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
    gross: employee.salary,
    net,
    status: paid ? "Paid" : "Pending",
    paymentDate: paid ? `${month}-28` : "",
    processedOn: paid ? `${month}-26` : "",
    bank: `HDFC **** ${String(4200 + index).slice(-4)}`,
    pan: `ABCDE${1000 + index}F`,
  };
}

export const payrollByMonth = payrollMonths.reduce((accumulator, month) => {
  accumulator[month.value] = employees.map((employee, index) =>
    buildRecord(employee, index, month.value),
  );
  return accumulator;
}, {});

export const payrollRecords = payrollByMonth["2026-11"];

export const payrollTrend = [
  { month: "Jun", payroll: 2780000, headcount: 24 },
  { month: "Jul", payroll: 2815000, headcount: 24 },
  { month: "Aug", payroll: 2890000, headcount: 25 },
  { month: "Sep", payroll: 2945000, headcount: 25 },
  { month: "Oct", payroll: 3010000, headcount: 26 },
  { month: "Nov", payroll: 3074000, headcount: 26 },
];

export const payrollBreakdown = [
  { name: "Basic salary", value: 52, color: "#25352B" },
  { name: "Allowances", value: 34, color: "#647765" },
  { name: "Statutory", value: 9, color: "#C2A878" },
  { name: "Other deductions", value: 5, color: "#B9A48A" },
];
