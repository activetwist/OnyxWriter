import { RotateCcw } from "lucide-react";
import type { RecentWorkspace } from "../lib/workspace/recentWorkspaces";

interface WorkspaceLauncherProps {
  recentWorkspaces: RecentWorkspace[];
  onOpenRecent: (path: string) => void;
}

export function WorkspaceLauncher({
  recentWorkspaces,
  onOpenRecent,
}: WorkspaceLauncherProps) {
  return (
    <main className="workspace-launcher">
      <section className="workspace-launcher-inner" aria-labelledby="workspace-launcher-title">
        <div>
          <h2 id="workspace-launcher-title">No bundle open</h2>
          <p>Use the left rail to open or create a folder-backed OKF document space.</p>
        </div>
        {recentWorkspaces.length ? (
          <div className="recent-workspaces">
            <div className="recent-workspaces-heading">
              <RotateCcw size={16} />
              <span>Recent Bundles</span>
            </div>
            {recentWorkspaces.map((workspace) => (
              <button key={workspace.path} className="recent-workspace-row" type="button" onClick={() => onOpenRecent(workspace.path)}>
                <strong>{workspace.name}</strong>
                <span>{workspace.path}</span>
              </button>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
