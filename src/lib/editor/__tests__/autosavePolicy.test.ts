import { describe, expect, it } from "vitest";
import { AUTOSAVE_DEBOUNCE_MS, canAutosaveDocument } from "../../state/workspaceStore";

describe("autosave policy", () => {
  it("uses a restrained debounce window", () => {
    expect(AUTOSAVE_DEBOUNCE_MS).toBeGreaterThanOrEqual(750);
    expect(AUTOSAVE_DEBOUNCE_MS).toBeLessThanOrEqual(1500);
  });

  it("autosaves only dirty drawer-backed documents", () => {
    const document = {
      path: "concepts/order.md",
      raw: "---\ntype: Concept\n---\n",
      dirty: true,
      validation: { errors: [], warnings: [], notices: [] },
    };
    expect(canAutosaveDocument("/tmp/drawer", document)).toBe(true);
    expect(canAutosaveDocument("Sample drawer", document)).toBe(false);
    expect(canAutosaveDocument("/tmp/drawer", { ...document, dirty: false })).toBe(false);
    expect(canAutosaveDocument("/tmp/drawer", null)).toBe(false);
  });
});
