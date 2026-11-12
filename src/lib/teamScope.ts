import { useEffect, useMemo, useState } from "react";
import type { CrmStore } from "../data/store";
import type { User } from "../types";
import { getTeamCrmFocus } from "./teamCrmFocus";

/** Founder / super admin sees every record. */
export function seesAllRecords(role: string) {
  return role === "founder";
}

/** Sales executives who report to this manager (plus the manager). */
export function teamMemberIds(users: User[], managerId: string) {
  const reports = users
    .filter((u) => u.managerId === managerId || u.id === managerId)
    .map((u) => u.id);
  return reports.length ? reports : [managerId];
}

export function teamMembers(users: User[], managerId: string) {
  return users.filter((u) => u.id === managerId || u.managerId === managerId);
}

/**
 * Record ownership scope for the logged-in user.
 * - founder: all records (optional employee focus)
 * - sales_manager: self + employees; optional focus on one employee book
 * - sales_executive: own records only
 * - others: all (module permissions still apply)
 */
export function recordScope(store: CrmStore): {
  mode: "all" | "team" | "self";
  ownerId?: string;
  teamManagerId?: string;
  ownerIds: string[];
  focusOwnerId?: string;
} {
  const { role, currentUser, data } = store;
  const focusOwnerId = getTeamCrmFocus() || undefined;

  if (seesAllRecords(role)) {
    if (focusOwnerId && data.users.some((u) => u.id === focusOwnerId)) {
      return {
        mode: "all",
        ownerId: focusOwnerId,
        ownerIds: [focusOwnerId],
        focusOwnerId,
      };
    }
    return { mode: "all", ownerIds: data.users.map((u) => u.id) };
  }

  if (role === "sales_manager") {
    const ownerIds = teamMemberIds(data.users, currentUser.id);
    if (focusOwnerId && ownerIds.includes(focusOwnerId)) {
      return {
        mode: "team",
        ownerId: focusOwnerId,
        ownerIds: [focusOwnerId],
        focusOwnerId,
      };
    }
    return {
      mode: "team",
      teamManagerId: currentUser.id,
      ownerIds,
    };
  }

  if (role === "sales_executive") {
    return {
      mode: "self",
      ownerId: currentUser.id,
      ownerIds: [currentUser.id],
    };
  }

  return { mode: "all", ownerIds: data.users.map((u) => u.id) };
}

export function scopeLabel(mode: "all" | "team" | "self", focusOwnerId?: string) {
  if (focusOwnerId) return "Employee CRM book";
  if (mode === "all") return "All company records";
  if (mode === "team") return "Your team records";
  return "Your records only";
}

/** Owners a manager may assign leads to. */
export function assignableOwners(store: CrmStore) {
  const { role, currentUser, data } = store;
  if (role === "founder") {
    return data.users.filter(
      (u) =>
        u.role === "sales_executive" ||
        u.role === "sales_manager" ||
        u.role === "founder",
    );
  }
  if (role === "sales_manager") {
    return teamMembers(data.users, currentUser.id);
  }
  return data.users.filter((u) => u.id === currentUser.id);
}

/** Reactive scope that updates when the manager switches employee CRM focus. */
export function useRecordScope(store: CrmStore) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick((n) => n + 1);
    window.addEventListener("team-crm-focus", onChange);
    return () => window.removeEventListener("team-crm-focus", onChange);
  }, []);
  return useMemo(() => {
    void tick;
    return recordScope(store);
  }, [store, tick]);
}
