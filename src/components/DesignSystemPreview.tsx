import type { CSSProperties } from "react";
import { compileVariables, jsonmTokenMap } from "../lib/jsonm";
import type { JsonmMode } from "../lib/jsonm";
import type { DesignSystemRecord } from "../lib/designSystem/types";

interface DesignSystemPreviewProps {
  system: DesignSystemRecord;
  mode: JsonmMode;
  onModeChange: (mode: JsonmMode) => void;
}

export function DesignSystemPreview({ system, mode, onModeChange }: DesignSystemPreviewProps) {
  const variables = compileVariables(system.definition, jsonmTokenMap, undefined, mode);
  const style = variables as CSSProperties;
  const modes = system.definition.settings.appearanceModes;

  return (
    <section className="design-preview">
      <div className="design-preview-toolbar">
        <span>{system.name}</span>
        {modes.length > 1 ? (
          <div className="preview-mode-toggle" aria-label="Preview appearance">
            {modes.map((item) => (
              <button className={item === mode ? "active" : ""} type="button" onClick={() => onModeChange(item)} key={item}>
                {item}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="design-preview-frame" style={style} data-appearance={mode}>
        <nav className="preview-nav">
          <strong>onyxwriter</strong>
          <button type="button">Open</button>
        </nav>
        <main className="preview-canvas">
          <span className="preview-eyebrow">tables/orders.md</span>
          <h3>Orders</h3>
          <p>
            A focused preview of app chrome, controls, validation states, and document typography under the selected
            JSONM design system.
          </p>
          <div className="preview-actions">
            <button type="button">Primary</button>
            <button type="button">Secondary</button>
          </div>
          <div className="preview-diagnostics">
            <span className="preview-ok">OKF valid</span>
            <span className="preview-warning">Missing backlink</span>
          </div>
        </main>
      </div>
    </section>
  );
}

