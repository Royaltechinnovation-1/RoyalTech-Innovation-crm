import { employees } from "./employees";

export const performanceRatings = employees
  .filter((e) => e.id !== "RTI-012" && e.salary > 0)
  .slice(0, 10)
  .map((e, i) => ({
    employeeId: e.id,
    name: e.name,
    department: e.department,
    role: e.designation,
    score: Number((3.6 + (i % 5) * 0.15).toFixed(1)),
    goalsCompleted: 2 + (i % 4),
    goalsTotal: 5,
    lastReview: "2026-11-01",
    reviewer: "CEO (Shreya)",
    potential: i % 3 === 0 ? "High" : "Medium",
    metrics: { quality: 4, delivery: 4, collaboration: 4, ownership: 3 },
    feedback: "Settling into role; review after probation.",
  }));

export const departmentPerformance = [
  { department: "Developer Team", score: 4.0, goals: 72, engagement: 82 },
  { department: "Sales", score: 3.9, goals: 68, engagement: 80 },
  { department: "HR/ADMIN", score: 4.1, goals: 75, engagement: 88 },
  { department: "content creator", score: 3.8, goals: 60, engagement: 78 },
];

export const goals = [
  {
    id: "G-7001",
    owner: "Mathan Murugan",
    department: "Developer Team",
    title: "Ship UI kit for CRM modules",
    progress: 55,
    dueDate: "2026-12-15",
    status: "On track",
    category: "Team",
  },
  {
    id: "G-7002",
    owner: "Vineet Kumar",
    department: "Sales",
    title: "Build Q4 pipeline in Mohali region",
    progress: 40,
    dueDate: "2026-12-31",
    status: "On track",
    category: "Individual",
  },
  {
    id: "G-7003",
    owner: "Vaishnavi Arora",
    department: "HR/ADMIN",
    title: "Complete joining docs for all RTI hires",
    progress: 85,
    dueDate: "2026-11-30",
    status: "On track",
    category: "Company",
  },
];
