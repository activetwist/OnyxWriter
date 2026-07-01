import { useState } from "react";
import { FolderOpen, LockKeyhole, LogOut, Plus, ShieldCheck } from "lucide-react";
import {
  initializeEncryptedWorkspace,
  openEncryptedWorkspace,
  protectStandardWorkspace,
  selectWorkspaceDirectory,
  type EncryptedWorkspaceInfo,
} from "../lib/workspace/api";

interface EncryptedStorageSettingsProps {
  currentBundlePath: string;
  encryptedBundlePath: string;
  encryptedBundleName: string;
  encryptedGeneration: number | null;
  onUnlock: (info: EncryptedWorkspaceInfo, passphrase: string) => void;
  onLock: () => void;
}

export function EncryptedStorageSettings({
  currentBundlePath,
  encryptedBundlePath,
  encryptedBundleName,
  encryptedGeneration,
  onUnlock,
  onLock,
}: EncryptedStorageSettingsProps) {
  const [root, setRoot] = useState("");
  const [name, setName] = useState("Private Bundle");
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function selectRoot() {
    const selected = await selectWorkspaceDirectory("Choose Protected Bundle Folder");
    if (selected) setRoot(selected);
  }

  async function createEncryptedBundle() {
    if (!root || !passphrase) {
      setError("Choose an empty folder and enter a passphrase before creating a protected bundle.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("Creating protected bundle.");
    try {
      const info = await initializeEncryptedWorkspace(root, passphrase, name.trim() || "Private Bundle");
      onUnlock(info, passphrase);
      setStatus(`Protected bundle created: ${info.bundleName}.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  async function unlockEncryptedBundle() {
    if (!root || !passphrase) {
      setError("Choose a protected bundle folder and enter its passphrase.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("Unlocking protected bundle.");
    try {
      const info = await openEncryptedWorkspace(root, passphrase);
      onUnlock(info, passphrase);
      setStatus(`Protected bundle unlocked: ${info.bundleName}.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  async function protectCurrentBundle() {
    if (!currentBundlePath) {
      setError("Open a standard bundle before creating a protected copy.");
      return;
    }
    if (!root || !passphrase) {
      setError("Choose an empty protected destination folder and enter a passphrase.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("Creating protected copy.");
    try {
      const info = await protectStandardWorkspace(currentBundlePath, root, passphrase, name.trim() || "Private Bundle");
      onUnlock(info, passphrase);
      setStatus(`Protected copy created and unlocked: ${info.bundleName}.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="encrypted-storage-settings">
      <section className="settings-section">
        <h3>
          <LockKeyhole size={16} />
          <span>Protected Bundles</span>
        </h3>
        <p>
          Protected bundles keep OKF documents editable in Onyx Writer while storing only encrypted manifests and encrypted document objects
          in the protected folder. Passphrases stay in memory for the current session, are not saved, and are cleared when the bundle is locked or closed.
        </p>
      </section>

      <section className="settings-section encrypted-open-panel">
        <h3>
          <ShieldCheck size={16} />
          <span>Open or Create</span>
        </h3>
        <label className="settings-field">
          <span>Protected folder</span>
          <div className="settings-field-row">
            <input value={root} onChange={(event) => setRoot(event.currentTarget.value)} placeholder="/path/to/protected-bundle" />
            <button className="open-button" type="button" onClick={selectRoot} disabled={busy}>
              <FolderOpen size={15} />
              <span>Choose</span>
            </button>
          </div>
        </label>
        <label className="settings-field">
          <span>Bundle name</span>
          <input value={name} onChange={(event) => setName(event.currentTarget.value)} placeholder="Private Bundle" />
        </label>
        <label className="settings-field">
          <span>Passphrase</span>
          <input
            type="password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.currentTarget.value)}
            placeholder="Required to unlock this session"
          />
        </label>
        <div className="drawer-actions">
          <button className="primary-action" type="button" onClick={unlockEncryptedBundle} disabled={busy}>
            <FolderOpen size={16} />
            <span>Unlock</span>
          </button>
          <button className="open-button" type="button" onClick={createEncryptedBundle} disabled={busy}>
            <Plus size={16} />
            <span>Create</span>
          </button>
          <button className="open-button" type="button" onClick={protectCurrentBundle} disabled={busy || !currentBundlePath}>
            <ShieldCheck size={16} />
            <span>Protect Current Bundle</span>
          </button>
        </div>
        {currentBundlePath ? (
          <p>
            Protect Current Bundle creates an encrypted protected copy in the selected protected folder, then opens that protected copy.
            The original standard bundle remains unchanged so you can verify the protected copy before archiving or deleting the original.
          </p>
        ) : null}
        {status ? <p className="settings-status">{status}</p> : null}
        {error ? <div className="settings-error">{error}</div> : null}
      </section>

      <section className="settings-section">
        <h3>Current Protected Bundle</h3>
        {encryptedBundlePath ? (
          <>
            <p className="current-drawer-path">{encryptedBundleName}</p>
            <p className="current-drawer-path">{encryptedBundlePath}</p>
            <p>Manifest generation: {encryptedGeneration ?? "unknown"}</p>
            <div className="drawer-actions">
              <button className="open-button" type="button" onClick={onLock}>
                <LogOut size={16} />
                <span>Lock Protected Bundle</span>
              </button>
            </div>
          </>
        ) : (
          <p>No protected bundle is unlocked in this session.</p>
        )}
      </section>

      <section className="settings-section">
        <h3>Current Standard Bundle</h3>
        <p className="current-drawer-path">{currentBundlePath || "No standard bundle open."}</p>
      </section>
    </div>
  );
}
