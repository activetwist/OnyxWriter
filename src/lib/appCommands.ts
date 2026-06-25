export type AppCommand =
  | "bundle.open"
  | "bundle.create"
  | "bundle.refresh"
  | "document.new"
  | "document.openRecent"
  | "document.share"
  | "document.export"
  | "folder.new"
  | "item.rename"
  | "item.delete"
  | "document.save"
  | "tab.close"
  | "tab.next"
  | "tab.previous"
  | "mode.visual"
  | "mode.raw"
  | "mode.toggle"
  | "graph.toggle"
  | "explorer.toggle"
  | "validation.toggle"
  | "settings.open"
  | EditorCommand;

export type EditorCommand =
  | "editor.paragraph"
  | "editor.heading1"
  | "editor.heading2"
  | "editor.heading3"
  | "editor.bold"
  | "editor.italic"
  | "editor.strike"
  | "editor.code"
  | "editor.bulletList"
  | "editor.orderedList"
  | "editor.link"
  | "editor.unlink"
  | "editor.table"
  | "editor.image"
  | "editor.undo"
  | "editor.redo";

export interface EditorCommandRequest {
  id: number;
  command: EditorCommand;
}

export interface MenuCommandPayload {
  command?: string;
}

export function isAppCommand(value: string): value is AppCommand {
  return APP_COMMANDS.has(value as AppCommand);
}

export function isEditorCommand(command: AppCommand): command is EditorCommand {
  return command.startsWith("editor.");
}

export function commandFromMenuPayload(payload: unknown): AppCommand | null {
  const command = typeof payload === "string" ? payload : isRecord(payload) ? payload.command : null;
  return typeof command === "string" && isAppCommand(command) ? command : null;
}

export function commandFromKeyboardEvent(event: KeyboardEvent, mode: "visual" | "raw"): AppCommand | null {
  if (event.defaultPrevented) return null;
  const key = normalizedKey(event);
  const primary = event.metaKey || event.ctrlKey;

  if (key === "Tab" && event.ctrlKey && !event.altKey && !event.metaKey) {
    return event.shiftKey ? "tab.previous" : "tab.next";
  }

  if (primary && !event.altKey) {
    if (key === "o" && !event.shiftKey) return "bundle.open";
    if (key === "o" && event.shiftKey) return "bundle.create";
    if (key === "n" && !event.shiftKey) return "document.new";
    if (key === "n" && event.shiftKey) return "folder.new";
    if (key === "s" && !event.shiftKey) return "document.save";
    if (key === "r" && !event.shiftKey) return "bundle.refresh";
    if (key === "w" && !event.shiftKey) return "tab.close";
    if (key === "," && !event.shiftKey) return "settings.open";
    if (key === "`" && !event.shiftKey) return "mode.toggle";
    if (key === "g" && event.shiftKey) return "graph.toggle";
    if (key === "e" && event.shiftKey) return "explorer.toggle";
    if (key === "m" && event.shiftKey) return "validation.toggle";
  }

  if (mode !== "visual") return null;

  if (primary && !event.altKey) {
    if (key === "b" && !event.shiftKey) return "editor.bold";
    if (key === "i" && !event.shiftKey) return "editor.italic";
    if (key === "x" && event.shiftKey) return "editor.strike";
    if (key === "k" && !event.shiftKey) return "editor.link";
    if (key === "k" && event.shiftKey) return "editor.unlink";
    if (key === "7" && event.shiftKey) return "editor.orderedList";
    if (key === "8" && event.shiftKey) return "editor.bulletList";
    if (key === "z" && !event.shiftKey) return "editor.undo";
    if ((key === "z" && event.shiftKey) || key === "y") return "editor.redo";
  }

  if (primary && event.altKey && !event.shiftKey) {
    if (key === "0") return "editor.paragraph";
    if (key === "1") return "editor.heading1";
    if (key === "2") return "editor.heading2";
    if (key === "3") return "editor.heading3";
  }

  return null;
}

export function shouldPreventDefaultForCommand(command: AppCommand): boolean {
  return Boolean(command);
}

function normalizedKey(event: KeyboardEvent): string {
  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}

function isRecord(value: unknown): value is MenuCommandPayload {
  return typeof value === "object" && value !== null;
}

const APP_COMMANDS = new Set<AppCommand>([
  "bundle.open",
  "bundle.create",
  "bundle.refresh",
  "document.new",
  "document.openRecent",
  "document.share",
  "document.export",
  "folder.new",
  "item.rename",
  "item.delete",
  "document.save",
  "tab.close",
  "tab.next",
  "tab.previous",
  "mode.visual",
  "mode.raw",
  "mode.toggle",
  "graph.toggle",
  "explorer.toggle",
  "validation.toggle",
  "settings.open",
  "editor.paragraph",
  "editor.heading1",
  "editor.heading2",
  "editor.heading3",
  "editor.bold",
  "editor.italic",
  "editor.strike",
  "editor.code",
  "editor.bulletList",
  "editor.orderedList",
  "editor.link",
  "editor.unlink",
  "editor.table",
  "editor.image",
  "editor.undo",
  "editor.redo",
]);
