import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { analyzeMarkdownCapabilities } from "../../src/lib/editor/markdownCapabilities";
import { parseOkfDocument, serializeOkfDocument, validateOkfText } from "../../src/lib/okf";

const referencePaths = [
  "index.md",
  "log.md",
  "datasets/sales.md",
  "tables/orders.md",
  "tables/customers.md",
  "references/sql-example.md",
];

function readFixture(path: string): string {
  return readFileSync(join(process.cwd(), "tests/fixtures/okf-reference", path), "utf8");
}

describe("OKF reference corpus smoke test", () => {
  it("validates all reference Markdown documents without errors", () => {
    const knownPaths = new Set(referencePaths);
    for (const path of referencePaths) {
      const validation = validateOkfText(path, readFixture(path), knownPaths);
      expect(validation.errors, path).toHaveLength(0);
    }
  });

  it("round-trips concept fixtures through the OKF serializer", () => {
    const knownPaths = new Set(referencePaths);
    for (const path of referencePaths.filter((item) => !["index.md", "log.md"].includes(item))) {
      const parsed = parseOkfDocument(path, readFixture(path));
      const serialized = serializeOkfDocument(parsed);
      expect(validateOkfText(path, serialized, knownPaths).errors, path).toHaveLength(0);
      expect(serialized).toContain("type:");
    }
  });

  it("flags raw-mode guidance for mermaid and SQL blocks without treating images as document links", () => {
    const knownPaths = new Set(referencePaths);
    const orders = readFixture("tables/orders.md");
    const sql = readFixture("references/sql-example.md");
    expect(analyzeMarkdownCapabilities(orders).warnings.map((warning) => warning.code)).toContain("mermaid");
    expect(analyzeMarkdownCapabilities(sql).warnings.map((warning) => warning.code)).toContain("fenced-code");
    expect(validateOkfText("tables/orders.md", orders, knownPaths).warnings.map((warning) => warning.code)).not.toContain("link.broken");
  });
});
