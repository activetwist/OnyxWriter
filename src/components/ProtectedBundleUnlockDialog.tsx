import { FormEvent, useEffect, useState } from "react";
import { FolderOpen, LockKeyhole, X } from "lucide-react";
import { openEncryptedWorkspace, type EncryptedWorkspaceInfo } from "../lib/workspace/api";

interface ProtectedBundleUnlockDialogProps {
  rootPath: string;
  onCancel: () => void;
  onUnlock: (info: EncryptedWorkspaceInfo, passphrase: string) => void;
}

function nameFromPath(path: string): string {
  return path.replace(/\\/g, "/").split("/").filter(Boolean).pop() || "Protected Bundle";
}

export function ProtectedBundleUnlockDialog({ rootPath, onCancel, onUnlock }: ProtectedBundleUnlockDialogProps) {
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPassphrase("");
    setError("");
  }, [rootPath]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passphrase) {
      setError("Enter the passphrase for this protected bundle.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const info = await openEncryptedWorkspace(rootPath, passphrase);
      onUnlock(info, passphrase);
      setPassphrase("");
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mutation-backdrop" role="presentation">
      <form className="mutation-dialog protected-unlock-dialog" role="dialog" aria-modal="true" aria-labelledby="protected-unlock-title" onSubmit={submit}>
        <header className="mutation-header">
          <div>
            <span className="eyebrow">Protected bundle</span>
            <h2 id="protected-unlock-title">
              <LockKeyhole size={17} />
              <span>Unlock {nameFromPath(rootPath)}</span>
            </h2>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="Cancel unlock" disabled={busy}>
            <X size={17} />
          </button>
        </header>
        <div className="mutation-body">
          <p className="path-input-help">
            This bundle is protected. Onyx Writer needs the passphrase before it can show documents, tabs, search, or graph data.
          </p>
          <label className="path-input-field">
            <span>Bundle</span>
            <input value={rootPath} readOnly />
          </label>
          <label className="path-input-field">
            <span>Passphrase</span>
            <input
              autoFocus
              type="password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.currentTarget.value)}
              placeholder="Required to unlock this session"
            />
          </label>
          {error ? <div className="settings-error">{error}</div> : null}
        </div>
        <footer className="mutation-actions">
          <button className="open-button" type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="primary-action" type="submit" disabled={busy}>
            <FolderOpen size={16} />
            <span>{busy ? "Unlocking" : "Unlock"}</span>
          </button>
        </footer>
      </form>
    </div>
  );
}
