use tauri::Manager;

#[tauri::command]
fn read_local_image(slug: String, role: String) -> Result<Vec<u8>, String> {
    // Attempt to read original high-res image from assets/originals/
    let base = std::path::Path::new("../assets/originals");
    let exts = ["jpg", "jpeg", "tif", "tiff", "png", "mpo"];
    for ext in &exts {
        let path = base.join(&slug).join(format!("{}.{}", role, ext));
        if let Ok(data) = std::fs::read(&path) {
            return Ok(data);
        }
    }
    Err(format!("local image not found: {}/{}", slug, role))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![read_local_image])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
