import { mermaidSecurityConfig } from "./security";

let configured = false;

export async function renderMermaidSvg(id: string, source: string): Promise<string> {
  const mermaid = (await import("mermaid")).default;
  if (!configured) {
    mermaid.initialize(mermaidSecurityConfig);
    configured = true;
  }
  const result = await mermaid.render(safeMermaidId(id), source);
  return result.svg;
}

function safeMermaidId(id: string): string {
  return `onyx-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
