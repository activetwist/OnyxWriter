import { describe, expect, it } from "vitest";
import { hasEditorExtension, registeredEditorExtensionNames } from "../editorCapabilities";

describe("editor capabilities", () => {
  it("reports rich editor extensions", () => {
    expect(hasEditorExtension("table")).toBe(true);
    expect(hasEditorExtension("image")).toBe(true);
    expect(registeredEditorExtensionNames().filter((name) => name === "link")).toHaveLength(1);
  });
});
