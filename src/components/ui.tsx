import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function Button({
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button className={`btn btn-${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="field" {...props} />;
}

export function Select({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className="field" {...props}>
      {children}
    </select>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="field field-area" {...props} />;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field-wrap">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function Tag({
  children,
  tone = "mist",
}: {
  children: ReactNode;
  tone?: "mist" | "sage" | "gold" | "cold" | "warm" | "danger";
}) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}

export function Widget({
  label,
  value,
  meta,
  accent = "sage",
}: {
  label: string;
  value: string | number;
  meta: string;
  accent?: "sage" | "gold" | "forest" | "mist";
}) {
  return (
    <article className={`stat accent-${accent}`}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      <p className="stat-meta">{meta}</p>
    </article>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-hero compact">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {actions ? <div className="hero-actions">{actions}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  action,
  children,
  dark = false,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <section className={`panel${dark ? " panel-dark" : ""}`}>
      <div className="panel-head">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function Denied() {
  return (
    <div className="page">
      <EmptyState
        title="Access restricted"
        body="Your role does not have permission to view this area. Confidential modules stay protected."
      />
    </div>
  );
}
