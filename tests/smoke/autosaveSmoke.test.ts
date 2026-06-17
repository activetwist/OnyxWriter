import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AUTOSAVE_DEBOUNCE_MS, canAutosaveDocument } from "../../src/lib/state/workspaceStore";

describe("autosave smoke", () => {
  it("exposes autosave as the primary save policy", () => {
    expect(AUTOSAVE_DEBOUNCE_MS).toBe(1000);
    expect(
      canAutosaveDocument("/tmp/drawer", {
        path: "notes/order.md",
        raw: "---\ntype: Concept\n---\n",
        dirty: true,
        validation: { errors: [], warnings: [], notices: [] },
      }),
    ).toBe(true);
  });

  it("keeps the save control in the toolbar utility cluster", () => {
    const toolbarSource = readFileSync("src/components/EditorToolbar.tsx", "utf8");
    expect(toolbarSource).toContain("editor-toolbar-utilities");
    expect(toolbarSource).toMatch(/Visual formatting[\s\S]*editor-toolbar-utilities[\s\S]*Visual/);
    expect(toolbarSource).toContain("Saving");
    expect(toolbarSource).toContain("Unsaved");
  });
});
