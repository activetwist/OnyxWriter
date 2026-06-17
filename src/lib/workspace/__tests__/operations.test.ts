import { describe, expect, it } from "vitest";
import { defaultConceptContents, destinationForMove, ensureMarkdownPath } from "../operations";

describe("workspace operations", () => {
  it("creates default concept contents", () => {
    expect(defaultConceptContents("Playbook", "Incident Response")).toContain("type: Playbook");
  });

  it("normalizes markdown paths", () => {
    expect(ensureMarkdownPath("tables/orders")).toBe("tables/orders.md");
  });

  it("computes destination paths", () => {
    expect(destinationForMove("archive", "tables/orders.md")).toBe("archive/orders.md");
  });
});
