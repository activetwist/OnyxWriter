import { X } from "lucide-react";
import type { ReactNode } from "react";

export interface SettingsTab {
  id: string;
  label: string;
}

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  tabs: SettingsTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: ReactNode;
}

export function SettingsDialog({ open, onClose, tabs, activeTab, onTabChange, children }: SettingsDialogProps) {
  if (!open) return null;
  return (
    <div className="settings-backdrop" role="presentation">
      <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="settings-header">
          <div>
            <h2 id="settings-title">Settings</h2>
            <p>Bundles, protected bundles, design system, and updates</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close settings">
            <X size={18} />
          </button>
        </header>
        <div className="settings-tabs" role="tablist" aria-label="Settings sections">
          {tabs.map((tab) => (
            <button
              className={tab.id === activeTab ? "active" : ""}
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.id === activeTab}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {children}
      </section>
    </div>
  );
}
