import type { ReactNode } from "react";
import type { CrmStore } from "../data/store";
import type { Permission } from "../lib/permissions";
import { Denied } from "./ui";

export function RequirePermission({
  store,
  permission,
  children,
}: {
  store: CrmStore;
  permission: Permission;
  children: ReactNode;
}) {
  if (!store.allow(permission)) return <Denied />;
  return children;
}
