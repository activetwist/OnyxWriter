import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorPane } from "../EditorPane";
import { validateOkfText } from "../../lib/okf";
import { SEED_DRAWER_FILES } from "../../lib/workspace/seedDrawer";

vi.mock("../MermaidDiagram", () => ({
  MermaidDiagram: ({ source }: { source: string }) => React.createElement("div", { "data-testid": "mermaid" }, source),
}));

afterEach(() => {
  document.body.innerHTML = "";
});

describe("EditorPane seed document rendering", () => {
  it("opens every seed document without blanking the editor surface", async () => {
    for (const file of SEED_DRAWER_FILES) {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const root = createRoot(host);

      await act(async () => {
        root.render(
          React.createElement(EditorPane, {
            document: { path: file.path, raw: file.contents, dirty: false, validation: validateOkfText(file.path, file.contents) },
            mode: "visual",
            onChange: () => {},
          }),
        );
      });

      expect(host.textContent, file.path).toContain(file.path);
      expect(host.querySelector(".editor-pane"), file.path).not.toBeNull();

      await act(async () => {
        root.unmount();
      });
      host.remove();
    }
  });
});
