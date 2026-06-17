use serde::Serialize;
use std::{
    fs,
    io::Write,
    path::{Component, Path, PathBuf},
};

#[derive(Serialize)]
pub struct WorkspaceEntry {
    name: String,
    path: String,
    kind: String,
    reserved: bool,
    children: Vec<WorkspaceEntry>,
}

#[derive(Serialize)]
pub struct WorkspaceFolderInspection {
    path: String,
    name: String,
    entries: Vec<String>,
    project_markers: Vec<String>,
    okf_markers: Vec<String>,
    has_markdown: bool,
}

const IGNORED_WORKSPACE_NAMES: &[&str] = &[
    ".git",
    ".hg",
    ".svn",
    "node_modules",
    "dist",
    "build",
    "target",
    ".venv",
    "venv",
    "__pycache__",
    ".idea",
    ".vscode",
    "coverage",
    "vendor",
];

const PROJECT_ROOT_MARKERS: &[&str] = &[
    ".git",
    "package.json",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
    "Cargo.toml",
    "pyproject.toml",
    "composer.json",
    "go.mod",
    "Gemfile",
    "Makefile",
];

const OKF_ROOT_MARKERS: &[&str] = &["index.md", "log.md"];

fn is_ignored_workspace_name(name: &str) -> bool {
    IGNORED_WORKSPACE_NAMES
        .iter()
        .any(|ignored| ignored == &name)
}

fn clean_relative_path(path: &str) -> Result<PathBuf, String> {
    let rel = Path::new(path);
    if rel.is_absolute() {
        return Err("path must be bundle-relative".into());
    }
    let mut out = PathBuf::new();
    for component in rel.components() {
        match component {
            Component::Normal(part) => out.push(part),
            Component::CurDir => {}
            _ => return Err("path traversal is not allowed".into()),
        }
    }
    Ok(out)
}

fn resolve_under_root(root: &str, relative_path: &str) -> Result<PathBuf, String> {
    let root_path = fs::canonicalize(root).map_err(|e| format!("workspace not found: {e}"))?;
    if !root_path.is_dir() {
        return Err("workspace root must be a directory".into());
    }
    let rel = clean_relative_path(relative_path)?;
    let joined = root_path.join(rel);
    if let Some(parent) = joined.parent() {
        let canonical_parent = if parent.exists() {
            fs::canonicalize(parent).map_err(|e| format!("invalid parent: {e}"))?
        } else {
            let mut current = parent;
            while !current.exists() {
                current = current
                    .parent()
                    .ok_or_else(|| "invalid parent path".to_string())?;
            }
            fs::canonicalize(current).map_err(|e| format!("invalid parent: {e}"))?
        };
        if !canonical_parent.starts_with(&root_path) {
            return Err("path escapes workspace".into());
        }
    }
    Ok(joined)
}

fn rel_string(root: &Path, path: &Path) -> Result<String, String> {
    let rel = path
        .strip_prefix(root)
        .map_err(|_| "entry escapes workspace".to_string())?;
    Ok(rel.to_string_lossy().replace('\\', "/"))
}

fn build_entry(root: &Path, path: &Path) -> Result<Option<WorkspaceEntry>, String> {
    let name = path
        .file_name()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| {
            root.file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string()
        });
    let metadata = fs::metadata(path).map_err(|e| format!("metadata failed: {e}"))?;
    if metadata.is_dir() {
        if path != root {
            if let Some(name) = path.file_name().and_then(|value| value.to_str()) {
                if is_ignored_workspace_name(name) {
                    return Ok(None);
                }
            }
        }
        let mut children = Vec::new();
        let mut entries = fs::read_dir(path)
            .map_err(|e| format!("read_dir failed: {e}"))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("read_dir failed: {e}"))?;
        entries.sort_by_key(|e| e.path());
        for entry in entries {
            if let Some(child) = build_entry(root, &entry.path())? {
                children.push(child);
            }
        }
        Ok(Some(WorkspaceEntry {
            name,
            path: rel_string(root, path)?,
            kind: "folder".into(),
            reserved: false,
            children,
        }))
    } else if path.extension().and_then(|v| v.to_str()) == Some("md") {
        let reserved = matches!(name.as_str(), "index.md" | "log.md");
        Ok(Some(WorkspaceEntry {
            name,
            path: rel_string(root, path)?,
            kind: "file".into(),
            reserved,
            children: Vec::new(),
        }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn list_workspace(root: String) -> Result<WorkspaceEntry, String> {
    let root_path = fs::canonicalize(root).map_err(|e| format!("workspace not found: {e}"))?;
    build_entry(&root_path, &root_path)?.ok_or_else(|| "workspace not readable".into())
}

#[tauri::command]
pub fn directory_has_entries(root: String) -> Result<bool, String> {
    let root_path = fs::canonicalize(root).map_err(|e| format!("workspace not found: {e}"))?;
    if !root_path.is_dir() {
        return Err("workspace root must be a directory".into());
    }
    let mut entries = fs::read_dir(root_path).map_err(|e| format!("read_dir failed: {e}"))?;
    Ok(entries.next().is_some())
}

#[tauri::command]
pub fn inspect_workspace_folder(root: String) -> Result<WorkspaceFolderInspection, String> {
    let root_path = fs::canonicalize(root).map_err(|e| format!("workspace not found: {e}"))?;
    if !root_path.is_dir() {
        return Err("workspace root must be a directory".into());
    }
    let mut entries = Vec::new();
    let mut project_markers = Vec::new();
    let mut okf_markers = Vec::new();
    let mut has_markdown = false;
    for entry in fs::read_dir(&root_path).map_err(|e| format!("read_dir failed: {e}"))? {
        let entry = entry.map_err(|e| format!("read_dir failed: {e}"))?;
        let name = entry.file_name().to_string_lossy().to_string();
        if entry.path().extension().and_then(|value| value.to_str()) == Some("md") {
            has_markdown = true;
        }
        if PROJECT_ROOT_MARKERS
            .iter()
            .any(|marker| marker == &name.as_str())
        {
            project_markers.push(name.clone());
        }
        if OKF_ROOT_MARKERS
            .iter()
            .any(|marker| marker == &name.as_str())
        {
            okf_markers.push(name.clone());
        }
        entries.push(name);
    }
    entries.sort();
    project_markers.sort();
    okf_markers.sort();
    let name = root_path
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|| root_path.to_string_lossy().to_string());
    Ok(WorkspaceFolderInspection {
        path: root_path.to_string_lossy().to_string(),
        name,
        entries,
        project_markers,
        okf_markers,
        has_markdown,
    })
}

#[tauri::command]
pub fn initialize_workspace(root: String, title: String) -> Result<(), String> {
    let root_path = fs::canonicalize(root).map_err(|e| format!("workspace not found: {e}"))?;
    if !root_path.is_dir() {
        return Err("workspace root must be a directory".into());
    }
    let index_path = root_path.join("index.md");
    if !index_path.exists() {
        let safe_title = title.trim();
        let heading = if safe_title.is_empty() {
            "Onyx Workspace"
        } else {
            safe_title
        };
        let contents = format!(
            "---\nokf_version: \"0.1\"\n---\n\n# {heading}\n\n<!-- onyxwriter:index:start -->\n## Documents\n\n- No concept documents yet.\n<!-- onyxwriter:index:end -->\n"
        );
        fs::write(index_path, contents).map_err(|e| format!("initialize index failed: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
pub fn import_image_asset(root: String, source_path: String) -> Result<String, String> {
    let root_path = fs::canonicalize(root).map_err(|e| format!("bundle not found: {e}"))?;
    if !root_path.is_dir() {
        return Err("bundle root must be a directory".into());
    }
    let source = fs::canonicalize(source_path).map_err(|e| format!("image not found: {e}"))?;
    if !source.is_file() {
        return Err("selected image must be a file".into());
    }
    let extension = source
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    if !matches!(
        extension.as_str(),
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg"
    ) {
        return Err("unsupported image type".into());
    }
    let stem = source
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("image");
    let safe_stem = sanitize_asset_stem(stem);
    let asset_dir = root_path.join("assets").join("images");
    fs::create_dir_all(&asset_dir).map_err(|e| format!("create asset folder failed: {e}"))?;

    let mut counter = 0;
    loop {
        let filename = if counter == 0 {
            format!("{safe_stem}.{extension}")
        } else {
            format!("{safe_stem}-{counter}.{extension}")
        };
        let destination = asset_dir.join(&filename);
        if !destination.exists() {
            fs::copy(&source, &destination).map_err(|e| format!("copy image failed: {e}"))?;
            return Ok(format!("assets/images/{filename}"));
        }
        counter += 1;
    }
}

fn sanitize_asset_stem(value: &str) -> String {
    let mut out = String::new();
    for character in value.chars() {
        if character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.') {
            out.push(character);
        } else {
            out.push('-');
        }
    }
    let trimmed = out.trim_matches('-');
    if trimmed.is_empty() {
        "image".into()
    } else {
        trimmed.into()
    }
}

#[tauri::command]
pub fn read_text_file(root: String, relative_path: String) -> Result<String, String> {
    let path = resolve_under_root(&root, &relative_path)?;
    fs::read_to_string(path).map_err(|e| format!("read failed: {e}"))
}

#[tauri::command]
pub fn write_text_file(
    root: String,
    relative_path: String,
    contents: String,
) -> Result<(), String> {
    let path = resolve_under_root(&root, &relative_path)?;
    if path.extension().and_then(|v| v.to_str()) != Some("md") {
        return Err("only Markdown files can be written".into());
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("create parent failed: {e}"))?;
    }
    let tmp = path.with_extension("md.tmp");
    {
        let mut file = fs::File::create(&tmp).map_err(|e| format!("temp write failed: {e}"))?;
        file.write_all(contents.as_bytes())
            .map_err(|e| format!("write failed: {e}"))?;
        file.sync_all().map_err(|e| format!("sync failed: {e}"))?;
    }
    fs::rename(tmp, path).map_err(|e| format!("replace failed: {e}"))
}

#[tauri::command]
pub fn create_folder(root: String, relative_path: String) -> Result<(), String> {
    let path = resolve_under_root(&root, &relative_path)?;
    fs::create_dir_all(path).map_err(|e| format!("create folder failed: {e}"))
}

#[tauri::command]
pub fn create_markdown_file(
    root: String,
    relative_path: String,
    contents: String,
) -> Result<(), String> {
    let path = resolve_under_root(&root, &relative_path)?;
    if path.extension().and_then(|v| v.to_str()) != Some("md") {
        return Err("concept files must end in .md".into());
    }
    if path.exists() {
        return Err("file already exists".into());
    }
    write_text_file(root, relative_path, contents)
}

#[tauri::command]
pub fn rename_path(
    root: String,
    relative_path: String,
    new_name: String,
) -> Result<String, String> {
    if new_name.contains('/') || new_name.contains('\\') || new_name.trim().is_empty() {
        return Err("new name must be a single path segment".into());
    }
    let from = resolve_under_root(&root, &relative_path)?;
    let to = from
        .parent()
        .ok_or_else(|| "cannot rename workspace root".to_string())?
        .join(new_name);
    fs::rename(&from, &to).map_err(|e| format!("rename failed: {e}"))?;
    let root_path = fs::canonicalize(root).map_err(|e| format!("workspace not found: {e}"))?;
    rel_string(&root_path, &to)
}

#[tauri::command]
pub fn move_path(
    root: String,
    relative_path: String,
    destination_path: String,
) -> Result<(), String> {
    let from = resolve_under_root(&root, &relative_path)?;
    let to = resolve_under_root(&root, &destination_path)?;
    if let Some(parent) = to.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("create parent failed: {e}"))?;
    }
    fs::rename(from, to).map_err(|e| format!("move failed: {e}"))
}

#[tauri::command]
pub fn delete_path(root: String, relative_path: String) -> Result<(), String> {
    let path = resolve_under_root(&root, &relative_path)?;
    if path.is_dir() {
        fs::remove_dir_all(path).map_err(|e| format!("delete folder failed: {e}"))
    } else {
        fs::remove_file(path).map_err(|e| format!("delete file failed: {e}"))
    }
}
