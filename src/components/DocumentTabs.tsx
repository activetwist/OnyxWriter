import { X } from "lucide-react";
import { markdownTitleFallback } from "../lib/okf";
import type { OpenDocumentState } from "../lib/state/workspaceStore";

interface DocumentTabsProps {
  documents: OpenDocumentState[];
  activePath: string;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}

export function DocumentTabs({ documents, activePath, onSelect, onClose }: DocumentTabsProps) {
  return (
    <div className="document-tabs" role="tablist" aria-label="Open documents">
      {documents.length ? (
        documents.map((document) => {
          const active = document.path === activePath;
          const label = markdownTitleFallback(document.path);
          return (
            <button
              className={`document-tab ${active ? "active" : ""}`}
              key={document.path}
              onClick={() => onSelect(document.path)}
              role="tab"
              aria-selected={active}
              title={document.path}
              type="button"
            >
              <span className={`dirty-dot ${document.dirty ? "visible" : ""}`} aria-label={document.dirty ? "Unsaved changes" : undefined} />
              <span className="document-tab-label">{label}</span>
              <span
                className="document-tab-close"
                role="button"
                tabIndex={0}
                aria-label={`Close ${label}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onClose(document.path);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  event.stopPropagation();
                  onClose(document.path);
                }}
              >
                <X size={13} />
              </span>
            </button>
          );
        })
      ) : (
        <span className="document-tabs-empty">No document open</span>
      )}
    </div>
  );
}
