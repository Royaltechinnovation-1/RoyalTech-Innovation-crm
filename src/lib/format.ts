import type { LeadStatus } from "../types";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string) {
  if (!value) return "—";
  const normalized = /^\d{4}-\d{2}-\d{2}/.test(value)
    ? `${value.slice(0, 10)}T12:00:00`
    : value.includes("T")
      ? value
      : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export const leadStageLabels: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const pipelineStages: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];
