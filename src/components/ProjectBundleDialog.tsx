import { FolderPlus, X } from "lucide-react";
import { useState } from "react";
import { DEFAULT_PROJECT_BUNDLE_PATH, validateProjectBundleSubpath, type ProjectRootAssessment } from "../lib/workspace/projectDetection";

interface ProjectBundleDialogProps {
  projectPath: string;
  assessment: ProjectRootAssessment;
  busy?: boolean;
  error?: string;
  onCancel: () => void;
  onCreate: (relativePath: string, title: string) => void;
}

export function ProjectBundleDialog({ projectPath, assessment, busy = false, error = "", onCancel, onCreate }: ProjectBundleDialogProps) {
  const [relativePath, setRelativePath] = useState(assessment.suggestedBundlePath || DEFAULT_PROJECT_BUNDLE_PATH);
  const [title, setTitle] = useState("Onyx Bundle");
  const [localError, setLocalError] = useState("");

  return (
    <div className="mutation-backdrop" role="presentation">
      <form
        className="mutation-dialog project-bundle-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-bundle-title"
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const normalized = validateProjectBundleSubpath(relativePath);
            setLocalError("");
            onCreate(normalized, title.trim() || "Onyx Bundle");
          } catch (validationError) {
            setLocalError(validationError instanceof Error ? validationError.message : String(validationError));
          }
        }}
      >
        <header className="mutation-header">
          <div>
            <span className="eyebrow">Developer project</span>
            <h2 id="project-bundle-title">Create bundle inside project</h2>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="Cancel" disabled={busy}>
            <X size={17} />
          </button>
        </header>
        <div className="mutation-body">
          <p>
            This folder looks like a code project
            {assessment.markers.length ? ` (${assessment.markers.join(", ")})` : ""}. Create the OKF bundle in a subfolder so Onyx does not manage the whole repository.
          </p>
          <p className="path-input-help">{projectPath}</p>
          <label className="path-input-field">
            <span>Bundle folder inside project</span>
            <input autoFocus value={relativePath} onChange={(event) => setRelativePath(event.target.value)} />
          </label>
          <label className="path-input-field">
            <span>Bundle title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          {localError || error ? <div className="settings-error">{localError || error}</div> : null}
        </div>
        <footer className="mutation-actions">
          <button className="open-button" type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="primary-action" type="submit" disabled={busy}>
            <FolderPlus size={16} />
            <span>{busy ? "Creating" : "Create Bundle"}</span>
          </button>
        </footer>
      </form>
    </div>
  );
}
