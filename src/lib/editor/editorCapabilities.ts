import { tiptapExtensions } from "./tiptap";

export function registeredEditorExtensionNames(): string[] {
  return tiptapExtensions.map((extension) => extension.name);
}

export function hasEditorExtension(name: string): boolean {
  return registeredEditorExtensionNames().includes(name);
}
