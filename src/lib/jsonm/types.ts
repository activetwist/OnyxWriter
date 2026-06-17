export type JsonmMode = "light" | "dark";
export type JsonmKind = "baseline" | "named" | "preset";

export interface JsonmProfile {
  allowedCorpusIds: string[];
  cssVarPrefix: string;
  allowKnownFontRoleExtensions: boolean;
}

export interface JsonmDefinition {
  schemaVersion: string;
  format: string;
  kind: JsonmKind;
  id: string;
  name: string;
  description: string;
  corpus: {
    id: string;
    version: string;
    canonical: boolean;
    sourceFiles: string[];
  };
  settings: {
    wcagPolicy: "AA" | "AAA";
    appearanceModes: JsonmMode[];
    defaultMode: JsonmMode;
    systemFollow: boolean;
  };
  tokens: Record<string, unknown>;
  fontRoles: {
    googleFontsCss2Url: string;
    roles: Record<string, JsonmFontRole>;
  };
}

export interface JsonmFontRole {
  family: string;
  fallback: string;
  weight: number;
  style: "normal" | "italic";
  size: string;
  tracking?: string;
  textTransform?: string;
  fontVariationSettings?: string;
  fontFeatureSettings?: string;
}

export interface JsonmTokenMap {
  corpusId: string;
  schemaVersion: string;
  mappings: JsonmTokenMapping[];
  specialMappings?: Array<{ type: string; jsonPath: string; sourceFile?: string }>;
}

export type JsonmMappingKind =
  | "value"
  | "integer"
  | "float"
  | "spaceAlias"
  | "radiusAlias"
  | "containerRef"
  | "fontFamilyPrimary";

export interface JsonmTokenMapping {
  cssVar: string;
  jsonPath: string;
  sourceFile?: string;
  kind?: JsonmMappingKind;
}

export interface JsonmValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CompiledJsonmTheme {
  cssText: string;
  variables: Record<string, string>;
  defaultMode: JsonmMode;
  appearanceModes: JsonmMode[];
}
