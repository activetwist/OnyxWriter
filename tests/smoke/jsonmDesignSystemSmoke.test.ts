import { describe, expect, it } from "vitest";
import { bundledJsonmSystems, compileJsonmTheme, jsonmTokenMap, validateJsonmDefinition } from "../../src/lib/jsonm";

describe("JSONM design-system smoke", () => {
  it("loads, validates, and compiles bundled systems", () => {
    expect(bundledJsonmSystems.length).toBe(11);
    expect(bundledJsonmSystems.find((system) => system.definition.id === "ec")?.definition.name).toBe("Enterprise Clean");
    for (const system of bundledJsonmSystems) {
      const validation = validateJsonmDefinition(system.definition, jsonmTokenMap);
      expect(validation.errors).toEqual([]);
      const compiled = compileJsonmTheme(system.definition, jsonmTokenMap);
      expect(compiled.cssText).toContain("--onyx-color-bg");
      expect(compiled.cssText).toContain("--onyx-font-role-body-family");
    }
  });

  it("can compile active appearance modes for runtime theming", () => {
    const system = bundledJsonmSystems.find((item) => item.definition.settings.appearanceModes.includes("dark")) ?? bundledJsonmSystems[0];
    const compiled = compileJsonmTheme(system.definition, jsonmTokenMap, undefined, "dark");
    expect(compiled.defaultMode).toBe("dark");
    expect(compiled.cssText).toContain(':root[data-appearance="dark"]');
  });
});
