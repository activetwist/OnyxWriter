import { Check, ExternalLink, Eye, RotateCcw, Upload } from "lucide-react";
import type { JsonmMode } from "../lib/jsonm";
import type { DesignSystemRecord } from "../lib/designSystem/types";
import { DesignSystemPreview } from "./DesignSystemPreview";

interface DesignSystemSettingsProps {
  systems: DesignSystemRecord[];
  activeId: string;
  previewId: string;
  appearanceMode: JsonmMode;
  error: string;
  onPreview: (id: string) => void;
  onModeChange: (mode: JsonmMode) => void;
  onApply: (id: string) => void;
  onImport: () => void;
  onReset: () => void;
  onOpenSpec: () => void;
}

export function DesignSystemSettings({
  systems,
  activeId,
  previewId,
  appearanceMode,
  error,
  onPreview,
  onModeChange,
  onApply,
  onImport,
  onReset,
  onOpenSpec,
}: DesignSystemSettingsProps) {
  const preview = systems.find((system) => system.id === previewId) ?? systems[0];
  return (
    <div className="design-settings">
      <div className="settings-actions">
        <button className="primary-action" type="button" onClick={onImport}>
          <Upload size={16} />
          <span>Import JSONM</span>
        </button>
        <button className="open-button" type="button" onClick={onReset}>
          <RotateCcw size={16} />
          <span>Reset</span>
        </button>
        <button className="jsonm-spec-link" type="button" onClick={onOpenSpec}>
          <ExternalLink size={15} />
          <span>JSONM Spec on GitHub</span>
        </button>
      </div>
      {error ? <div className="settings-error">{error}</div> : null}
      <div className="design-system-layout">
        <div className="design-system-list" role="list">
          {systems.map((system) => {
            const active = system.id === activeId;
            const selected = system.id === previewId;
            return (
              <button
                className={`design-system-row ${selected ? "selected" : ""}`}
                key={system.id}
                type="button"
                onClick={() => onPreview(system.id)}
              >
                <span>
                  <strong>{system.name}</strong>
                  <small>{system.source}</small>
                </span>
                {active ? <Check size={16} aria-label="Active" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        <div className="design-system-detail">
          <p>{preview.description}</p>
          <DesignSystemPreview system={preview} mode={appearanceMode} onModeChange={onModeChange} />
          <button className="primary-action apply-theme-button" type="button" onClick={() => onApply(preview.id)}>
            <Check size={16} />
            <span>{preview.id === activeId ? "Applied" : "Apply"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
