import { describe, expect, it } from "vitest";
import { isAllowedMermaidConfigKey, mermaidSecurityConfig } from "../security";

describe("Mermaid security policy", () => {
  it("uses strict deterministic rendering defaults", () => {
    expect(mermaidSecurityConfig).toMatchObject({
      startOnLoad: false,
      securityLevel: "strict",
      htmlLabels: false,
      deterministicIds: true,
    });
  });

  it("rejects config keys outside the shipped allowlist", () => {
    expect(isAllowedMermaidConfigKey("securityLevel")).toBe(true);
    expect(isAllowedMermaidConfigKey("themeCSS")).toBe(false);
  });
});
