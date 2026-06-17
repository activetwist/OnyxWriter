import { getPath } from "./pathAccess";
import { onyxJsonmProfile } from "./profile";
import {
  appearanceModes,
  derivedTokenKey,
  resolveDefaultMode,
  resolveDerivedColors,
  resolveSemanticColors,
  semanticTokenKey,
  validateJsonmDefinition,
} from "./validator";
import type { CompiledJsonmTheme, JsonmDefinition, JsonmMode, JsonmProfile, JsonmTokenMap, JsonmTokenMapping } from "./types";

export function compileJsonmTheme(
  definition: JsonmDefinition,
  tokenMap: JsonmTokenMap,
  profile: JsonmProfile = onyxJsonmProfile,
  requestedMode?: JsonmMode,
): CompiledJsonmTheme {
  const validation = validateJsonmDefinition(definition, tokenMap, profile);
  if (!validation.valid) throw new Error(`Definition is invalid:\n- ${validation.errors.join("\n- ")}`);
  const defaultMode = resolveDefaultMode(definition, requestedMode);
  const modes = appearanceModes(definition);
  const variables = compileVariables(definition, tokenMap, profile, defaultMode);
  const blocks = [compileBlock(":root", definition, tokenMap, profile, defaultMode)];

  for (const mode of modes) {
    blocks.push(compileBlock(`:root[data-appearance="${mode}"]`, definition, tokenMap, profile, mode));
  }
  if (modes.includes("dark")) {
    blocks.push(`@media (prefers-color-scheme: dark) {\n${indent(compileBlock(':root:not([data-appearance="light"])', definition, tokenMap, profile, "dark"))}\n}`);
  }

  return {
    cssText: blocks.join("\n\n"),
    variables,
    defaultMode,
    appearanceModes: modes,
  };
}

export function compileVariables(
  definition: JsonmDefinition,
  tokenMap: JsonmTokenMap,
  profile: JsonmProfile = onyxJsonmProfile,
  mode: JsonmMode = resolveDefaultMode(definition),
): Record<string, string> {
  return Object.fromEntries(
    tokenMap.mappings.map((mapping) => [rewriteCssVar(mapping.cssVar, profile), compileMappedValue(definition, mapping, profile, mode)]),
  );
}

function compileBlock(selector: string, definition: JsonmDefinition, tokenMap: JsonmTokenMap, profile: JsonmProfile, mode: JsonmMode): string {
  const variables = compileVariables(definition, tokenMap, profile, mode);
  const lines = [`${selector} {`];
  for (const [name, value] of Object.entries(variables)) lines.push(`  ${name}: ${value};`);
  lines.push("}");
  return lines.join("\n");
}

function compileMappedValue(definition: JsonmDefinition, mapping: JsonmTokenMapping, profile: JsonmProfile, mode: JsonmMode): string {
  const semanticKey = semanticTokenKey(mapping.jsonPath);
  if (semanticKey) return resolveSemanticColors(definition, mode)[semanticKey];
  const derivedKey = derivedTokenKey(mapping.jsonPath);
  if (derivedKey) return resolveDerivedColors(definition, mode)[derivedKey];

  const value = getPath(definition, mapping.jsonPath);
  const kind = mapping.kind ?? "value";
  switch (kind) {
    case "integer":
      return String(Number.parseInt(String(value), 10));
    case "float":
      return stringifyFloat(Number(value));
    case "spaceAlias":
      return `var(--${profile.cssVarPrefix}-space-${String(value)})`;
    case "radiusAlias":
      return `var(--${profile.cssVarPrefix}-radius-${String(value)})`;
    case "containerRef":
      return String(getPath(definition, `tokens.layout.containers.${String(value)}`));
    case "fontFamilyPrimary":
      return compileFontStack(definition, mapping.jsonPath);
    default:
      return String(value);
  }
}

function rewriteCssVar(cssVar: string, profile: JsonmProfile): string {
  return cssVar.replace(/^--myron-/, `--${profile.cssVarPrefix}-`);
}

function compileFontStack(definition: JsonmDefinition, familyPath: string): string {
  const family = String(getPath(definition, familyPath) ?? "");
  const fallback = String(getPath(definition, familyPath.replace(/\.family$/, ".fallback")) ?? "");
  const primary = family.includes(" ") && !family.startsWith('"') ? `"${family}"` : family;
  return fallback ? `${primary}, ${fallback}` : primary;
}

function stringifyFloat(value: number): string {
  return Number.isInteger(value) ? `${value}.0` : value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function indent(value: string): string {
  return value
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
}
