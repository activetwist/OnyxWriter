import { FolderOpen, PackageOpen, Plus, RotateCcw } from "lucide-react";
import type { SaveStatus } from "../lib/state/workspaceStore";
import type { RecentWorkspace } from "../lib/workspace/recentWorkspaces";

interface DrawerSettingsProps {
  currentDrawerPath: string;
  recentDrawers: RecentWorkspace[];
  saveStatus: SaveStatus;
  showSystemFiles: boolean;
  onOpenDrawer: () => void;
  onCreateDrawer: () => void;
  onCreateSeedDrawer: () => void;
  onOpenRecentDrawer: (path: string) => void;
  onShowSystemFilesChange: (visible: boolean) => void;
}

export function DrawerSettings({
  currentDrawerPath,
  recentDrawers,
  saveStatus,
  showSystemFiles,
  onOpenDrawer,
  onCreateDrawer,
  onCreateSeedDrawer,
  onOpenRecentDrawer,
  onShowSystemFilesChange,
}: DrawerSettingsProps) {
  return (
    <div className="drawer-settings">
      <section className="settings-section">
        <h3>Bundles</h3>
        <p>A bundle is a folder-backed OKF document space that Onyx Writer indexes and manages as one unit.</p>
        <p>Inside code projects, create the bundle in a subfolder such as docs/okf so Onyx does not manage the whole repository.</p>
        <div className="drawer-actions">
          <button className="primary-action" type="button" onClick={onOpenDrawer}>
            <FolderOpen size={16} />
            <span>Open Bundle</span>
          </button>
          <button className="open-button" type="button" onClick={onCreateDrawer}>
            <Plus size={16} />
            <span>Create Bundle</span>
          </button>
          <button className="open-button" type="button" onClick={onCreateSeedDrawer}>
            <PackageOpen size={16} />
            <span>Create Seed Bundle</span>
          </button>
        </div>
      </section>
      <section className="settings-section">
        <h3>Current Bundle</h3>
        <p className="current-drawer-path">{currentDrawerPath || "No bundle open."}</p>
        <p>Autosave is {saveStatus === "error" ? "blocked by the current save error" : "enabled for bundle-backed documents"}.</p>
        <label className="settings-check">
          <input type="checkbox" checked={showSystemFiles} onChange={(event) => onShowSystemFilesChange(event.currentTarget.checked)} />
          <span>Show system files</span>
        </label>
      </section>
      {recentDrawers.length ? (
        <section className="settings-section">
          <h3>
            <RotateCcw size={16} />
            <span>Recent Bundles</span>
          </h3>
          <div className="recent-workspaces">
            {recentDrawers.map((drawer) => (
              <button key={drawer.path} className="recent-workspace-row" type="button" onClick={() => onOpenRecentDrawer(drawer.path)}>
                <strong>{drawer.name}</strong>
                <span>{drawer.path}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
