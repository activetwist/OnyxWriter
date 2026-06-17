import type { DrawerGraph } from "../workspace/graph";
import { settleDrawerGraph, type SimulatedDrawerGraph, type SimulatedGraphEdge, type SimulatedGraphNode } from "./drawerGraphPhysics";

export type PositionedGraphNode = SimulatedGraphNode;

export type PositionedGraphEdge = SimulatedGraphEdge;

export type PositionedDrawerGraph = SimulatedDrawerGraph;

export function layoutDrawerGraph(graph: DrawerGraph, width = 960, height = 640): PositionedDrawerGraph {
  return settleDrawerGraph(graph, { width, height });
}
