import { AlertTriangle, ArrowRight, FilePenLine, FolderInput, Trash2, X } from "lucide-react";
import type { DrawerMutationPlan } from "../lib/workspace/mutations";

interface DrawerMutationDialogProps {
  plan: DrawerMutationPlan | null;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onApply: () => void;
}

export function DrawerMutationDialog({ plan, busy, error, onCancel, onApply }: DrawerMutationDialogProps) {
  if (!plan) return null;
  const title = plan.kind === "rename" ? "Rename bundle item" : plan.kind === "move" ? "Move bundle item" : "Delete bundle item";
  const Icon = plan.kind === "delete" ? Trash2 : plan.kind === "move" ? FolderInput : FilePenLine;

  return (
    <div className="mutation-backdrop" role="presentation">
      <section className="mutation-dialog" role="dialog" aria-modal="true" aria-labelledby="mutation-title">
        <header className="mutation-header">
          <div>
            <span className="eyebrow">Bundle mutation</span>
            <h2 id="mutation-title">
              <Icon size={18} />
              {title}
            </h2>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="Cancel mutation" disabled={busy}>
            <X size={17} />
          </button>
        </header>
        <div className="mutation-body">
          <div className="mutation-paths">
            <code>{plan.sourcePath}</code>
            {plan.targetPath ? (
              <>
                <ArrowRight size={16} />
                <code>{plan.targetPath}</code>
              </>
            ) : null}
          </div>
          <dl className="mutation-facts">
            <div>
              <dt>Affected paths</dt>
              <dd>{plan.affectedPaths.length}</dd>
            </div>
            <div>
              <dt>Link repair</dt>
              <dd>{plan.linkRepairCount ? `${plan.linkRepairCount} document target(s)` : "Not needed"}</dd>
            </div>
            <div>
              <dt>Index refresh</dt>
              <dd>{plan.indexRefresh ? "Yes" : "No"}</dd>
            </div>
          </dl>
          {plan.destructive ? (
            <div className="mutation-warning">
              <AlertTriangle size={16} />
              <span>This removes bundle files from disk. This cannot be undone from Onyx Writer.</span>
            </div>
          ) : null}
          {plan.warnings.length ? (
            <ul className="mutation-notes">
              {plan.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          {error ? <div className="settings-error">{error}</div> : null}
        </div>
        <footer className="mutation-actions">
          <button className="open-button" type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className={`primary-action ${plan.destructive ? "save-error" : ""}`} type="button" onClick={onApply} disabled={busy}>
            {busy ? "Applying" : plan.kind === "delete" ? "Delete" : "Apply"}
          </button>
        </footer>
      </section>
    </div>
  );
}
