import { AlertTriangle, CheckCircle2, Info, PanelRightClose, PanelRightOpen } from "lucide-react";
import type { ValidationResult } from "../lib/okf";

interface ValidationPanelProps {
  validation: ValidationResult | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function ValidationPanel({ validation, collapsed, onToggleCollapsed }: ValidationPanelProps) {
  const errors = validation?.errors ?? [];
  const warnings = validation?.warnings ?? [];
  const brokenLinks = warnings.filter((item) => item.code === "link.broken");
  const guidanceWarnings = warnings.filter((item) => item.code !== "link.broken");
  const notices = validation?.notices ?? [];
  const clean = errors.length === 0 && warnings.length === 0 && notices.length === 0;
  const statusLabel = clean ? "OKF valid" : errors.length ? `${errors.length} validation error(s)` : `${warnings.length + notices.length} validation notice(s)`;

  if (collapsed) {
    return (
      <aside className="validation-panel collapsed" aria-label="Validation">
        <button className="icon-button" type="button" onClick={onToggleCollapsed} aria-label="Expand validation" title={statusLabel}>
          {clean ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
        </button>
        <button className="icon-button" type="button" onClick={onToggleCollapsed} aria-label="Expand validation rail" title="Expand validation">
          <PanelRightOpen size={16} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="validation-panel" aria-label="Validation">
      <div className="panel-heading">
        <span>Validation</span>
        <button className="panel-heading-button" type="button" onClick={onToggleCollapsed} aria-label="Collapse validation" title="Collapse validation">
          {clean ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <PanelRightClose size={15} />
        </button>
      </div>
      {clean ? (
        <div className="validation-empty">
          <CheckCircle2 size={18} />
          <span>OKF valid</span>
        </div>
      ) : (
        <div className="diagnostic-list">
          <DiagnosticGroup title="Errors" items={errors} className="error" icon="error" />
          <DiagnosticGroup title="Warnings" items={guidanceWarnings} className="warning" icon="info" />
          <DiagnosticGroup title="Broken Links" items={brokenLinks} className="warning" icon="info" />
          <DiagnosticGroup title="Editor Confidence" items={notices} className="info" icon="info" />
        </div>
      )}
    </aside>
  );
}

function DiagnosticGroup({
  title,
  items,
  className,
  icon,
}: {
  title: string;
  items: NonNullable<ValidationResult["errors"]>;
  className: "error" | "warning" | "info";
  icon: "error" | "info";
}) {
  if (!items.length) return null;
  return (
    <section className="diagnostic-group" aria-label={title}>
      <h3>{title}</h3>
      {items.map((item) => (
        <div className={`diagnostic ${className}`} key={`${item.code}-${item.message}`}>
          {icon === "error" ? <AlertTriangle size={15} /> : <Info size={15} />}
          <span>
            {item.message}
            <small>{item.code}</small>
          </span>
        </div>
      ))}
    </section>
  );
}
