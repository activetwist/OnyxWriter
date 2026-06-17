import { describe, expect, it } from "vitest";
import {
  classifyLink,
  extractMarkdownLinks,
  isOpenableExternalHref,
  normalizeOpenableExternalHref,
  relativeMarkdownHref,
  resolveInternalLink,
} from "../links";

describe("links", () => {
  it("classifies link kinds", () => {
    expect(classifyLink("/tables/users.md")).toBe("bundle-absolute");
    expect(classifyLink("../tables/users.md")).toBe("relative");
    expect(classifyLink("https://example.com")).toBe("external");
  });

  it("resolves relative links", () => {
    expect(resolveInternalLink("../tables/users.md", "datasets/sales.md")).toBe("tables/users.md");
  });

  it("builds relative Markdown hrefs from nested source documents", () => {
    expect(relativeMarkdownHref("dashboards/operations/order-health.md", "tables/orders.md")).toBe("../../tables/orders.md");
    expect(relativeMarkdownHref("tables/orders.md", "tables/customers.md")).toBe("customers.md");
    expect(relativeMarkdownHref("overview.md", "tables/orders.md")).toBe("tables/orders.md");
  });

  it("only allows safe outbound protocols for system opening", () => {
    expect(isOpenableExternalHref("https://example.com")).toBe(true);
    expect(isOpenableExternalHref("http://example.com")).toBe(true);
    expect(isOpenableExternalHref("mailto:team@example.com")).toBe(true);
    expect(isOpenableExternalHref("file:///tmp/example.md")).toBe(false);
    expect(isOpenableExternalHref("javascript:alert(1)")).toBe(false);
    expect(isOpenableExternalHref("not a url")).toBe(false);
  });

  it("normalizes safe outbound protocols before handing them to the system opener", () => {
    expect(normalizeOpenableExternalHref("Https://google.com")).toBe("https://google.com/");
    expect(normalizeOpenableExternalHref("mailto:team@example.com")).toBe("mailto:team@example.com");
    expect(normalizeOpenableExternalHref("javascript:alert(1)")).toBeUndefined();
  });

  it("marks known missing internal links as warnings only", () => {
    const links = extractMarkdownLinks("[Users](users.md) [Missing](missing.md)", "tables/orders.md", new Set(["tables/users.md"]));
    expect(links.find((link) => link.href === "users.md")?.broken).toBe(false);
    expect(links.find((link) => link.href === "missing.md")?.broken).toBe(true);
  });

  it("ignores image links when extracting document references", () => {
    const links = extractMarkdownLinks("![Chart](assets/chart.png)\n\n[Users](users.md)", "tables/orders.md", new Set(["tables/users.md"]));
    expect(links.map((link) => link.href)).toEqual(["users.md"]);
  });
});
