import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import type { DrawerGraph, DrawerGraphEdge, DrawerGraphNode } from "../workspace/graph";

export const DEFAULT_GRAPH_WIDTH = 960;
export const DEFAULT_GRAPH_HEIGHT = 640;

export interface GraphDimensions {
  width: number;
  height: number;
}

export interface SimulatedGraphNode extends DrawerGraphNode, SimulationNodeDatum {
  x: number;
  y: number;
  radius: number;
  label: string;
  shortLabel: string;
}

export interface SimulatedGraphLink extends SimulationLinkDatum<SimulatedGraphNode> {
  id: string;
  kind: DrawerGraphEdge["kind"];
  label: string;
  broken?: boolean;
  source: string | SimulatedGraphNode;
  target: string | SimulatedGraphNode;
}

export interface SimulatedGraphEdge extends DrawerGraphEdge {
  sourceNode: SimulatedGraphNode;
  targetNode: SimulatedGraphNode;
}

export interface SimulatedDrawerGraph {
  nodes: SimulatedGraphNode[];
  edges: SimulatedGraphEdge[];
}

export interface GraphBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface GraphNeighborhood {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
}

export function createInitialGraphNodes(
  graph: DrawerGraph,
  dimensions: GraphDimensions,
  previousNodes: readonly SimulatedGraphNode[] = [],
): SimulatedGraphNode[] {
  const previousById = new Map(previousNodes.map((node) => [node.id, node]));
  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;
  const ring = Math.max(96, Math.min(dimensions.width, dimensions.height) * 0.22);

  return graph.nodes.map((node, index) => {
    const previous = previousById.get(node.id);
    const angle = (index / Math.max(1, graph.nodes.length)) * Math.PI * 2;
    const depthOffset = Math.min(3, node.depth) * 34;
    return {
      ...node,
      radius: graphNodeRadius(node),
      label: node.label,
      shortLabel: truncateGraphLabel(node.label),
      x: previous?.x ?? centerX + Math.cos(angle) * (ring + depthOffset),
      y: previous?.y ?? centerY + Math.sin(angle) * (ring + depthOffset),
      vx: previous?.vx ?? 0,
      vy: previous?.vy ?? 0,
    };
  });
}

export function createSimulationLinks(graph: DrawerGraph, nodes: readonly SimulatedGraphNode[]): SimulatedGraphLink[] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  return graph.edges
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .map((edge) => ({
      id: edge.id,
      kind: edge.kind,
      label: edge.label,
      broken: edge.broken,
      source: edge.source,
      target: edge.target,
    }));
}

export function createGraphSimulation(
  nodes: SimulatedGraphNode[],
  links: SimulatedGraphLink[],
  dimensions: GraphDimensions,
): Simulation<SimulatedGraphNode, SimulatedGraphLink> {
  return forceSimulation<SimulatedGraphNode, SimulatedGraphLink>(nodes)
    .alpha(0.92)
    .alphaMin(0.025)
    .alphaDecay(0.034)
    .velocityDecay(0.34)
    .force("charge", forceManyBody<SimulatedGraphNode>().strength(nodeCharge))
    .force("center", forceCenter(dimensions.width / 2, dimensions.height / 2))
    .force("collision", forceCollide<SimulatedGraphNode>().radius((node) => node.radius + 10).strength(0.72))
    .force(
      "link",
      forceLink<SimulatedGraphNode, SimulatedGraphLink>(links)
        .id((node) => node.id)
        .distance(linkDistance)
        .strength(linkStrength),
    );
}

export function settleDrawerGraph(graph: DrawerGraph, dimensions: GraphDimensions, ticks = 150): SimulatedDrawerGraph {
  const nodes = createInitialGraphNodes(graph, dimensions);
  const links = createSimulationLinks(graph, nodes);
  const simulation = createGraphSimulation(nodes, links, dimensions).stop();
  for (let index = 0; index < ticks; index += 1) simulation.tick();
  simulation.stop();
  return {
    nodes,
    edges: resolveGraphEdges(graph.edges, nodes),
  };
}

export function resolveGraphEdges(edges: readonly DrawerGraphEdge[], nodes: readonly SimulatedGraphNode[]): SimulatedGraphEdge[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  return edges.flatMap((edge) => {
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);
    return sourceNode && targetNode ? [{ ...edge, sourceNode, targetNode }] : [];
  });
}

export function graphNodeRadius(node: DrawerGraphNode): number {
  const degree = Math.max(0, (node.inbound || 0) + (node.outbound || 0));
  const connectionScale = Math.sqrt(degree) * 0.95;
  if (node.kind === "root") return Math.min(10, 6 + connectionScale);
  if (node.kind === "folder") return Math.min(8.5, 4.7 + connectionScale);
  if (node.kind === "broken") return Math.min(6, 3.6 + connectionScale * 0.45);
  if (node.kind === "system") return Math.min(7, 4.2 + connectionScale * 0.75);
  return Math.min(8.5, 4.2 + connectionScale);
}

export function truncateGraphLabel(label: string, maxLength = 24): string {
  if (label.length <= maxLength) return label;
  return `${label.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

export function graphBounds(nodes: readonly SimulatedGraphNode[], padding = 48): GraphBounds {
  if (!nodes.length) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1, width: 1, height: 1 };
  }
  const minX = Math.min(...nodes.map((node) => node.x - node.radius)) - padding;
  const minY = Math.min(...nodes.map((node) => node.y - node.radius - 18)) - padding;
  const maxX = Math.max(...nodes.map((node) => node.x + node.radius + Math.min(120, node.shortLabel.length * 6))) + padding;
  const maxY = Math.max(...nodes.map((node) => node.y + node.radius + 24)) + padding;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export function graphNeighborhood(graph: DrawerGraph, nodeId: string | null): GraphNeighborhood {
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  if (!nodeId) return { nodeIds, edgeIds };
  nodeIds.add(nodeId);
  for (const edge of graph.edges) {
    if (edge.source !== nodeId && edge.target !== nodeId) continue;
    edgeIds.add(edge.id);
    nodeIds.add(edge.source);
    nodeIds.add(edge.target);
  }
  return { nodeIds, edgeIds };
}

function nodeCharge(node: SimulatedGraphNode): number {
  if (node.kind === "root") return -520;
  if (node.kind === "folder") return -360;
  if (node.kind === "broken") return -170;
  if (node.kind === "system") return -220;
  return -285 - Math.min(4, node.inbound + node.outbound) * 22;
}

function linkDistance(link: SimulatedGraphLink): number {
  if (link.kind === "contains") return 54;
  if (link.kind === "broken-link") return 158;
  return 132;
}

function linkStrength(link: SimulatedGraphLink): number {
  if (link.kind === "contains") return 0.72;
  if (link.kind === "broken-link") return 0.08;
  return 0.18;
}
