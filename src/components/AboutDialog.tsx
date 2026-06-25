import { X } from "lucide-react";
import { ONYX_APP_LICENSE, ONYX_APP_NAME, ONYX_APP_REPOSITORY, ONYX_APP_VERSION } from "../lib/appInfo";

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  if (!open) return null;

  return (
    <div className="settings-backdrop" role="presentation">
      <section className="about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-dialog-title">
        <header className="about-dialog-header">
          <div>
            <span className="eyebrow">About</span>
            <h2 id="about-dialog-title">{ONYX_APP_NAME}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close about dialog">
            <X size={17} />
          </button>
        </header>
        <div className="about-dialog-body">
          <dl>
            <div>
              <dt>Version</dt>
              <dd>{ONYX_APP_VERSION}</dd>
            </div>
            <div>
              <dt>License</dt>
              <dd>{ONYX_APP_LICENSE}</dd>
            </div>
            <div>
              <dt>Repository</dt>
              <dd>
                <a href={ONYX_APP_REPOSITORY} target="_blank" rel="noreferrer">
                  {ONYX_APP_REPOSITORY}
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
