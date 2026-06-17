import { describe, expect, it } from "vitest";
import { validateOkfText } from "../validator";

describe("validator", () => {
  it("accepts minimal conformant concept and warns on recommended fields", () => {
    const result = validateOkfText("concept.md", "---\ntype: Concept\n---\n\nBody\n");
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.map((warning) => warning.code)).toContain("frontmatter.title.recommended");
  });

  it("rejects a concept missing type", () => {
    const result = validateOkfText("concept.md", "---\ntitle: Missing Type\n---\n");
    expect(result.errors.map((error) => error.code)).toContain("frontmatter.type.required");
  });

  it("permits okf_version frontmatter only on root index", () => {
    expect(validateOkfText("index.md", "---\nokf_version: \"0.1\"\n---\n\n# Index\n").errors).toHaveLength(0);
    expect(validateOkfText("tables/index.md", "---\nokf_version: \"0.1\"\n---\n\n# Index\n").errors[0]?.code).toBe("index.frontmatter");
  });

  it("does not reject broken links", () => {
    const result = validateOkfText("tables/orders.md", "---\ntype: Table\n---\n\n[Missing](missing.md)\n", new Set(["tables/orders.md"]));
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.map((warning) => warning.code)).toContain("link.broken");
  });
});
