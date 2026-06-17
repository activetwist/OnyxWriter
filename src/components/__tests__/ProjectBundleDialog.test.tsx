import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PROJECT_BUNDLE_PATH, type ProjectRootAssessment } from "../../lib/workspace/projectDetection";
import { ProjectBundleDialog } from "../ProjectBundleDialog";

const assessment: ProjectRootAssessment = {
  likelyProjectRoot: true,
  likelyOkfBundle: false,
  markers: [".git", "package.json"],
  suggestedBundlePath: DEFAULT_PROJECT_BUNDLE_PATH,
};

beforeEach(() => {
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, configurable: true });
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ProjectBundleDialog", () => {
  it("submits a nested bundle path and title", async () => {
    const onCreate = vi.fn();
    const host = renderDialog(onCreate);

    await setInput(host, "Bundle folder inside project", "knowledge/okf");
    await setInput(host, "Bundle title", "Project Knowledge");
    await submit(host);

    expect(onCreate).toHaveBeenCalledWith("knowledge/okf", "Project Knowledge");
  });

  it("rejects traversal paths before submit", async () => {
    const onCreate = vi.fn();
    const host = renderDialog(onCreate);

    await setInput(host, "Bundle folder inside project", "../okf");
    await submit(host);

    expect(onCreate).not.toHaveBeenCalled();
    expect(host.textContent).toContain("traversal");
  });
});

function renderDialog(onCreate: (path: string, title: string) => void): HTMLDivElement {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      React.createElement(ProjectBundleDialog, {
        projectPath: "/tmp/project",
        assessment,
        onCancel: vi.fn(),
        onCreate,
      }),
    );
  });
  return host;
}

async function setInput(host: HTMLElement, labelText: string, value: string): Promise<void> {
  const label = Array.from(host.querySelectorAll("label")).find((item) => item.textContent?.includes(labelText));
  const input = label?.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error(`Input not found: ${labelText}`);
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function submit(host: HTMLElement): Promise<void> {
  const button = Array.from(host.querySelectorAll("button")).find((item) => item.textContent?.includes("Create Bundle"));
  if (!(button instanceof HTMLButtonElement)) throw new Error("Submit button not found.");
  await act(async () => {
    button.click();
  });
}
