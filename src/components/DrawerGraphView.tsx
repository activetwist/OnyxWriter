import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  createGraphSimulation,
  createInitialGraphNodes,
  createSimulationLinks,
  DEFAULT_GRAPH_HEIGHT,
  DEFAULT_GRAPH_WIDTH,
  graphBounds,
  graphNeighborhood,
  graphNodeRadius,
  resolveGraphEdges,
  type GraphDimensions,
  type SimulatedDrawerGraph,
  type SimulatedGraphNode,
} from "../lib/visualization/drawerGraphPhysics";
import {
  DEFAULT_VIEWPORT,
  fitViewportToBounds,
  panViewport,
  zoomViewport,
  type ViewportTransform,
} from "../lib/visualization/viewport";
import type { DrawerGraph, DrawerGraphEdge, DrawerGraphNode } from "../lib/workspace/graph";

interface DrawerGraphViewProps {
  graph: DrawerGraph;
  selectedPath: string;
  onOpenDocument: (path: string) => void;
}

interface GraphFilters {
  folders: boolean;
  system: boolean;
  links: boolean;
  broken: boolean;
}

const DEFAULT_FILTERS: GraphFilters = {
  folders: true,
  system: false,
  links: true,
  broken: true,
};

const DEFAULT_DIMENSIONS: GraphDimensions = { width: DEFAULT_GRAPH_WIDTH, height: DEFAULT_GRAPH_HEIGHT };

export function DrawerGraphView({ graph, selectedPath, onOpenDocument }: DrawerGraphViewProps) {
  const [filters, setFilters] = useState<GraphFilters>(DEFAULT_FILTERS);
  const [viewport, setViewport] = useState<ViewportTransform>(DEFAULT_VIEWPORT);
  const [dimensions, setDimensions] = useState<GraphDimensions>(DEFAULT_DIMENSIONS);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [layout, setLayout] = useState<SimulatedDrawerGraph>({ nodes: [], edges: [] });
  const dragRef = useRef<
    { mode: "pan"; x: number; y: number } | { mode: "node"; nodeId: string; startX: number; startY: number; moved: boolean } | null
  >(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const nodesRef = useRef<SimulatedGraphNode[]>([]);
  const simulationRef = useRef<ReturnType<typeof createGraphSimulation> | null>(null);
  const suppressNodeClickRef = useRef(false);
  const filtered = useMemo(() => filterGraph(graph, filters), [filters, graph]);
  const activeNeighborhood = useMemo(() => graphNeighborhood(filtered, activeNodeId), [activeNodeId, filtered]);

  const fit = useCallback(() => {
    setViewport(fitViewportToBounds(graphBounds(nodesRef.current), dimensions.width, dimensions.height));
  }, [dimensions.height, dimensions.width]);

  const onPointerMove = useCallback((event: PointerEvent<SVGSVGElement>) => {
    const previous = dragRef.current;
    if (!previous) return;
    if (previous.mode === "node") {
      const node = nodesRef.current.find((candidate) => candidate.id === previous.nodeId);
      if (!node) return;
      const point = clientPointToGraph(event, svgRef.current, dimensions, viewport);
      node.fx = point.x;
      node.fy = point.y;
      previous.moved = previous.moved || pointerDistance(previous.startX, previous.startY, event.clientX, event.clientY) > 3;
      simulationRef.current?.alphaTarget(0.2).restart();
      setLayout({ nodes: [...nodesRef.current], edges: resolveGraphEdges(filtered.edges, nodesRef.current) });
      return;
    }
    dragRef.current = { mode: "pan", x: event.clientX, y: event.clientY };
    setViewport((current) => panViewport(current, event.clientX - previous.x, event.clientY - previous.y));
  }, [dimensions, filtered.edges, viewport]);

  const endPointerInteraction = useCallback((event?: PointerEvent<SVGSVGElement | SVGGElement>) => {
    const current = dragRef.current;
    if (current?.mode === "node") {
      current.moved = current.moved || (event ? pointerDistance(current.startX, current.startY, event.clientX, event.clientY) > 3 : false);
      const node = nodesRef.current.find((candidate) => candidate.id === current.nodeId);
      if (node) {
        node.fx = undefined;
        node.fy = undefined;
      }
      suppressNodeClickRef.current = current.moved;
      simulationRef.current?.alphaTarget(0).restart();
    }
    dragRef.current = null;
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const updateDimensions = () => {
      const rect = stage.getBoundingClientRect();
      setDimensions({
        width: Math.max(360, Math.round(rect.width || DEFAULT_GRAPH_WIDTH)),
        height: Math.max(360, Math.round(rect.height || DEFAULT_GRAPH_HEIGHT)),
      });
    };
    updateDimensions();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateDimensions);
      return () => window.removeEventListener("resize", updateDimensions);
    }
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    simulationRef.current?.stop();
    if (!filtered.nodes.length) {
      nodesRef.current = [];
      setLayout({ nodes: [], edges: [] });
      return undefined;
    }
    const nodes = createInitialGraphNodes(filtered, dimensions, nodesRef.current);
    const links = createSimulationLinks(filtered, nodes);
    nodesRef.current = nodes;
    const simulation = createGraphSimulation(nodes, links, dimensions);
    simulationRef.current = simulation;
    setLayout({ nodes: [...nodes], edges: resolveGraphEdges(filtered.edges, nodes) });
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (prefersReducedMotion) {
      simulation.stop();
      for (let index = 0; index < 120; index += 1) simulation.tick();
      setLayout({ nodes: [...nodes], edges: resolveGraphEdges(filtered.edges, nodes) });
      setViewport(fitViewportToBounds(graphBounds(nodes), dimensions.width, dimensions.height));
      return () => simulation.stop();
    }
    simulation.on("tick", () => {
      setLayout({ nodes: [...nodes], edges: resolveGraphEdges(filtered.edges, nodes) });
    });
    simulation.on("end", () => {
      simulation.alphaTarget(0);
      setLayout({ nodes: [...nodes], edges: resolveGraphEdges(filtered.edges, nodes) });
    });
    setViewport(fitViewportToBounds(graphBounds(nodes), dimensions.width, dimensions.height));
    return () => {
      simulation.stop();
      simulation.on("tick", null);
      simulation.on("end", null);
    };
  }, [dimensions, filtered]);

  if (!graph.nodes.length) {
    return (
      <main className="drawer-graph-view empty-graph">
        <h2>Bundle graph</h2>
        <p>Open a bundle with documents to visualize folder structure and document links.</p>
      </main>
    );
  }

  return (
    <main className="drawer-graph-view">
      <div className="graph-header">
        <div>
          <span className="eyebrow">Bundle graph</span>
          <h2>Documents and links</h2>
        </div>
        <div className="graph-actions">
          <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => setViewport((current) => zoomViewport(current, 0.84))}>
            <Minus size={15} />
          </button>
          <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => setViewport((current) => zoomViewport(current, 1.18))}>
            <Plus size={15} />
          </button>
          <button type="button" aria-label="Fit graph" title="Fit graph" onClick={fit}>
            <Maximize2 size={15} />
          </button>
          <button type="button" aria-label="Reset graph" title="Reset graph" onClick={() => setViewport(DEFAULT_VIEWPORT)}>
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
      <div className="graph-filters" aria-label="Graph filters">
        <GraphCheck label="Folders" checked={filters.folders} onChange={(value) => setFilters((current) => ({ ...current, folders: value }))} />
        <GraphCheck label="System files" checked={filters.system} onChange={(value) => setFilters((current) => ({ ...current, system: value }))} />
        <GraphCheck label="Links" checked={filters.links} onChange={(value) => setFilters((current) => ({ ...current, links: value }))} />
        <GraphCheck label="Broken" checked={filters.broken} onChange={(value) => setFilters((current) => ({ ...current, broken: value }))} />
      </div>
      <div className="graph-stage" ref={stageRef}>
        {!filtered.nodes.length ? (
          <div className="graph-filter-empty">
            <h3>No graph content visible</h3>
            <p>Adjust filters to show bundle nodes and links.</p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            className="drawer-graph-svg"
            role="img"
            aria-label="Bundle folder and document graph"
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            onMouseDown={(event) => {
              event.preventDefault();
              clearNativeSelection();
            }}
            onDragStart={(event) => {
              event.preventDefault();
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              clearNativeSelection();
              dragRef.current = { mode: "pan", x: event.clientX, y: event.clientY };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={onPointerMove}
            onPointerUp={endPointerInteraction}
            onPointerCancel={endPointerInteraction}
            onWheel={(event) => {
              event.preventDefault();
              setViewport((current) => zoomViewport(current, event.deltaY > 0 ? 0.9 : 1.1));
            }}
          >
            <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
              {layout.edges.map((edge) => (
                <line
                  key={edge.id}
                  className={`graph-edge edge-${edge.kind} ${edgeStateClass(edge, activeNeighborhood)}`}
                  x1={edge.sourceNode.x}
                  y1={edge.sourceNode.y}
                  x2={edge.targetNode.x}
                  y2={edge.targetNode.y}
                >
                  <title>{edge.label}</title>
                </line>
              ))}
              {layout.nodes.map((node) => {
                const selected = selectedPath && node.path === selectedPath;
                const openNode = () => {
                  if (node.kind === "document") onOpenDocument(node.path);
                };
                const radius = graphNodeRadius(node);
                return (
                  <g
                    key={node.id}
                    className={`graph-node is-${node.kind} ${selected ? "selected" : ""} ${nodeStateClass(node.id, activeNeighborhood)}`}
                    transform={`translate(${node.x} ${node.y})`}
                    role={node.kind === "document" ? "button" : "img"}
                    tabIndex={0}
                    aria-label={nodeAriaLabel(node)}
                    onPointerEnter={() => setActiveNodeId(node.id)}
                    onPointerLeave={() => setActiveNodeId((current) => (current === node.id ? null : current))}
                    onFocus={() => setActiveNodeId(node.id)}
                    onBlur={() => setActiveNodeId((current) => (current === node.id ? null : current))}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      clearNativeSelection();
                    }}
                    onDragStart={(event) => {
                      event.preventDefault();
                    }}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      clearNativeSelection();
                      event.stopPropagation();
                      dragRef.current = { mode: "node", nodeId: node.id, startX: event.clientX, startY: event.clientY, moved: false };
                      node.fx = node.x;
                      node.fy = node.y;
                      simulationRef.current?.alphaTarget(0.24).restart();
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerUp={(event) => {
                      event.stopPropagation();
                      endPointerInteraction(event);
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (suppressNodeClickRef.current) {
                        suppressNodeClickRef.current = false;
                        return;
                      }
                      openNode();
                    }}
                    onKeyDown={(event) => {
                      if (node.kind !== "document" || (event.key !== "Enter" && event.key !== " ")) return;
                      event.preventDefault();
                      openNode();
                    }}
                  >
                    {node.kind === "broken" ? <rect x={-radius} y={-radius} width={radius * 2} height={radius * 2} rx={3} /> : <circle r={radius} />}
                    <text className="graph-node-label-halo" y={radius + 13}>{node.shortLabel}</text>
                    <text y={radius + 13}>{node.shortLabel}</text>
                    <title>{nodeAriaLabel(node)}</title>
                  </g>
                );
              })}
            </g>
          </svg>
        )}
      </div>
    </main>
  );
}

function GraphCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="graph-check">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
      <span>{label}</span>
    </label>
  );
}

function filterGraph(graph: DrawerGraph, filters: GraphFilters): DrawerGraph {
  const nodes = graph.nodes.filter((node) => keepNode(node, filters));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => keepEdge(edge, filters) && nodeIds.has(edge.source) && nodeIds.has(edge.target));
  return { nodes, edges };
}

function keepNode(node: DrawerGraphNode, filters: GraphFilters): boolean {
  if (node.kind === "folder" && !filters.folders) return false;
  if (node.kind === "system" && !filters.system) return false;
  if (node.kind === "broken" && !filters.broken) return false;
  return true;
}

function keepEdge(edge: DrawerGraphEdge, filters: GraphFilters): boolean {
  if (edge.kind === "link" && !filters.links) return false;
  if (edge.kind === "broken-link" && (!filters.links || !filters.broken)) return false;
  return true;
}

function nodeAriaLabel(node: DrawerGraphNode): string {
  const degree = node.inbound || node.outbound ? `, ${node.inbound} inbound, ${node.outbound} outbound` : "";
  return `${node.label}, ${node.kind}${node.path ? `, ${node.path}` : ""}${degree}`;
}

function nodeStateClass(nodeId: string, neighborhood: ReturnType<typeof graphNeighborhood>): string {
  if (!neighborhood.nodeIds.size) return "";
  return neighborhood.nodeIds.has(nodeId) ? "is-neighbor" : "is-dimmed";
}

function edgeStateClass(edge: DrawerGraphEdge, neighborhood: ReturnType<typeof graphNeighborhood>): string {
  if (!neighborhood.edgeIds.size) return "";
  return neighborhood.edgeIds.has(edge.id) ? "is-neighbor" : "is-dimmed";
}

function clientPointToGraph(
  event: PointerEvent<SVGSVGElement>,
  svg: SVGSVGElement | null,
  dimensions: GraphDimensions,
  viewport: ViewportTransform,
): { x: number; y: number } {
  const rect = svg?.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  const svgX = ((event.clientX - rect.left) / rect.width) * dimensions.width;
  const svgY = ((event.clientY - rect.top) / rect.height) * dimensions.height;
  return {
    x: (svgX - viewport.x) / viewport.scale,
    y: (svgY - viewport.y) / viewport.scale,
  };
}

function pointerDistance(startX: number, startY: number, endX: number, endY: number): number {
  return Math.hypot(endX - startX, endY - startY);
}

function clearNativeSelection(): void {
  window.getSelection()?.removeAllRanges();
}
