use aes_gcm::{
    aead::{Aead, KeyInit, Payload},
    Aes256Gcm, Key, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use rand::{rngs::OsRng, RngCore};
use scrypt::{scrypt, Params as ScryptParams};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fs,
    path::{Component, Path, PathBuf},
};

const HEADER_FILE: &str = "onyx-encrypted-folder.json";
const STORAGE_DIR: &str = ".onyx-encrypted";
const OBJECTS_DIR: &str = "objects";
const TMP_DIR: &str = "tmp";
const MANIFEST_FILE: &str = "manifest.enc.json";
const FORMAT: &str = "onyx.encrypted-folder";
const MANIFEST_FORMAT: &str = "onyx.encrypted-folder.manifest";
const VERSION: u8 = 1;

const DEFAULT_INDEX: &str = "---\ntype: Index\ntitle: Bundle Index\n---\n\n# Bundle Index\n\nThis encrypted Onyx Writer bundle is managed locally.\n";
const DEFAULT_LOG: &str = "---\ntype: Log\ntitle: Bundle Log\n---\n\n# Bundle Log\n\n";

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Envelope {
    algorithm: String,
    nonce: String,
    tag: String,
    ciphertext: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct KeyWrap {
    algorithm: String,
    kdf: KdfSettings,
    envelope: Envelope,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct KdfSettings {
    name: String,
    n: u32,
    r: u32,
    p: u32,
    salt: String,
    key_length: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HeaderCrypto {
    data_key: KeyWrap,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HeaderStorage {
    manifest: String,
    objects: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Header {
    format: String,
    version: u8,
    created_at: String,
    updated_at: String,
    crypto: HeaderCrypto,
    storage: HeaderStorage,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ManifestEntry {
    kind: String,
    object_id: String,
    plaintext_hash: String,
    ciphertext_hash: String,
    size: usize,
    version: u32,
    updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    format: String,
    version: u8,
    bundle_name: String,
    created_at: String,
    updated_at: String,
    generation: u64,
    documents: BTreeMap<String, ManifestEntry>,
    assets: BTreeMap<String, ManifestEntry>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EncryptedObject {
    envelope: Envelope,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EncryptedFolderInfo {
    ok: bool,
    root_path: String,
    generation: u64,
    bundle_name: String,
    documents: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtectedFolderProbe {
    protected: bool,
    root_path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EncryptedDocumentRead {
    path: String,
    contents: String,
    generation: u64,
    version: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EncryptedDocumentWrite {
    ok: bool,
    path: String,
    generation: u64,
    version: u32,
}

#[tauri::command]
pub fn is_encrypted_folder(root: String) -> Result<ProtectedFolderProbe, String> {
    let root_path = fs::canonicalize(root).map_err(|e| format!("folder not found: {e}"))?;
    if !root_path.is_dir() {
        return Err("folder root must be a directory".into());
    }
    Ok(ProtectedFolderProbe {
        protected: root_path.join(HEADER_FILE).exists(),
        root_path: root_path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub fn initialize_encrypted_folder(
    root: String,
    passphrase: String,
    name: Option<String>,
) -> Result<EncryptedFolderInfo, String> {
    let root_path = PathBuf::from(&root);
    fs::create_dir_all(&root_path).map_err(|e| format!("create encrypted folder failed: {e}"))?;
    let root_path =
        fs::canonicalize(root_path).map_err(|e| format!("encrypted folder not found: {e}"))?;
    if !root_path.is_dir() {
        return Err("encrypted folder root must be a directory".into());
    }
    let header_path = root_path.join(HEADER_FILE);
    if header_path.exists() {
        return Err("encrypted folder already exists".into());
    }
    fs::create_dir_all(root_path.join(STORAGE_DIR).join(OBJECTS_DIR))
        .map_err(|e| format!("create encrypted objects folder failed: {e}"))?;
    fs::create_dir_all(root_path.join(STORAGE_DIR).join(TMP_DIR))
        .map_err(|e| format!("create encrypted tmp folder failed: {e}"))?;

    let mut data_key = [0u8; 32];
    OsRng.fill_bytes(&mut data_key);
    let now = iso_now();
    let header = Header {
        format: FORMAT.into(),
        version: VERSION,
        created_at: now.clone(),
        updated_at: now.clone(),
        crypto: HeaderCrypto {
            data_key: wrap_data_key(&passphrase, &data_key)?,
        },
        storage: HeaderStorage {
            manifest: format!("{STORAGE_DIR}/{MANIFEST_FILE}"),
            objects: format!("{STORAGE_DIR}/{OBJECTS_DIR}"),
        },
    };
    write_json_atomic(&header_path, &header)?;

    let bundle_name = name
        .filter(|value| !value.trim().is_empty())
        .or_else(|| {
            root_path
                .file_name()
                .map(|value| value.to_string_lossy().to_string())
        })
        .unwrap_or_else(|| "Encrypted Bundle".into());
    let mut manifest = Manifest {
        format: MANIFEST_FORMAT.into(),
        version: VERSION,
        bundle_name,
        created_at: now.clone(),
        updated_at: now,
        generation: 1,
        documents: BTreeMap::new(),
        assets: BTreeMap::new(),
    };
    manifest = put_document(
        &root_path,
        &data_key,
        manifest,
        "index.md",
        DEFAULT_INDEX,
        1,
    )?;
    manifest = put_document(&root_path, &data_key, manifest, "log.md", DEFAULT_LOG, 1)?;
    publish_manifest(&root_path, &data_key, &manifest)?;
    info_from_manifest(&root_path, manifest)
}

#[tauri::command]
pub fn protect_standard_folder(
    source_root: String,
    target_root: String,
    passphrase: String,
    name: Option<String>,
) -> Result<EncryptedFolderInfo, String> {
    let source_path =
        fs::canonicalize(source_root).map_err(|e| format!("source bundle not found: {e}"))?;
    if !source_path.is_dir() {
        return Err("source bundle must be a directory".into());
    }
    let target_path = PathBuf::from(&target_root);
    fs::create_dir_all(&target_path).map_err(|e| format!("create protected folder failed: {e}"))?;
    let target_path =
        fs::canonicalize(target_path).map_err(|e| format!("protected folder not found: {e}"))?;
    if source_path == target_path {
        return Err(
            "choose an empty protected destination folder outside the current standard bundle"
                .into(),
        );
    }
    if target_path.join(HEADER_FILE).exists() {
        return Err("protected destination already contains an encrypted bundle".into());
    }
    let visible_entries = fs::read_dir(&target_path)
        .map_err(|e| format!("read protected destination failed: {e}"))?
        .filter_map(Result::ok)
        .filter(|entry| entry.file_name().to_string_lossy() != ".DS_Store")
        .count();
    if visible_entries > 0 {
        return Err("protected destination folder must be empty".into());
    }

    let info = initialize_encrypted_folder(
        target_path.to_string_lossy().to_string(),
        passphrase.clone(),
        name,
    )?;
    let mut session = open_session(&info.root_path, &passphrase)?;
    let markdown_files = collect_markdown_files(&source_path, &source_path)?;
    for (relative_path, full_path) in markdown_files {
        let contents = fs::read_to_string(&full_path)
            .map_err(|e| format!("read source document failed: {relative_path}: {e}"))?;
        let version = session
            .manifest
            .documents
            .get(&relative_path)
            .map(|entry| entry.version + 1)
            .unwrap_or(1);
        session.manifest = put_document(
            &session.root_path,
            &session.data_key,
            session.manifest,
            &relative_path,
            &contents,
            version,
        )?;
    }
    session.manifest.generation += 1;
    session.manifest.updated_at = iso_now();
    publish_manifest(&session.root_path, &session.data_key, &session.manifest)?;
    info_from_manifest(&session.root_path, session.manifest)
}

#[tauri::command]
pub fn encrypted_folder_info(
    root: String,
    passphrase: String,
) -> Result<EncryptedFolderInfo, String> {
    let session = open_session(&root, &passphrase)?;
    info_from_manifest(&session.root_path, session.manifest)
}

#[tauri::command]
pub fn list_encrypted_folder(
    root: String,
    passphrase: String,
) -> Result<EncryptedFolderInfo, String> {
    encrypted_folder_info(root, passphrase)
}

#[tauri::command]
pub fn read_encrypted_document(
    root: String,
    passphrase: String,
    relative_path: String,
) -> Result<EncryptedDocumentRead, String> {
    let session = open_session(&root, &passphrase)?;
    let clean_path = clean_relative_path(&relative_path, true)?;
    let entry = session
        .manifest
        .documents
        .get(&clean_path)
        .ok_or_else(|| format!("encrypted document not found: {clean_path}"))?;
    let object = read_encrypted_object(&session.root_path, &entry.object_id)?;
    let plaintext = decrypt_bytes(
        &session.data_key,
        &object.envelope,
        &format!("document:{clean_path}:v{}", entry.version),
    )?;
    let contents =
        String::from_utf8(plaintext).map_err(|e| format!("document is not utf-8: {e}"))?;
    if sha256_hex(contents.as_bytes()) != entry.plaintext_hash {
        return Err("document hash does not match encrypted manifest".into());
    }
    Ok(EncryptedDocumentRead {
        path: clean_path,
        contents,
        generation: session.manifest.generation,
        version: entry.version,
    })
}

#[tauri::command]
pub fn write_encrypted_document(
    root: String,
    passphrase: String,
    relative_path: String,
    contents: String,
    expected_generation: Option<u64>,
) -> Result<EncryptedDocumentWrite, String> {
    let session = open_session(&root, &passphrase)?;
    let expected = expected_generation.unwrap_or(session.manifest.generation);
    if session.manifest.generation != expected {
        return Err(format!(
            "encrypted manifest conflict: expected generation {expected}, found {}",
            session.manifest.generation
        ));
    }
    let clean_path = clean_relative_path(&relative_path, true)?;
    let version = session
        .manifest
        .documents
        .get(&clean_path)
        .map(|entry| entry.version + 1)
        .unwrap_or(1);
    let mut manifest = put_document(
        &session.root_path,
        &session.data_key,
        session.manifest,
        &clean_path,
        &contents,
        version,
    )?;
    manifest.generation += 1;
    manifest.updated_at = iso_now();
    let next_version = manifest
        .documents
        .get(&clean_path)
        .map(|entry| entry.version)
        .unwrap_or(version);
    publish_manifest(&session.root_path, &session.data_key, &manifest)?;
    Ok(EncryptedDocumentWrite {
        ok: true,
        path: clean_path,
        generation: manifest.generation,
        version: next_version,
    })
}

struct Session {
    root_path: PathBuf,
    data_key: [u8; 32],
    manifest: Manifest,
}

fn open_session(root: &str, passphrase: &str) -> Result<Session, String> {
    let root_path =
        fs::canonicalize(root).map_err(|e| format!("encrypted folder not found: {e}"))?;
    if !root_path.is_dir() {
        return Err("encrypted folder root must be a directory".into());
    }
    let header = read_header(&root_path)?;
    let data_key = unwrap_data_key(passphrase, &header.crypto.data_key)?;
    let manifest = read_manifest(&root_path, &data_key)?;
    Ok(Session {
        root_path,
        data_key,
        manifest,
    })
}

fn read_header(root_path: &Path) -> Result<Header, String> {
    let text = fs::read_to_string(root_path.join(HEADER_FILE))
        .map_err(|e| format!("read encrypted folder header failed: {e}"))?;
    let header: Header = serde_json::from_str(&text)
        .map_err(|e| format!("parse encrypted folder header failed: {e}"))?;
    if header.format != FORMAT || header.version != VERSION {
        return Err("unsupported encrypted folder format".into());
    }
    Ok(header)
}

fn read_manifest(root_path: &Path, data_key: &[u8; 32]) -> Result<Manifest, String> {
    let text = fs::read_to_string(root_path.join(STORAGE_DIR).join(MANIFEST_FILE))
        .map_err(|e| format!("read encrypted manifest failed: {e}"))?;
    let object: EncryptedObject =
        serde_json::from_str(&text).map_err(|e| format!("parse encrypted manifest failed: {e}"))?;
    let plaintext = decrypt_bytes(
        data_key,
        &object.envelope,
        "onyxwriter:encrypted-folder-manifest:v1",
    )?;
    serde_json::from_slice(&plaintext).map_err(|e| format!("parse decrypted manifest failed: {e}"))
}

fn publish_manifest(
    root_path: &Path,
    data_key: &[u8; 32],
    manifest: &Manifest,
) -> Result<(), String> {
    let plaintext = serde_json::to_vec_pretty(manifest)
        .map_err(|e| format!("serialize encrypted manifest failed: {e}"))?;
    let envelope = encrypt_bytes(
        data_key,
        &plaintext,
        "onyxwriter:encrypted-folder-manifest:v1",
    )?;
    let object = EncryptedObject { envelope };
    write_json_atomic(&root_path.join(STORAGE_DIR).join(MANIFEST_FILE), &object)
}

fn put_document(
    root_path: &Path,
    data_key: &[u8; 32],
    mut manifest: Manifest,
    relative_path: &str,
    contents: &str,
    version: u32,
) -> Result<Manifest, String> {
    let clean_path = clean_relative_path(relative_path, true)?;
    let aad = format!("document:{clean_path}:v{version}");
    let object = write_encrypted_object(root_path, data_key, contents.as_bytes(), &aad)?;
    let now = iso_now();
    manifest.updated_at = now.clone();
    manifest.documents.insert(
        clean_path,
        ManifestEntry {
            kind: "document".into(),
            object_id: object.object_id,
            plaintext_hash: object.plaintext_hash,
            ciphertext_hash: object.ciphertext_hash,
            size: contents.len(),
            version,
            updated_at: now,
        },
    );
    Ok(manifest)
}

struct ObjectWriteResult {
    object_id: String,
    plaintext_hash: String,
    ciphertext_hash: String,
}

fn write_encrypted_object(
    root_path: &Path,
    data_key: &[u8; 32],
    plaintext: &[u8],
    aad: &str,
) -> Result<ObjectWriteResult, String> {
    let envelope = encrypt_bytes(data_key, plaintext, aad)?;
    let serialized = serde_json::to_vec_pretty(&EncryptedObject {
        envelope: envelope.clone(),
    })
    .map_err(|e| format!("serialize encrypted object failed: {e}"))?;
    let ciphertext_hash = sha256_hex(&serialized);
    let object_id = format!("{}.enc.json", ciphertext_hash);
    let object_path = root_path
        .join(STORAGE_DIR)
        .join(OBJECTS_DIR)
        .join(&object_id);
    write_bytes_atomic(&object_path, &serialized)?;
    Ok(ObjectWriteResult {
        object_id,
        plaintext_hash: sha256_hex(plaintext),
        ciphertext_hash,
    })
}

fn read_encrypted_object(root_path: &Path, object_id: &str) -> Result<EncryptedObject, String> {
    let clean = clean_relative_path(object_id, false)?;
    if clean.contains('/') {
        return Err("encrypted object id must be a filename".into());
    }
    let text = fs::read_to_string(root_path.join(STORAGE_DIR).join(OBJECTS_DIR).join(clean))
        .map_err(|e| format!("read encrypted object failed: {e}"))?;
    serde_json::from_str(&text).map_err(|e| format!("parse encrypted object failed: {e}"))
}

fn wrap_data_key(passphrase: &str, data_key: &[u8; 32]) -> Result<KeyWrap, String> {
    let mut salt = [0u8; 16];
    OsRng.fill_bytes(&mut salt);
    let key = derive_passphrase_key(passphrase, &salt)?;
    let envelope = encrypt_bytes(&key, data_key, "onyxwriter:data-key:v1")?;
    Ok(KeyWrap {
        algorithm: "AES-256-GCM".into(),
        kdf: KdfSettings {
            name: "scrypt".into(),
            n: 16_384,
            r: 8,
            p: 1,
            salt: BASE64.encode(salt),
            key_length: 32,
        },
        envelope,
    })
}

fn unwrap_data_key(passphrase: &str, wrapped: &KeyWrap) -> Result<[u8; 32], String> {
    if wrapped.kdf.name != "scrypt" || wrapped.kdf.key_length != 32 {
        return Err("unsupported encrypted folder key derivation settings".into());
    }
    let salt = BASE64
        .decode(&wrapped.kdf.salt)
        .map_err(|e| format!("decode encrypted folder salt failed: {e}"))?;
    let key = derive_passphrase_key(passphrase, &salt)?;
    let plaintext = decrypt_bytes(&key, &wrapped.envelope, "onyxwriter:data-key:v1")?;
    let bytes: [u8; 32] = plaintext
        .try_into()
        .map_err(|_| "encrypted folder data key has invalid length".to_string())?;
    Ok(bytes)
}

fn derive_passphrase_key(passphrase: &str, salt: &[u8]) -> Result<[u8; 32], String> {
    let params =
        ScryptParams::new(14, 8, 1, 32).map_err(|e| format!("scrypt parameters invalid: {e}"))?;
    let mut key = [0u8; 32];
    scrypt(passphrase.as_bytes(), salt, &params, &mut key)
        .map_err(|e| format!("scrypt derivation failed: {e}"))?;
    Ok(key)
}

fn encrypt_bytes(key: &[u8; 32], plaintext: &[u8], aad: &str) -> Result<Envelope, String> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let mut nonce = [0u8; 12];
    OsRng.fill_bytes(&mut nonce);
    let encrypted = cipher
        .encrypt(
            Nonce::from_slice(&nonce),
            Payload {
                msg: plaintext,
                aad: aad.as_bytes(),
            },
        )
        .map_err(|_| "encryption failed".to_string())?;
    if encrypted.len() < 16 {
        return Err("encrypted payload is invalid".into());
    }
    let (ciphertext, tag) = encrypted.split_at(encrypted.len() - 16);
    Ok(Envelope {
        algorithm: "AES-256-GCM".into(),
        nonce: BASE64.encode(nonce),
        tag: BASE64.encode(tag),
        ciphertext: BASE64.encode(ciphertext),
    })
}

fn decrypt_bytes(key: &[u8; 32], envelope: &Envelope, aad: &str) -> Result<Vec<u8>, String> {
    if envelope.algorithm != "AES-256-GCM" {
        return Err("unsupported encrypted payload algorithm".into());
    }
    let nonce = BASE64
        .decode(&envelope.nonce)
        .map_err(|e| format!("decode encrypted nonce failed: {e}"))?;
    let mut encrypted = BASE64
        .decode(&envelope.ciphertext)
        .map_err(|e| format!("decode encrypted ciphertext failed: {e}"))?;
    let tag = BASE64
        .decode(&envelope.tag)
        .map_err(|e| format!("decode encrypted tag failed: {e}"))?;
    encrypted.extend(tag);
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    cipher
        .decrypt(
            Nonce::from_slice(&nonce),
            Payload {
                msg: encrypted.as_ref(),
                aad: aad.as_bytes(),
            },
        )
        .map_err(|_| "decryption failed; check passphrase or encrypted files".to_string())
}

fn clean_relative_path(path: &str, markdown_only: bool) -> Result<String, String> {
    let rel = Path::new(path);
    if rel.is_absolute() {
        return Err("path must be bundle-relative".into());
    }
    let mut parts = Vec::new();
    for component in rel.components() {
        match component {
            Component::Normal(part) => parts.push(part.to_string_lossy().to_string()),
            Component::CurDir => {}
            _ => return Err("path traversal is not allowed".into()),
        }
    }
    let clean = parts.join("/");
    if clean.is_empty() {
        return Err("path is required".into());
    }
    if markdown_only && !clean.ends_with(".md") {
        return Err("encrypted document path must end in .md".into());
    }
    Ok(clean)
}

fn info_from_manifest(root_path: &Path, manifest: Manifest) -> Result<EncryptedFolderInfo, String> {
    Ok(EncryptedFolderInfo {
        ok: true,
        root_path: root_path.to_string_lossy().to_string(),
        generation: manifest.generation,
        bundle_name: manifest.bundle_name,
        documents: manifest.documents.keys().cloned().collect(),
    })
}

fn collect_markdown_files(root_path: &Path, path: &Path) -> Result<Vec<(String, PathBuf)>, String> {
    let mut out = Vec::new();
    if path != root_path {
        if let Some(name) = path.file_name().and_then(|value| value.to_str()) {
            if matches!(
                name,
                ".git"
                    | ".hg"
                    | ".svn"
                    | "node_modules"
                    | "dist"
                    | "build"
                    | "target"
                    | ".venv"
                    | "venv"
                    | "__pycache__"
                    | ".idea"
                    | ".vscode"
                    | "coverage"
                    | "vendor"
                    | STORAGE_DIR
            ) {
                return Ok(out);
            }
        }
    }
    for entry in fs::read_dir(path).map_err(|e| format!("read source bundle failed: {e}"))? {
        let entry = entry.map_err(|e| format!("read source bundle failed: {e}"))?;
        let child_path = entry.path();
        let metadata = entry
            .metadata()
            .map_err(|e| format!("read source metadata failed: {e}"))?;
        if metadata.is_dir() {
            out.extend(collect_markdown_files(root_path, &child_path)?);
        } else if child_path.extension().and_then(|value| value.to_str()) == Some("md") {
            out.push((rel_string(root_path, &child_path)?, child_path));
        }
    }
    out.sort_by(|a, b| a.0.cmp(&b.0));
    Ok(out)
}

fn rel_string(root: &Path, path: &Path) -> Result<String, String> {
    let rel = path
        .strip_prefix(root)
        .map_err(|_| "source entry escapes bundle".to_string())?;
    Ok(rel.to_string_lossy().replace('\\', "/"))
}

fn write_json_atomic<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    let data =
        serde_json::to_vec_pretty(value).map_err(|e| format!("serialize json failed: {e}"))?;
    write_bytes_atomic(path, &data)
}

fn write_bytes_atomic(path: &Path, data: &[u8]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("create parent directory failed: {e}"))?;
    }
    let mut random = [0u8; 8];
    OsRng.fill_bytes(&mut random);
    let tmp = path.with_extension(format!("tmp-{}", hex::encode(random)));
    fs::write(&tmp, data).map_err(|e| format!("write temp file failed: {e}"))?;
    fs::rename(&tmp, path).map_err(|e| format!("publish file failed: {e}"))
}

fn sha256_hex(data: &[u8]) -> String {
    hex::encode(Sha256::digest(data))
}

fn iso_now() -> String {
    // This keeps the Rust side dependency-light. The value is stable ISO-ish metadata, not a trust boundary.
    format!("{:?}", std::time::SystemTime::now())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn encrypted_folder_round_trips_and_rejects_stale_generation() {
        let dir = std::env::temp_dir().join(format!(
            "onyx-encrypted-test-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let root = dir.to_string_lossy().to_string();
        let info =
            initialize_encrypted_folder(root.clone(), "secret".into(), Some("Private".into()))
                .unwrap();
        assert_eq!(info.bundle_name, "Private");
        assert!(dir.join(HEADER_FILE).exists());
        assert!(!dir.join("index.md").exists());

        let read =
            read_encrypted_document(root.clone(), "secret".into(), "index.md".into()).unwrap();
        assert!(read.contents.contains("Bundle Index"));
        let written = write_encrypted_document(
            root.clone(),
            "secret".into(),
            "notes/one.md".into(),
            "---\ntype: Note\ntitle: One\n---\n\n# One\n".into(),
            Some(read.generation),
        )
        .unwrap();
        assert_eq!(written.generation, read.generation + 1);
        let stale = write_encrypted_document(
            root.clone(),
            "secret".into(),
            "notes/two.md".into(),
            "# Two\n".into(),
            Some(read.generation),
        );
        assert!(stale.unwrap_err().contains("conflict"));
        assert!(read_encrypted_document(root.clone(), "wrong".into(), "index.md".into()).is_err());
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn protect_standard_folder_copies_markdown_into_empty_encrypted_destination() {
        let source = std::env::temp_dir().join(format!(
            "onyx-standard-source-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let target = std::env::temp_dir().join(format!(
            "onyx-protected-target-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(source.join("notes")).unwrap();
        fs::write(
            source.join("notes").join("alpha.md"),
            "---\ntype: Note\ntitle: Alpha\n---\n\n# Alpha\n",
        )
        .unwrap();
        let info = protect_standard_folder(
            source.to_string_lossy().to_string(),
            target.to_string_lossy().to_string(),
            "secret".into(),
            Some("Protected".into()),
        )
        .unwrap();
        assert_eq!(info.bundle_name, "Protected");
        assert!(info.documents.contains(&"notes/alpha.md".into()));
        assert!(target.join(HEADER_FILE).exists());
        assert!(!target.join("notes").join("alpha.md").exists());
        let read = read_encrypted_document(
            target.to_string_lossy().to_string(),
            "secret".into(),
            "notes/alpha.md".into(),
        )
        .unwrap();
        assert!(read.contents.contains("# Alpha"));
        assert!(read_encrypted_document(
            target.to_string_lossy().to_string(),
            "wrong".into(),
            "notes/alpha.md".into()
        )
        .is_err());
        let _ = fs::remove_dir_all(source);
        let _ = fs::remove_dir_all(target);
    }
}
