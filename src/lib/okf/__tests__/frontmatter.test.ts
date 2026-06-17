import { describe, expect, it } from "vitest";
import { OkfParseError, parseOkfDocument, serializeOkfDocument } from "../frontmatter";

describe("frontmatter", () => {
  it("parses and serializes unknown keys", () => {
    const raw = "---\ntype: Reference\ncustom: keep\ntitle: Example\n---\n\n# Body\n";
    const doc = parseOkfDocument("references/example.md", raw);
    expect(doc.frontmatter.custom).toBe("keep");
    expect(doc.body).toContain("# Body");
    expect(serializeOkfDocument(doc)).toContain("custom: keep");
  });

  it("treats files without frontmatter as body", () => {
    const doc = parseOkfDocument("index.md", "# Index\n");
    expect(doc.hasFrontmatter).toBe(false);
    expect(doc.body).toBe("# Index\n");
  });

  it("rejects malformed yaml", () => {
    expect(() => parseOkfDocument("x.md", "---\ntype: [\n---\n")).toThrow(OkfParseError);
  });
});
