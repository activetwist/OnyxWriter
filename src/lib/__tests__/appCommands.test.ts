import { describe, expect, it } from "vitest";
import { commandFromKeyboardEvent, commandFromMenuPayload } from "../appCommands";

describe("app command routing", () => {
  it("maps standard bundle and document shortcuts", () => {
    expect(commandFromKeyboardEvent(key("o", { metaKey: true }), "visual")).toBe("bundle.open");
    expect(commandFromKeyboardEvent(key("O", { metaKey: true, shiftKey: true }), "visual")).toBe("bundle.create");
    expect(commandFromKeyboardEvent(key("n", { ctrlKey: true }), "visual")).toBe("document.new");
    expect(commandFromKeyboardEvent(key("N", { ctrlKey: true, shiftKey: true }), "visual")).toBe("folder.new");
    expect(commandFromKeyboardEvent(key("s", { metaKey: true }), "visual")).toBe("document.save");
    expect(commandFromKeyboardEvent(key("r", { metaKey: true }), "visual")).toBe("bundle.refresh");
  });

  it("keeps tab navigation and close tab routed to app commands", () => {
    expect(commandFromKeyboardEvent(key("Tab", { ctrlKey: true }), "visual")).toBe("tab.next");
    expect(commandFromKeyboardEvent(key("Tab", { ctrlKey: true, shiftKey: true }), "visual")).toBe("tab.previous");
    expect(commandFromKeyboardEvent(key("w", { metaKey: true }), "visual")).toBe("tab.close");
    expect(commandFromKeyboardEvent(key("w", { ctrlKey: true }), "visual")).toBe("tab.close");
  });

  it("maps editor shortcuts only in visual mode", () => {
    expect(commandFromKeyboardEvent(key("b", { metaKey: true }), "visual")).toBe("editor.bold");
    expect(commandFromKeyboardEvent(key("i", { ctrlKey: true }), "visual")).toBe("editor.italic");
    expect(commandFromKeyboardEvent(key("k", { metaKey: true }), "visual")).toBe("editor.link");
    expect(commandFromKeyboardEvent(key("K", { metaKey: true, shiftKey: true }), "visual")).toBe("editor.unlink");
    expect(commandFromKeyboardEvent(key("1", { ctrlKey: true, altKey: true }), "visual")).toBe("editor.heading1");
    expect(commandFromKeyboardEvent(key("b", { metaKey: true }), "raw")).toBeNull();
  });

  it("accepts valid native menu command payloads", () => {
    expect(commandFromMenuPayload({ command: "bundle.open" })).toBe("bundle.open");
    expect(commandFromMenuPayload("editor.bold")).toBe("editor.bold");
    expect(commandFromMenuPayload({ command: "unknown.command" })).toBeNull();
  });
});

function key(value: string, options: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true, ...options });
}
