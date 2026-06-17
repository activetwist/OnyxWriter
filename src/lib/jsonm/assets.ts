import baselineRaw from "../../assets/jsonm/baseline/onyxwriter-baseline-v0.1.0.jsonm?raw";
import tokenMap from "../../assets/jsonm/schema/token-map.json";
import bfRaw from "../../assets/jsonm/archetypes/bf-billboard-fintech-v0.1.0.jsonm?raw";
import bmRaw from "../../assets/jsonm/archetypes/bm-brutalist-minimalist-v0.1.0.jsonm?raw";
import cgRaw from "../../assets/jsonm/archetypes/cg-consumer-gallery-v0.1.0.jsonm?raw";
import dtRaw from "../../assets/jsonm/archetypes/dt-dev-terminal-v0.1.0.jsonm?raw";
import ecRaw from "../../assets/jsonm/archetypes/ec-enterprise-clean-v0.1.0.jsonm?raw";
import emRaw from "../../assets/jsonm/archetypes/em-editorial-magazine-v0.1.0.jsonm?raw";
import fpRaw from "../../assets/jsonm/archetypes/fp-friendly-productivity-v0.1.0.jsonm?raw";
import ftRaw from "../../assets/jsonm/archetypes/ft-fintech-trust-v0.1.0.jsonm?raw";
import lvRaw from "../../assets/jsonm/archetypes/lv-luxury-void-v0.1.0.jsonm?raw";
import whRaw from "../../assets/jsonm/archetypes/wh-warm-humanist-v0.1.0.jsonm?raw";
import { parseJsonm } from "./validator";
import type { JsonmDefinition, JsonmTokenMap } from "./types";

export interface BundledJsonmSystem {
  source: "baseline" | "archetype";
  definition: JsonmDefinition;
  raw: string;
}

const archetypeRaws = [bfRaw, bmRaw, cgRaw, dtRaw, ecRaw, emRaw, fpRaw, ftRaw, lvRaw, whRaw];

export const jsonmTokenMap = tokenMap as JsonmTokenMap;

export const bundledJsonmSystems: BundledJsonmSystem[] = [
  { source: "baseline", raw: baselineRaw, definition: parseJsonm(baselineRaw) },
  ...archetypeRaws.map((raw) => ({ source: "archetype" as const, raw, definition: parseJsonm(raw) })),
];

export function baselineJsonmDefinition(): JsonmDefinition {
  return bundledJsonmSystems[0].definition;
}

