import { contrastRatio, parseRgb } from "./colorMath";
import { getPath, isRecord, pathExists, recordAt } from "./pathAccess";
import { onyxJsonmProfile } from "./profile";
import type { JsonmDefinition, JsonmMode, JsonmProfile, JsonmTokenMap, JsonmValidationResult } from "./types";

const ROLE_NAMES = ["headlines", "subtitles", "body", "ui", "micro"] as const;
const KNOWN_FONT_ROLE_EXTENSIONS = new Set(["tracking", "textTransform", "fontVariationSettings", "fontFeatureSettings"]);
const REQUIRED_SEMANTIC_COLORS = [
  "bg",
  "surface",
  "surfaceAlt",
  "text",
  "textMuted",
  "border",
  "borderStrong",
  "focus",
  "link",
  "linkHover",
  "accent",
  "accentText",
  "danger",
  "dangerText",
  "success",
  "successText",
  "warning",
  "warningText",
];
const CONTRAST_PAIRS: Array<[string, string, number]> = [
  ["text", "bg", 4.5],
  ["textMuted", "bg", 3.0],
  ["accentText", "accent", 4.5],
  ["dangerText", "danger", 4.5],
  ["successText", "success", 4.5],
  ["warningText", "warning", 4.5],
];

export function parseJsonm(text: string): JsonmDefinition {
  return JSON.parse(text) as JsonmDefinition;
}

export function validateJsonmDefinition(
  definition: unknown,
  tokenMap: JsonmTokenMap,
  profile: JsonmProfile = onyxJsonmProfile,
): JsonmValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(definition)) {
    return { valid: false, errors: ["JSONM root must be an object."], warnings };
  }

  expect(definition.schemaVersion === "1", 'schemaVersion must equal "1".', errors);
  expect(definition.format === "JSONM", 'format must equal "JSONM".', errors);
  expect(["baseline", "named", "preset"].includes(String(definition.kind ?? "")), "kind must be baseline, named, or preset.", errors);
  expect(typeof definition.id === "string" && definition.id.trim() !== "", "id is required.", errors);
  expect(typeof definition.name === "string" && definition.name.trim() !== "", "name is required.", errors);
  expect(typeof definition.description === "string", "description must be a string.", errors);

  validateCorpus(definition, profile, errors);
  validateSettings(definition, errors, warnings);
  validateSemanticColors(definition, errors);
  validateTokenMapPaths(definition, tokenMap, errors);
  validateScales(definition, errors);
  validateLayout(definition, errors);
  validateFontRoles(definition, profile, errors, warnings);
  validateContrast(definition, errors);

  return { valid: errors.length === 0, errors, warnings };
}

export function appearanceModes(definition: unknown): JsonmMode[] {
  const modes = getPath(definition, "settings.appearanceModes");
  if (!Array.isArray(modes)) return [];
  return modes.filter((mode): mode is JsonmMode => mode === "light" || mode === "dark");
}

export function resolveDefaultMode(definition: unknown, requestedMode?: string | null): JsonmMode {
  const modes = appearanceModes(definition);
  if ((requestedMode === "light" || requestedMode === "dark") && modes.includes(requestedMode)) return requestedMode;
  const defaultMode = getPath(definition, "settings.defaultMode");
  if ((defaultMode === "light" || defaultMode === "dark") && modes.includes(defaultMode)) return defaultMode;
  return modes[0] ?? "light";
}

export function resolveSemanticColors(definition: unknown, requestedMode?: string | null): Record<string, string> {
  const semantic = getPath(definition, "tokens.color.semantic");
  if (!isRecord(semantic)) throw new Error("tokens.color.semantic must be an object.");
  if (isFlatSemanticColorMap(semantic)) return stringRecord(semantic);
  const mode = resolveDefaultMode(definition, requestedMode);
  const modeColors = semantic[mode];
  if (!isRecord(modeColors)) throw new Error(`tokens.color.semantic.${mode} must be an object.`);
  return stringRecord(modeColors);
}

export function resolveDerivedColors(definition: unknown, requestedMode?: string | null): Record<string, string> {
  const existing = stringRecord(recordAt(definition, "tokens.color.derived") ?? {});
  const semantic = resolveSemanticColors(definition, requestedMode);
  return { ...generateDerivedColors(semantic, existing), ...existing };
}

export function semanticTokenKey(path: string): string | null {
  const prefix = "tokens.color.semantic.";
  if (!path.startsWith(prefix)) return null;
  const key = path.slice(prefix.length);
  return key && !key.includes(".") ? key : null;
}

export function derivedTokenKey(path: string): string | null {
  const prefix = "tokens.color.derived.";
  if (!path.startsWith(prefix)) return null;
  const key = path.slice(prefix.length);
  return key && !key.includes(".") ? key : null;
}

export function jsonmPathExists(definition: unknown, path: string): boolean {
  const semanticKey = semanticTokenKey(path);
  if (semanticKey) {
    try {
      return Object.hasOwn(resolveSemanticColors(definition), semanticKey);
    } catch {
      return false;
    }
  }
  const derivedKey = derivedTokenKey(path);
  if (derivedKey) {
    try {
      return Object.hasOwn(resolveDerivedColors(definition), derivedKey);
    } catch {
      return false;
    }
  }
  return pathExists(definition, path);
}

function validateCorpus(definition: Record<string, unknown>, profile: JsonmProfile, errors: string[]): void {
  const corpus = definition.corpus;
  expect(isRecord(corpus), "corpus must be an object.", errors);
  if (!isRecord(corpus)) return;
  expect(profile.allowedCorpusIds.includes(String(corpus.id ?? "")), `corpus.id must be one of: ${profile.allowedCorpusIds.join(", ")}.`, errors);
  expect(typeof corpus.version === "string" && corpus.version.trim() !== "", "corpus.version is required.", errors);
  expect(typeof corpus.canonical === "boolean", "corpus.canonical must be a boolean.", errors);
  expect(Array.isArray(corpus.sourceFiles) && corpus.sourceFiles.length > 0, "corpus.sourceFiles must list canonical source files.", errors);
}

function validateSettings(definition: Record<string, unknown>, errors: string[], warnings: string[]): void {
  const settings = definition.settings;
  expect(isRecord(settings), "settings must be an object.", errors);
  if (!isRecord(settings)) return;
  expect(settings.wcagPolicy === "AA" || settings.wcagPolicy === "AAA", "settings.wcagPolicy must be AA or AAA.", errors);
  const modes = appearanceModes(definition);
  expect(modes.length > 0, "settings.appearanceModes must contain at least one mode.", errors);
  expect(modes.length === (settings.appearanceModes as unknown[] | undefined)?.length, "settings.appearanceModes may only contain light or dark.", errors);
  const defaultMode = settings.defaultMode;
  if (defaultMode === "light" || defaultMode === "dark") {
    expect(modes.includes(defaultMode), "settings.defaultMode must be declared in settings.appearanceModes.", errors);
  } else {
    errors.push("settings.defaultMode is required.");
  }
  expect(typeof settings.systemFollow === "boolean", "settings.systemFollow must be a boolean.", errors);
  if (modes.length === 1 && defaultMode === undefined) {
    warnings.push("Legacy single-mode definition is missing settings.defaultMode.");
  }
}

function validateSemanticColors(definition: Record<string, unknown>, errors: string[]): void {
  const semantic = getPath(definition, "tokens.color.semantic");
  expect(isRecord(semantic), "tokens.color.semantic must be an object.", errors);
  if (!isRecord(semantic)) return;
  const modes = appearanceModes(definition);
  if (modes.length > 1 && isFlatSemanticColorMap(semantic)) {
    errors.push("tokens.color.semantic must be mode-keyed when multiple appearance modes are declared.");
  }
  const modeList = isFlatSemanticColorMap(semantic) ? [resolveDefaultMode(definition)] : modes;
  for (const mode of modeList) {
    let colors: Record<string, string>;
    try {
      colors = resolveSemanticColors(definition, mode);
    } catch {
      errors.push(`tokens.color.semantic.${mode} must be present when ${mode} is declared.`);
      continue;
    }
    for (const key of REQUIRED_SEMANTIC_COLORS) {
      if (!colors[key]) errors.push(`tokens.color.semantic.${mode}.${key} is required.`);
    }
  }
}

function validateTokenMapPaths(definition: Record<string, unknown>, tokenMap: JsonmTokenMap, errors: string[]): void {
  expect(tokenMap.corpusId === "activetwist-design-corpus/v1", "tokenMap.corpusId must match JSONM v1 corpus.", errors);
  expect(tokenMap.schemaVersion === "1", 'tokenMap.schemaVersion must equal "1".', errors);
  for (const mapping of tokenMap.mappings ?? []) {
    if (!mapping.jsonPath) {
      errors.push("Token map entry is missing jsonPath.");
    } else if (!jsonmPathExists(definition, mapping.jsonPath)) {
      errors.push(`Missing required JSONM path: ${mapping.jsonPath}`);
    }
  }
  for (const mapping of tokenMap.specialMappings ?? []) {
    if (mapping.jsonPath && !jsonmPathExists(definition, mapping.jsonPath)) errors.push(`Missing required JSONM path: ${mapping.jsonPath}`);
  }
}

function validateScales(definition: Record<string, unknown>, errors: string[]): void {
  validateLengthGroup(definition, "tokens.space.scale", 4, errors);
  validateAliasRefs(definition, "tokens.space.scale", "tokens.space.aliases", errors);
  validateLengthGroup(definition, "tokens.size.control", 4, errors);
  validateLengthGroup(definition, "tokens.size.icon", 4, errors);
  validatePxPath(definition, "tokens.size.hitTargetMin", 4, errors);
  validateLengthGroup(definition, "tokens.radius.scale", 4, errors);
  validateAliasRefs(definition, "tokens.radius.scale", "tokens.radius.aliases", errors);
  validatePxPath(definition, "tokens.radius.pill", 1, errors);
  validatePxPath(definition, "tokens.border.hairline", 1, errors);
  validatePxPath(definition, "tokens.border.thin", 1, errors);
  validateLengthGroup(definition, "tokens.typography.sizes", 1, errors);
  validatePositiveNumberGroup(definition, "tokens.typography.lineHeights", errors);
  validateIntegerGroup(definition, "tokens.typography.weights", errors);
  validateLengthGroup(definition, "tokens.layout.containers", 8, errors);
  validateLengthGroup(definition, "tokens.layout.gutters", 8, errors);
  validateLengthGroup(definition, "tokens.layout.breakpoints", 8, errors);
  validatePxPath(definition, "tokens.focus.ringWidth", 1, errors);
  validatePxPath(definition, "tokens.focus.ringOffset", 1, errors);
  validateIntegerGroup(definition, "tokens.zIndex", errors);
}

function validateLayout(definition: Record<string, unknown>, errors: string[]): void {
  const outline = getPath(definition, "tokens.focus.outlineStyle");
  expect(["solid", "dashed", "dotted", "double"].includes(String(outline)), "tokens.focus.outlineStyle must be a supported CSS outline style.", errors);
  const widthModes = recordAt(definition, "tokens.layout.widthModes");
  expect(Boolean(widthModes), "tokens.layout.widthModes must be an object.", errors);
  if (!widthModes) return;
  for (const scope of ["page", "section"]) {
    const intent = widthModes[scope];
    if (!isRecord(intent)) {
      errors.push(`tokens.layout.widthModes.${scope} must be an object.`);
      continue;
    }
    expect(["contained", "full-bleed", "fixed", "mixed"].includes(String(intent.mode ?? "")), `tokens.layout.widthModes.${scope}.mode must be contained, full-bleed, fixed, or mixed.`, errors);
    expect(["sm", "md", "lg"].includes(String(intent.container ?? "")), `tokens.layout.widthModes.${scope}.container must reference sm, md, or lg.`, errors);
  }
}

function validateFontRoles(definition: Record<string, unknown>, profile: JsonmProfile, errors: string[], warnings: string[]): void {
  const url = getPath(definition, "fontRoles.googleFontsCss2Url");
  if (typeof url !== "string") errors.push("fontRoles.googleFontsCss2Url must be a string.");
  if (typeof url === "string" && url && !isSafeUrl(url)) errors.push("fontRoles.googleFontsCss2Url must be a valid URL.");
  for (const role of ROLE_NAMES) {
    const roleValue = recordAt(definition, `fontRoles.roles.${role}`);
    if (!roleValue) {
      errors.push(`fontRoles.roles.${role} is required.`);
      continue;
    }
    expect(typeof roleValue.family === "string" && roleValue.family.trim() !== "", `fontRoles.roles.${role}.family must not be empty.`, errors);
    expect(typeof roleValue.fallback === "string" && roleValue.fallback.trim() !== "", `fontRoles.roles.${role}.fallback must not be empty.`, errors);
    expect(Number.isInteger(roleValue.weight), `fontRoles.roles.${role}.weight must be an integer.`, errors);
    expect(roleValue.style === "normal" || roleValue.style === "italic", `fontRoles.roles.${role}.style must be normal or italic.`, errors);
    validatePxValue(String(roleValue.size ?? ""), 1, `fontRoles.roles.${role}.size`, errors);
    for (const key of Object.keys(roleValue)) {
      const known = ["family", "fallback", "weight", "style", "size"].includes(key) || KNOWN_FONT_ROLE_EXTENSIONS.has(key);
      if (!known || (!profile.allowKnownFontRoleExtensions && KNOWN_FONT_ROLE_EXTENSIONS.has(key))) {
        errors.push(`fontRoles.roles.${role}.${key} is not supported.`);
      } else if (KNOWN_FONT_ROLE_EXTENSIONS.has(key)) {
        warnings.push(`fontRoles.roles.${role}.${key} is accepted by compatibility profile but not mapped.`);
      }
    }
  }
}

function validateContrast(definition: Record<string, unknown>, errors: string[]): void {
  const modes = appearanceModes(definition);
  for (const mode of modes.length ? modes : [resolveDefaultMode(definition)]) {
    let colors: Record<string, string>;
    try {
      colors = resolveSemanticColors(definition, mode);
    } catch {
      continue;
    }
    for (const [fgKey, bgKey, minimum] of CONTRAST_PAIRS) {
      const fg = parseRgb(colors[fgKey] ?? "");
      const bg = parseRgb(colors[bgKey] ?? "");
      if (!fg || !bg) continue;
      const ratio = contrastRatio(fg, bg);
      if (ratio + 0.0001 < minimum) {
        errors.push(`tokens.color.semantic.${mode} ${fgKey}/${bgKey} contrast ${ratio.toFixed(2)} must be >= ${minimum}.`);
      }
    }
  }
}

function validateLengthGroup(definition: Record<string, unknown>, path: string, step: number, errors: string[]): void {
  const group = recordAt(definition, path);
  if (!group) {
    errors.push(`${path} must be an object.`);
    return;
  }
  for (const [name, value] of Object.entries(group)) validatePxValue(String(value), step, `${path}.${name}`, errors);
}

function validateAliasRefs(definition: Record<string, unknown>, scalePath: string, aliasPath: string, errors: string[]): void {
  const scale = recordAt(definition, scalePath);
  const aliases = recordAt(definition, aliasPath);
  if (!scale || !aliases) return;
  for (const [name, value] of Object.entries(aliases)) {
    if (!Object.hasOwn(scale, String(value))) errors.push(`${aliasPath}.${name} references unknown scale key \`${String(value)}\`.`);
  }
}

function validatePxPath(definition: Record<string, unknown>, path: string, step: number, errors: string[]): void {
  if (!pathExists(definition, path)) {
    errors.push(`Missing required JSONM path: ${path}`);
    return;
  }
  validatePxValue(String(getPath(definition, path)), step, path, errors);
}

function validatePxValue(value: string, step: number, label: string, errors: string[]): void {
  if (!/^-?\d+(?:\.\d+)?px$/.test(value)) {
    errors.push(`${label} must be a px value.`);
    return;
  }
  const number = Number(value.slice(0, -2));
  if (step > 1 && Math.abs(number % step) > 0.00001) errors.push(`${label} must follow the ${step}px invariant.`);
}

function validatePositiveNumberGroup(definition: Record<string, unknown>, path: string, errors: string[]): void {
  const group = recordAt(definition, path);
  if (!group) {
    errors.push(`${path} must be an object.`);
    return;
  }
  for (const [name, value] of Object.entries(group)) {
    if (typeof value !== "number" || value <= 0) errors.push(`${path}.${name} must be a positive number.`);
  }
}

function validateIntegerGroup(definition: Record<string, unknown>, path: string, errors: string[]): void {
  const group = recordAt(definition, path);
  if (!group) {
    errors.push(`${path} must be an object.`);
    return;
  }
  for (const [name, value] of Object.entries(group)) {
    if (!Number.isInteger(value)) errors.push(`${path}.${name} must be an integer.`);
  }
}

function isFlatSemanticColorMap(value: Record<string, unknown>): boolean {
  return !isRecord(value.light) && !isRecord(value.dark);
}

function stringRecord(value: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item)]));
}

function generateDerivedColors(semantic: Record<string, string>, fallback: Record<string, string>): Record<string, string> {
  return {
    linkSurfaceSubtle: rgbaFallback(semantic.link, 0.06, fallback.linkSurfaceSubtle),
    linkSurfaceSoft: rgbaFallback(semantic.link, 0.1, fallback.linkSurfaceSoft),
    linkSurfaceSoftStrong: rgbaFallback(semantic.link, 0.14, fallback.linkSurfaceSoftStrong),
    linkBorderSoft: rgbaFallback(semantic.link, 0.3, fallback.linkBorderSoft),
    successSurfaceSubtle: rgbaFallback(semantic.success, 0.06, fallback.successSurfaceSubtle),
    successSurfaceSoft: rgbaFallback(semantic.success, 0.1, fallback.successSurfaceSoft),
    successSurfaceSoftStrong: rgbaFallback(semantic.success, 0.14, fallback.successSurfaceSoftStrong),
    successBorderSoft: rgbaFallback(semantic.success, 0.3, fallback.successBorderSoft),
    successBorderSoftStrong: rgbaFallback(semantic.success, 0.4, fallback.successBorderSoftStrong),
    warningSurfaceSoft: rgbaFallback(semantic.warning, 0.1, fallback.warningSurfaceSoft),
    warningSurfaceSoftStrong: rgbaFallback(semantic.warning, 0.14, fallback.warningSurfaceSoftStrong),
    warningBorderSoft: rgbaFallback(semantic.warning, 0.3, fallback.warningBorderSoft),
    warningBorderSoftStrong: rgbaFallback(semantic.warning, 0.4, fallback.warningBorderSoftStrong),
    dangerSurfaceSubtle: rgbaFallback(semantic.danger, 0.06, fallback.dangerSurfaceSubtle),
    dangerSurfaceSoft: rgbaFallback(semantic.danger, 0.1, fallback.dangerSurfaceSoft),
    dangerSurfaceSoftStrong: rgbaFallback(semantic.danger, 0.14, fallback.dangerSurfaceSoftStrong),
    dangerBorderSoft: rgbaFallback(semantic.danger, 0.3, fallback.dangerBorderSoft),
    dangerBorderSoftStrong: rgbaFallback(semantic.danger, 0.4, fallback.dangerBorderSoftStrong),
    accentSurfaceSubtlest: rgbaFallback(semantic.accent, 0.04, fallback.accentSurfaceSubtlest),
    accentSurfaceSubtle: rgbaFallback(semantic.accent, 0.06, fallback.accentSurfaceSubtle),
    accentSurfaceSoft: rgbaFallback(semantic.accent, 0.1, fallback.accentSurfaceSoft),
    accentSurfaceEmphasis: rgbaFallback(semantic.accent, 0.14, fallback.accentSurfaceEmphasis),
    accentBorderSoft: rgbaFallback(semantic.accent, 0.3, fallback.accentBorderSoft),
    textOverlay: fallback.textOverlay ?? rgbaFallback(semantic.text, 0.6, ""),
    dangerHover: fallback.dangerHover ?? semantic.danger,
  };
}

function rgbaFallback(color: string | undefined, alpha: number, fallback = ""): string {
  const rgb = parseRgb(color ?? "");
  return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(2)})` : fallback;
}

function isSafeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function expect(condition: boolean, message: string, errors: string[]): void {
  if (!condition) errors.push(message);
}

