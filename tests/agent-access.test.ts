import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error The governed Node runtime is intentionally .mjs so CLI/MCP can run without a TypeScript loader.
import { checkLinks, createDocument, movePath, OnyxCoreError, readDocument, refreshManagedIndexes, updateDocument, validateBundle } from "../src/lib/onyx-core/nodeRuntime.mjs";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("governed Onyx agent access", () => {
  it("creates, validates, updates, moves, repairs links, and refreshes indexes", async () => {
    const root = await tempBundle();
    await createDocument(root, "alpha.md", { title: "Alpha", type: "note", caller: "test" });
    await createDocument(root, "beta.md", {
      title: "Beta",
      type: "note",
      contents: "---\ntype: note\ntitle: Beta\n---\n\n# Beta\n\nSee [Alpha](alpha.md).\n",
      caller: "test",
    });

    const validation = await validateBundle(root);
    expect(validation.ok).toBe(true);

    const alpha = await readDocument(root, "alpha.md");
    await expect(updateDocument(root, "alpha.md", "# Broken stale write\n", { expectedHash: "bad", caller: "test" })).rejects.toMatchObject({
      code: "conflict",
    } satisfies Partial<OnyxCoreError>);
    await updateDocument(root, "alpha.md", "# Alpha\n\nUpdated.\n", { expectedHash: alpha.hash, caller: "test" });

    await movePath(root, "alpha.md", "notes/alpha.md", { caller: "test" });

    const beta = await readFile(path.join(root, "beta.md"), "utf8");
    expect(beta).toContain("[Alpha](notes/alpha.md)");
    const links = await checkLinks(root);
    expect(links.ok).toBe(true);

    await refreshManagedIndexes(root, { caller: "test" });
    const index = await readFile(path.join(root, "index.md"), "utf8");
    expect(index).toContain("<!-- onyxwriter:index:start -->");
    expect(index).toContain("notes/index.md");
  });

  it("exposes deterministic JSON through the CLI", async () => {
    const root = await tempBundle();
    const result = await runNode(["bin/onyx.mjs", "doc", "create", "--root", root, "--path", "notes/cli.md", "--title", "CLI", "--type", "note", "--json"]);
    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);

    const validate = await runNode(["bin/onyx.mjs", "bundle", "validate", "--root", root, "--json"]);
    expect(validate.status).toBe(0);
    expect(JSON.parse(validate.stdout).ok).toBe(true);
  });

  it("serves MCP stdio tool calls without opening a server", async () => {
    const root = await tempBundle();
    const proc = spawn(process.execPath, ["src/mcp/onyx-mcp.mjs", "--root", root], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });
    const responses: unknown[] = [];
    proc.stdout.setEncoding("utf8");
    proc.stdout.on("data", (chunk) => {
      for (const line of chunk.split("\n").filter(Boolean)) responses.push(JSON.parse(line));
    });

    proc.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })}\n`);
    proc.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "onyx.document.create", arguments: { path: "mcp.md", type: "note", title: "MCP" } } })}\n`);
    proc.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "onyx.bundle.validate", arguments: {} } })}\n`);

    await waitFor(() => responses.length >= 3);
    proc.kill();

    expect(responses).toHaveLength(3);
    const createPayload = parseMcpText(responses[1]);
    const validatePayload = parseMcpText(responses[2]);
    expect(JSON.stringify(createPayload)).toContain("mcp.md");
    expect(validatePayload.ok).toBe(true);
  });
});

async function tempBundle(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "onyx-agent-"));
  roots.push(root);
  await writeFile(path.join(root, "index.md"), "---\nokf_version: \"0.1\"\n---\n\n# Index\n", "utf8");
  return root;
}

async function runNode(args: string[]): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, args, { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    proc.stdout.setEncoding("utf8");
    proc.stderr.setEncoding("utf8");
    proc.stdout.on("data", (chunk) => (stdout += chunk));
    proc.stderr.on("data", (chunk) => (stderr += chunk));
    proc.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

async function waitFor(predicate: () => boolean): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > 3000) throw new Error("Timed out waiting for MCP response.");
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

function parseMcpText(response: unknown): Record<string, unknown> {
  const result = (response as { result?: { content?: Array<{ text?: string }> } }).result;
  return JSON.parse(result?.content?.[0]?.text ?? "{}") as Record<string, unknown>;
}
