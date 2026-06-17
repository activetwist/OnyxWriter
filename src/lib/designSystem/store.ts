import { bundledJsonmSystems, jsonmTokenMap, parseJsonm, validateJsonmDefinition } from "../jsonm";
import { deleteImportedDesignSystem, readActiveDesignSystemId, readImportedDesignSystems, saveImportedDesignSystem, writeActiveDesignSystemId } from "./api";
import type { DesignSystemRecord, DesignSystemSettingsState, DesignSystemSource } from "./types";

export const DEFAULT_DESIGN_SYSTEM_ID = "archetype-ec";

export async function loadDesignSystemState(): Promise<DesignSystemSettingsState> {
  const systems = [...bundledRecords(), ...(await importedRecords())];
  let activeId = await readActiveDesignSystemId();
  const errors: string[] = [];
  if (shouldUseDefaultDesignSystem(activeId, systems)) {
    activeId = defaultDesignSystemId(systems);
    await writeActiveDesignSystemId(activeId);
    errors.push("Active design system was missing or legacy-defaulted and has been reset to Enterprise Clean.");
  }
  const active = systems.find((system) => system.id === activeId) ?? systems[0];
  return {
    activeId,
    previewId: activeId,
    appearanceMode: active.definition.settings.defaultMode,
    systems,
    errors,
  };
}

export async function importDesignSystem(contents: string): Promise<DesignSystemRecord> {
  const definition = parseJsonm(contents);
  const validation = validateJsonmDefinition(definition, jsonmTokenMap);
  if (!validation.valid) {
    throw new Error(validation.errors.join("\n"));
  }
  const id = `imported-${slug(definition.id || definition.name)}`;
  await saveImportedDesignSystem(id, contents);
  return toRecord("imported", definition, contents, id);
}

export async function applyDesignSystem(id: string): Promise<void> {
  await writeActiveDesignSystemId(id);
}

export async function resetDesignSystem(): Promise<string> {
  const id = defaultDesignSystemId(bundledRecords());
  await writeActiveDesignSystemId(id);
  return id;
}

export async function removeImportedDesignSystem(id: string): Promise<void> {
  await deleteImportedDesignSystem(id);
}

export function activeDesignSystem(state: DesignSystemSettingsState): DesignSystemRecord {
  return state.systems.find((system) => system.id === state.activeId) ?? state.systems[0];
}

function bundledRecords(): DesignSystemRecord[] {
  return bundledJsonmSystems.map((system) => toRecord(system.source, system.definition, system.raw));
}

async function importedRecords(): Promise<DesignSystemRecord[]> {
  const rows = await readImportedDesignSystems();
  const records: DesignSystemRecord[] = [];
  for (const row of rows) {
    try {
      const record = toRecord("imported", parseJsonm(row.contents), row.contents, row.id);
      if (record.validation.valid) records.push(record);
    } catch {
      // Invalid persisted imports are ignored and can be replaced by re-import.
    }
  }
  return records;
}

function toRecord(source: DesignSystemSource, definition: ReturnType<typeof parseJsonm>, raw: string, forcedId?: string): DesignSystemRecord {
  const validation = validateJsonmDefinition(definition, jsonmTokenMap);
  return {
    id: forcedId ?? `${source}-${definition.id}`,
    source,
    name: definition.name,
    description: definition.description,
    definition,
    raw,
    validation,
  };
}

export function defaultDesignSystemId(systems: DesignSystemRecord[]): string {
  return systems.find((system) => system.id === DEFAULT_DESIGN_SYSTEM_ID)?.id ?? baselineId(systems);
}

export function shouldUseDefaultDesignSystem(activeId: string, systems: DesignSystemRecord[]): boolean {
  return !activeId || activeId === baselineId(systems) || !systems.some((system) => system.id === activeId);
}

function baselineId(systems: DesignSystemRecord[]): string {
  return systems.find((system) => system.source === "baseline")?.id ?? systems[0]?.id ?? "";
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
