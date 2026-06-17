import { normalizeWorkspacePath } from "./tree";

export function defaultConceptContents(type = "Concept", title = "Untitled"): string {
  return `---\ntype: ${type}\ntitle: ${title}\ndescription: \ntags: []\ntimestamp: \n---\n\n# ${title}\n`;
}

export function ensureMarkdownPath(path: string): string {
  const normalized = normalizeWorkspacePath(path);
  return normalized.endsWith(".md") ? normalized : `${normalized}.md`;
}

export function destinationForMove(targetFolder: string, sourcePath: string): string {
  const filename = sourcePath.split("/").pop();
  if (!filename) throw new Error("source path has no file name");
  const folder = normalizeWorkspacePath(targetFolder);
  return folder ? `${folder}/${filename}` : filename;
}
