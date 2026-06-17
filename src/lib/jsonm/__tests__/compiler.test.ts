import { describe, expect, it } from "vitest";
import { bundledJsonmSystems, compileJsonmTheme, compileVariables, jsonmTokenMap } from "../index";

describe("compileJsonmTheme", () => {
  it("emits onyx-prefixed variables and mode blocks", () => {
    const compiled = compileJsonmTheme(bundledJsonmSystems[0].definition, jsonmTokenMap);
    expect(compiled.cssText).toContain("--onyx-color-bg");
    expect(compiled.cssText).toContain(':root[data-appearance="dark"]');
    expect(compiled.variables["--onyx-space-md"]).toBe("var(--onyx-space-s2)");
  });

  it("resolves different semantic color values per mode", () => {
    const definition = bundledJsonmSystems.find((system) => system.definition.id === "dt")?.definition ?? bundledJsonmSystems[0].definition;
    const light = compileVariables(definition, jsonmTokenMap, undefined, "light");
    const dark = compileVariables(definition, jsonmTokenMap, undefined, "dark");
    expect(light["--onyx-color-bg"]).not.toBe(dark["--onyx-color-bg"]);
  });

  it("can compile a requested appearance mode as the runtime default", () => {
    const definition = bundledJsonmSystems.find((system) => system.definition.id === "dt")?.definition ?? bundledJsonmSystems[0].definition;
    const darkVariables = compileVariables(definition, jsonmTokenMap, undefined, "dark");
    const compiled = compileJsonmTheme(definition, jsonmTokenMap, undefined, "dark");
    expect(compiled.defaultMode).toBe("dark");
    expect(compiled.variables["--onyx-color-bg"]).toBe(darkVariables["--onyx-color-bg"]);
  });
});
