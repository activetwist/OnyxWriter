export type FrontmatterValue =
  | string
  | number
  | boolean
  | null
  | FrontmatterValue[]
  | { [key: string]: FrontmatterValue };

export type Frontmatter = Record<string, FrontmatterValue>;

export type OkfDocumentKind = "concept" | "index" | "log";

export interface OkfDocument {
  path: string;
  kind: OkfDocumentKind;
  frontmatter: Frontmatter;
  body: string;
  raw: string;
  hasFrontmatter: boolean;
}

export type OkfSeverity = "error" | "warning" | "info";

export interface OkfDiagnostic {
  severity: OkfSeverity;
  code: string;
  message: string;
  path?: string;
}

export interface ValidationResult {
  errors: OkfDiagnostic[];
  warnings: OkfDiagnostic[];
  notices: OkfDiagnostic[];
}

export interface OkfLink {
  href: string;
  label: string;
  kind: "bundle-absolute" | "relative" | "external" | "anchor" | "other";
  targetPath?: string;
  broken?: boolean;
}
