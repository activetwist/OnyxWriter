import { describe, expect, it } from "vitest";
import { tiptapExtensions } from "../tiptap";

describe("tiptap extensions", () => {
  it("registers Link only once", () => {
    expect(tiptapExtensions.map((extension) => extension.name).filter((name) => name === "link")).toHaveLength(1);
  });

  it("registers table and image extensions", () => {
    expect(tiptapExtensions.map((extension) => extension.name)).toEqual(
      expect.arrayContaining(["table", "tableRow", "tableCell", "tableHeader", "image"]),
    );
  });
});
