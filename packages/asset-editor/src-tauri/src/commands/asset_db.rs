use log::info;
use rayon::prelude::*;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

const DB_FILENAME: &str = ".index/assets.db";

#[derive(Clone, Debug, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct IndexBuildStatusPayload {
    pub running: bool,
    pub mode: Option<String>,
    pub last_started_at_ms: Option<i64>,
    pub last_completed_at_ms: Option<i64>,
    pub last_error: Option<String>,
}

fn build_lock() -> &'static Mutex<()> {
    static BUILD_LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    BUILD_LOCK.get_or_init(|| Mutex::new(()))
}

fn build_status() -> &'static Mutex<IndexBuildStatusPayload> {
    static BUILD_STATUS: OnceLock<Mutex<IndexBuildStatusPayload>> = OnceLock::new();
    BUILD_STATUS.get_or_init(|| Mutex::new(IndexBuildStatusPayload::default()))
}

fn now_unix_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_default()
}

fn set_build_status_running(mode: &str) {
    if let Ok(mut status) = build_status().lock() {
        status.running = true;
        status.mode = Some(mode.to_string());
        status.last_started_at_ms = Some(now_unix_millis());
        status.last_error = None;
    }
}

fn set_build_status_finished(error: Option<String>) {
    if let Ok(mut status) = build_status().lock() {
        status.running = false;
        status.last_completed_at_ms = Some(now_unix_millis());
        status.last_error = error;
    }
}

fn snapshot_build_status() -> IndexBuildStatusPayload {
    build_status()
        .lock()
        .map(|status| status.clone())
        .unwrap_or_default()
}

fn run_index_build<T, F>(mode: &str, operation: F) -> Result<T, String>
where
    F: FnOnce() -> Result<T, String>,
{
    let _guard = build_lock()
        .lock()
        .map_err(|_| "asset index build lock poisoned".to_string())?;

    set_build_status_running(mode);
    let result = operation();
    let error = result.as_ref().err().cloned();
    set_build_status_finished(error);
    result
}

fn resources_dir() -> PathBuf {
    let cwd = std::env::current_dir().unwrap_or_default();
    let direct = cwd.join("Resources");
    if direct.exists() {
        return direct;
    }
    if let Some(parent) = cwd.parent() {
        let up = parent.join("Resources");
        if up.exists() {
            return up;
        }
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            let beside = exe_dir.join("Resources");
            if beside.exists() {
                return beside;
            }
        }
    }
    direct
}

fn db_path() -> PathBuf {
    resources_dir().join(DB_FILENAME)
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

fn open_db() -> Result<Connection, String> {
    let path = db_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    Connection::open(&path).map_err(|e| e.to_string())
}

const SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS asset_index (
  path TEXT PRIMARY KEY,
  guid TEXT NOT NULL UNIQUE,
  asset_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  hash TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  modified_secs INTEGER,
  release_status TEXT,
  banner_image_hash TEXT,
  game_icon_hash TEXT,
  game_id TEXT
);
CREATE TABLE IF NOT EXISTS image_index (
  path TEXT PRIMARY KEY,
  hash TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  modified_secs INTEGER
);
CREATE TABLE IF NOT EXISTS file_index (
  path TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  modified_secs INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_guid ON asset_index(guid);
CREATE INDEX IF NOT EXISTS idx_asset_type_release ON asset_index(asset_type, release_status);
CREATE INDEX IF NOT EXISTS idx_asset_game_id ON asset_index(game_id);
"#;

fn migrate_asset_index_columns(conn: &Connection) -> Result<(), String> {
    for col in [
        "release_status",
        "banner_image_hash",
        "game_icon_hash",
        "game_id",
    ] {
        let sql = format!("ALTER TABLE asset_index ADD COLUMN {col} TEXT");
        if let Err(e) = conn.execute(&sql, []) {
            let msg = e.to_string();
            if !msg.to_lowercase().contains("duplicate") {
                return Err(msg);
            }
        }
    }
    Ok(())
}

pub fn ensure_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(SCHEMA).map_err(|e| e.to_string())?;
    migrate_asset_index_columns(conn)?;
    Ok(())
}

fn indexed_resource_count(conn: &Connection) -> Result<i64, String> {
    conn.query_row(
        "SELECT
            (SELECT COUNT(*) FROM asset_index) +
            (SELECT COUNT(*) FROM image_index) +
            (SELECT COUNT(*) FROM file_index)",
        [],
        |row| row.get(0),
    )
    .map_err(|e| e.to_string())
}

fn ensure_index_populated(conn: &mut Connection) -> Result<(), String> {
    if indexed_resource_count(conn)? > 0 {
        return Ok(());
    }

    let root = resources_dir();
    let started_at = Instant::now();
    build_index(conn, &root)?;
    info!(
        "ensure_index_populated built local asset cache in {}ms",
        started_at.elapsed().as_millis()
    );
    Ok(())
}

pub fn ensure_index_available() -> Result<(), String> {
    run_index_build("startup", || {
        let started_at = Instant::now();
        let mut conn = open_db()?;
        ensure_schema(&conn)?;
        let root = resources_dir();
        build_index(&mut conn, &root)?;
        info!(
            "ensure_index_available synced local asset cache in {}ms",
            started_at.elapsed().as_millis()
        );
        Ok(())
    })
}

const IMAGE_EXTENSIONS: [&str; 8] = [
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".avif",
];

fn is_asset_file(path: &str) -> bool {
    path.to_lowercase().ends_with(".asset")
}

fn is_image_file(path: &str) -> bool {
    let lower = path.to_lowercase();
    IMAGE_EXTENSIONS.iter().any(|ext| lower.ends_with(ext))
}

fn parse_asset_system(path: &Path) -> Option<(String, String, String)> {
    let bytes = fs::read(path).ok()?;
    let text = String::from_utf8_lossy(&bytes);
    let v: serde_json::Value = json5::from_str(&text).ok()?;
    let system = v.get("system")?.as_object()?;
    let guid = system.get("guid")?.as_str()?.to_string();
    if guid.is_empty() {
        return None;
    }
    let asset_type = system
        .get("assetType")
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown")
        .to_string();
    let display_name = system
        .get("displayName")
        .and_then(|v| v.as_str())
        .map(String::from)
        .unwrap_or_else(|| {
            path.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_string()
        });
    Some((guid, asset_type, display_name))
}

#[derive(Default)]
struct GameModeExtras {
    release_status: Option<String>,
    banner_image_hash: Option<String>,
    game_icon_hash: Option<String>,
    game_id: Option<String>,
}

fn parse_game_mode_extras(v: &serde_json::Value) -> GameModeExtras {
    let mut out = GameModeExtras::default();
    let system = v.get("system").and_then(|s| s.as_object());
    if let Some(sys) = system {
        out.game_id = sys.get("gameId").and_then(|x| x.as_str()).map(String::from);
    }
    let data = v.get("data").and_then(|d| d.as_object());
    if let Some(d) = data {
        out.release_status = d
            .get("releaseStatus")
            .and_then(|x| x.as_str())
            .map(String::from);
        out.banner_image_hash = d
            .get("bannerImage")
            .and_then(|x| x.as_str())
            .filter(|s| !s.is_empty())
            .map(String::from);
        out.game_icon_hash = d
            .get("gameIcon")
            .and_then(|x| x.as_str())
            .filter(|s| !s.is_empty())
            .map(String::from);
    }
    out
}

fn is_game_mode_type(asset_type: &str) -> bool {
    asset_type.ends_with("GameMode")
}

fn collect_scan_entries(root: &Path, dir: &Path) -> Result<Vec<(String, u64, Option<u64>)>, String> {
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
            file_entries.push((rel, meta.len(), modified_secs));
        }
    }

    let nested_results: Vec<Result<Vec<(String, u64, Option<u64>)>, String>> = subdirs
        .par_iter()
        .map(|subdir| collect_scan_entries(root, subdir))
        .collect();

    for nested in nested_results {
        file_entries.extend(nested?);
    }

    Ok(file_entries)
}

fn normalize_path(path: &str) -> String {
    let p = path.replace('\\', "/").trim_start_matches('/').to_string();
    if p.starts_with("Resources/") {
        p
    } else {
        format!("Resources/{}", p)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum IndexedResourceKind {
    Asset,
    Image,
    File,
}

#[derive(Clone, Debug)]
struct IndexedResourceMeta {
    kind: IndexedResourceKind,
    file_size: u64,
    modified_secs: Option<u64>,
}

fn load_indexed_resource_meta(
    conn: &Connection,
) -> Result<BTreeMap<String, IndexedResourceMeta>, String> {
    let mut by_path = BTreeMap::new();

    let mut stmt = conn
        .prepare("SELECT path, file_size, modified_secs FROM asset_index")
        .map_err(|e| e.to_string())?;
    for row in stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)? as u64,
                row.get::<_, Option<i64>>(2)?.map(|value| value as u64),
            ))
        })
        .map_err(|e| e.to_string())?
    {
        let (path, file_size, modified_secs) = row.map_err(|e| e.to_string())?;
        by_path.insert(
            path,
            IndexedResourceMeta {
                kind: IndexedResourceKind::Asset,
                file_size,
                modified_secs,
            },
        );
    }

    let mut stmt = conn
        .prepare("SELECT path, file_size, modified_secs FROM image_index")
        .map_err(|e| e.to_string())?;
    for row in stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)? as u64,
                row.get::<_, Option<i64>>(2)?.map(|value| value as u64),
            ))
        })
        .map_err(|e| e.to_string())?
    {
        let (path, file_size, modified_secs) = row.map_err(|e| e.to_string())?;
        by_path.insert(
            path,
            IndexedResourceMeta {
                kind: IndexedResourceKind::Image,
                file_size,
                modified_secs,
            },
        );
    }

    let mut stmt = conn
        .prepare("SELECT path, file_size, modified_secs FROM file_index")
        .map_err(|e| e.to_string())?;
    for row in stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)? as u64,
                row.get::<_, Option<i64>>(2)?.map(|value| value as u64),
            ))
        })
        .map_err(|e| e.to_string())?
    {
        let (path, file_size, modified_secs) = row.map_err(|e| e.to_string())?;
        by_path.insert(
            path,
            IndexedResourceMeta {
                kind: IndexedResourceKind::File,
                file_size,
                modified_secs,
            },
        );
    }

    Ok(by_path)
}

fn delete_index_entry(conn: &Connection, path: &str) -> Result<(), String> {
    conn.execute("DELETE FROM asset_index WHERE path = ?1", [path])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM image_index WHERE path = ?1", [path])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM file_index WHERE path = ?1", [path])
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn upsert_asset_index_entry(
    conn: &Connection,
    path: &str,
    guid: &str,
    asset_type: &str,
    display_name: &str,
    hash: &str,
    file_size: u64,
    modified_secs: Option<u64>,
    release_status: Option<String>,
    banner_image_hash: Option<String>,
    game_icon_hash: Option<String>,
    game_id: Option<String>,
) -> Result<(), String> {
    delete_index_entry(conn, path)?;
    conn.execute(
        "INSERT INTO asset_index (path, guid, asset_type, display_name, hash, file_size, modified_secs, release_status, banner_image_hash, game_icon_hash, game_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
         ON CONFLICT(path) DO UPDATE SET
           guid = excluded.guid,
           asset_type = excluded.asset_type,
           display_name = excluded.display_name,
           hash = excluded.hash,
           file_size = excluded.file_size,
           modified_secs = excluded.modified_secs,
           release_status = excluded.release_status,
           banner_image_hash = excluded.banner_image_hash,
           game_icon_hash = excluded.game_icon_hash,
           game_id = excluded.game_id",
        rusqlite::params![
            path,
            guid,
            asset_type,
            display_name,
            hash,
            file_size as i64,
            modified_secs.map(|value| value as i64),
            release_status,
            banner_image_hash,
            game_icon_hash,
            game_id
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn upsert_image_index_entry(
    conn: &Connection,
    path: &str,
    hash: &str,
    file_size: u64,
    modified_secs: Option<u64>,
) -> Result<(), String> {
    delete_index_entry(conn, path)?;
    conn.execute(
        "INSERT INTO image_index (path, hash, file_size, modified_secs)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(path) DO UPDATE SET
           hash = excluded.hash,
           file_size = excluded.file_size,
           modified_secs = excluded.modified_secs",
        rusqlite::params![path, hash, file_size as i64, modified_secs.map(|value| value as i64)],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn upsert_file_index_entry(
    conn: &Connection,
    path: &str,
    checksum: &str,
    file_size: u64,
    modified_secs: Option<u64>,
) -> Result<(), String> {
    delete_index_entry(conn, path)?;
    conn.execute(
        "INSERT INTO file_index (path, checksum, file_size, modified_secs)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(path) DO UPDATE SET
           checksum = excluded.checksum,
           file_size = excluded.file_size,
           modified_secs = excluded.modified_secs",
        rusqlite::params![
            path,
            checksum,
            file_size as i64,
            modified_secs.map(|value| value as i64)
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Clone, Debug)]
struct ChangedResourceEntry {
    path: String,
    file_size: u64,
    modified_secs: Option<u64>,
    kind: IndexedResourceKind,
}

#[derive(Clone, Debug)]
enum PreparedIndexEntry {
    Asset {
        path: String,
        guid: String,
        asset_type: String,
        display_name: String,
        hash: String,
        file_size: u64,
        modified_secs: Option<u64>,
        release_status: Option<String>,
        banner_image_hash: Option<String>,
        game_icon_hash: Option<String>,
        game_id: Option<String>,
    },
    Image {
        path: String,
        hash: String,
        file_size: u64,
        modified_secs: Option<u64>,
    },
    File {
        path: String,
        checksum: String,
        file_size: u64,
        modified_secs: Option<u64>,
    },
}

fn prepare_index_entry(root: &Path, entry: &ChangedResourceEntry) -> Option<PreparedIndexEntry> {
    let relative_path = entry.path.strip_prefix("Resources/").unwrap_or(entry.path.as_str());
    let full_path = root.join(relative_path);

    match entry.kind {
        IndexedResourceKind::Asset => {
            let (guid, asset_type, display_name) = parse_asset_system(&full_path)?;
            let bytes = fs::read(&full_path).ok()?;
            let hash = hash_bytes_hex(&bytes);
            let (release_status, banner_image_hash, game_icon_hash, game_id) =
                if is_game_mode_type(&asset_type) {
                    let text = String::from_utf8_lossy(&bytes);
                    let value: serde_json::Value =
                        json5::from_str(&text).unwrap_or(serde_json::Value::Null);
                    let extras = parse_game_mode_extras(&value);
                    (
                        extras.release_status,
                        extras.banner_image_hash,
                        extras.game_icon_hash,
                        extras.game_id,
                    )
                } else {
                    (None, None, None, None)
                };

            Some(PreparedIndexEntry::Asset {
                path: entry.path.clone(),
                guid,
                asset_type,
                display_name,
                hash,
                file_size: entry.file_size,
                modified_secs: entry.modified_secs,
                release_status,
                banner_image_hash,
                game_icon_hash,
                game_id,
            })
        }
        IndexedResourceKind::Image => {
            let bytes = fs::read(&full_path).ok()?;
            Some(PreparedIndexEntry::Image {
                path: entry.path.clone(),
                hash: hash_bytes_hex(&bytes),
                file_size: entry.file_size,
                modified_secs: entry.modified_secs,
            })
        }
        IndexedResourceKind::File => {
            let bytes = fs::read(&full_path).ok()?;
            Some(PreparedIndexEntry::File {
                path: entry.path.clone(),
                checksum: hash_bytes_hex(&bytes),
                file_size: entry.file_size,
                modified_secs: entry.modified_secs,
            })
        }
    }
}

fn sync_index_entries(conn: &mut Connection, root: &Path, entries: Vec<ChangedResourceEntry>) -> Result<(), String> {
    if entries.is_empty() {
        return Ok(());
    }

    let prepared_entries: Vec<PreparedIndexEntry> = entries
        .par_iter()
        .filter_map(|entry| prepare_index_entry(root, entry))
        .collect();

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for prepared_entry in &prepared_entries {
        match prepared_entry {
            PreparedIndexEntry::Asset {
                path,
                guid,
                asset_type,
                display_name,
                hash,
                file_size,
                modified_secs,
                release_status,
                banner_image_hash,
                game_icon_hash,
                game_id,
            } => {
                upsert_asset_index_entry(
                    &tx,
                    path,
                    guid,
                    asset_type,
                    display_name,
                    hash,
                    *file_size,
                    *modified_secs,
                    release_status.clone(),
                    banner_image_hash.clone(),
                    game_icon_hash.clone(),
                    game_id.clone(),
                )?;
            }
            PreparedIndexEntry::Image {
                path,
                hash,
                file_size,
                modified_secs,
            } => {
                upsert_image_index_entry(&tx, path, hash, *file_size, *modified_secs)?;
            }
            PreparedIndexEntry::File {
                path,
                checksum,
                file_size,
                modified_secs,
            } => {
                upsert_file_index_entry(&tx, path, checksum, *file_size, *modified_secs)?;
            }
        }
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

fn sync_index_path_internal(path: &str) -> Result<(), String> {
    let _guard = build_lock()
        .lock()
        .map_err(|_| "asset index build lock poisoned".to_string())?;

    let normalized_path = normalize_path(path);
    let mut conn = open_db()?;
    ensure_schema(&conn)?;

    if normalized_path.contains("/.index/")
        || normalized_path.starts_with(".index/")
        || normalized_path.to_lowercase().ends_with(".meta")
    {
        delete_index_entry(&conn, &normalized_path)?;
        return Ok(());
    }

    let root = resources_dir();
    let relative_path = normalized_path
        .strip_prefix("Resources/")
        .unwrap_or(normalized_path.as_str());
    let full_path = root.join(relative_path);
    if !full_path.exists() {
        delete_index_entry(&conn, &normalized_path)?;
        return Ok(());
    }

    let meta = fs::metadata(&full_path).map_err(|e| e.to_string())?;
    if meta.is_dir() {
        return Ok(());
    }

    let kind = if is_asset_file(&normalized_path) {
        IndexedResourceKind::Asset
    } else if is_image_file(&normalized_path) {
        IndexedResourceKind::Image
    } else {
        IndexedResourceKind::File
    };
    let modified_secs = meta
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs());

    sync_index_entries(
        &mut conn,
        &root,
        vec![ChangedResourceEntry {
            path: normalized_path,
            file_size: meta.len(),
            modified_secs,
            kind,
        }],
    )
}

pub fn sync_index_path(path: &str) -> Result<(), String> {
    sync_index_path_internal(path)
}

pub fn remove_index_path(path: &str) -> Result<(), String> {
    let _guard = build_lock()
        .lock()
        .map_err(|_| "asset index build lock poisoned".to_string())?;
    let normalized_path = normalize_path(path);
    let conn = open_db()?;
    ensure_schema(&conn)?;
    delete_index_entry(&conn, &normalized_path)
}

pub fn build_index(conn: &mut Connection, root: &Path) -> Result<(), String> {
    let total_started_at = Instant::now();
    let scan_started_at = Instant::now();
    let mut current_entries: Vec<(String, u64, Option<u64>)> = collect_scan_entries(root, root)?
        .into_iter()
        .map(|(path, file_size, modified_secs)| (normalize_path(&path), file_size, modified_secs))
        .collect();
    current_entries.sort_by(|a, b| a.0.cmp(&b.0));
    let scan_ms = scan_started_at.elapsed().as_millis();

    let diff_started_at = Instant::now();
    let current_paths: BTreeSet<String> = current_entries
        .iter()
        .map(|(path, _, _)| path.clone())
        .collect();
    let existing = load_indexed_resource_meta(conn)?;

    let stale_paths: Vec<String> = existing
        .keys()
        .filter(|path| !current_paths.contains(*path))
        .cloned()
        .collect();
    let mut changed_entries = Vec::new();
    let mut kept_unchanged = 0usize;

    for (resource_path, file_size, modified_secs) in current_entries {
        let target_kind = if is_asset_file(&resource_path) {
            IndexedResourceKind::Asset
        } else if is_image_file(&resource_path) {
            IndexedResourceKind::Image
        } else {
            IndexedResourceKind::File
        };

        let is_unchanged = existing.get(&resource_path).is_some_and(|meta| {
            meta.kind == target_kind
                && meta.file_size == file_size
                && meta.modified_secs == modified_secs
        });
        if is_unchanged {
            kept_unchanged += 1;
            continue;
        }

        changed_entries.push(ChangedResourceEntry {
            path: resource_path,
            file_size,
            modified_secs,
            kind: target_kind,
        });
    }
    let diff_ms = diff_started_at.elapsed().as_millis();

    let delete_started_at = Instant::now();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for stale_path in &stale_paths {
        delete_index_entry(&tx, stale_path)?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    let delete_ms = delete_started_at.elapsed().as_millis();

    let sync_started_at = Instant::now();
    sync_index_entries(conn, root, changed_entries.clone())?;
    let sync_ms = sync_started_at.elapsed().as_millis();

    info!(
        "build_index synced local asset cache (scanned={}, changed={}, kept_unchanged={}, removed={}, scan_ms={}, diff_ms={}, delete_ms={}, sync_ms={}, total_ms={})",
        current_paths.len(),
        changed_entries.len(),
        kept_unchanged,
        stale_paths.len(),
        scan_ms,
        diff_ms,
        delete_ms,
        sync_ms,
        total_started_at.elapsed().as_millis()
    );

    Ok(())
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "resourceEntryType")]
pub enum AssetIndexEntry {
    #[serde(rename = "AssetResourceEntry")]
    AssetResourceEntry {
        path: String,
        guid: String,
        #[serde(rename = "assetType")]
        asset_type: String,
        #[serde(rename = "displayName")]
        display_name: String,
        #[serde(rename = "fileSize")]
        file_size: u64,
    },
    #[serde(rename = "ImageResourceEntry")]
    ImageResourceEntry {
        path: String,
        hash: String,
        #[serde(rename = "fileSize")]
        file_size: u64,
    },
    #[serde(rename = "FileResourceEntry")]
    FileResourceEntry {
        path: String,
        checksum: String,
        #[serde(rename = "fileSize")]
        file_size: u64,
    },
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogResourceRecordPayload {
    pub id: String,
    pub path: String,
    pub file_name: String,
    pub type_label: String,
    pub kind: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageResourceGroupPayload {
    pub folder: String,
    pub items: Vec<CatalogResourceRecordPayload>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceQueryPayload {
    pub available_types: Vec<String>,
    pub items: Vec<CatalogResourceRecordPayload>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceQueryInput {
    pub search: Option<String>,
    pub resource_type: Option<String>,
}

fn file_name_from_path(path: &str) -> String {
    Path::new(path)
        .file_name()
        .and_then(|name| name.to_str())
        .map(String::from)
        .unwrap_or_else(|| path.to_string())
}

fn catalog_record_from_index_entry(entry: AssetIndexEntry) -> Option<CatalogResourceRecordPayload> {
    match entry {
        AssetIndexEntry::AssetResourceEntry {
            path,
            guid,
            asset_type,
            display_name,
            ..
        } => {
            let file_name = file_name_from_path(&path);
            Some(CatalogResourceRecordPayload {
                id: guid,
                file_name: if file_name.is_empty() {
                    display_name
                } else {
                    file_name
                },
                path,
                type_label: asset_type,
                kind: "asset".to_string(),
            })
        }
        AssetIndexEntry::ImageResourceEntry { path, hash, .. } => {
            Some(CatalogResourceRecordPayload {
                id: hash,
                file_name: file_name_from_path(&path),
                path,
                type_label: "Image".to_string(),
                kind: "image".to_string(),
            })
        }
        AssetIndexEntry::FileResourceEntry { path, checksum, .. } => {
            Some(CatalogResourceRecordPayload {
                id: checksum,
                file_name: file_name_from_path(&path),
                path,
                type_label: "File".to_string(),
                kind: "file".to_string(),
            })
        }
    }
}

fn is_hidden_index_path(path: &str) -> bool {
    path.contains("/.index/") || path.starts_with(".index/")
}

fn folder_prefix(folder: &str) -> String {
    if folder.is_empty() || folder == "root" {
        "Resources/".to_string()
    } else {
        let f = folder.strip_prefix("folder:").unwrap_or(folder);
        let f = f.trim_end_matches('/');
        if f.is_empty() || f == "Resources" {
            "Resources/".to_string()
        } else if f.starts_with("Resources/") {
            format!("{}/", f)
        } else {
            format!("Resources/{}/", f)
        }
    }
}

pub fn get_resources_in_folder(
    conn: &Connection,
    folder: &str,
) -> Result<Vec<AssetIndexEntry>, String> {
    let prefix = folder_prefix(folder);
    let like_pat = if prefix == "Resources/" {
        "Resources/%".to_string()
    } else {
        format!("{}%", prefix)
    };
    let mut entries = Vec::new();

    let mut stmt = conn
        .prepare("SELECT path, guid, asset_type, display_name, file_size FROM asset_index WHERE path LIKE ?1 ESCAPE '\\'")
        .map_err(|e| e.to_string())?;
    let iter = stmt
        .query_map([&like_pat], |row| {
            Ok(AssetIndexEntry::AssetResourceEntry {
                path: row.get(0)?,
                guid: row.get(1)?,
                asset_type: row.get(2)?,
                display_name: row.get(3)?,
                file_size: row.get::<_, i64>(4)? as u64,
            })
        })
        .map_err(|e| e.to_string())?;
    for e in iter {
        if let Ok(entry) = e {
            let path: String = match &entry {
                AssetIndexEntry::AssetResourceEntry { path, .. } => path.clone(),
                _ => continue,
            };
            if path.starts_with(&prefix)
                && path.len() > prefix.len()
                && !is_hidden_index_path(&path)
            {
                entries.push(entry);
            }
        }
    }

    let mut stmt = conn
        .prepare("SELECT path, hash, file_size FROM image_index WHERE path LIKE ?1 ESCAPE '\\'")
        .map_err(|e| e.to_string())?;
    let iter = stmt
        .query_map([&like_pat], |row| {
            Ok(AssetIndexEntry::ImageResourceEntry {
                path: row.get(0)?,
                hash: row.get(1)?,
                file_size: row.get::<_, i64>(2)? as u64,
            })
        })
        .map_err(|e| e.to_string())?;
    for e in iter {
        if let Ok(entry) = e {
            let path: String = match &entry {
                AssetIndexEntry::ImageResourceEntry { path, .. } => path.clone(),
                _ => continue,
            };
            if path.starts_with(&prefix)
                && path.len() > prefix.len()
                && !is_hidden_index_path(&path)
            {
                entries.push(entry);
            }
        }
    }

    let mut stmt = conn
        .prepare("SELECT path, checksum, file_size FROM file_index WHERE path LIKE ?1 ESCAPE '\\'")
        .map_err(|e| e.to_string())?;
    let iter = stmt
        .query_map([&like_pat], |row| {
            Ok(AssetIndexEntry::FileResourceEntry {
                path: row.get(0)?,
                checksum: row.get(1)?,
                file_size: row.get::<_, i64>(2)? as u64,
            })
        })
        .map_err(|e| e.to_string())?;
    for e in iter {
        if let Ok(entry) = e {
            let path: String = match &entry {
                AssetIndexEntry::FileResourceEntry { path, .. } => path.clone(),
                _ => continue,
            };
            if path.starts_with(&prefix)
                && path.len() > prefix.len()
                && !is_hidden_index_path(&path)
            {
                entries.push(entry);
            }
        }
    }

    Ok(entries)
}

pub fn get_all_entries(conn: &Connection) -> Result<Vec<AssetIndexEntry>, String> {
    let mut entries = Vec::new();
    let mut stmt = conn
        .prepare("SELECT path, guid, asset_type, display_name, file_size FROM asset_index")
        .map_err(|e| e.to_string())?;
    for row in stmt
        .query_map([], |row| {
            Ok(AssetIndexEntry::AssetResourceEntry {
                path: row.get(0)?,
                guid: row.get(1)?,
                asset_type: row.get(2)?,
                display_name: row.get(3)?,
                file_size: row.get::<_, i64>(4)? as u64,
            })
        })
        .map_err(|e| e.to_string())?
    {
        let entry = row.map_err(|e| e.to_string())?;
        let path: String = match &entry {
            AssetIndexEntry::AssetResourceEntry { path, .. } => path.clone(),
            _ => continue,
        };
        if !is_hidden_index_path(&path) {
            entries.push(entry);
        }
    }
    let mut stmt = conn
        .prepare("SELECT path, hash, file_size FROM image_index")
        .map_err(|e| e.to_string())?;
    for row in stmt
        .query_map([], |row| {
            Ok(AssetIndexEntry::ImageResourceEntry {
                path: row.get(0)?,
                hash: row.get(1)?,
                file_size: row.get::<_, i64>(2)? as u64,
            })
        })
        .map_err(|e| e.to_string())?
    {
        entries.push(row.map_err(|e| e.to_string())?);
    }
    let mut stmt = conn
        .prepare("SELECT path, checksum, file_size FROM file_index")
        .map_err(|e| e.to_string())?;
    for row in stmt
        .query_map([], |row| {
            Ok(AssetIndexEntry::FileResourceEntry {
                path: row.get(0)?,
                checksum: row.get(1)?,
                file_size: row.get::<_, i64>(2)? as u64,
            })
        })
        .map_err(|e| e.to_string())?
    {
        let entry = row.map_err(|e| e.to_string())?;
        let path: String = match &entry {
            AssetIndexEntry::FileResourceEntry { path, .. } => path.clone(),
            _ => continue,
        };
        if !is_hidden_index_path(&path) {
            entries.push(entry);
        }
    }
    Ok(entries)
}

#[tauri::command]
pub fn get_resource_by_guid_db(guid: String) -> Result<Option<AssetIndexEntry>, String> {
    let conn = open_db()?;
    ensure_schema(&conn)?;
    let mut stmt = conn
        .prepare("SELECT path, guid, asset_type, display_name, file_size FROM asset_index WHERE guid = ?1")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([&guid]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let path: String = row.get(0).map_err(|e| e.to_string())?;
        if is_hidden_index_path(&path) {
            return Ok(None);
        }
        let entry = AssetIndexEntry::AssetResourceEntry {
            path,
            guid: row.get(1).map_err(|e| e.to_string())?,
            asset_type: row.get(2).map_err(|e| e.to_string())?,
            display_name: row.get(3).map_err(|e| e.to_string())?,
            file_size: row.get::<_, i64>(4).map_err(|e| e.to_string())? as u64,
        };
        return Ok(Some(entry));
    }
    Ok(None)
}

#[tauri::command]
pub fn get_resource_by_hash_db(hash: String) -> Result<Option<AssetIndexEntry>, String> {
    let conn = open_db()?;
    ensure_schema(&conn)?;
    let mut stmt = conn
        .prepare("SELECT path, hash, file_size FROM image_index WHERE hash = ?1 LIMIT 1")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([&hash]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let path: String = row.get(0).map_err(|e| e.to_string())?;
        if is_hidden_index_path(&path) {
            return Ok(None);
        }
        let entry = AssetIndexEntry::ImageResourceEntry {
            path,
            hash: row.get(1).map_err(|e| e.to_string())?,
            file_size: row.get::<_, i64>(2).map_err(|e| e.to_string())? as u64,
        };
        return Ok(Some(entry));
    }
    let mut stmt = conn
        .prepare("SELECT path, checksum, file_size FROM file_index WHERE checksum = ?1 LIMIT 1")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([&hash]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let path: String = row.get(0).map_err(|e| e.to_string())?;
        if is_hidden_index_path(&path) {
            return Ok(None);
        }
        let entry = AssetIndexEntry::FileResourceEntry {
            path,
            checksum: row.get(1).map_err(|e| e.to_string())?,
            file_size: row.get::<_, i64>(2).map_err(|e| e.to_string())? as u64,
        };
        return Ok(Some(entry));
    }
    Ok(None)
}

#[derive(Deserialize)]
pub struct LoadAssetInput {
    pub guid: Option<String>,
    pub path: Option<String>,
}

#[tauri::command]
pub fn load_asset(input: LoadAssetInput) -> Result<Vec<u8>, String> {
    match (&input.guid, &input.path) {
        (Some(g), None) => load_asset_bytes(Some(g), None),
        (None, Some(p)) => load_asset_bytes(None, Some(p)),
        _ => Err("load_asset: exactly one of guid or path required".to_string()),
    }
}

#[tauri::command]
pub fn rebuild_index() -> Result<(), String> {
    run_index_build("manual", || {
        let started_at = Instant::now();
        let root = resources_dir();
        let mut conn = open_db()?;
        ensure_schema(&conn)?;
        build_index(&mut conn, &root)?;
        info!("rebuild_index completed in {}ms", started_at.elapsed().as_millis());
        Ok(())
    })
}

#[tauri::command]
pub fn get_index_status() -> Result<IndexBuildStatusPayload, String> {
    Ok(snapshot_build_status())
}

#[tauri::command]
pub fn get_resources_in_folder_db(folder: String) -> Result<Vec<AssetIndexEntry>, String> {
    let mut conn = open_db()?;
    ensure_schema(&conn)?;
    ensure_index_populated(&mut conn)?;
    let entries = get_resources_in_folder(&conn, &folder)?;
    Ok(entries)
}

#[tauri::command]
pub fn get_disk_resource_entries_db() -> Result<Vec<AssetIndexEntry>, String> {
    let mut conn = open_db()?;
    ensure_schema(&conn)?;
    ensure_index_populated(&mut conn)?;
    get_all_entries(&conn)
}

#[tauri::command]
pub fn get_image_resource_entries_db() -> Result<Vec<AssetIndexEntry>, String> {
    let mut conn = open_db()?;
    ensure_schema(&conn)?;
    ensure_index_populated(&mut conn)?;
    let mut entries = Vec::new();
    let mut stmt = conn
        .prepare("SELECT path, hash, file_size FROM image_index")
        .map_err(|e| e.to_string())?;
    for row in stmt
        .query_map([], |row| {
            Ok(AssetIndexEntry::ImageResourceEntry {
                path: row.get(0)?,
                hash: row.get(1)?,
                file_size: row.get::<_, i64>(2)? as u64,
            })
        })
        .map_err(|e| e.to_string())?
    {
        entries.push(row.map_err(|e| e.to_string())?);
    }
    Ok(entries)
}

#[tauri::command]
pub fn get_image_resource_groups_db() -> Result<Vec<ImageResourceGroupPayload>, String> {
    let mut conn = open_db()?;
    ensure_schema(&conn)?;
    ensure_index_populated(&mut conn)?;

    let mut groups: BTreeMap<String, Vec<CatalogResourceRecordPayload>> = BTreeMap::new();
    let mut stmt = conn
        .prepare("SELECT path, hash FROM image_index ORDER BY path")
        .map_err(|e| e.to_string())?;

    for row in stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?
    {
        let (path, hash) = row.map_err(|e| e.to_string())?;
        if is_hidden_index_path(&path) {
            continue;
        }

        let folder = path
            .rfind('/')
            .map(|idx| path[..idx].to_string())
            .unwrap_or_else(|| "(root)".to_string());

        groups
            .entry(folder)
            .or_default()
            .push(CatalogResourceRecordPayload {
                id: hash.clone(),
                path: path.clone(),
                file_name: file_name_from_path(&path),
                type_label: "Image".to_string(),
                kind: "image".to_string(),
            });
    }

    Ok(groups
        .into_iter()
        .map(|(folder, items)| ImageResourceGroupPayload { folder, items })
        .collect())
}

#[tauri::command]
pub fn query_resources_db(input: ResourceQueryInput) -> Result<ResourceQueryPayload, String> {
    let mut conn = open_db()?;
    ensure_schema(&conn)?;
    ensure_index_populated(&mut conn)?;

    let normalized_search = input.search.as_deref().unwrap_or("").trim().to_lowercase();
    let normalized_type = input
        .resource_type
        .as_deref()
        .unwrap_or("All")
        .trim()
        .to_lowercase();

    let mut available_types = BTreeSet::new();
    let mut items = Vec::new();

    for entry in get_all_entries(&conn)? {
        if let Some(record) = catalog_record_from_index_entry(entry) {
            available_types.insert(record.type_label.clone());

            let type_matches = normalized_type == "all"
                || normalized_type.is_empty()
                || record.type_label.to_lowercase() == normalized_type;
            if !type_matches {
                continue;
            }

            if !normalized_search.is_empty() {
                let search_matches = record.id.to_lowercase().contains(&normalized_search)
                    || record.path.to_lowercase().contains(&normalized_search)
                    || record.file_name.to_lowercase().contains(&normalized_search)
                    || record
                        .type_label
                        .to_lowercase()
                        .contains(&normalized_search);
                if !search_matches {
                    continue;
                }
            }

            items.push(record);
        }
    }

    items.sort_by(|a, b| a.path.cmp(&b.path).then_with(|| a.id.cmp(&b.id)));

    Ok(ResourceQueryPayload {
        available_types: available_types.into_iter().collect(),
        items,
    })
}


#[tauri::command]
pub fn get_local_index_hash() -> Result<String, String> {
    let mut conn = open_db()?;
    ensure_schema(&conn)?;
    ensure_index_populated(&mut conn)?;
    let entries = get_all_entries(&conn)?;
    let mut canonical: Vec<String> = entries
        .iter()
        .map(|e| match e {
            AssetIndexEntry::AssetResourceEntry {
                path,
                guid,
                asset_type,
                display_name,
                file_size,
            } => format!(
                "A|{}|{}|{}|{}|{}",
                path, guid, asset_type, display_name, file_size
            ),
            AssetIndexEntry::ImageResourceEntry {
                path,
                hash,
                file_size,
            } => {
                format!("I|{}|{}|{}", path, hash, file_size)
            }
            AssetIndexEntry::FileResourceEntry {
                path,
                checksum,
                file_size,
            } => format!("F|{}|{}|{}", path, checksum, file_size),
        })
        .collect();
    canonical.sort();
    let joined = canonical.join("\n");
    let digest = hash_bytes_hex(joined.as_bytes());
    Ok(digest)
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HomepageBadge {
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tone: Option<String>,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HomepageFeaturedGame {
    pub game_id: String,
    pub guid: String,
    pub name: String,
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub release_status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub featured_top_badges: Option<Vec<HomepageBadge>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub featured_bottom_badges: Option<Vec<HomepageBadge>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tagline: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tagline2: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub short_description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_players: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_players: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub game_category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subcategory: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub difficulty: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deck: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub players_display: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quality: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "bannerImage")]
    pub banner_image: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "gameIcon")]
    pub game_icon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub carousel_images: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub carousel_playback_mode: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub carousel_transition_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub carousel_transition_duration_ms: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_logo_image: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_logo_alt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_logo_start_ms: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_logo_duration_ms: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_logo_scale_from: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_logo_scale_to: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_logo_opacity_from: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_logo_opacity_to: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_logo_visible_from_index: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_logo_visible_to_index: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_title_text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_title_color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_title_start_ms: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_title_duration_ms: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_title_scale_from: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_title_scale_to: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_title_opacity_from: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_title_opacity_to: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_title_visible_from_index: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_title_visible_to_index: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_overlay_tint_color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_overlay_tint_opacity: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_vignette_opacity: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_fade_to_black_opacity: Option<f64>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComingSoonTeaser {
    pub id: String,
    pub name: String,
    #[serde(rename = "bannerImage")]
    pub banner_image: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alt: Option<String>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureBannerItem {
    pub title: String,
    pub description: String,
    pub image_hash: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HomepageCatalogPayload {
    pub featured: Vec<HomepageFeaturedGame>,
    pub available_now: Vec<HomepageFeaturedGame>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HomepageComingSoonPayload {
    pub coming_soon: Vec<ComingSoonTeaser>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HomepageFeatureBannerPayload {
    pub feature_banner_items: Vec<FeatureBannerItem>,
}

fn load_coming_soon_teasers(
    root: &Path,
    conn: &Connection,
) -> Result<Vec<ComingSoonTeaser>, String> {
    let mut stmt = conn
        .prepare("SELECT path FROM asset_index WHERE asset_type = 'ComingSoon' LIMIT 1")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    let row = match rows.next().map_err(|e| e.to_string())? {
        Some(r) => r,
        None => return Ok(Vec::new()),
    };
    let path: String = row.get(0).map_err(|e| e.to_string())?;
    let full = root.join(path.strip_prefix("Resources/").unwrap_or(&path));
    let bytes = fs::read(&full).map_err(|e| e.to_string())?;
    let text = String::from_utf8_lossy(&bytes);
    let v: serde_json::Value = json5::from_str(&text).map_err(|e| e.to_string())?;
    let data = v
        .get("data")
        .and_then(|d| d.as_object())
        .ok_or("ComingSoon missing data")?;
    let empty: Vec<serde_json::Value> = vec![];
    let images = data
        .get("images")
        .and_then(|arr| arr.as_array())
        .unwrap_or(&empty);
    let mut out = Vec::new();
    for img in images {
        let obj = img.as_object().ok_or("invalid image entry")?;
        let id = obj
            .get("id")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .to_string();
        let label = obj
            .get("label")
            .and_then(|x| x.as_str())
            .map(String::from)
            .unwrap_or_else(|| id.clone());
        let image_hash = obj
            .get("imageHash")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .to_string();
        let alt = obj.get("alt").and_then(|x| x.as_str()).map(String::from);
        if !id.is_empty() && !image_hash.is_empty() {
            out.push(ComingSoonTeaser {
                id,
                name: label,
                banner_image: image_hash,
                alt,
            });
        }
    }
    Ok(out)
}

fn load_feature_banner_items(
    root: &Path,
    conn: &Connection,
) -> Result<Vec<FeatureBannerItem>, String> {
    let mut stmt = conn
        .prepare("SELECT path FROM asset_index WHERE asset_type = 'FeatureBanner' LIMIT 1")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    let row = match rows.next().map_err(|e| e.to_string())? {
        Some(r) => r,
        None => return Ok(Vec::new()),
    };
    let path: String = row.get(0).map_err(|e| e.to_string())?;
    let full = root.join(path.strip_prefix("Resources/").unwrap_or(&path));
    let bytes = fs::read(&full).map_err(|e| e.to_string())?;
    let text = String::from_utf8_lossy(&bytes);
    let v: serde_json::Value = json5::from_str(&text).map_err(|e| e.to_string())?;
    let data = v
        .get("data")
        .and_then(|d| d.as_object())
        .ok_or("FeatureBanner missing data")?;
    let empty: Vec<serde_json::Value> = vec![];
    let items = data
        .get("items")
        .and_then(|arr| arr.as_array())
        .unwrap_or(&empty);
    let mut out = Vec::new();
    for item in items {
        let obj = item.as_object().ok_or("invalid feature banner item")?;
        let title = obj
            .get("title")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .to_string();
        let description = obj
            .get("description")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .to_string();
        let image_hash = obj
            .get("imageHash")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .to_string();
        if !title.is_empty() && !description.is_empty() && !image_hash.is_empty() {
            out.push(FeatureBannerItem {
                title,
                description,
                image_hash,
            });
        }
    }
    Ok(out)
}

#[derive(Default)]
struct HomepageCarouselFields {
    carousel_images: Option<Vec<String>>,
    carousel_playback_mode: Option<String>,
    carousel_transition_type: Option<String>,
    carousel_transition_duration_ms: Option<f64>,
    banner_logo_image: Option<String>,
    banner_logo_alt: Option<String>,
    banner_logo_start_ms: Option<f64>,
    banner_logo_duration_ms: Option<f64>,
    banner_logo_scale_from: Option<f64>,
    banner_logo_scale_to: Option<f64>,
    banner_logo_opacity_from: Option<f64>,
    banner_logo_opacity_to: Option<f64>,
    banner_logo_visible_from_index: Option<f64>,
    banner_logo_visible_to_index: Option<f64>,
    banner_title_text: Option<String>,
    banner_title_color: Option<String>,
    banner_title_start_ms: Option<f64>,
    banner_title_duration_ms: Option<f64>,
    banner_title_scale_from: Option<f64>,
    banner_title_scale_to: Option<f64>,
    banner_title_opacity_from: Option<f64>,
    banner_title_opacity_to: Option<f64>,
    banner_title_visible_from_index: Option<f64>,
    banner_title_visible_to_index: Option<f64>,
    banner_overlay_tint_color: Option<String>,
    banner_overlay_tint_opacity: Option<f64>,
    banner_vignette_opacity: Option<f64>,
    banner_fade_to_black_opacity: Option<f64>,
}

#[derive(Default)]
struct HomepageInfoFields {
    tags: Option<Vec<String>>,
    featured_top_badges: Option<Vec<HomepageBadge>>,
    featured_bottom_badges: Option<Vec<HomepageBadge>>,
    tagline: Option<String>,
    tagline2: Option<String>,
    short_description: Option<String>,
    description: Option<String>,
    min_players: Option<f64>,
    max_players: Option<f64>,
    game_category: Option<String>,
    subcategory: Option<String>,
    difficulty: Option<String>,
    duration: Option<String>,
    deck: Option<String>,
    players_display: Option<String>,
    quality: Option<String>,
}

fn homepage_string(data: &serde_json::Map<String, serde_json::Value>, key: &str) -> Option<String> {
    data.get(key)
        .and_then(|x| x.as_str())
        .filter(|s| !s.is_empty())
        .map(String::from)
}

fn homepage_number(data: &serde_json::Map<String, serde_json::Value>, key: &str) -> Option<f64> {
    data.get(key).and_then(|x| x.as_f64())
}

fn homepage_strings(
    data: &serde_json::Map<String, serde_json::Value>,
    key: &str,
) -> Option<Vec<String>> {
    let values: Vec<String> = data
        .get(key)
        .and_then(|x| x.as_array())
        .into_iter()
        .flatten()
        .filter_map(|x| x.as_str())
        .filter(|s| !s.is_empty())
        .map(String::from)
        .collect();
    if values.is_empty() {
        None
    } else {
        Some(values)
    }
}

fn homepage_badges(
    data: &serde_json::Map<String, serde_json::Value>,
    key: &str,
) -> Option<Vec<HomepageBadge>> {
    let badges: Vec<HomepageBadge> = data
        .get(key)
        .and_then(|x| x.as_array())
        .into_iter()
        .flatten()
        .filter_map(|item| {
            let obj = item.as_object()?;
            let label = obj.get("label").and_then(|x| x.as_str())?.trim();
            if label.is_empty() {
                return None;
            }
            let tone = obj
                .get("tone")
                .and_then(|x| x.as_str())
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(String::from);
            Some(HomepageBadge {
                label: label.to_string(),
                tone,
            })
        })
        .collect();
    if badges.is_empty() {
        None
    } else {
        Some(badges)
    }
}

fn load_homepage_game_value(root: &Path, game_asset_path: &str) -> Option<serde_json::Value> {
    let game_full = root.join(
        game_asset_path
            .strip_prefix("Resources/")
            .unwrap_or(game_asset_path),
    );
    let game_text = fs::read_to_string(&game_full).ok()?;
    json5::from_str::<serde_json::Value>(&game_text).ok()
}

fn load_homepage_carousel_fields(root: &Path, game_asset_path: &str) -> HomepageCarouselFields {
    let mut fields = HomepageCarouselFields::default();
    let Some(game_value) = load_homepage_game_value(root, game_asset_path) else {
        return fields;
    };
    let Some(carousel_path) = game_value
        .get("data")
        .and_then(|d| d.get("carouselImagesAsset"))
        .and_then(|entry| entry.get("path"))
        .and_then(|path| path.as_str())
    else {
        return fields;
    };
    let carousel_full = root.join(
        carousel_path
            .strip_prefix("Resources/")
            .unwrap_or(carousel_path),
    );
    let Ok(carousel_text) = fs::read_to_string(&carousel_full) else {
        return fields;
    };
    let Ok(carousel_value) = json5::from_str::<serde_json::Value>(&carousel_text) else {
        return fields;
    };
    let Some(data) = carousel_value.get("data").and_then(|d| d.as_object()) else {
        return fields;
    };

    if let Some(slides) = data.get("slides").and_then(|x| x.as_array()) {
        let images: Vec<String> = slides
            .iter()
            .filter_map(|slide| {
                slide
                    .get("imageHash")
                    .and_then(|hash| hash.as_str())
                    .filter(|hash| !hash.is_empty())
                    .map(String::from)
            })
            .collect();
        if !images.is_empty() {
            fields.carousel_images = Some(images);
        }
    }

    fields.carousel_playback_mode = homepage_string(data, "playbackMode");
    fields.carousel_transition_type = homepage_string(data, "transitionType");
    fields.carousel_transition_duration_ms = homepage_number(data, "transitionDurationMs");
    fields.banner_logo_image = homepage_string(data, "logoImageHash");
    fields.banner_logo_alt = homepage_string(data, "logoAlt");
    fields.banner_logo_start_ms = homepage_number(data, "logoStartMs");
    fields.banner_logo_duration_ms = homepage_number(data, "logoDurationMs");
    fields.banner_logo_scale_from = homepage_number(data, "logoScaleFrom");
    fields.banner_logo_scale_to = homepage_number(data, "logoScaleTo");
    fields.banner_logo_opacity_from = homepage_number(data, "logoOpacityFrom");
    fields.banner_logo_opacity_to = homepage_number(data, "logoOpacityTo");
    fields.banner_logo_visible_from_index = homepage_number(data, "logoVisibleFromIndex");
    fields.banner_logo_visible_to_index = homepage_number(data, "logoVisibleToIndex");
    fields.banner_title_text = homepage_string(data, "titleText");
    fields.banner_title_color = homepage_string(data, "titleTextColor");
    fields.banner_title_start_ms = homepage_number(data, "titleTextStartMs");
    fields.banner_title_duration_ms = homepage_number(data, "titleTextDurationMs");
    fields.banner_title_scale_from = homepage_number(data, "titleTextScaleFrom");
    fields.banner_title_scale_to = homepage_number(data, "titleTextScaleTo");
    fields.banner_title_opacity_from = homepage_number(data, "titleTextOpacityFrom");
    fields.banner_title_opacity_to = homepage_number(data, "titleTextOpacityTo");
    fields.banner_title_visible_from_index = homepage_number(data, "titleTextVisibleFromIndex");
    fields.banner_title_visible_to_index = homepage_number(data, "titleTextVisibleToIndex");
    fields.banner_overlay_tint_color = homepage_string(data, "overlayTintColor");
    fields.banner_overlay_tint_opacity = homepage_number(data, "overlayTintOpacity");
    fields.banner_vignette_opacity = homepage_number(data, "vignetteOpacity");
    fields.banner_fade_to_black_opacity = homepage_number(data, "fadeToBlackOpacity");
    fields
}

fn load_homepage_info_fields(root: &Path, game_asset_path: &str) -> HomepageInfoFields {
    let mut fields = HomepageInfoFields::default();
    let Some(game_value) = load_homepage_game_value(root, game_asset_path) else {
        return fields;
    };
    let Some(game_data) = game_value.get("data").and_then(|d| d.as_object()) else {
        return fields;
    };

    fields.min_players = homepage_number(game_data, "minPlayers");
    fields.max_players = homepage_number(game_data, "maxPlayers");

    let Some(info_path) = game_data
        .get("gameInfoAsset")
        .and_then(|entry| entry.get("path"))
        .and_then(|path| path.as_str())
    else {
        return fields;
    };
    let info_full = root.join(info_path.strip_prefix("Resources/").unwrap_or(info_path));
    let Ok(info_text) = fs::read_to_string(&info_full) else {
        return fields;
    };
    let Ok(info_value) = json5::from_str::<serde_json::Value>(&info_text) else {
        return fields;
    };
    let Some(info_data) = info_value.get("data").and_then(|d| d.as_object()) else {
        return fields;
    };

    fields.tags = homepage_strings(info_data, "tags");
    fields.featured_top_badges = homepage_badges(info_data, "featuredTopBadges");
    fields.featured_bottom_badges = homepage_badges(info_data, "featuredBottomBadges");
    fields.tagline = homepage_string(info_data, "tagline");
    fields.tagline2 = homepage_string(info_data, "tagline2");
    fields.short_description = homepage_string(info_data, "shortDescription");
    fields.description = homepage_string(info_data, "description");
    fields.min_players = homepage_number(info_data, "minPlayers").or(fields.min_players);
    fields.max_players = homepage_number(info_data, "maxPlayers").or(fields.max_players);
    fields.game_category = homepage_string(info_data, "gameCategory");
    fields.subcategory = homepage_string(info_data, "subcategory");
    fields.difficulty = homepage_string(info_data, "difficulty");
    fields.duration = homepage_string(info_data, "duration");
    fields.deck = homepage_string(info_data, "deck");
    fields.players_display = homepage_string(info_data, "playersDisplay");
    fields.quality = homepage_string(info_data, "quality");
    fields
}

fn load_homepage_catalog(conn: &Connection) -> Result<HomepageCatalogPayload, String> {
    let root = resources_dir();
    let mut stmt = conn
        .prepare(
            "SELECT path, guid, asset_type, display_name, release_status, banner_image_hash, game_icon_hash, game_id
             FROM asset_index
             WHERE asset_type LIKE '%GameMode'
             AND (release_status IS NULL OR release_status != 'Deprecated')",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, Option<String>>(5)?,
                row.get::<_, Option<String>>(6)?,
                row.get::<_, Option<String>>(7)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut featured = Vec::new();
    let mut available_now = Vec::new();

    for row in rows {
        let (
            path,
            guid,
            _asset_type,
            display_name,
            release_status,
            banner_image_hash,
            game_icon_hash,
            game_id,
        ) = row.map_err(|e| e.to_string())?;
        if is_hidden_index_path(&path) {
            continue;
        }
        let enabled = release_status
            .as_ref()
            .map(|s| s != "Deprecated")
            .unwrap_or(true);
        let game_id_val =
            game_id.unwrap_or_else(|| path.split('/').rev().nth(1).unwrap_or("").to_string());
        let carousel_fields = load_homepage_carousel_fields(&root, &path);
        let info_fields = load_homepage_info_fields(&root, &path);
        let game = HomepageFeaturedGame {
            game_id: game_id_val,
            guid: guid.clone(),
            name: display_name,
            enabled,
            release_status: release_status.clone(),
            tags: info_fields.tags,
            featured_top_badges: info_fields.featured_top_badges,
            featured_bottom_badges: info_fields.featured_bottom_badges,
            tagline: info_fields.tagline,
            tagline2: info_fields.tagline2,
            short_description: info_fields.short_description,
            description: info_fields.description,
            min_players: info_fields.min_players,
            max_players: info_fields.max_players,
            game_category: info_fields.game_category,
            subcategory: info_fields.subcategory,
            difficulty: info_fields.difficulty,
            duration: info_fields.duration,
            deck: info_fields.deck,
            players_display: info_fields.players_display,
            quality: info_fields.quality,
            banner_image: banner_image_hash,
            game_icon: game_icon_hash,
            carousel_images: carousel_fields.carousel_images,
            carousel_playback_mode: carousel_fields.carousel_playback_mode,
            carousel_transition_type: carousel_fields.carousel_transition_type,
            carousel_transition_duration_ms: carousel_fields.carousel_transition_duration_ms,
            banner_logo_image: carousel_fields.banner_logo_image,
            banner_logo_alt: carousel_fields.banner_logo_alt,
            banner_logo_start_ms: carousel_fields.banner_logo_start_ms,
            banner_logo_duration_ms: carousel_fields.banner_logo_duration_ms,
            banner_logo_scale_from: carousel_fields.banner_logo_scale_from,
            banner_logo_scale_to: carousel_fields.banner_logo_scale_to,
            banner_logo_opacity_from: carousel_fields.banner_logo_opacity_from,
            banner_logo_opacity_to: carousel_fields.banner_logo_opacity_to,
            banner_logo_visible_from_index: carousel_fields.banner_logo_visible_from_index,
            banner_logo_visible_to_index: carousel_fields.banner_logo_visible_to_index,
            banner_title_text: carousel_fields.banner_title_text,
            banner_title_color: carousel_fields.banner_title_color,
            banner_title_start_ms: carousel_fields.banner_title_start_ms,
            banner_title_duration_ms: carousel_fields.banner_title_duration_ms,
            banner_title_scale_from: carousel_fields.banner_title_scale_from,
            banner_title_scale_to: carousel_fields.banner_title_scale_to,
            banner_title_opacity_from: carousel_fields.banner_title_opacity_from,
            banner_title_opacity_to: carousel_fields.banner_title_opacity_to,
            banner_title_visible_from_index: carousel_fields.banner_title_visible_from_index,
            banner_title_visible_to_index: carousel_fields.banner_title_visible_to_index,
            banner_overlay_tint_color: carousel_fields.banner_overlay_tint_color,
            banner_overlay_tint_opacity: carousel_fields.banner_overlay_tint_opacity,
            banner_vignette_opacity: carousel_fields.banner_vignette_opacity,
            banner_fade_to_black_opacity: carousel_fields.banner_fade_to_black_opacity,
        };
        featured.push(game.clone());
        if release_status.as_deref() == Some("Available") {
            available_now.push(game);
        }
    }

    Ok(HomepageCatalogPayload {
        featured,
        available_now,
    })
}

#[tauri::command]
pub fn get_homepage_catalog() -> Result<HomepageCatalogPayload, String> {
    let mut conn = open_db()?;
    ensure_schema(&conn)?;
    ensure_index_populated(&mut conn)?;
    load_homepage_catalog(&conn)
}

#[tauri::command]
pub fn get_homepage_coming_soon() -> Result<HomepageComingSoonPayload, String> {
    let root = resources_dir();
    let mut conn = open_db()?;
    ensure_schema(&conn)?;
    ensure_index_populated(&mut conn)?;
    let coming_soon = load_coming_soon_teasers(&root, &conn)?;
    Ok(HomepageComingSoonPayload { coming_soon })
}

#[tauri::command]
pub fn get_homepage_feature_banner() -> Result<HomepageFeatureBannerPayload, String> {
    let root = resources_dir();
    let mut conn = open_db()?;
    ensure_schema(&conn)?;
    ensure_index_populated(&mut conn)?;
    let feature_banner_items = load_feature_banner_items(&root, &conn)?;
    Ok(HomepageFeatureBannerPayload {
        feature_banner_items,
    })
}

fn extract_mode_from_path(path: &str) -> String {
    let normalized = path.replace('\\', "/");
    if let Some(rest) = normalized.strip_prefix("Resources/GameMode/") {
        if let Some(mode) = rest.split('/').next() {
            return mode.to_string();
        }
    }
    "Other".to_string()
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameCatalogEntryPayload {
    pub game_id: String,
    pub display_name: String,
    pub guid: String,
    pub path: String,
    pub asset_type: String,
    pub mode: String,
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub release_status: Option<String>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameCatalogPayload {
    pub games: Vec<GameCatalogEntryPayload>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogCountsPayload {
    pub games: u32,
    pub images: u32,
    pub resources: u32,
}

#[tauri::command]
pub fn get_catalog_counts() -> Result<CatalogCountsPayload, String> {
    let mut conn = open_db()?;
    ensure_schema(&conn)?;
    ensure_index_populated(&mut conn)?;

    let games: u32 = conn
        .query_row(
            "SELECT COUNT(*) FROM asset_index
             WHERE asset_type LIKE '%GameMode'
             AND (release_status IS NULL OR release_status != 'Deprecated')
             AND path NOT LIKE '%.index/%'
             AND path NOT LIKE '.index/%'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let images: u32 = conn
        .query_row(
            "SELECT COUNT(*) FROM image_index
             WHERE path NOT LIKE '%.index/%'
             AND path NOT LIKE '.index/%'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let resources: u32 = conn
        .query_row(
            "SELECT
                (SELECT COUNT(*) FROM asset_index WHERE path NOT LIKE '%.index/%' AND path NOT LIKE '.index/%') +
                (SELECT COUNT(*) FROM image_index WHERE path NOT LIKE '%.index/%' AND path NOT LIKE '.index/%') +
                (SELECT COUNT(*) FROM file_index WHERE path NOT LIKE '%.index/%' AND path NOT LIKE '.index/%')",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|e| e.to_string())?
        .try_into()
        .unwrap_or(0);

    Ok(CatalogCountsPayload {
        games,
        images,
        resources,
    })
}

#[tauri::command]
pub fn get_games_catalog() -> Result<GameCatalogPayload, String> {
    let mut conn = open_db()?;
    ensure_schema(&conn)?;
    ensure_index_populated(&mut conn)?;

    let mut stmt = conn
        .prepare(
            "SELECT path, guid, asset_type, display_name, release_status, game_id
             FROM asset_index
             WHERE asset_type LIKE '%GameMode'
             AND (release_status IS NULL OR release_status != 'Deprecated')",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, Option<String>>(5)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut games = Vec::new();
    for row in rows {
        let (path, guid, asset_type, display_name, release_status, game_id) =
            row.map_err(|e| e.to_string())?;
        if is_hidden_index_path(&path) {
            continue;
        }
        let enabled = release_status
            .as_ref()
            .map(|s| s != "Deprecated")
            .unwrap_or(true);
        let game_id_val =
            game_id.unwrap_or_else(|| path.split('/').rev().nth(1).unwrap_or("").to_string());
        let mode = extract_mode_from_path(&path);
        games.push(GameCatalogEntryPayload {
            game_id: game_id_val,
            display_name,
            guid,
            path,
            asset_type,
            mode,
            enabled,
            release_status,
        });
    }

    Ok(GameCatalogPayload { games })
}

fn load_asset_bytes(guid: Option<&str>, path: Option<&str>) -> Result<Vec<u8>, String> {
    let root = resources_dir();
    let conn = open_db()?;
    ensure_schema(&conn)?;

    let resolved_path: String = match (guid, path) {
        (Some(g), None) => {
            let mut stmt = conn
                .prepare("SELECT path FROM asset_index WHERE guid = ?1")
                .map_err(|e| e.to_string())?;
            let mut rows = stmt.query([g]).map_err(|e| e.to_string())?;
            let row = rows
                .next()
                .map_err(|e| e.to_string())?
                .ok_or_else(|| format!("load_asset: no asset for guid {g}"))?;
            row.get(0).map_err(|e| e.to_string())?
        }
        (None, Some(p)) => {
            let norm = normalize_path(p);
            let in_asset: bool = conn
                .query_row(
                    "SELECT 1 FROM asset_index WHERE path = ?1 LIMIT 1",
                    [&norm],
                    |_| Ok(()),
                )
                .is_ok();
            let in_image: bool = conn
                .query_row(
                    "SELECT 1 FROM image_index WHERE path = ?1 LIMIT 1",
                    [&norm],
                    |_| Ok(()),
                )
                .is_ok();
            let in_file: bool = conn
                .query_row(
                    "SELECT 1 FROM file_index WHERE path = ?1 LIMIT 1",
                    [&norm],
                    |_| Ok(()),
                )
                .is_ok();
            if !in_asset && !in_image && !in_file {
                let strip = p.strip_prefix("Resources/").unwrap_or(p);
                let full = root.join(strip);
                if full.exists() {
                    return fs::read(&full).map_err(|e| e.to_string());
                }
                return Err(format!(
                    "load_asset: path not in index and file not found: {p}"
                ));
            }
            norm
        }
        _ => return Err("load_asset: exactly one of guid or path required".to_string()),
    };

    let rel = resolved_path
        .strip_prefix("Resources/")
        .unwrap_or(&resolved_path);
    let full = root.join(rel);
    info!("load_asset path={}", resolved_path);
    fs::read(&full).map_err(|e| format!("load_asset({}): {e}", resolved_path))
}

