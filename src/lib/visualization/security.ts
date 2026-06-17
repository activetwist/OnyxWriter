export const mermaidSecurityConfig = {
  startOnLoad: false,
  securityLevel: "strict",
  htmlLabels: false,
  deterministicIds: true,
  deterministicIDSeed: "onyxwriter",
} as const;

export function isAllowedMermaidConfigKey(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(mermaidSecurityConfig, key);
}
