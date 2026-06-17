import { describe, expect, it } from "vitest";
import { bundledJsonmSystems, jsonmTokenMap, validateJsonmDefinition } from "../../jsonm";
import { DEFAULT_DESIGN_SYSTEM_ID, defaultDesignSystemId, shouldUseDefaultDesignSystem } from "../store";
import type { DesignSystemRecord } from "../types";

describe("design system store inputs", () => {
  it("keeps bundled systems available and valid", () => {
    expect(bundledJsonmSystems.length).toBe(11);
    for (const system of bundledJsonmSystems) {
      const result = validateJsonmDefinition(system.definition, jsonmTokenMap);
      expect(result.errors).toEqual([]);
    }
  });

  it("uses Enterprise Clean as the default and legacy-baseline migration target", () => {
    const records = bundledJsonmSystems.map((system) => ({
      id: `${system.source}-${system.definition.id}`,
      source: system.source,
      name: system.definition.name,
      description: system.definition.description,
      definition: system.definition,
      raw: system.raw,
      validation: { valid: true, errors: [], warnings: [] },
    })) satisfies DesignSystemRecord[];

    expect(defaultDesignSystemId(records)).toBe(DEFAULT_DESIGN_SYSTEM_ID);
    expect(shouldUseDefaultDesignSystem("", records)).toBe(true);
    expect(shouldUseDefaultDesignSystem("baseline-onyxwriter-baseline", records)).toBe(true);
    expect(shouldUseDefaultDesignSystem("archetype-dt", records)).toBe(false);
  });
});
