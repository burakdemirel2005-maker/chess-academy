use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Serialize, Deserialize)]
pub struct PlatformInfo {
    pub platform: String,
    pub arch: String,
    pub version: String,
    pub is_desktop: bool,
}

#[tauri::command]
fn get_platform_info() -> PlatformInfo {
    PlatformInfo {
        platform: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        is_desktop: true,
    }
}

fn resolve_store_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create app data dir: {}", e))?;
    }
    Ok(dir.join("chess_academy_store.json"))
}

#[tauri::command]
fn read_local_backup(app: tauri::AppHandle) -> Result<String, String> {
    let path = resolve_store_path(&app)?;
    if !path.exists() {
        return Ok("{}".to_string());
    }
    fs::read_to_string(path).map_err(|e| format!("Failed to read local backup: {}", e))
}

#[tauri::command]
fn write_local_backup(app: tauri::AppHandle, payload: String) -> Result<bool, String> {
    let path = resolve_store_path(&app)?;
    fs::write(path, payload).map_err(|e| format!("Failed to write local backup: {}", e))?;
    Ok(true)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_platform_info,
            read_local_backup,
            write_local_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running Satranç Akademisi desktop application");
}
