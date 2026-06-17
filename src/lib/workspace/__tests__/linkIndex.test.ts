import { describe, expect, it } from "vitest";
import { indexDocumentLinks } from "../linkIndex";

describe("document link index", () => {
  it("indexes internal links and ignores image references", () => {
    const links = indexDocumentLinks(
      "overview.md",
      "[Orders](tables/orders.md)\n\n![Chart](assets/images/chart.png)\n\n[Missing](missing.md)",
      new Set(["overview.md", "tables/orders.md"]),
    );
    expect(links.map((link) => link.href)).toEqual(["tables/orders.md", "missing.md"]);
    expect(links[0]).toMatchObject({ kind: "internal", targetPath: "tables/orders.md", broken: false });
    expect(links[1]).toMatchObject({ kind: "internal", targetPath: "missing.md", broken: true });
  });

  it("classifies external and anchor links without drawer targets", () => {
    const links = indexDocumentLinks("overview.md", "[Site](https://example.com)\n[Top](#top)", new Set(["overview.md"]));
    expect(links.map((link) => link.kind)).toEqual(["external", "anchor"]);
  });
});
