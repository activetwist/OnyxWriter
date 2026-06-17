import type { JsonmDefinition, JsonmMode, JsonmValidationResult } from "../jsonm";

export type DesignSystemSource = "baseline" | "archetype" | "imported";

export interface DesignSystemRecord {
  id: string;
  source: DesignSystemSource;
  name: string;
  description: string;
  definition: JsonmDefinition;
  raw: string;
  validation: JsonmValidationResult;
}

export interface DesignSystemSettingsState {
  activeId: string;
  previewId: string;
  appearanceMode: JsonmMode;
  systems: DesignSystemRecord[];
  errors: string[];
}

export interface ImportedDesignSystemPayload {
  name: string;
  contents: string;
}

