mod commands;

use tauri::{
    image::Image,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use tauri_plugin_window_state::{AppHandleExt, StateFlags};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            std::thread::spawn(|| {
                if let Err(e) = commands::asset_db::ensure_index_available() {
                    log::warn!("ensure_index_available on startup failed: {}", e);
                }
            });
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let icon = app.default_window_icon().cloned().unwrap_or_else(|| {
                Image::from_bytes(include_bytes!("../icons/32x32.png")).unwrap()
            });

            TrayIconBuilder::new()
                .icon(icon)
                .tooltip("Asset Editor")
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
                if window.label() == "main" {
                    let _ = window.app_handle().save_window_state(StateFlags::all());
                    (window as &tauri::Window).hide().unwrap();
                    api.prevent_close();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::assets::write_asset,
            commands::assets::delete_asset,
            commands::assets::list_dir,
            commands::assets::scan_assets,
            commands::assets::get_resources_dir,
            commands::assets::compute_asset_hash,
            commands::asset_db::get_local_index_hash,
            commands::assets::read_cached_image,
            commands::assets::write_cached_image,
            commands::asset_db::load_asset,
            commands::asset_db::rebuild_index,
            commands::asset_db::get_index_status,
            commands::asset_db::get_resources_in_folder_db,
            commands::asset_db::get_disk_resource_entries_db,
            commands::asset_db::get_image_resource_entries_db,
            commands::asset_db::get_image_resource_groups_db,
            commands::asset_db::get_resource_by_guid_db,
            commands::asset_db::get_resource_by_hash_db,
            commands::asset_db::query_resources_db,
            commands::asset_db::get_homepage_catalog,
            commands::asset_db::get_homepage_coming_soon,
            commands::asset_db::get_homepage_feature_banner,
            commands::asset_db::get_games_catalog,
            commands::asset_db::get_catalog_counts,
            commands::auth::start_oauth_server,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
