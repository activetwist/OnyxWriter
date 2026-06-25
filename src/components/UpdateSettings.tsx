import { useState } from "react";
import { CheckCircle2, Download, RefreshCw, ShieldAlert } from "lucide-react";
import { checkForOnyxUpdate, classifyUpdaterFailure, type OnyxUpdate, type UpdateProgress, type UpdaterFailure } from "../lib/updater/api";
import { ONYX_APP_VERSION } from "../lib/appInfo";

type UpdateStatus = "idle" | "checking" | "current" | "available" | "downloading" | "installed" | "unsupported" | "error";

interface AvailableUpdateState {
  update: OnyxUpdate;
  install: (onProgress?: (progress: UpdateProgress) => void) => Promise<void>;
}

export function UpdateSettings() {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [available, setAvailable] = useState<AvailableUpdateState | null>(null);
  const [failure, setFailure] = useState<UpdaterFailure | null>(null);
  const [unsupportedReason, setUnsupportedReason] = useState("");
  const [progress, setProgress] = useState<UpdateProgress | null>(null);

  async function checkForUpdates() {
    setStatus("checking");
    setFailure(null);
    setUnsupportedReason("");
    setProgress(null);

    try {
      const result = await checkForOnyxUpdate();
      if (result.status === "unsupported") {
        setAvailable(null);
        setUnsupportedReason(result.reason);
        setStatus("unsupported");
        return;
      }

      if (result.status === "current") {
        setAvailable(null);
        setStatus("current");
        return;
      }

      setAvailable({ update: result.update, install: result.install });
      setStatus("available");
    } catch (error) {
      setAvailable(null);
      setFailure(classifyUpdaterFailure(error));
      setStatus("error");
    }
  }

  async function installUpdate() {
    if (!available) return;

    setStatus("downloading");
    setFailure(null);
    setProgress(null);

    try {
      await available.install(setProgress);
      setStatus("installed");
    } catch (error) {
      setFailure(classifyUpdaterFailure(error));
      setStatus("error");
    }
  }

  return (
    <div className="update-settings">
      <section className="settings-section">
        <h3>Application Updates</h3>
        <p>Onyx Writer can check GitHub Releases for signed desktop updates when running as the installed app.</p>
        <p className="installed-version">Installed version: {ONYX_APP_VERSION}</p>
        <div className="update-actions">
          <button className="primary-action" type="button" onClick={checkForUpdates} disabled={status === "checking" || status === "downloading"}>
            <RefreshCw size={16} />
            <span>{status === "checking" ? "Checking" : "Check for Updates"}</span>
          </button>
          <button className="open-button" type="button" onClick={installUpdate} disabled={!available || status === "downloading" || status === "installed"}>
            <Download size={16} />
            <span>{status === "downloading" ? "Installing" : "Install Update"}</span>
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3>Status</h3>
        {status === "idle" ? <p>No update check has run in this session.</p> : null}
        {status === "checking" ? <p>Checking the public Onyx Writer release channel.</p> : null}
        {status === "current" ? (
          <div className="update-status success">
            <CheckCircle2 size={17} />
            <span>Onyx Writer is up to date.</span>
          </div>
        ) : null}
        {status === "unsupported" ? (
          <div className="update-status muted">
            <ShieldAlert size={17} />
            <span>{unsupportedReason}</span>
          </div>
        ) : null}
        {available ? <AvailableUpdate update={available.update} /> : null}
        {status === "downloading" ? <UpdateProgressMeter progress={progress} /> : null}
        {status === "installed" ? (
          <div className="update-status success">
            <CheckCircle2 size={17} />
            <span>Update installed. Restart Onyx Writer to use the new version.</span>
          </div>
        ) : null}
        {failure ? (
          <div className={`update-status danger ${failure.kind}`}>
            <ShieldAlert size={17} />
            <span>{failureLabel(failure)}</span>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function AvailableUpdate({ update }: { update: OnyxUpdate }) {
  return (
    <div className="update-card">
      <strong>Onyx Writer {update.version} is available.</strong>
      <span>Current version: {update.currentVersion}</span>
      {update.date ? <span>Published: {new Date(update.date).toLocaleString()}</span> : null}
      {update.body ? <p>{update.body}</p> : null}
    </div>
  );
}

function UpdateProgressMeter({ progress }: { progress: UpdateProgress | null }) {
  const total = progress?.totalBytes ?? null;
  const downloaded = progress && "downloadedBytes" in progress ? progress.downloadedBytes : 0;
  const percent = total ? Math.min(100, Math.round((downloaded / total) * 100)) : null;

  return (
    <div className="update-progress" aria-live="polite">
      <span>{percent === null ? "Downloading update." : `Downloading update: ${percent}%`}</span>
      <div className="update-progress-track">
        <span style={{ width: `${percent ?? 12}%` }} />
      </div>
    </div>
  );
}

function failureLabel(failure: UpdaterFailure): string {
  if (failure.kind === "signature") return `Update signature could not be verified: ${failure.message}`;
  if (failure.kind === "network") return `Update check failed because the release channel could not be reached: ${failure.message}`;
  if (failure.kind === "unsupported") return `Updates are not available in this runtime: ${failure.message}`;
  return `Update failed: ${failure.message}`;
}
