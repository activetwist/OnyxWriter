import { compileJsonmTheme, jsonmTokenMap } from "../jsonm";
import type { JsonmMode } from "../jsonm";
import type { DesignSystemRecord } from "./types";

export function compileDesignSystemCss(system: DesignSystemRecord, mode?: JsonmMode): string {
  return compileJsonmTheme(system.definition, jsonmTokenMap, undefined, mode).cssText;
}
