import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CrmStore } from "../data/store";
import { getTeamCrmFocus, setTeamCrmFocus } from "../lib/teamCrmFocus";
import { teamMembers } from "../lib/teamScope";

export function useTeamCrmFocusTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick((n) => n + 1);
    window.addEventListener("team-crm-focus", onChange);
    return () => window.removeEventListener("team-crm-focus", onChange);
  }, []);
  return tick;
}

/** Sales managers can switch between whole-team CRM and one employee's book. */
export function TeamCrmBar({ store }: { store: CrmStore }) {
  const tick = useTeamCrmFocusTick();
  const focusId = useMemo(() => {
    void tick;
    return getTeamCrmFocus();
  }, [tick]);

  if (store.role !== "sales_manager" && store.role !== "founder") return null;

  const members =
    store.role === "sales_manager"
      ? teamMembers(store.data.users, store.currentUser.id)
      : store.data.users.filter(
          (u) => u.role === "sales_manager" || u.role === "sales_executive",
        );

  const executives = members.filter((u) => u.role === "sales_executive");
  if (!executives.length && store.role === "sales_manager") return null;

  const active = members.find((u) => u.id === focusId);

  return (
    <div className="team-crm-bar" role="region" aria-label="Team CRM focus">
      <div className="team-crm-bar-copy">
        <strong>Handling CRM for</strong>
        <span>
          {active
            ? `${active.name}'s book — leads, follow-ups, clients, and pipeline`
            : "Whole team — you and every employee under you"}
        </span>
      </div>
      <div className="team-crm-bar-controls">
        <label className="team-crm-select">
          <span>Employee</span>
          <select
            value={focusId || "all"}
            onChange={(e) => setTeamCrmFocus(e.target.value)}
          >
            <option value="all">All team</option>
            {store.role === "sales_manager" ? (
              <option value={store.currentUser.id}>My own book</option>
            ) : null}
            {executives.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <Link className="btn btn-secondary btn-sm" to="/leads">
          Leads
        </Link>
        <Link className="btn btn-secondary btn-sm" to="/leads/pipeline">
          Pipeline
        </Link>
        <Link className="btn btn-secondary btn-sm" to="/leads/followups">
          Follow-ups
        </Link>
        <Link className="btn btn-secondary btn-sm" to="/clients">
          Clients
        </Link>
        <Link className="btn btn-primary btn-sm" to="/leads/new">
          Add lead
        </Link>
      </div>
    </div>
  );
}
