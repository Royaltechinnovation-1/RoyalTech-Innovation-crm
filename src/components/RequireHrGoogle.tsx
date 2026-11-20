import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { CrmStore } from "../data/store";
import { HR_GOOGLE_EMAIL } from "../lib/hrAuth";

/** Gates HR module pages to the official HR admin account. */
export function RequireHrGoogle({
  store,
  children,
}: {
  store: CrmStore;
  children: ReactNode;
}) {
  if (store.hrCrmOpen) return <>{children}</>;

  return (
    <div className="page">
      <div className="denied-card hr-google-lock">
        <p className="eyebrow">HR CRM locked</p>
        <h2>HR or Super Admin required</h2>
        <p>
          Sign in as <strong>{HR_GOOGLE_EMAIL}</strong> / <strong>hr123</strong>, or as Super
          Admin <strong>aryan@royaltech.io</strong> / <strong>founder123</strong>, to open HR
          pages including Messages and Events.
        </p>
        <div className="hr-google-lock-actions">
          <button type="button" className="btn btn-primary" onClick={() => store.logout()}>
            Switch account
          </button>
          <Link className="btn btn-secondary" to="/">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
