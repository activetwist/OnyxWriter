import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { X } from "lucide-react";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { DesignSystemSettings } from "./DesignSystemSettings";
import { DrawerSettings } from "./DrawerSettings";
import { DrawerMutationDialog } from "./DrawerMutationDialog";
import { DocumentTabs } from "./DocumentTabs";
import { EditorToolbar } from "./EditorToolbar";
import { ProjectBundleDialog } from "./ProjectBundleDialog";
import { SettingsDialog, type SettingsTab } from "./SettingsDialog";
import { UpdateSettings } from "./UpdateSettings";
import { ValidationPanel } from "./ValidationPanel";
import { WorkspaceLauncher } from "./WorkspaceLauncher";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import {
  createWorkspaceFolder,
  createWorkspaceMarkdownFile,
  deleteWorkspacePath,
  directoryHasEntries,
  initializeWorkspace,
  inspectWorkspaceFolder,
  isTauriRuntime,
  listWorkspace,
  moveWorkspacePath,
  readWorkspaceFile,
  renameWorkspacePath,
  selectAndImportDrawerImage,
  selectWorkspaceDirectory,
  writeWorkspaceFile,
} from "../lib/workspace/api";
import { defaultConceptContents, ensureMarkdownPath } from "../lib/workspace/operations";
import { SEED_DRAWER_FILES, SEED_DRAWER_TITLE } from "../lib/workspace/seedDrawer";
import { ancestorFolderPaths, linkableMarkdownPaths, markdownPaths, normalizeWorkspacePath } from "../lib/workspace/tree";
import type { WorkspaceEntry } from "../lib/workspace/types";
import { defaultIndexContent, generateDirectoryIndexBlock, indexableDirectoryPaths, indexPathForDirectory, updateManagedIndexContent } from "../lib/workspace/indexManager";
import { repairMovedLinksFrom } from "../lib/workspace/linkRepair";
import { findWorkspaceEntry, mutationStatus, planDelete, planMove, planRename, remapSelectedPath, type DrawerMutationPlan } from "../lib/workspace/mutations";
import { forgetRecentDrawer, loadRecentDrawers, rememberDrawer, type RecentWorkspace } from "../lib/workspace/recentWorkspaces";
import { buildDrawerGraph } from "../lib/workspace/graph";
import { assessWorkspaceFolder, joinHostPath, type ProjectRootAssessment } from "../lib/workspace/projectDetection";
import { analyzeMarkdownCapabilities } from "../lib/editor/markdownCapabilities";
import {
  classifyLink,
  isOpenableExternalHref,
  normalizeOpenableExternalHref,
  parseOkfDocument,
  relativeMarkdownHref,
  resolveInternalLink,
  serializeOkfDocument,
  validateOkfText,
type ValidationResult,
} from "../lib/okf";
import {
  commandFromKeyboardEvent,
  commandFromMenuPayload,
  isEditorCommand,
  shouldPreventDefaultForCommand,
  type AppCommand,
  type EditorCommandRequest,
} from "../lib/appCommands";
import {
  AUTOSAVE_DEBOUNCE_MS,
  canAutosaveDocument,
  initialWorkspaceState,
  removeOpenDocument,
  type AppWorkspaceState,
  type EditorMode,
  type OpenDocumentState,
  upsertOpenDocument,
} from "../lib/state/workspaceStore";
import { loadWorkspaceSession, saveWorkspaceSession } from "../lib/state/workspaceSession";
import { selectDesignSystemFile } from "../lib/designSystem/api";
import { compileDesignSystemCss } from "../lib/designSystem/applyTheme";
import { activeDesignSystem, applyDesignSystem, importDesignSystem, loadDesignSystemState, resetDesignSystem } from "../lib/designSystem/store";
import type { DesignSystemSettingsState } from "../lib/designSystem/types";
import type { JsonmMode } from "../lib/jsonm";

const SAMPLE_TREE = {
  name: "okf-basic",
  path: "",
  kind: "folder" as const,
  reserved: false,
  children: [
    {
      name: "tables",
      path: "tables",
      kind: "folder" as const,
      reserved: false,
      children: [
        { name: "orders.md", path: "tables/orders.md", kind: "file" as const, reserved: false, children: [] },
        { name: "customers.md", path: "tables/customers.md", kind: "file" as const, reserved: false, children: [] },
      ],
    },
    { name: "index.md", path: "index.md", kind: "file" as const, reserved: true, children: [] },
  ],
};

const SAMPLE_DOC = `---\ntype: Table\ntitle: Orders\ndescription: One row per customer order.\ntags: [sales]\ntimestamp: 2026-06-15T00:00:00Z\n---\n\n# Schema\n\n- \`order_id\` joins to [customers](customers.md).\n\n\`\`\`mermaid\nflowchart LR\n  Orders --> Customers\n  Orders --> Revenue\n\`\`\`\n`;
const SAMPLE_DOCS: Record<string, string> = {
  "tables/orders.md": SAMPLE_DOC,
  "tables/customers.md": `---\ntype: Table\ntitle: Customers\ndescription: One row per customer.\n---\n\n# Customers\n\nCustomers link back to [orders](orders.md).\n\n![Profile chart](assets/images/customers.png)\n`,
};
const SAMPLE_BUNDLE_ROOT = "Sample bundle";
const SAMPLE_DRAWER_ROOT = SAMPLE_BUNDLE_ROOT;

const SETTINGS_TABS: SettingsTab[] = [
  { id: "drawers", label: "Bundles" },
  { id: "design-system", label: "Design System" },
  { id: "updates", label: "Updates" },
];
const JSONM_SPEC_URL = "https://github.com/activetwist/jsonm";

type PathInputKind = "create-file" | "create-folder" | "rename";

interface PathInputRequest {
  kind: PathInputKind;
  title: string;
  label: string;
  value: string;
  sourcePath?: string;
}

interface ProjectBundleRequest {
  projectPath: string;
  assessment: ProjectRootAssessment;
}

const EditorPane = lazy(() => import("./EditorPane").then((module) => ({ default: module.EditorPane })));
const DrawerGraphView = lazy(() => import("./DrawerGraphView").then((module) => ({ default: module.DrawerGraphView })));

export async function openExternalHref(href: string): Promise<boolean> {
  const normalizedHref = normalizeOpenableExternalHref(href);
  if (!normalizedHref) return false;
  if (isTauriRuntime()) {
    await openUrl(normalizedHref);
    return true;
  }
  window.open(normalizedHref, "_blank", "noopener,noreferrer");
  return true;
}

function validateWithConfidence(path: string, raw: string, knownPaths: Set<string>): ValidationResult {
  const validation = validateOkfText(path, raw, knownPaths);
  let markdownBody = raw;
  try {
    markdownBody = parseOkfDocument(path, raw).body;
  } catch {
    markdownBody = raw;
  }
  const capabilityReport = analyzeMarkdownCapabilities(markdownBody);
  return {
    ...validation,
    notices: [
      ...(validation.notices ?? []),
      ...capabilityReport.warnings.map((warning) => ({
        severity: "info" as const,
        code: `editor.${warning.code}`,
        message: warning.message,
        path,
      })),
    ],
  };
}

function bundleNameFromPath(rootPath: string): string {
  if (!rootPath) return "";
  if (rootPath === SAMPLE_BUNDLE_ROOT) return "Sample Bundle";
  return rootPath.replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? rootPath;
}

function remapOpenDocumentPath(path: string, plan: DrawerMutationPlan): string {
  return remapSelectedPath(path, plan.movedMarkdown, plan.kind === "delete" ? plan.affectedPaths : []);
}

function activeDocumentFrom(documents: OpenDocumentState[], path: string): OpenDocumentState | null {
  return documents.find((document) => document.path === path) ?? documents[0] ?? null;
}

function parentFolderPath(path: string): string {
  return path.split("/").slice(0, -1).join("/");
}

function selectedFolderPath(tree: WorkspaceEntry | null, selectedTreePath: string): string {
  const entry = selectedTreePath ? findWorkspaceEntry(tree, selectedTreePath) : null;
  if (!entry) return "";
  return entry.kind === "folder" ? entry.path : parentFolderPath(entry.path);
}

function remapExplorerSelectionPath(path: string, plan: DrawerMutationPlan): string {
  if (!path) return "";
  if (plan.kind === "delete") {
    return plan.affectedPaths.some((affectedPath) => path === affectedPath || path.startsWith(`${affectedPath}/`)) ? "" : path;
  }
  if (!plan.targetPath) return path;
  if (path === plan.sourcePath) return plan.targetPath;
  return path.startsWith(`${plan.sourcePath}/`) ? path.replace(`${plan.sourcePath}/`, `${plan.targetPath}/`) : path;
}

export function AppShell() {
  const [state, setState] = useState<AppWorkspaceState>(initialWorkspaceState);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("drawers");
  const [visualEditor, setVisualEditor] = useState<Editor | null>(null);
  const [showSystemFiles, setShowSystemFiles] = useState(() => localStorage.getItem("onyxwriter.showSystemFiles") === "true");
  const [explorerCollapsed, setExplorerCollapsed] = useState(() => localStorage.getItem("onyxwriter.explorerCollapsed") === "true");
  const [validationCollapsed, setValidationCollapsed] = useState(() => localStorage.getItem("onyxwriter.validationCollapsed") === "true");
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => new Set());
  const [recentDrawers, setRecentDrawers] = useState<RecentWorkspace[]>(() => loadRecentDrawers());
  const [designState, setDesignState] = useState<DesignSystemSettingsState | null>(null);
  const [designError, setDesignError] = useState("");
  const [graphOpen, setGraphOpen] = useState(false);
  const [graphDocuments, setGraphDocuments] = useState<Record<string, string>>(SAMPLE_DOCS);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [pendingMutation, setPendingMutation] = useState<DrawerMutationPlan | null>(null);
  const [pathInputRequest, setPathInputRequest] = useState<PathInputRequest | null>(null);
  const [projectBundleRequest, setProjectBundleRequest] = useState<ProjectBundleRequest | null>(null);
  const [pathInputValue, setPathInputValue] = useState("");
  const [mutationError, setMutationError] = useState("");
  const [mutationBusy, setMutationBusy] = useState(false);
  const [projectBundleBusy, setProjectBundleBusy] = useState(false);
  const [projectBundleError, setProjectBundleError] = useState("");
  const [editorCommandRequest, setEditorCommandRequest] = useState<EditorCommandRequest | null>(null);
  const restoreAttemptedRef = useRef(false);
  const editorCommandIdRef = useRef(0);
  const knownPaths = useMemo(() => new Set(markdownPaths(state.tree)), [state.tree]);
  const activeBundleName = useMemo(() => bundleNameFromPath(state.rootPath), [state.rootPath]);
  const linkSuggestions = useMemo(() => {
    const fromPath = state.openDocument?.path;
    if (!fromPath) return [];
    return linkableMarkdownPaths(state.tree, { includeSystemFiles: showSystemFiles })
      .filter((path) => path !== fromPath)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
      .map((path) => ({ path, href: relativeMarkdownHref(fromPath, path) }));
  }, [showSystemFiles, state.openDocument?.path, state.tree]);
  const currentDesignSystem = designState ? activeDesignSystem(designState) : null;
  const currentAppearanceMode = designState?.appearanceMode ?? currentDesignSystem?.definition.settings.defaultMode ?? "light";
  const openDocumentPathsKey = useMemo(() => state.openDocuments.map((document) => document.path).join("\u001f"), [state.openDocuments]);
  const drawerGraph = useMemo(
    () => buildDrawerGraph(state.tree, graphDocuments, { includeSystemFiles: showSystemFiles }),
    [graphDocuments, showSystemFiles, state.tree],
  );
  const themeCss = useMemo(
    () => (currentDesignSystem ? compileDesignSystemCss(currentDesignSystem, currentAppearanceMode) : ""),
    [currentAppearanceMode, currentDesignSystem],
  );

  useEffect(() => {
    setCollapsedFolders(new Set());
  }, [state.rootPath]);

  useEffect(() => {
    void loadDesignSystemState().then(setDesignState).catch((error: unknown) => setDesignError(String(error)));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.appearance = currentAppearanceMode;
    return () => {
      delete document.documentElement.dataset.appearance;
    };
  }, [currentAppearanceMode]);

  const refreshTree = useCallback(async (rootPath: string) => {
    const tree = await listWorkspace(rootPath);
    setState((current) => ({ ...current, tree, rootPath }));
    return tree;
  }, []);

  const refreshManagedIndex = useCallback(async (rootPath: string, tree = state.tree) => {
    if (!rootPath || rootPath === SAMPLE_DRAWER_ROOT) return;
    const directories = indexableDirectoryPaths(tree);
    await Promise.all(
      directories.map(async (directoryPath) => {
        const indexPath = indexPathForDirectory(directoryPath);
        let existing = "";
        try {
          existing = await readWorkspaceFile(rootPath, indexPath);
        } catch {
          existing = defaultIndexContent(tree, directoryPath);
        }
        const updated = updateManagedIndexContent(existing, generateDirectoryIndexBlock(tree, directoryPath));
        await writeWorkspaceFile(rootPath, indexPath, updated);
      }),
    );
  }, [state.tree]);

  const expandAncestors = useCallback((path: string) => {
    const ancestors = ancestorFolderPaths(path);
    if (!ancestors.length) return;
    setCollapsedFolders((current) => {
      const next = new Set(current);
      for (const ancestor of ancestors) next.delete(ancestor);
      return next;
    });
  }, []);

  const toggleExplorerCollapsed = useCallback(() => {
    setExplorerCollapsed((current) => {
      localStorage.setItem("onyxwriter.explorerCollapsed", String(!current));
      return !current;
    });
  }, []);

  const toggleValidationCollapsed = useCallback(() => {
    setValidationCollapsed((current) => {
      localStorage.setItem("onyxwriter.validationCollapsed", String(!current));
      return !current;
    });
  }, []);

  const toggleFolderCollapsed = useCallback((path: string) => {
    setCollapsedFolders((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const setActiveDocument = useCallback((document: OpenDocumentState, status = "") => {
    expandAncestors(document.path);
    setState((current) => ({
      ...current,
      selectedPath: document.path,
      selectedTreePath: document.path,
      openDocument: document,
      openDocuments: upsertOpenDocument(current.openDocuments, document),
      saveStatus: document.dirty ? "dirty" : "clean",
      status,
    }));
  }, [expandAncestors]);

  const openDocumentPath = useCallback(
    async (path: string, status = "") => {
      if (!state.rootPath) return;
      const existing = state.openDocuments.find((document) => document.path === path);
      if (existing) {
        setActiveDocument(existing, status);
        return;
      }
      const raw = state.rootPath === SAMPLE_DRAWER_ROOT ? SAMPLE_DOCS[path] ?? SAMPLE_DOC : await readWorkspaceFile(state.rootPath, path);
      const validation = validateWithConfidence(path, raw, knownPaths);
      setActiveDocument({ path, raw, dirty: false, validation }, status);
    },
    [knownPaths, setActiveDocument, state.openDocuments, state.rootPath],
  );

  const selectOpenTab = useCallback((path: string) => {
    const document = state.openDocuments.find((item) => item.path === path);
    if (!document) return;
    setActiveDocument(document);
  }, [setActiveDocument, state.openDocuments]);

  const closeOpenTab = useCallback((path: string) => {
    const document = state.openDocuments.find((item) => item.path === path);
    if (document?.dirty && !window.confirm(`Close ${path} with unsaved changes?`)) return;
    setState((current) => {
      const remaining = removeOpenDocument(current.openDocuments, path);
      const active = current.openDocument?.path === path ? activeDocumentFrom(remaining, "") : current.openDocument;
      return {
        ...current,
        openDocuments: remaining,
        openDocument: active,
        selectedPath: active?.path ?? "",
        selectedTreePath: active?.path ?? current.selectedTreePath,
        saveStatus: active?.dirty ? "dirty" : "clean",
      };
    });
  }, [state.openDocuments]);

  const cycleOpenTab = useCallback((direction: 1 | -1) => {
    const documents = state.openDocuments;
    if (documents.length < 2) return;
    const activeIndex = documents.findIndex((document) => document.path === state.openDocument?.path);
    const currentIndex = activeIndex === -1 ? 0 : activeIndex;
    const nextIndex = (currentIndex + direction + documents.length) % documents.length;
    setActiveDocument(documents[nextIndex]);
  }, [setActiveDocument, state.openDocument?.path, state.openDocuments]);

  const loadGraphDocuments = useCallback(async (rootPath: string, tree = state.tree) => {
    if (!rootPath || rootPath === SAMPLE_DRAWER_ROOT) {
      setGraphDocuments(SAMPLE_DOCS);
      return SAMPLE_DOCS;
    }
    const paths = markdownPaths(tree).filter((path) => path.endsWith(".md"));
    const entries = await Promise.all(
      paths.map(async (path) => {
        try {
          return [path, await readWorkspaceFile(rootPath, path)] as const;
        } catch {
          return [path, ""] as const;
        }
      }),
    );
    const next = Object.fromEntries(entries);
    setGraphDocuments(next);
    return next;
  }, [state.tree]);

  const restoreSessionDocuments = useCallback(async (rootPath: string, tree: WorkspaceEntry) => {
    if (!rootPath || rootPath === SAMPLE_DRAWER_ROOT) {
      return { openDocuments: [] as OpenDocumentState[], active: null as OpenDocumentState | null, skippedCount: 0 };
    }
    const session = loadWorkspaceSession(rootPath);
    if (!session?.openPaths.length) {
      return { openDocuments: [] as OpenDocumentState[], active: null as OpenDocumentState | null, skippedCount: 0 };
    }
    const knownSessionPaths = new Set(markdownPaths(tree));
    const paths = Array.from(new Set(session.openPaths)).filter((path) => knownSessionPaths.has(path));
    const loaded = await Promise.all(
      paths.map(async (path) => {
        try {
          const raw = await readWorkspaceFile(rootPath, path);
          return { path, raw, dirty: false, validation: validateWithConfidence(path, raw, knownSessionPaths) };
        } catch {
          return null;
        }
      }),
    );
    const openDocuments = loaded.filter((document): document is OpenDocumentState => Boolean(document));
    const active = openDocuments.find((document) => document.path === session.activePath) ?? openDocuments[0] ?? null;
    return { openDocuments, active, skippedCount: session.openPaths.length - openDocuments.length };
  }, []);

  const refreshDrawerAfterMutation = useCallback(
    async (rootPath: string, selectedPath: string, plan?: DrawerMutationPlan) => {
      const tree = await refreshTree(rootPath);
      await refreshManagedIndex(rootPath, tree);
      const refreshedTree = await refreshTree(rootPath);
      const documents = await loadGraphDocuments(rootPath, refreshedTree);
      const nextKnownPaths = new Set(markdownPaths(refreshedTree));
      setState((current) => ({
        ...current,
        ...(() => {
          const openDocuments = current.openDocuments
            .map((document) => {
              const nextPath = plan ? remapOpenDocumentPath(document.path, plan) : document.path;
              if (!nextPath || !nextPath.endsWith(".md") || !documents[nextPath]) return null;
              const raw = documents[nextPath];
              return {
                path: nextPath,
                raw,
                dirty: false,
                validation: validateWithConfidence(nextPath, raw, nextKnownPaths),
              };
            })
            .filter((document): document is OpenDocumentState => Boolean(document));
          const active = activeDocumentFrom(openDocuments, selectedPath);
          const selectedTreePath = plan ? remapExplorerSelectionPath(current.selectedTreePath, plan) : current.selectedTreePath;
          return {
            selectedPath: active?.path ?? "",
            selectedTreePath,
            openDocument: active,
            openDocuments,
            saveStatus: "clean" as const,
          };
        })(),
      }));
      return refreshedTree;
    },
    [loadGraphDocuments, refreshManagedIndex, refreshTree],
  );

  const repairDrawerLinks = useCallback(async (rootPath: string, documents: Record<string, string>, plan: DrawerMutationPlan) => {
    if (!plan.movedMarkdown.length) return 0;
    let repairedCount = 0;
    await Promise.all(
      Object.entries(documents).map(async ([oldPath, raw]) => {
        const pathMove = plan.movedMarkdown.find((move) => move.from === oldPath);
        const newPath = pathMove ? pathMove.to : oldPath.startsWith(`${plan.sourcePath}/`) && plan.targetPath ? oldPath.replace(`${plan.sourcePath}/`, `${plan.targetPath}/`) : oldPath;
        if (!newPath.endsWith(".md")) return;
        const repaired = repairMovedLinksFrom(raw, oldPath, newPath, plan.movedMarkdown);
        if (repaired === raw) return;
        repairedCount += 1;
        await writeWorkspaceFile(rootPath, newPath, repaired);
      }),
    );
    return repairedCount;
  }, []);

  const setSystemFilesVisible = useCallback((visible: boolean) => {
    setShowSystemFiles(visible);
    localStorage.setItem("onyxwriter.showSystemFiles", String(visible));
  }, []);

  const openWorkspacePath = useCallback(
    async (path: string, options: { restoreSession?: boolean } = {}) => {
      try {
        const tree = await refreshTree(path);
        await loadGraphDocuments(path, tree);
        const shouldRestoreSession = options.restoreSession ?? true;
        const restored = shouldRestoreSession
          ? await restoreSessionDocuments(path, tree)
          : { openDocuments: [] as OpenDocumentState[], active: null as OpenDocumentState | null, skippedCount: 0 };
        setRecentDrawers(rememberDrawer(path));
        setState((current) => ({
          ...current,
          selectedPath: restored.active?.path ?? "",
          selectedTreePath: restored.active?.path ?? "",
          openDocument: restored.active,
          openDocuments: restored.openDocuments,
          saveStatus: "clean",
          status: restored.skippedCount > 0 ? `Bundle opened. Skipped ${restored.skippedCount} missing saved tab(s).` : "Bundle opened.",
        }));
      } catch (error) {
        setRecentDrawers(forgetRecentDrawer(path));
        setState((current) => ({
          ...current,
          status: error instanceof Error ? error.message : String(error),
        }));
      }
    },
    [loadGraphDocuments, refreshTree, restoreSessionDocuments],
  );

  useEffect(() => {
    if (restoreAttemptedRef.current || !isTauriRuntime() || recentDrawers.length === 0 || state.rootPath) return;
    restoreAttemptedRef.current = true;
    const lastDrawer = recentDrawers[0];
    void openWorkspacePath(lastDrawer.path).then(() => {
      setState((current) => ({
        ...current,
        status: current.rootPath
          ? current.status.startsWith("Bundle opened.")
            ? current.status.replace("Bundle opened.", `Restored bundle ${lastDrawer.name}.`)
            : `Restored bundle ${lastDrawer.name}.`
          : current.status,
      }));
    });
  }, [openWorkspacePath, recentDrawers, state.rootPath]);

  const openWorkspace = useCallback(async () => {
    if (!isTauriRuntime()) {
      const validation = validateWithConfidence("tables/orders.md", SAMPLE_DOC, new Set(markdownPaths(SAMPLE_TREE)));
      setGraphDocuments(SAMPLE_DOCS);
      setState({
        ...initialWorkspaceState,
        rootPath: SAMPLE_DRAWER_ROOT,
        tree: SAMPLE_TREE,
        selectedPath: "tables/orders.md",
        selectedTreePath: "tables/orders.md",
        openDocument: { path: "tables/orders.md", raw: SAMPLE_DOC, dirty: false, validation },
        openDocuments: [{ path: "tables/orders.md", raw: SAMPLE_DOC, dirty: false, validation }],
        saveStatus: "clean",
        status: "Sample bundle loaded in browser preview.",
      });
      return;
    }
    const selected = await selectWorkspaceDirectory("Open Onyx Bundle");
    if (!selected) return;
    const assessment = assessWorkspaceFolder(await inspectWorkspaceFolder(selected));
    if (assessment.likelyProjectRoot && !assessment.likelyOkfBundle) {
      const confirmed = window.confirm(
        `This folder looks like a code project (${assessment.markers.join(", ")}). OKF bundles usually live in a subfolder such as ${assessment.suggestedBundlePath}. Open the whole project as a bundle anyway?`,
      );
      if (!confirmed) {
        setState((current) => ({ ...current, status: "Open canceled. Select an OKF bundle folder or create one inside the project." }));
        return;
      }
    }
    await openWorkspacePath(selected);
  }, [openWorkspacePath]);

  const createWorkspace = useCallback(async () => {
    if (!isTauriRuntime()) {
      await openWorkspace();
      return;
    }
    const selected = await selectWorkspaceDirectory("Create Onyx Bundle");
    if (!selected) return;
    const assessment = assessWorkspaceFolder(await inspectWorkspaceFolder(selected));
    if (assessment.likelyProjectRoot && !assessment.likelyOkfBundle) {
      setProjectBundleRequest({ projectPath: selected, assessment });
      setProjectBundleError("");
      return;
    }
    const title = window.prompt("Bundle title", "Onyx Bundle")?.trim() || "Onyx Bundle";
    await initializeWorkspace(selected, title);
    await openWorkspacePath(selected, { restoreSession: false });
    setState((current) => ({ ...current, status: "Bundle created." }));
  }, [openWorkspace, openWorkspacePath]);

  const cancelProjectBundle = useCallback(() => {
    setProjectBundleRequest(null);
    setProjectBundleError("");
  }, []);

  const createProjectBundle = useCallback(
    async (relativePath: string, title: string) => {
      if (!projectBundleRequest) return;
      setProjectBundleBusy(true);
      setProjectBundleError("");
      try {
        await createWorkspaceFolder(projectBundleRequest.projectPath, relativePath);
        const bundlePath = joinHostPath(projectBundleRequest.projectPath, relativePath);
        await initializeWorkspace(bundlePath, title);
        await openWorkspacePath(bundlePath, { restoreSession: false });
        setProjectBundleRequest(null);
        setState((current) => ({ ...current, status: `Bundle created at ${relativePath}.` }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setProjectBundleError(message);
        setState((current) => ({ ...current, status: message }));
      } finally {
        setProjectBundleBusy(false);
      }
    },
    [openWorkspacePath, projectBundleRequest],
  );

  const createSeedDrawer = useCallback(async () => {
    if (!isTauriRuntime()) {
      setState((current) => ({ ...current, status: "Seed bundles can be created in the desktop app." }));
      return;
    }
    const selected = await selectWorkspaceDirectory("Create Onyx Seed Bundle");
    if (!selected) return;
    if (await directoryHasEntries(selected)) {
      const confirmed = window.confirm(
        "The selected folder is not empty. Creating the seed bundle may overwrite files with the same bundle-relative paths. Continue?",
      );
      if (!confirmed) return;
    }
    setState((current) => ({ ...current, status: "Creating seed bundle." }));
    for (const file of SEED_DRAWER_FILES) {
      await writeWorkspaceFile(selected, file.path, file.contents);
    }
    const tree = await refreshTree(selected);
    await refreshManagedIndex(selected, tree);
    await openWorkspacePath(selected, { restoreSession: false });
    setState((current) => ({ ...current, status: `${SEED_DRAWER_TITLE} created.` }));
  }, [openWorkspacePath, refreshManagedIndex, refreshTree]);

  const selectPath = useCallback(
    async (path: string) => {
      await openDocumentPath(path);
    },
    [openDocumentPath],
  );

  const selectTreeEntry = useCallback((path: string) => {
    setState((current) => ({ ...current, selectedTreePath: path }));
  }, []);

  const changeRaw = useCallback(
    (raw: string) => {
      const openPath = state.openDocument?.path;
      setState((current) => {
        if (!current.openDocument) return current;
        const nextDocument = {
          ...current.openDocument,
          raw,
          dirty: true,
          validation: validateWithConfidence(current.openDocument.path, raw, knownPaths),
        };
        return {
          ...current,
          openDocument: nextDocument,
          openDocuments: upsertOpenDocument(current.openDocuments, nextDocument),
          saveStatus: "dirty",
        };
      });
      if (openPath) {
        setGraphDocuments((current) => ({ ...current, [openPath]: raw }));
      }
    },
    [knownPaths, state.openDocument],
  );

  const saveSnapshot = useCallback(
    async (rootPath: string, path: string, raw: string, manual = false) => {
      if (!rootPath || rootPath === SAMPLE_DRAWER_ROOT) return;
      setState((current) =>
        current.rootPath === rootPath && current.openDocument?.path === path
          ? { ...current, saveStatus: "saving", status: manual ? "Saving." : "Autosaving." }
          : current,
      );
      try {
        await writeWorkspaceFile(rootPath, path, raw);
        setState((current) => {
          if (current.rootPath !== rootPath) return current;
          const openDocuments = current.openDocuments.map((document) => {
            if (document.path !== path) return document;
            return document.raw === raw ? { ...document, dirty: false } : document;
          });
          if (current.openDocument?.path !== path) return { ...current, openDocuments };
          const openDocument = openDocuments.find((document) => document.path === path) ?? current.openDocument;
          if (openDocument.raw !== raw) return { ...current, openDocuments, saveStatus: "dirty", status: "Unsaved changes." };
          return {
            ...current,
            openDocuments,
            openDocument,
            saveStatus: "saved",
            status: "Saved.",
          };
        });
        const tree = await listWorkspace(rootPath);
        setState((current) => (current.rootPath === rootPath ? { ...current, tree } : current));
        setGraphDocuments((current) => ({ ...current, [path]: raw }));
      } catch (error) {
        setState((current) =>
          current.rootPath === rootPath && current.openDocument?.path === path
            ? {
                ...current,
                saveStatus: "error",
                status: error instanceof Error ? `Save failed: ${error.message}` : `Save failed: ${String(error)}`,
              }
            : current,
        );
      }
    },
    [],
  );

  useEffect(() => {
    const dirtyDocuments = state.openDocuments.filter((document) => canAutosaveDocument(state.rootPath, document));
    if (!dirtyDocuments.length) return;
    const rootPath = state.rootPath;
    const timer = window.setTimeout(() => {
      void Promise.all(dirtyDocuments.map((document) => saveSnapshot(rootPath, document.path, document.raw, false)));
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [saveSnapshot, state.openDocuments, state.rootPath]);

  useEffect(() => {
    if (!state.rootPath || state.rootPath === SAMPLE_DRAWER_ROOT) return;
    saveWorkspaceSession({
      rootPath: state.rootPath,
      openPaths: state.openDocuments.map((document) => document.path),
      activePath: state.openDocument?.path ?? "",
      updatedAt: new Date().toISOString(),
    });
  }, [openDocumentPathsKey, state.openDocument?.path, state.rootPath, state.openDocuments]);

  const save = useCallback(async () => {
    if (!state.openDocument) return;
    await saveSnapshot(state.rootPath, state.openDocument.path, state.openDocument.raw, true);
  }, [saveSnapshot, state.openDocument, state.rootPath]);

  const refreshBundle = useCallback(async () => {
    if (!state.rootPath) {
      setState((current) => ({ ...current, status: "Open a bundle before refreshing." }));
      return;
    }
    if (state.rootPath === SAMPLE_DRAWER_ROOT) {
      setGraphDocuments(SAMPLE_DOCS);
      setState((current) => ({ ...current, tree: SAMPLE_TREE, status: "Sample bundle refreshed." }));
      return;
    }
    const rootPath = state.rootPath;
    setRefreshBusy(true);
    setState((current) => ({ ...current, status: "Refreshing bundle." }));
    try {
      const dirtyDocuments = state.openDocuments.filter((document) => canAutosaveDocument(rootPath, document));
      await Promise.all(dirtyDocuments.map((document) => writeWorkspaceFile(rootPath, document.path, document.raw)));
      const tree = await refreshTree(rootPath);
      const documents = await loadGraphDocuments(rootPath, tree);
      const nextKnownPaths = new Set(markdownPaths(tree));
      setState((current) => {
        if (current.rootPath !== rootPath) return current;
        const openDocuments = current.openDocuments
          .map((document) => {
            if (!nextKnownPaths.has(document.path) || documents[document.path] === undefined) return null;
            const raw = documents[document.path];
            return {
              path: document.path,
              raw,
              dirty: false,
              validation: validateWithConfidence(document.path, raw, nextKnownPaths),
            };
          })
          .filter((document): document is OpenDocumentState => Boolean(document));
        const active = current.openDocument ? activeDocumentFrom(openDocuments, current.openDocument.path) : openDocuments[0] ?? null;
        const selectedTreePath = current.selectedTreePath && findWorkspaceEntry(tree, current.selectedTreePath) ? current.selectedTreePath : active?.path ?? "";
        const skippedCount = current.openDocuments.length - openDocuments.length;
        const refreshMessage = dirtyDocuments.length ? `Saved ${dirtyDocuments.length} dirty tab${dirtyDocuments.length === 1 ? "" : "s"} and refreshed bundle.` : "Refreshed bundle.";
        const skippedSuffix = skippedCount ? ` Skipped ${skippedCount} missing tab${skippedCount === 1 ? "" : "s"}.` : "";
        return {
          ...current,
          tree,
          selectedPath: active?.path ?? "",
          selectedTreePath,
          openDocument: active,
          openDocuments,
          saveStatus: "clean",
          status: `${refreshMessage}${skippedSuffix}`,
        };
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        saveStatus: "error",
        status: error instanceof Error ? `Refresh failed: ${error.message}` : `Refresh failed: ${String(error)}`,
      }));
    } finally {
      setRefreshBusy(false);
    }
  }, [loadGraphDocuments, refreshTree, state.openDocuments, state.rootPath]);

  const openGraph = useCallback(async () => {
    if (state.rootPath && state.tree) await loadGraphDocuments(state.rootPath, state.tree);
    setGraphOpen((current) => !current);
  }, [loadGraphDocuments, state.rootPath, state.tree]);

  const openGraphDocument = useCallback(
    async (path: string) => {
      await selectPath(path);
      setGraphOpen(false);
    },
    [selectPath],
  );

  const openDocumentLink = useCallback(
    async (href: string) => {
      const fromPath = state.openDocument?.path;
      if (!fromPath) return;
      const kind = classifyLink(href);
      if (kind === "external" || href.startsWith("mailto:")) {
        try {
          const opened = await openExternalHref(href);
          setState((current) => ({ ...current, status: opened ? `Opened external link: ${href}` : `Unsupported external link: ${href}` }));
        } catch (error) {
          setState((current) => ({
            ...current,
            status: error instanceof Error ? `External link failed: ${error.message}` : `External link failed: ${String(error)}`,
          }));
        }
        return;
      }
      const targetPath = resolveInternalLink(href, fromPath)?.split("#")[0];
      if (targetPath && knownPaths.has(targetPath)) {
        await selectPath(targetPath);
        setState((current) => ({ ...current, status: `Opened ${targetPath}.` }));
        return;
      }
      setState((current) => ({ ...current, status: targetPath ? `Link target not found: ${targetPath}` : `Cannot open link: ${href}` }));
    },
    [knownPaths, selectPath, state.openDocument?.path],
  );

  const insertImage = useCallback(async () => {
    if (!visualEditor) return;
    if (!isTauriRuntime() || state.rootPath === SAMPLE_DRAWER_ROOT) {
      const src = window.prompt("Image URL or bundle-relative path", "assets/images/example.png");
      if (!src) return;
      const alt = window.prompt("Alt text", "") ?? "";
      visualEditor.chain().focus().setImage({ src, alt }).run();
      return;
    }
    if (!state.rootPath) return;
    const selected = await selectAndImportDrawerImage(state.rootPath);
    if (!selected) return;
    const alt = window.prompt("Alt text", "") ?? "";
    visualEditor.chain().focus().setImage({ src: selected.relativePath, alt }).run();
  }, [state.rootPath, visualEditor]);

  const setMode = useCallback(
    (mode: EditorMode) => {
      setState((current) => {
        if (!current.openDocument) return { ...current, mode };
        try {
          const parsed = parseOkfDocument(current.openDocument.path, current.openDocument.raw);
          const openDocument = {
            ...current.openDocument,
            raw: serializeOkfDocument(parsed),
          };
          return {
            ...current,
            mode,
            openDocument,
            openDocuments: upsertOpenDocument(current.openDocuments, openDocument),
          };
        } catch {
          return { ...current, mode };
        }
      });
    },
    [],
  );

  const performCreateFile = useCallback(async (input: string) => {
    if (!state.rootPath || state.rootPath === SAMPLE_DRAWER_ROOT) return;
    const path = ensureMarkdownPath(input);
    await createWorkspaceMarkdownFile(state.rootPath, path, defaultConceptContents("Concept", "New Concept"));
    const tree = await refreshTree(state.rootPath);
    await refreshManagedIndex(state.rootPath, tree);
    await refreshTree(state.rootPath);
    await selectPath(path);
  }, [refreshManagedIndex, refreshTree, selectPath, state.rootPath]);

  const performCreateFolder = useCallback(async (input: string) => {
    if (!state.rootPath || state.rootPath === SAMPLE_DRAWER_ROOT) return;
    const path = normalizeWorkspacePath(input);
    if (!path) throw new Error("Folder path is required.");
    await createWorkspaceFolder(state.rootPath, path);
    const tree = await refreshTree(state.rootPath);
    await refreshManagedIndex(state.rootPath, tree);
    await refreshTree(state.rootPath);
    setState((current) => ({ ...current, selectedTreePath: path, status: `Created folder ${path}.` }));
  }, [refreshManagedIndex, refreshTree, state.rootPath]);

  const createFile = useCallback(() => {
    if (!state.rootPath || state.rootPath === SAMPLE_DRAWER_ROOT) {
      setState((current) => ({ ...current, status: "Document actions require a desktop bundle." }));
      return;
    }
    const targetFolder = selectedFolderPath(state.tree, state.selectedTreePath);
    const defaultPath = [targetFolder, "new-concept.md"].filter(Boolean).join("/");
    setPathInputRequest({
      kind: "create-file",
      title: "New document",
      label: "Bundle-relative document path",
      value: defaultPath,
    });
    setPathInputValue(defaultPath);
    setMutationError("");
  }, [state.rootPath, state.selectedTreePath, state.tree]);

  const createFolder = useCallback(() => {
    if (!state.rootPath || state.rootPath === SAMPLE_DRAWER_ROOT) {
      setState((current) => ({ ...current, status: "Document actions require a desktop bundle." }));
      return;
    }
    const targetFolder = selectedFolderPath(state.tree, state.selectedTreePath);
    const defaultPath = [targetFolder, "new-folder"].filter(Boolean).join("/");
    setPathInputRequest({
      kind: "create-folder",
      title: "New folder",
      label: "Bundle-relative folder path",
      value: defaultPath,
    });
    setPathInputValue(defaultPath);
    setMutationError("");
  }, [state.rootPath, state.selectedTreePath, state.tree]);

  const stageMutation = useCallback((plan: DrawerMutationPlan) => {
    setMutationError("");
    setPendingMutation(plan);
  }, []);

  const renameSelected = useCallback(() => {
    if (!state.rootPath || state.rootPath === SAMPLE_DRAWER_ROOT) {
      setState((current) => ({ ...current, status: "Document actions require a desktop bundle." }));
      return;
    }
    if (!state.selectedTreePath) {
      setState((current) => ({ ...current, status: "Select a document or folder to rename." }));
      return;
    }
    const value = state.selectedTreePath.split("/").pop() ?? "";
    setPathInputRequest({
      kind: "rename",
      title: "Rename bundle item",
      label: "New name",
      value,
      sourcePath: state.selectedTreePath,
    });
    setPathInputValue(value);
    setMutationError("");
  }, [state.rootPath, state.selectedTreePath]);

  const cancelPathInput = useCallback(() => {
    setPathInputRequest(null);
    setPathInputValue("");
    setMutationError("");
  }, []);

  const submitPathInput = useCallback(async () => {
    if (!pathInputRequest) return;
    const input = pathInputValue.trim();
    if (!input) {
      setMutationError(`${pathInputRequest.label} is required.`);
      return;
    }
    setMutationError("");
    try {
      if (pathInputRequest.kind === "create-file") {
        await performCreateFile(input);
      } else if (pathInputRequest.kind === "create-folder") {
        await performCreateFolder(input);
      } else {
        const sourcePath = pathInputRequest.sourcePath;
        if (!sourcePath) throw new Error("Select a document or folder to rename.");
        stageMutation(planRename(state.tree, sourcePath, input));
      }
      setPathInputRequest(null);
      setPathInputValue("");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setMutationError(message);
      setState((current) => ({ ...current, status: message }));
    }
  }, [pathInputRequest, pathInputValue, performCreateFile, performCreateFolder, stageMutation, state.tree]);

  const deleteSelected = useCallback(async () => {
    if (!state.rootPath || state.rootPath === SAMPLE_DRAWER_ROOT) {
      setState((current) => ({ ...current, status: "Document actions require a desktop bundle." }));
      return;
    }
    if (!state.selectedTreePath) {
      setState((current) => ({ ...current, status: "Select a document or folder to delete." }));
      return;
    }
    try {
      stageMutation(planDelete(state.tree, state.selectedTreePath));
    } catch (error) {
      setState((current) => ({ ...current, status: error instanceof Error ? error.message : String(error) }));
    }
  }, [stageMutation, state.rootPath, state.selectedTreePath, state.tree]);

  const movePath = useCallback(
    (sourcePath: string, destinationFolderPath: string) => {
      if (!state.rootPath || state.rootPath === SAMPLE_DRAWER_ROOT) {
        setState((current) => ({ ...current, status: "Browser preview does not move bundle files." }));
        return;
      }
      try {
        stageMutation(planMove(state.tree, sourcePath, destinationFolderPath));
      } catch (error) {
        setState((current) => ({ ...current, status: error instanceof Error ? error.message : String(error) }));
      }
    },
    [stageMutation, state.rootPath, state.tree],
  );

  const applyMutation = useCallback(async () => {
    if (!pendingMutation || !state.rootPath || state.rootPath === SAMPLE_DRAWER_ROOT) return;
    setMutationBusy(true);
    setMutationError("");
    try {
      await Promise.all(
        state.openDocuments
          .filter((document) => canAutosaveDocument(state.rootPath, document))
          .map((document) => writeWorkspaceFile(state.rootPath, document.path, document.raw)),
      );
      const documentsBefore = await loadGraphDocuments(state.rootPath, state.tree);
      if (pendingMutation.kind === "rename") {
        await renameWorkspacePath(state.rootPath, pendingMutation.sourcePath, pendingMutation.targetPath?.split("/").pop() ?? "");
      } else if (pendingMutation.kind === "move") {
        await moveWorkspacePath(state.rootPath, pendingMutation.sourcePath, pendingMutation.targetPath ?? "");
      } else {
        await deleteWorkspacePath(state.rootPath, pendingMutation.sourcePath);
      }
      if (pendingMutation.kind !== "delete") {
        await repairDrawerLinks(state.rootPath, documentsBefore, pendingMutation);
      }
      const selectedPath = remapSelectedPath(
        state.selectedPath,
        pendingMutation.movedMarkdown,
        pendingMutation.kind === "delete" ? pendingMutation.affectedPaths : [],
      );
      await refreshDrawerAfterMutation(state.rootPath, selectedPath, pendingMutation);
      if (selectedPath) expandAncestors(selectedPath);
      setState((current) => ({ ...current, status: mutationStatus(pendingMutation) }));
      setPendingMutation(null);
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : String(error));
      setState((current) => ({ ...current, saveStatus: "error", status: error instanceof Error ? error.message : String(error) }));
    } finally {
      setMutationBusy(false);
    }
  }, [expandAncestors, loadGraphDocuments, pendingMutation, refreshDrawerAfterMutation, repairDrawerLinks, state.openDocuments, state.rootPath, state.selectedPath, state.tree]);

  const previewDesignSystem = useCallback((id: string) => {
    setDesignState((current) => {
      if (!current) return current;
      const system = current.systems.find((item) => item.id === id);
      return system ? { ...current, previewId: id, appearanceMode: system.definition.settings.defaultMode } : current;
    });
  }, []);

  const changePreviewMode = useCallback((mode: JsonmMode) => {
    setDesignState((current) => (current ? { ...current, appearanceMode: mode } : current));
  }, []);

  const applyPreviewDesignSystem = useCallback(async (id: string) => {
    await applyDesignSystem(id);
    setDesignState((current) => (current ? { ...current, activeId: id } : current));
    setDesignError("");
  }, []);

  const importJsonmDesignSystem = useCallback(async () => {
    setDesignError("");
    try {
      const selected = await selectDesignSystemFile();
      if (!selected) return;
      const record = await importDesignSystem(selected.contents);
      setDesignState((current) =>
        current
          ? {
              ...current,
              systems: [...current.systems.filter((system) => system.id !== record.id), record],
              previewId: record.id,
              appearanceMode: record.definition.settings.defaultMode,
            }
          : current,
      );
    } catch (error) {
      setDesignError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  const resetTheme = useCallback(async () => {
    const id = await resetDesignSystem();
    setDesignState((current) => {
      if (!current) return current;
      const system = current.systems.find((item) => item.id === id);
      return {
        ...current,
        activeId: id,
        previewId: id,
        appearanceMode: system?.definition.settings.defaultMode ?? "light",
      };
    });
    setDesignError("");
  }, []);

  const openJsonmSpec = useCallback(async () => {
    try {
      const opened = await openExternalHref(JSONM_SPEC_URL);
      setState((current) => ({ ...current, status: opened ? "Opened JSONM spec on GitHub." : "Could not open JSONM spec link." }));
    } catch (error) {
      setState((current) => ({
        ...current,
        status: error instanceof Error ? `JSONM spec link failed: ${error.message}` : `JSONM spec link failed: ${String(error)}`,
      }));
    }
  }, []);

  const dispatchEditorCommand = useCallback(
    (command: AppCommand) => {
      if (!isEditorCommand(command)) return;
      if (state.mode !== "visual") {
        setState((current) => ({ ...current, status: "Editor formatting shortcuts require visual mode." }));
        return;
      }
      if (!visualEditor?.isEditable) {
        setState((current) => ({ ...current, status: "Open a visual editor before using editor shortcuts." }));
        return;
      }
      editorCommandIdRef.current += 1;
      setEditorCommandRequest({ id: editorCommandIdRef.current, command });
    },
    [state.mode, visualEditor],
  );

  const executeAppCommand = useCallback(
    async (command: AppCommand) => {
      if (isEditorCommand(command)) {
        dispatchEditorCommand(command);
        return;
      }
      switch (command) {
        case "bundle.open":
          await openWorkspace();
          break;
        case "bundle.create":
          await createWorkspace();
          break;
        case "bundle.refresh":
          await refreshBundle();
          break;
        case "document.new":
          createFile();
          break;
        case "folder.new":
          createFolder();
          break;
        case "item.rename":
          renameSelected();
          break;
        case "item.delete":
          await deleteSelected();
          break;
        case "document.save":
          await save();
          break;
        case "tab.close":
          if (state.openDocument) closeOpenTab(state.openDocument.path);
          break;
        case "tab.next":
          cycleOpenTab(1);
          break;
        case "tab.previous":
          cycleOpenTab(-1);
          break;
        case "mode.visual":
          setMode("visual");
          break;
        case "mode.raw":
          setMode("raw");
          break;
        case "mode.toggle":
          setMode(state.mode === "visual" ? "raw" : "visual");
          break;
        case "graph.toggle":
          await openGraph();
          break;
        case "explorer.toggle":
          toggleExplorerCollapsed();
          break;
        case "validation.toggle":
          toggleValidationCollapsed();
          break;
        case "settings.open":
          setSettingsOpen(true);
          break;
      }
    },
    [
      closeOpenTab,
      createFile,
      createFolder,
      createWorkspace,
      cycleOpenTab,
      deleteSelected,
      dispatchEditorCommand,
      openGraph,
      openWorkspace,
      refreshBundle,
      renameSelected,
      save,
      setMode,
      state.mode,
      state.openDocument,
      toggleExplorerCollapsed,
      toggleValidationCollapsed,
    ],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const command = commandFromKeyboardEvent(event, state.mode);
      if (!command) return;
      if (command === "tab.close" && !state.openDocument) return;
      if (shouldPreventDefaultForCommand(command)) {
        event.preventDefault();
        event.stopPropagation();
      }
      void executeAppCommand(command);
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [executeAppCommand, state.mode, state.openDocument]);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    let unlisten: (() => void) | null = null;
    let canceled = false;
    void import("@tauri-apps/api/event")
      .then(({ listen }) =>
        listen("onyxwriter://menu-command", (event) => {
          const command = commandFromMenuPayload(event.payload);
          if (command) void executeAppCommand(command);
        }),
      )
      .then((cleanup) => {
        if (canceled) cleanup();
        else unlisten = cleanup;
      })
      .catch(() => {});
    return () => {
      canceled = true;
      unlisten?.();
    };
  }, [executeAppCommand]);

  return (
    <div className="app-shell" data-appearance={currentAppearanceMode} data-explorer-collapsed={explorerCollapsed ? "true" : "false"}>
      {themeCss ? <style data-onyx-jsonm-theme>{themeCss}</style> : null}
      <WorkspaceSidebar
        rootPath={state.rootPath}
        bundleName={activeBundleName}
        tree={state.tree}
        selectedPath={state.selectedTreePath || state.selectedPath}
        canMutateDocuments={Boolean(state.rootPath && state.rootPath !== SAMPLE_DRAWER_ROOT)}
        collapsed={explorerCollapsed}
        collapsedFolders={collapsedFolders}
        showSystemFiles={showSystemFiles}
        onOpenWorkspace={openWorkspace}
        onCreateWorkspace={createWorkspace}
        onSelectPath={selectPath}
        onSelectEntry={selectTreeEntry}
        onToggleCollapsed={toggleExplorerCollapsed}
        onToggleFolder={toggleFolderCollapsed}
        onCreateFile={createFile}
        onCreateFolder={createFolder}
        onRename={renameSelected}
        onDelete={deleteSelected}
        onMovePath={movePath}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <section className={`main-column ${state.rootPath ? "" : "no-tabs"}`}>
        {state.rootPath ? <DocumentTabs documents={state.openDocuments} activePath={state.openDocument?.path ?? ""} onSelect={selectOpenTab} onClose={closeOpenTab} /> : null}
        <EditorToolbar
          mode={state.mode}
          dirty={state.openDocument?.dirty ?? false}
          saveStatus={state.saveStatus}
          canSave={Boolean(state.openDocument && state.rootPath !== SAMPLE_DRAWER_ROOT)}
          canRefresh={Boolean(state.rootPath)}
          refreshBusy={refreshBusy}
          visualEditor={visualEditor}
          canInsertImage={Boolean(state.rootPath)}
          canOpenGraph={Boolean(state.rootPath)}
          graphOpen={graphOpen}
          onModeChange={setMode}
          onRefresh={refreshBundle}
          onSave={save}
          onInsertImage={insertImage}
          onToggleGraph={openGraph}
          commandRequest={editorCommandRequest}
          linkSuggestions={linkSuggestions}
        />
        {state.rootPath && graphOpen ? (
          <div className="workbench graph-workbench">
            <AppErrorBoundary label="Bundle graph" resetKey={`${state.rootPath}:graph`}>
              <Suspense fallback={<div className="surface-loading">Loading graph.</div>}>
                <DrawerGraphView graph={drawerGraph} selectedPath={state.selectedPath} onOpenDocument={openGraphDocument} />
              </Suspense>
            </AppErrorBoundary>
          </div>
        ) : state.rootPath ? (
          <div className={`workbench ${validationCollapsed ? "validation-collapsed" : ""}`}>
            <AppErrorBoundary label="Editor" resetKey={`${state.rootPath}:${state.selectedPath}:${state.mode}`}>
              <Suspense fallback={<div className="surface-loading">Loading editor.</div>}>
                <EditorPane
                  document={state.openDocument}
                  mode={state.mode}
                  onChange={changeRaw}
                  onOpenLink={openDocumentLink}
                  onVisualEditorChange={setVisualEditor}
                />
              </Suspense>
            </AppErrorBoundary>
            <ValidationPanel validation={state.openDocument?.validation ?? null} collapsed={validationCollapsed} onToggleCollapsed={toggleValidationCollapsed} />
          </div>
        ) : (
          <WorkspaceLauncher
            recentWorkspaces={recentDrawers}
            onOpenRecent={openWorkspacePath}
          />
        )}
        <div className="status-line">{state.status}</div>
      </section>
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        tabs={SETTINGS_TABS}
        activeTab={settingsTab}
        onTabChange={setSettingsTab}
      >
        {settingsTab === "drawers" ? (
          <DrawerSettings
            currentDrawerPath={state.rootPath}
            recentDrawers={recentDrawers}
            saveStatus={state.saveStatus}
            showSystemFiles={showSystemFiles}
            onOpenDrawer={openWorkspace}
            onCreateDrawer={createWorkspace}
            onCreateSeedDrawer={createSeedDrawer}
            onOpenRecentDrawer={openWorkspacePath}
            onShowSystemFilesChange={setSystemFilesVisible}
          />
        ) : settingsTab === "design-system" && designState ? (
          <DesignSystemSettings
            systems={designState.systems}
            activeId={designState.activeId}
            previewId={designState.previewId}
            appearanceMode={designState.appearanceMode}
            error={designError}
            onPreview={previewDesignSystem}
            onModeChange={changePreviewMode}
            onApply={applyPreviewDesignSystem}
            onImport={importJsonmDesignSystem}
            onReset={resetTheme}
            onOpenSpec={openJsonmSpec}
          />
        ) : settingsTab === "updates" ? (
          <UpdateSettings />
        ) : (
          <div className="settings-loading">Loading design systems.</div>
        )}
      </SettingsDialog>
      {pathInputRequest ? (
        <div className="mutation-backdrop" role="presentation">
          <form
            className="mutation-dialog path-input-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="path-input-title"
            onSubmit={(event) => {
              event.preventDefault();
              void submitPathInput();
            }}
          >
            <header className="mutation-header">
              <div>
                <span className="eyebrow">Bundle files</span>
                <h2 id="path-input-title">{pathInputRequest.title}</h2>
              </div>
              <button className="icon-button" type="button" onClick={cancelPathInput} aria-label="Cancel">
                <X size={17} />
              </button>
            </header>
            <div className="mutation-body">
              <label className="path-input-field">
                <span>{pathInputRequest.label}</span>
                <input
                  autoFocus
                  value={pathInputValue}
                  onChange={(event) => setPathInputValue(event.target.value)}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </label>
              {pathInputRequest.kind === "rename" && pathInputRequest.sourcePath ? (
                <p className="path-input-help">Renaming: {pathInputRequest.sourcePath}</p>
              ) : null}
              {mutationError ? <div className="settings-error">{mutationError}</div> : null}
            </div>
            <footer className="mutation-actions">
              <button className="open-button" type="button" onClick={cancelPathInput}>
                Cancel
              </button>
              <button className="primary-action" type="submit">
                {pathInputRequest.kind === "rename" ? "Preview Rename" : "Create"}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
      {projectBundleRequest ? (
        <ProjectBundleDialog
          projectPath={projectBundleRequest.projectPath}
          assessment={projectBundleRequest.assessment}
          busy={projectBundleBusy}
          error={projectBundleError}
          onCancel={cancelProjectBundle}
          onCreate={createProjectBundle}
        />
      ) : null}
      <DrawerMutationDialog
        plan={pendingMutation}
        busy={mutationBusy}
        error={mutationError}
        onCancel={() => {
          if (!mutationBusy) {
            setPendingMutation(null);
            setMutationError("");
          }
        }}
        onApply={applyMutation}
      />
    </div>
  );
}
