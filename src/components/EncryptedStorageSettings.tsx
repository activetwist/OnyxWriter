import { useState } from "react";
import { FolderOpen, LockKeyhole, Plus, ShieldCheck } from "lucide-react";
import {
  initializeEncryptedWorkspace,
  openEncryptedWorkspace,
  selectWorkspaceDirectory,
  type EncryptedWorkspaceInfo,
} from "../lib/workspace/api";

interface EncryptedStorageSettingsProps {
  currentBundlePath: string;
  encryptedBundlePath: string;
  encryptedBundleName: string;
  encryptedGeneration: number | null;
  onUnlock: (info: EncryptedWorkspaceInfo, passphrase: string) => void;
}

export function EncryptedStorageSettings({
  currentBundlePath,
  encryptedBundlePath,
  encryptedBundleName,
  encryptedGeneration,
  onUnlock,
}: EncryptedStorageSettingsProps) {
  const [root, setRoot] = useState("");
  const [name, setName] = useState("Private Bundle");
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function selectRoot() {
    const selected = await selectWorkspaceDirectory("Choose Encrypted Bundle Folder");
    if (selected) setRoot(selected);
  }

  async function createEncryptedBundle() {
    if (!root || !passphrase) {
      setError("Choose a folder and enter a passphrase before creating an encrypted bundle.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("Creating encrypted bundle.");
    try {
      const info = await initializeEncryptedWorkspace(root, passphrase, name.trim() || "Private Bundle");
      onUnlock(info, passphrase);
      setStatus(`Encrypted bundle created: ${info.bundleName}.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  async function unlockEncryptedBundle() {
    if (!root || !passphrase) {
      setError("Choose an encrypted bundle folder and enter its passphrase.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("Unlocking encrypted bundle.");
    try {
      const info = await openEncryptedWorkspace(root, passphrase);
      onUnlock(info, passphrase);
      setStatus(`Encrypted bundle unlocked: ${info.bundleName}.`);
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
          <span>Encrypted Bundles</span>
        </h3>
        <p>
          Encrypted bundles keep OKF documents editable in Onyx Writer while storing only encrypted manifests and encrypted document objects
          in the selected folder. Passphrases stay in memory for the current session and are not saved.
        </p>
      </section>

      <section className="settings-section encrypted-open-panel">
        <h3>
          <ShieldCheck size={16} />
          <span>Open or Create</span>
        </h3>
        <label className="settings-field">
          <span>Encrypted folder</span>
          <div className="settings-field-row">
            <input value={root} onChange={(event) => setRoot(event.currentTarget.value)} placeholder="/path/to/encrypted-bundle" />
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
        </div>
        {status ? <p className="settings-status">{status}</p> : null}
        {error ? <div className="settings-error">{error}</div> : null}
      </section>

      <section className="settings-section">
        <h3>Current Encrypted Bundle</h3>
        {encryptedBundlePath ? (
          <>
            <p className="current-drawer-path">{encryptedBundleName}</p>
            <p className="current-drawer-path">{encryptedBundlePath}</p>
            <p>Manifest generation: {encryptedGeneration ?? "unknown"}</p>
          </>
        ) : (
          <p>No encrypted bundle is unlocked in this session.</p>
        )}
      </section>

      <section className="settings-section">
        <h3>Current Standard Bundle</h3>
        <p className="current-drawer-path">{currentBundlePath || "No standard bundle open."}</p>
      </section>
    </div>
  );
}
