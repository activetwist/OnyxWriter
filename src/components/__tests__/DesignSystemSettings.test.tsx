import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DesignSystemSettings } from "../DesignSystemSettings";
import type { DesignSystemRecord } from "../../lib/designSystem/types";

vi.mock("../DesignSystemPreview", () => ({
  DesignSystemPreview: () => React.createElement("div", { "data-testid": "design-preview" }, "Preview"),
}));

beforeEach(() => {
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, configurable: true });
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("DesignSystemSettings", () => {
  it("shows a right-aligned JSONM GitHub spec action", async () => {
    const onOpenSpec = vi.fn();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        React.createElement(DesignSystemSettings, {
          systems: [system],
          activeId: system.id,
          previewId: system.id,
          appearanceMode: "light",
          error: "",
          onPreview: vi.fn(),
          onModeChange: vi.fn(),
          onApply: vi.fn(),
          onImport: vi.fn(),
          onReset: vi.fn(),
          onOpenSpec,
        }),
      );
    });

    const action = buttonByText(host, "JSONM Spec on GitHub");
    expect(action.closest(".settings-actions")).not.toBeNull();

    await act(async () => {
      action.click();
    });

    expect(onOpenSpec).toHaveBeenCalledTimes(1);
  });
});

function buttonByText(host: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(host.querySelectorAll("button")).find((item) => item.textContent?.includes(text));
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Button not found: ${text}`);
  return button;
}

const system: DesignSystemRecord = {
  id: "enterprise-clean",
  name: "Enterprise Clean",
  source: "archetype",
  description: "Quiet operational design system.",
  raw: "{}",
  validation: { valid: true, errors: [], warnings: [] },
  definition: {
    format: "JSONM",
    version: "1.0.0",
    name: "Enterprise Clean",
    settings: {
      defaultMode: "light",
      appearanceModes: ["light", "dark"],
    },
    tokens: {},
  } as unknown as DesignSystemRecord["definition"],
};
