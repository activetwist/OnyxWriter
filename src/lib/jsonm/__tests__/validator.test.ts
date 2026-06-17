import { describe, expect, it } from "vitest";
import { bundledJsonmSystems, jsonmTokenMap, validateJsonmDefinition } from "../index";

describe("validateJsonmDefinition", () => {
  it("accepts every bundled JSONM system", () => {
    for (const system of bundledJsonmSystems) {
      const result = validateJsonmDefinition(system.definition, jsonmTokenMap);
      expect(result.errors).toEqual([]);
    }
  });

  it("aggregates token path and alias failures", () => {
    const definition = structuredClone(bundledJsonmSystems[0].definition);
    delete (definition.tokens.space as { aliases: Record<string, string> }).aliases.md;
    (definition.tokens.radius as { aliases: Record<string, string> }).aliases.sm = "missing";
    const result = validateJsonmDefinition(definition, jsonmTokenMap);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("tokens.space.aliases.md"))).toBe(true);
    expect(result.errors.some((error) => error.includes("references unknown scale key"))).toBe(true);
  });

  it("rejects insufficient semantic contrast", () => {
    const definition = structuredClone(bundledJsonmSystems[0].definition);
    const colors = (definition.tokens.color as { semantic: { light: Record<string, string> } }).semantic.light;
    colors.text = colors.bg;
    const result = validateJsonmDefinition(definition, jsonmTokenMap);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("text/bg contrast"))).toBe(true);
  });
});

