import { describe, expect, it } from "vitest";
import { analyzeMarkdownCapabilities } from "../../src/lib/editor/markdownCapabilities";
import { markdownToVisual, visualHtmlToMarkdown } from "../../src/lib/editor/markdownBridge";
import { imageAssetPath, isDrawerImageAssetPath } from "../../src/lib/workspace/assets";

describe("drawer rich editor smoke", () => {
  it("supports simple table and image Markdown in visual mode", () => {
    const markdown = "| Name | Type |\n| --- | --- |\n| Orders | Table |\n\n![Orders](assets/images/orders.png)\n";
    expect(analyzeMarkdownCapabilities(markdown).safeForVisualEditing).toBe(true);
    expect(visualHtmlToMarkdown(markdownToVisual(markdown).html)).toBe(markdown);
  });

  it("keeps copied images under drawer-local asset paths", () => {
    const path = imageAssetPath("Orders Chart.png");
    expect(path).toBe("assets/images/Orders-Chart.png");
    expect(isDrawerImageAssetPath(path)).toBe(true);
  });
});
