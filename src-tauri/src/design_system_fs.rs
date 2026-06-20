use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
pub struct StoredDesignSystem {
    id: String,
    contents: String,
}

#[derive(Serialize, Deserialize, Default)]
pub struct DesignSystemSettings {
    active_id: String,
}

fn store_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app data directory unavailable: {e}"))?
        .join("design-systems");
    fs::create_dir_all(&dir).map_err(|e| format!("create design-system store failed: {e}"))?;
    Ok(dir)
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app data directory unavailable: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("create app data directory failed: {e}"))?;
    Ok(dir.join("design-system-settings.json"))
}

fn clean_id(id: &str) -> Result<String, String> {
    let trimmed = id.trim();
    if trimmed.is_empty() {
        return Err("design system id is required".into());
    }
    if !trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_'))
    {
        return Err("design system id contains unsupported characters".into());
    }
    Ok(trimmed.to_string())
}

#[tauri::command]
pub fn read_design_system_import_file(source_path: String) -> Result<String, String> {
    let path = PathBuf::from(&source_path);
    if !path.is_file() {
        return Err("selected JSONM file is not readable".into());
    }
    match path.extension().and_then(|part| part.to_str()) {
        Some("json") | Some("jsonm") => {}
        _ => return Err("design system import must be a .json or .jsonm file".into()),
    }
    fs::read_to_string(path).map_err(|e| format!("read design system failed: {e}"))
}

#[tauri::command]
pub fn list_imported_design_systems(app: AppHandle) -> Result<Vec<StoredDesignSystem>, String> {
    let dir = store_dir(&app)?;
    let mut rows = Vec::new();
    for entry in fs::read_dir(dir).map_err(|e| format!("read design-system store failed: {e}"))? {
        let entry = entry.map_err(|e| format!("read design-system entry failed: {e}"))?;
        let path = entry.path();
        if path.extension().and_then(|part| part.to_str()) != Some("jsonm") {
            continue;
        }
        let id = path
            .file_stem()
            .and_then(|part| part.to_str())
            .unwrap_or_default()
            .to_string();
        let contents = fs::read_to_string(path)
            .map_err(|e| format!("read imported design system failed: {e}"))?;
        rows.push(StoredDesignSystem { id, contents });
    }
    rows.sort_by(|left, right| left.id.cmp(&right.id));
    Ok(rows)
}

#[tauri::command]
pub fn save_imported_design_system(
    app: AppHandle,
    id: String,
    contents: String,
) -> Result<(), String> {
    let id = clean_id(&id)?;
    let path = store_dir(&app)?.join(format!("{id}.jsonm"));
    fs::write(path, contents).map_err(|e| format!("save imported design system failed: {e}"))
}

#[tauri::command]
pub fn delete_imported_design_system(app: AppHandle, id: String) -> Result<(), String> {
    let id = clean_id(&id)?;
    let path = store_dir(&app)?.join(format!("{id}.jsonm"));
    if path.exists() {
        fs::remove_file(path).map_err(|e| format!("delete imported design system failed: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
pub fn read_design_system_settings(app: AppHandle) -> Result<DesignSystemSettings, String> {
    let path = settings_path(&app)?;
    if !path.exists() {
        return Ok(DesignSystemSettings::default());
    }
    let raw =
        fs::read_to_string(path).map_err(|e| format!("read design-system settings failed: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("parse design-system settings failed: {e}"))
}

#[tauri::command]
pub fn write_design_system_settings(app: AppHandle, active_id: String) -> Result<(), String> {
    let settings = DesignSystemSettings { active_id };
    let raw = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("serialize design-system settings failed: {e}"))?;
    fs::write(settings_path(&app)?, raw)
        .map_err(|e| format!("write design-system settings failed: {e}"))
}
