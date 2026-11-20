import type { FormEvent, ReactNode } from "react";

export function HrmEditModal({
  title,
  onClose,
  onSubmit,
  children,
  submitLabel = "Save",
}: {
  title: string;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
  submitLabel?: string;
}) {
  return (
    <div className="ai-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ai-modal hrm-edit-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h3>{title}</h3>
          <button className="ai-menu" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <form
          className="form-grid hrm-edit-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(e);
          }}
          noValidate
        >
          <div className="hrm-edit-body">{children}</div>
          <div className="form-actions hrm-edit-actions">
            <button className="btn btn-secondary" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit">
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function HrmField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field-wrap">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
