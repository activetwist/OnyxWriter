import { describe, expect, it } from "vitest";
import { analyzeMarkdownCapabilities } from "../../editor/markdownCapabilities";
import { extractMermaidBlocks } from "../../editor/mermaidBlocks";
import { validateOkfText } from "../../okf";
import { buildDrawerGraph } from "../graph";
import { SEED_DRAWER_FILES, seedDrawerMarkdownPaths, seedDrawerTree } from "../seedDrawer";

describe("seed drawer", () => {
  it("ships a rich, valid OKF corpus", () => {
    const knownPaths = new Set(seedDrawerMarkdownPaths());

    expect(SEED_DRAWER_FILES).toHaveLength(20);
    expect(knownPaths).toContain("dashboards/operations/order-health.md");
    expect(knownPaths).toContain("domains/marketing/campaign-attribution.md");

    for (const file of SEED_DRAWER_FILES) {
      const validation = validateOkfText(file.path, file.contents, knownPaths);
      expect(validation.errors, file.path).toEqual([]);
      expect(validation.warnings, file.path).toEqual([]);
    }
  });

  it("builds a dense graph with nested folders, cycles, and no broken links", () => {
    const documents = Object.fromEntries(SEED_DRAWER_FILES.map((file) => [file.path, file.contents]));
    const graph = buildDrawerGraph(seedDrawerTree(), documents);
    const nodeIds = graph.nodes.map((node) => node.id);
    const linkEdges = graph.edges.filter((edge) => edge.kind === "link");

    expect(nodeIds).toContain("folder:dashboards/operations");
    expect(nodeIds).toContain("document:domains/commerce/customer-journey.md");
    expect(nodeIds).toContain("document:domains/marketing/campaign-attribution.md");
    expect(graph.nodes.filter((node) => node.kind === "document")).toHaveLength(20);
    expect(graph.nodes.filter((node) => node.kind === "folder").length).toBeGreaterThanOrEqual(8);
    expect(linkEdges.length).toBeGreaterThanOrEqual(45);
    expect(graph.edges.some((edge) => edge.kind === "broken-link")).toBe(false);
    expect(linkEdges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "document:domains/commerce/customer-journey.md",
          target: "document:domains/marketing/campaign-attribution.md",
        }),
        expect.objectContaining({
          source: "document:dashboards/operations/order-health.md",
          target: "document:dashboards/executive-overview.md",
        }),
        expect.objectContaining({
          source: "document:metrics/revenue.md",
          target: "document:queries/revenue-by-channel.md",
        }),
      ]),
    );
  });

  it("includes Mermaid diagrams that remain raw-mode guided", () => {
    const mermaidFiles = SEED_DRAWER_FILES.filter((file) => extractMermaidBlocks(file.contents).length > 0);

    expect(mermaidFiles).toHaveLength(5);
    for (const file of mermaidFiles) {
      const report = analyzeMarkdownCapabilities(file.contents);
      expect(report.safeForVisualEditing, file.path).toBe(false);
      expect(report.warnings.map((warning) => warning.code)).toContain("mermaid");
    }
  });
});
