import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("desktop packaging smoke test", () => {
  it("uses the release product name and generated platform icons", () => {
    const config = JSON.parse(readFileSync(join(process.cwd(), "src-tauri/tauri.conf.json"), "utf8")) as {
      productName: string;
      app: { windows: Array<{ title: string }> };
      bundle: { active: boolean; icon: string[] };
    };
    expect(config.productName).toBe("Onyx Writer");
    expect(config.app.windows[0]?.title).toBe("Onyx Writer");
    expect(config.bundle.active).toBe(true);
    expect(config.bundle.icon).toContain("icons/icon.icns");
    expect(config.bundle.icon).toContain("icons/icon.ico");
  });

  it("documents the bundle-versus-app-settings storage boundary", () => {
    const packagingDoc = readFileSync(join(process.cwd(), "docs/release/desktop-packaging.md"), "utf8");
    expect(packagingDoc).toContain("Bundles are user-selected folders");
    expect(packagingDoc).toContain("Imported JSONM systems");
    expect(packagingDoc).toContain("app-data directory");
  });
});
