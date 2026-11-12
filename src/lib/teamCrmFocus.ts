const KEY = "rt_team_crm_focus";

export function getTeamCrmFocus(): string {
  try {
    return sessionStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

export function setTeamCrmFocus(ownerId: string) {
  try {
    if (!ownerId || ownerId === "all") {
      sessionStorage.removeItem(KEY);
    } else {
      sessionStorage.setItem(KEY, ownerId);
    }
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("team-crm-focus", { detail: ownerId || "all" }));
}

export function clearTeamCrmFocus() {
  setTeamCrmFocus("");
}
