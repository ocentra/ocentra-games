use keyring::Entry;
use reqwest::header::IF_NONE_MATCH;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::fs;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::path::{Path, PathBuf};
use tauri::{
    image::Image,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WindowEvent,
};
use tauri_plugin_window_state::{AppHandleExt, StateFlags};

const APP_NAMESPACE: &str = "ocentra";
const CACHE_DIRECTORY_NAME: &str = "asset-cache";
const CACHE_ENTRY_INDEX_FILENAME: &str = "entry-index-cache.json";
const CACHE_ASSET_DIRECTORY_NAME: &str = "assets";
const CACHE_IMAGE_DIRECTORY_NAME: &str = "images";
const CACHE_SLICE_DIRECTORY_NAME: &str = "content-slices";

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CachedEntryIndexRecord {
    content: String,
    cached_at: u64,
    expires_at: u64,
    asset_guids: Vec<String>,
    etag: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CachedAssetPayload {
    guid: String,
    path: String,
    content: Vec<u8>,
    content_type: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CachedAssetMetadata {
    guid: String,
    path: String,
    content_type: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CachedSliceRecord {
    key: String,
    content: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeFetchPayload {
    status: u16,
    content: Vec<u8>,
    content_type: Option<String>,
    etag: Option<String>,
}

fn get_cache_root(app: &AppHandle) -> Result<PathBuf, String> {
    let cache_dir = app.path().app_cache_dir().map_err(|error| error.to_string())?;
    let root = cache_dir.join(CACHE_DIRECTORY_NAME);
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    Ok(root)
}

fn get_entry_index_cache_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(get_cache_root(app)?.join(CACHE_ENTRY_INDEX_FILENAME))
}

fn get_asset_cache_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = get_cache_root(app)?.join(CACHE_ASSET_DIRECTORY_NAME);
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}

fn get_image_cache_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = get_cache_root(app)?.join(CACHE_IMAGE_DIRECTORY_NAME);
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}

fn get_slice_cache_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = get_cache_root(app)?.join(CACHE_SLICE_DIRECTORY_NAME);
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}

fn normalize_cache_key(value: &str) -> String {
    value
        .chars()
        .filter(|character| character.is_ascii_alphanumeric() || *character == '-')
        .collect::<String>()
        .to_lowercase()
}

fn hash_cache_key(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    let digest = hasher.finalize();
    digest
        .iter()
        .map(|byte| format!("{:02x}", byte))
        .collect::<String>()
}

fn asset_content_path(asset_dir: &Path, guid: &str) -> PathBuf {
    asset_dir.join(format!("{}.asset", normalize_cache_key(guid)))
}

fn asset_metadata_path(asset_dir: &Path, guid: &str) -> PathBuf {
    asset_dir.join(format!("{}.json", normalize_cache_key(guid)))
}

fn cached_image_path(image_dir: &Path, hash: &str, variant: &str) -> PathBuf {
    image_dir.join(format!("{}-{}.bin", normalize_cache_key(hash), normalize_cache_key(variant)))
}

fn slice_cache_path(slice_dir: &Path, key: &str) -> PathBuf {
    slice_dir.join(format!("{}.json", hash_cache_key(key)))
}

const OAUTH_CALLBACK_PORT: u16 = 8766;

#[tauri::command]
fn start_oauth_server(app: AppHandle) -> Result<u16, String> {
    let listener = TcpListener::bind(("127.0.0.1", OAUTH_CALLBACK_PORT))
        .map_err(|e| format!("bind failed: {e}"))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("local_addr: {e}"))?
        .port();

    tauri::async_runtime::spawn_blocking(move || {
        match listener.accept() {
            Ok((mut stream, _)) => {
                let mut buf = [0u8; 8192];
                let n = stream.read(&mut buf).unwrap_or(0);
                let raw = String::from_utf8_lossy(&buf[..n]);

                let callback_url = raw
                    .lines()
                    .next()
                    .and_then(|l| l.split_whitespace().nth(1))
                    .map(|path| format!("http://127.0.0.1:{port}{path}"))
                    .unwrap_or_default();

                let body = "<html><body><h2>Sign-in complete. You can close this tab.</h2></body></html>";
                let response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    body.len(),
                    body
                );
                let _ = stream.write_all(response.as_bytes());
                let _ = stream.flush();

                app.emit("oauth://url", callback_url).ok();
            }
            Err(e) => {
                app.emit("oauth://url", format!("error://{e}")).ok();
            }
        }
    });

    Ok(port)
}

#[tauri::command]
fn get_auth_token() -> Option<String> {
    let entry = Entry::new(APP_NAMESPACE, "auth_token").ok()?;
    entry.get_password().ok()
}

#[tauri::command]
fn store_auth_token(token: String) -> Result<(), String> {
    let entry = Entry::new(APP_NAMESPACE, "auth_token").map_err(|error| error.to_string())?;
    entry
        .set_password(&token)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn get_secret(provider_id: String, key: String) -> Option<String> {
    let username = format!("{}_{}", provider_id, key);
    let entry = Entry::new(APP_NAMESPACE, &username).ok()?;
    entry.get_password().ok()
}

#[tauri::command]
fn store_secret(provider_id: String, key: String, value: String) -> Result<(), String> {
    let username = format!("{}_{}", provider_id, key);
    let entry = Entry::new(APP_NAMESPACE, &username).map_err(|error| error.to_string())?;
    entry
        .set_password(&value)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn get_cached_entry_index(app: AppHandle) -> Result<Option<CachedEntryIndexRecord>, String> {
    let entry_index_path = get_entry_index_cache_path(&app)?;
    if !entry_index_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(entry_index_path).map_err(|error| error.to_string())?;
    let record = serde_json::from_str::<CachedEntryIndexRecord>(&content).map_err(|error| error.to_string())?;
    Ok(Some(record))
}

#[tauri::command]
fn cache_entry_index(
    app: AppHandle,
    content: String,
    expires_at: u64,
    asset_guids: Vec<String>,
    etag: Option<String>,
) -> Result<(), String> {
    let entry_index_path = get_entry_index_cache_path(&app)?;
    let record = CachedEntryIndexRecord {
        content,
        cached_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|error| error.to_string())?
            .as_millis() as u64,
        expires_at,
        asset_guids,
        etag,
    };
    let serialized = serde_json::to_string(&record).map_err(|error| error.to_string())?;
    fs::write(entry_index_path, serialized).map_err(|error| error.to_string())
}

#[tauri::command]
fn get_cached_asset(app: AppHandle, guid: String) -> Result<Option<CachedAssetPayload>, String> {
    let asset_dir = get_asset_cache_dir(&app)?;
    let content_path = asset_content_path(&asset_dir, &guid);
    let metadata_path = asset_metadata_path(&asset_dir, &guid);
    if !content_path.exists() || !metadata_path.exists() {
        return Ok(None);
    }

    let metadata_content = fs::read_to_string(metadata_path).map_err(|error| error.to_string())?;
    let metadata = serde_json::from_str::<CachedAssetMetadata>(&metadata_content).map_err(|error| error.to_string())?;
    let content = fs::read(content_path).map_err(|error| error.to_string())?;
    Ok(Some(CachedAssetPayload {
        guid: metadata.guid,
        path: metadata.path,
        content,
        content_type: metadata.content_type,
    }))
}

#[tauri::command]
fn cache_asset(
    app: AppHandle,
    guid: String,
    path: String,
    content: Vec<u8>,
    content_type: Option<String>,
) -> Result<(), String> {
    let asset_dir = get_asset_cache_dir(&app)?;
    let content_path = asset_content_path(&asset_dir, &guid);
    let metadata_path = asset_metadata_path(&asset_dir, &guid);
    let metadata = CachedAssetMetadata {
        guid,
        path,
        content_type: content_type.unwrap_or_else(|| "application/json".to_string()),
    };
    let serialized_metadata = serde_json::to_string(&metadata).map_err(|error| error.to_string())?;
    fs::write(content_path, content).map_err(|error| error.to_string())?;
    fs::write(metadata_path, serialized_metadata).map_err(|error| error.to_string())
}

#[tauri::command]
fn read_cached_image(app: AppHandle, hash: String, variant: String) -> Result<Vec<u8>, String> {
    let image_dir = get_image_cache_dir(&app)?;
    let image_path = cached_image_path(&image_dir, &hash, &variant);
    if !image_path.exists() {
        return Err("not found".to_string());
    }

    fs::read(image_path).map_err(|error| error.to_string())
}

#[tauri::command]
fn write_cached_image(
    app: AppHandle,
    hash: String,
    variant: String,
    content: Vec<u8>,
) -> Result<(), String> {
    let image_dir = get_image_cache_dir(&app)?;
    let image_path = cached_image_path(&image_dir, &hash, &variant);
    fs::write(image_path, content).map_err(|error| error.to_string())
}

#[tauri::command]
fn get_cached_slice(app: AppHandle, key: String) -> Result<Option<String>, String> {
    let slice_dir = get_slice_cache_dir(&app)?;
    let record_path = slice_cache_path(&slice_dir, &key);
    if !record_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(record_path).map_err(|error| error.to_string())?;
    let record = serde_json::from_str::<CachedSliceRecord>(&content).map_err(|error| error.to_string())?;
    Ok(Some(record.content))
}

#[tauri::command]
fn set_cached_slice(app: AppHandle, key: String, content: String) -> Result<(), String> {
    let slice_dir = get_slice_cache_dir(&app)?;
    let record_path = slice_cache_path(&slice_dir, &key);
    let record = CachedSliceRecord { key, content };
    let serialized = serde_json::to_string(&record).map_err(|error| error.to_string())?;
    fs::write(record_path, serialized).map_err(|error| error.to_string())
}

#[tauri::command]
fn delete_cached_slice(app: AppHandle, key: String) -> Result<(), String> {
    let slice_dir = get_slice_cache_dir(&app)?;
    let record_path = slice_cache_path(&slice_dir, &key);
    if !record_path.exists() {
        return Ok(());
    }

    fs::remove_file(record_path).map_err(|error| error.to_string())
}

#[tauri::command]
fn list_cached_slice_keys(
    app: AppHandle,
    prefix: Option<String>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<Vec<String>, String> {
    let slice_dir = get_slice_cache_dir(&app)?;
    let mut keys = Vec::new();

    for entry in fs::read_dir(slice_dir).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|value| value.to_str()) != Some("json") {
            continue;
        }

        let content = fs::read_to_string(&path).map_err(|error| error.to_string())?;
        let record = serde_json::from_str::<CachedSliceRecord>(&content).map_err(|error| error.to_string())?;
        if let Some(prefix_value) = &prefix {
            if !record.key.starts_with(prefix_value) {
                continue;
            }
        }
        keys.push(record.key);
    }

    keys.sort();
    let start = offset.unwrap_or(0).min(keys.len());
    let end = limit
        .map(|value| start.saturating_add(value).min(keys.len()))
        .unwrap_or(keys.len());
    Ok(keys[start..end].to_vec())
}

#[tauri::command]
fn remove_stale_cached_assets(app: AppHandle, valid_guids: Vec<String>) -> Result<Vec<String>, String> {
    let asset_dir = get_asset_cache_dir(&app)?;
    let valid = valid_guids
        .iter()
        .map(|guid| normalize_cache_key(guid))
        .collect::<HashSet<String>>();
    let mut removed = Vec::new();

    for entry in fs::read_dir(&asset_dir).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        let extension = path.extension().and_then(|value| value.to_str()).unwrap_or_default();
        if extension != "asset" {
            continue;
        }

        let Some(file_stem) = path.file_stem().and_then(|value| value.to_str()) else {
            continue;
        };

        let normalized_guid = file_stem.to_string();
        if valid.contains(&normalized_guid) {
            continue;
        }

        let metadata_path = asset_metadata_path(&asset_dir, &normalized_guid);
        let _ = fs::remove_file(&path);
        let _ = fs::remove_file(&metadata_path);
        removed.push(normalized_guid);
    }

    Ok(removed)
}

#[tauri::command]
async fn fetch_remote_resource(
    url: String,
    if_none_match: Option<String>,
) -> Result<NativeFetchPayload, String> {
    let client = reqwest::Client::new();
    let mut request = client.get(url);

    if let Some(etag) = if_none_match {
        if !etag.is_empty() {
            request = request.header(IF_NONE_MATCH, etag);
        }
    }

    let response = request.send().await.map_err(|error| error.to_string())?;
    let status = response.status().as_u16();
    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.to_string());
    let etag = response
        .headers()
        .get(reqwest::header::ETAG)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.to_string());
    let content = if status == 304 {
        Vec::new()
    } else {
        response.bytes().await.map_err(|error| error.to_string())?.to_vec()
    };

    Ok(NativeFetchPayload {
        status,
        content,
        content_type,
        etag,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let icon = app.default_window_icon().cloned().unwrap_or_else(|| {
                Image::from_bytes(include_bytes!("../icons/32x32.png")).unwrap()
            });

            TrayIconBuilder::new()
                .icon(icon)
                .tooltip("Ocentra")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = app.save_window_state(StateFlags::all());
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.app_handle().save_window_state(StateFlags::all());
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            start_oauth_server,
            get_auth_token,
            store_auth_token,
            get_secret,
            store_secret,
            get_cached_entry_index,
            cache_entry_index,
            get_cached_asset,
            cache_asset,
            read_cached_image,
            write_cached_image,
            get_cached_slice,
            set_cached_slice,
            delete_cached_slice,
            list_cached_slice_keys,
            remove_stale_cached_assets,
            fetch_remote_resource,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
