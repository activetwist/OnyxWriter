#!/usr/bin/env node
import readline from "node:readline";
import {
  bundleInfo,
  checkLinks,
  createDocument,
  deletePath,
  graphSummary,
  importAsset,
  listBundleTree,
  movePath,
  OnyxCoreError,
  readAsset,
  readDocument,
  refreshManagedIndexes,
  renamePath,
  updateDocument,
  validateBundle,
} from "../lib/onyx-core/nodeRuntime.mjs";

const ROOT = parseRoot(process.argv.slice(2));

const tools = [
  tool("onyx.bundle.info", "Return current bundle metadata.", {}),
  tool("onyx.bundle.validate", "Validate all Markdown documents in the bundle.", {}),
  tool("onyx.bundle.tree", "Return the governed bundle tree.", {}),
  tool("onyx.document.read", "Read a Markdown document.", { path: stringSchema("Bundle-relative Markdown path.") }, ["path"]),
  tool("onyx.document.create", "Create a governed OKF Markdown document.", {
    path: stringSchema("Bundle-relative Markdown path."),
    type: stringSchema("OKF type value."),
    title: stringSchema("Document title."),
    contents: stringSchema("Optional Markdown body."),
  }, ["path"]),
  tool("onyx.document.update", "Update a governed OKF Markdown document.", {
    path: stringSchema("Bundle-relative Markdown path."),
    contents: stringSchema("Markdown contents."),
    expectedHash: stringSchema("Optional current sha256 hash precondition."),
    expectedMtimeMs: { type: "number", description: "Optional current modified-time precondition." },
  }, ["path", "contents"]),
  tool("onyx.document.move", "Move a bundle path and repair links/indexes.", {
    from: stringSchema("Current bundle-relative path."),
    to: stringSchema("Target bundle-relative path."),
  }, ["from", "to"]),
  tool("onyx.document.rename", "Rename a bundle path and repair links/indexes.", {
    path: stringSchema("Current bundle-relative path."),
    name: stringSchema("New file or folder name."),
  }, ["path", "name"]),
  tool("onyx.document.delete", "Delete a bundle path and refresh indexes.", { path: stringSchema("Bundle-relative path.") }, ["path"]),
  tool("onyx.asset.import", "Import an image asset into assets/images.", { sourcePath: stringSchema("Absolute source image path.") }, ["sourcePath"]),
  tool("onyx.index.refresh", "Refresh deterministic managed index blocks.", {}),
  tool("onyx.links.check", "Return internal/external/broken link summary.", {}),
  tool("onyx.graph.export", "Return graph nodes and edges.", {}),
];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
let requestQueue = Promise.resolve();
rl.on("line", async (line) => {
  if (!line.trim()) return;
  requestQueue = requestQueue.then(() => handleLine(line));
});

async function handleLine(line) {
  let request;
  try {
    request = JSON.parse(line);
  } catch (error) {
    respond(null, undefined, rpcError(-32700, error instanceof Error ? error.message : String(error)));
    return;
  }
  try {
    const result = await handleRequest(request);
    if (request.id !== undefined) respond(request.id, result);
  } catch (error) {
    if (request.id !== undefined) respond(request.id, undefined, errorToRpc(error));
  }
}

async function handleRequest(request) {
  const { method, params = {} } = request;
  if (method === "initialize") {
    return {
      protocolVersion: params.protocolVersion ?? "2025-11-25",
      serverInfo: { name: "onyxwriter", version: "0.1.0-agent" },
      capabilities: { tools: {}, resources: {} },
    };
  }
  if (method === "notifications/initialized") return {};
  if (method === "tools/list") return { tools };
  if (method === "tools/call") return callTool(params.name, params.arguments ?? {});
  if (method === "resources/list") return listResources();
  if (method === "resources/read") return readResource(params.uri);
  throw rpcError(-32601, `Unsupported MCP method: ${method}`);
}

async function callTool(name, args) {
  const root = requireConfiguredRoot();
  const result =
    name === "onyx.bundle.info" ? await bundleInfo(root)
    : name === "onyx.bundle.validate" ? await validateBundle(root)
    : name === "onyx.bundle.tree" ? await listBundleTree(root)
    : name === "onyx.document.read" ? await readDocument(root, args.path)
    : name === "onyx.document.create" ? await createDocument(root, args.path, { type: args.type, title: args.title, contents: args.contents, caller: "mcp" })
    : name === "onyx.document.update" ? await updateDocument(root, args.path, args.contents, { expectedHash: args.expectedHash, expectedMtimeMs: args.expectedMtimeMs, caller: "mcp" })
    : name === "onyx.document.move" ? await movePath(root, args.from, args.to, { caller: "mcp" })
    : name === "onyx.document.rename" ? await renamePath(root, args.path, args.name, { caller: "mcp" })
    : name === "onyx.document.delete" ? await deletePath(root, args.path, { caller: "mcp" })
    : name === "onyx.asset.import" ? await importAsset(root, args.sourcePath, { caller: "mcp" })
    : name === "onyx.index.refresh" ? await refreshManagedIndexes(root, { caller: "mcp" })
    : name === "onyx.links.check" ? await checkLinks(root)
    : name === "onyx.graph.export" ? await graphSummary(root)
    : undefined;
  if (result === undefined) throw rpcError(-32602, `Unknown tool: ${name}`);
  return textResult(result);
}

async function listResources() {
  const root = requireConfiguredRoot();
  const tree = await listBundleTree(root);
  const resources = [
    resource("onyx://bundle/info", "Bundle info", "application/json"),
    resource("onyx://bundle/tree", "Bundle tree", "application/json"),
    resource("onyx://bundle/validation", "Bundle validation", "application/json"),
    resource("onyx://bundle/graph", "Bundle graph", "application/json"),
  ];
  for (const entry of flattenTree(tree)) {
    if (entry.kind === "file" && entry.path.endsWith(".md")) {
      resources.push(resource(`onyx://document/${encodeURIComponent(entry.path)}`, entry.path, "text/markdown"));
    }
    if (entry.kind === "file" && entry.fileType === "image") {
      resources.push(resource(`onyx://asset/${encodeURIComponent(entry.path)}`, entry.path, "application/octet-stream"));
    }
  }
  return { resources };
}

async function readResource(uri) {
  const root = requireConfiguredRoot();
  if (uri === "onyx://bundle/info") return resourceText(uri, await bundleInfo(root));
  if (uri === "onyx://bundle/tree") return resourceText(uri, await listBundleTree(root));
  if (uri === "onyx://bundle/validation") return resourceText(uri, await validateBundle(root));
  if (uri === "onyx://bundle/graph") return resourceText(uri, await graphSummary(root));
  if (uri?.startsWith("onyx://document/")) {
    const document = await readDocument(root, decodeURIComponent(uri.slice("onyx://document/".length)));
    return { contents: [{ uri, mimeType: "text/markdown", text: document.contents }] };
  }
  if (uri?.startsWith("onyx://asset/")) {
    const asset = await readAsset(root, decodeURIComponent(uri.slice("onyx://asset/".length)));
    return { contents: [{ uri, mimeType: asset.mimeType, blob: Buffer.from(asset.data).toString("base64") }] };
  }
  throw rpcError(-32602, `Unknown resource: ${uri}`);
}

function parseRoot(argv) {
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--root") return argv[index + 1];
    if (argv[index].startsWith("--root=")) return argv[index].slice("--root=".length);
  }
  return process.env.ONYX_BUNDLE_ROOT ?? "";
}

function requireConfiguredRoot() {
  if (!ROOT) throw new OnyxCoreError("root_required", "Launch onyx-mcp with --root /path/to/bundle or ONYX_BUNDLE_ROOT.");
  return ROOT;
}

function tool(name, description, properties, required = []) {
  return {
    name,
    description,
    inputSchema: {
      type: "object",
      properties,
      required,
      additionalProperties: false,
    },
  };
}

function stringSchema(description) {
  return { type: "string", description };
}

function resource(uri, name, mimeType) {
  return { uri, name, mimeType };
}

function textResult(value) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function resourceText(uri, value) {
  return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(value, null, 2) }] };
}

function flattenTree(tree) {
  const entries = [];
  const visit = (entry) => {
    if (!entry) return;
    entries.push(entry);
    for (const child of entry.children ?? []) visit(child);
  };
  visit(tree);
  return entries;
}

function respond(id, result, error) {
  const response = { jsonrpc: "2.0", id };
  if (error) response.error = error;
  else response.result = result ?? {};
  process.stdout.write(`${JSON.stringify(response)}\n`);
}

function rpcError(code, message, data) {
  const error = new Error(message);
  error.rpc = { code, message, data };
  return error;
}

function errorToRpc(error) {
  if (error?.rpc) return error.rpc;
  if (error instanceof OnyxCoreError) return { code: -32000, message: error.message, data: { code: error.code, ...error.details } };
  return { code: -32000, message: error instanceof Error ? error.message : String(error) };
}
