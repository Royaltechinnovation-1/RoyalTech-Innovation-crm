import type { ReactNode } from "react";
import { Tag } from "./ui";

export function DbBadge({ mode }: { mode?: string }) {
  if (!mode) return null;
  return (
    <Tag tone={mode === "mysql" ? "sage" : "gold"}>
      {mode === "mysql" ? "MySQL connected" : "Local DB fallback"}
    </Tag>
  );
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="empty">
      <h3>{label}</h3>
      <p>Fetching from the CRM database.</p>
    </div>
  );
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="empty">
      <h3>API offline</h3>
      <p>{message}</p>
      <p className="muted">
        Run <code>npm run server</code> then refresh.
      </p>
    </div>
  );
}

export function ModuleShell({
  children,
  error,
  loading,
}: {
  children: ReactNode;
  error: string;
  loading: boolean;
}) {
  if (error) return <ErrorBlock message={error} />;
  if (loading) return <LoadingBlock />;
  return children;
}
