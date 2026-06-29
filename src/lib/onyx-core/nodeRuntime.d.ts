export class OnyxCoreError extends Error {
  code: string;
  details: Record<string, unknown>;
  constructor(code: string, message: string, details?: Record<string, unknown>);
}

export function bundleInfo(root: string): Promise<Record<string, unknown>>;
export function listBundleTree(root: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
export function validateBundle(root: string): Promise<{ ok: boolean; diagnostics: Array<Record<string, unknown>> }>;
export function readDocument(root: string, relativePath: string): Promise<{ path: string; contents: string; hash: string; mtimeMs: number }>;
export function createDocument(root: string, relativePath: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
export function updateDocument(root: string, relativePath: string, contents: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
export function movePath(root: string, fromPath: string, toPath: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
export function renamePath(root: string, relativePath: string, newName: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
export function deletePath(root: string, relativePath: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
export function refreshManagedIndexes(root: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
export function checkLinks(root: string): Promise<{ ok: boolean; links: Array<Record<string, unknown>>; broken: Array<Record<string, unknown>> }>;
export function graphSummary(root: string): Promise<{ nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> }>;
export function hashText(value: string): string;
