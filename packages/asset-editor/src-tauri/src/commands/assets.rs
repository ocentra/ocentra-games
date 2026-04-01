use image::ImageReader;
use log::{error, info};
use rayon::prelude::*;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use webp::Encoder;

use super::asset_db::{remove_index_path, sync_index_path};

fn resources_dir() -> PathBuf {
    let cwd = std::env::current_dir().unwrap_or_default();

    // Try cwd/Resources (production, or dev run from project root)
    let direct = cwd.join("Resources");
    if direct.exists() {
        return direct;
    }

    // Tauri dev: cwd is src-tauri/, Resources is one level up (packages/asset-editor/Resources/)
    if let Some(parent) = cwd.parent() {
        let up = parent.join("Resources");
        if up.exists() {
            return up;
        }
    }

    // Fallback: next to the executable (production bundle)
    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            let beside = exe_dir.join("Resources");
            if beside.exists() {
                return beside;
            }
        }
    }

    direct // last resort
}

#[derive(Serialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

#[derive(Serialize)]
pub struct AssetMeta {
    pub path: String,
    pub size: u64,
    pub modified_secs: Option<u64>,
}

fn hash_bytes_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let digest = hasher.finalize();
    let mut out = String::with_capacity(64);
    for b in digest {
        out.push_str(&format!("{:02x}", b));
    }
    out
}

#[tauri::command]
pub fn write_asset(path: String, content: Vec<u8>) -> Result<(), String> {
    let full = resources_dir().join(&path);
    info!(
        "write_asset start path={} full={} bytes={}",
        path,
        full.to_string_lossy(),
        content.len()
    );
    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("mkdir({path}): {e}"))?;
    }
    match fs::write(&full, &content) {
        Ok(_) => {
            sync_index_path(&path)?;
            info!("write_asset ok path={}", path);
            Ok(())
        }
        Err(e) => {
            error!("write_asset error path={} err={}", path, e);
            Err(format!("write_asset({path}): {e}"))
        }
    }
}

#[tauri::command]
pub fn delete_asset(path: String) -> Result<(), String> {
    let full = resources_dir().join(&path);
    info!(
        "delete_asset start path={} full={}",
        path,
        full.to_string_lossy()
    );
    match fs::remove_file(&full) {
        Ok(_) => {
            remove_index_path(&path)?;
            info!("delete_asset ok path={}", path);
            Ok(())
        }
        Err(e) => {
            error!("delete_asset error path={} err={}", path, e);
            Err(format!("delete_asset({path}): {e}"))
        }
    }
}

#[tauri::command]
pub fn list_dir(folder: String) -> Result<Vec<DirEntry>, String> {
    let dir = if folder.is_empty() {
        resources_dir()
    } else {
        resources_dir().join(&folder)
    };

    let read = fs::read_dir(&dir).map_err(|e| format!("list_dir({folder}): {e}"))?;
    let root = resources_dir();
    info!(
        "list_dir start folder={} dir={}",
        folder,
        dir.to_string_lossy()
    );
    let mut entries: Vec<DirEntry> = read
        .flatten()
        .filter_map(|e| {
            let meta = e.metadata().ok()?;
            let rel = e
                .path()
                .strip_prefix(&root)
                .ok()?
                .to_string_lossy()
                .replace('\\', "/");
            Some(DirEntry {
                name: e.file_name().to_string_lossy().to_string(),
                path: rel,
                is_dir: meta.is_dir(),
                size: if meta.is_file() { meta.len() } else { 0 },
            })
        })
        .collect();

    entries.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name)));
    info!("list_dir ok folder={} entries={}", folder, entries.len());
    Ok(entries)
}

#[tauri::command]
pub fn scan_assets() -> Result<Vec<AssetMeta>, String> {
    let root = resources_dir();
    info!("scan_assets start root={}", root.to_string_lossy());
    let mut out = collect_scan_assets(&root, &root)?;
    out.sort_by(|a, b| a.path.cmp(&b.path));
    info!("scan_assets ok files={}", out.len());
    Ok(out)
}

fn collect_scan_assets(root: &Path, dir: &Path) -> Result<Vec<AssetMeta>, String> {
    let mut file_entries = Vec::new();
    let mut subdirs = Vec::new();

    for entry in fs::read_dir(dir).map_err(|e| e.to_string())?.flatten() {
        let path = entry.path();
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        if meta.is_dir() {
            let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
            if name == ".index" || name.starts_with('.') {
                continue;
            }
            subdirs.push(path);
        } else {
            let rel = path
                .strip_prefix(root)
                .unwrap_or(&path)
                .to_string_lossy()
                .replace('\\', "/");
            if rel.to_lowercase().ends_with(".meta") {
                continue;
            }
            let modified_secs = meta
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs());
            file_entries.push(AssetMeta {
                path: rel,
                size: meta.len(),
                modified_secs,
            });
        }
    }

    let nested_results: Vec<Result<Vec<AssetMeta>, String>> = subdirs
        .par_iter()
        .map(|subdir| collect_scan_assets(root, subdir))
        .collect();

    for nested in nested_results {
        file_entries.extend(nested?);
    }

    Ok(file_entries)
}

#[tauri::command]
pub fn get_resources_dir() -> String {
    let dir = resources_dir().to_string_lossy().replace('\\', "/");
    info!("get_resources_dir {}", dir);
    dir
}

#[tauri::command]
pub fn compute_asset_hash(path: String) -> Result<String, String> {
    let full = resources_dir().join(&path);
    info!(
        "compute_asset_hash start path={} full={}",
        path,
        full.to_string_lossy()
    );
    let bytes = fs::read(&full).map_err(|e| format!("compute_asset_hash({path}): {e}"))?;
    let digest = hash_bytes_hex(&bytes);
    info!("compute_asset_hash ok path={} hash={}", path, digest);
    Ok(digest)
}

const CACHE_IMAGES: &str = ".cache/images";
const CACHE_THUMBNAILS: &str = ".cache/thumbnails";

fn cache_path_for_image(root: &Path, hash: &str, variant: &str) -> PathBuf {
    let dir = match variant {
        "icon" => root.join(CACHE_THUMBNAILS),
        _ => root.join(CACHE_IMAGES),
    };
    let filename = if variant == "icon" {
        format!("{}_icon.webp", sanitize_filename(hash))
    } else {
        sanitize_filename(hash)
    };
    dir.join(filename)
}

const ICON_SIZE: u32 = 64;

fn generate_thumbnail_webp(content: &[u8]) -> Result<Vec<u8>, String> {
    let img = ImageReader::new(Cursor::new(content))
        .with_guessed_format()
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;
    let thumb = image::imageops::thumbnail(&img, ICON_SIZE, ICON_SIZE);
    let (w, h) = (thumb.width(), thumb.height());
    let encoder = Encoder::from_rgba(thumb.as_raw(), w, h);
    let webp_bytes = encoder.encode(85.0);
    Ok(webp_bytes.to_vec())
}

fn sanitize_filename(s: &str) -> String {
    s.chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .take(128)
        .collect()
}

#[tauri::command]
pub fn read_cached_image(hash: String, variant: String) -> Result<Vec<u8>, String> {
    let root = resources_dir();
    let parent = root.parent().unwrap_or(&root);
    let cache_path = cache_path_for_image(parent, &hash, &variant);
    if !cache_path.exists() {
        return Err("not found".to_string());
    }
    fs::read(&cache_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_cached_image(hash: String, variant: String, content: Vec<u8>) -> Result<(), String> {
    let root = resources_dir();
    let parent = root.parent().unwrap_or(&root);
    let cache_path = cache_path_for_image(parent, &hash, &variant);
    if let Some(dir) = cache_path.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let bytes: Vec<u8> = if variant == "icon" {
        generate_thumbnail_webp(&content).unwrap_or(content)
    } else {
        content
    };
    fs::write(&cache_path, &bytes).map_err(|e| e.to_string())
}
