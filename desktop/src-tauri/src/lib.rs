use std::io::Cursor;
use std::path::{Component, Path, PathBuf};
use tauri::{ipc::Response, Manager};

fn safe_original_relative_path(original_path: &str) -> Result<PathBuf, String> {
    let relative = Path::new(original_path)
        .strip_prefix(Path::new("assets/originals"))
        .map_err(|_| "原图路径不属于 assets/originals".to_string())?;

    if relative.as_os_str().is_empty()
        || relative
            .components()
            .any(|component| !matches!(component, Component::Normal(_)))
    {
        return Err("原图路径不合法".to_string());
    }

    let extension = relative
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if !matches!(
        extension.as_str(),
        "jpg" | "jpeg" | "png" | "tif" | "tiff" | "mpo"
    ) {
        return Err("不支持的原图格式".to_string());
    }

    Ok(relative.to_path_buf())
}

fn candidate_roots(app: &tauri::AppHandle, library_root: Option<String>) -> Vec<PathBuf> {
    let mut roots = Vec::new();
    if let Some(root) = library_root.filter(|value| !value.trim().is_empty()) {
        roots.push(PathBuf::from(root));
    }
    if let Some(root) = std::env::var_os("PINGYANG_ORIGINALS_DIR") {
        roots.push(PathBuf::from(root));
    }
    #[cfg(debug_assertions)]
    roots.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../assets/originals"));
    if let Ok(resource_dir) = app.path().resource_dir() {
        roots.push(resource_dir.join("assets/originals"));
    }
    if let Ok(executable) = std::env::current_exe() {
        if let Some(parent) = executable.parent() {
            roots.push(parent.join("assets/originals"));
        }
    }
    roots
}

fn browser_image_bytes(path: &Path) -> Result<Vec<u8>, String> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if matches!(extension.as_str(), "tif" | "tiff") {
        let image = image::open(path).map_err(|error| format!("无法解码 TIFF 原图：{error}"))?;
        let mut output = Cursor::new(Vec::new());
        image
            .write_to(&mut output, image::ImageFormat::Png)
            .map_err(|error| format!("无法生成 TIFF 预览：{error}"))?;
        Ok(output.into_inner())
    } else {
        std::fs::read(path).map_err(|error| format!("无法读取本地原图：{error}"))
    }
}

#[tauri::command]
fn read_local_image(
    app: tauri::AppHandle,
    original_path: String,
    library_root: Option<String>,
) -> Result<Response, String> {
    let relative = safe_original_relative_path(&original_path)?;

    for root in candidate_roots(&app, library_root) {
        let Ok(canonical_root) = root.canonicalize() else {
            continue;
        };
        let candidate = canonical_root.join(&relative);
        let Ok(canonical_candidate) = candidate.canonicalize() else {
            continue;
        };
        if !canonical_candidate.starts_with(&canonical_root) || !canonical_candidate.is_file() {
            continue;
        }
        let bytes = browser_image_bytes(&canonical_candidate)?;
        return Ok(Response::new(bytes));
    }

    Err("未找到本地原图，请选择 assets/originals 文件夹".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![read_local_image])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{browser_image_bytes, safe_original_relative_path};

    #[test]
    fn accepts_manifest_original_path() {
        let relative = safe_original_relative_path("assets/originals/py-001/01-primary.jpg")
            .expect("manifest path should be valid");
        assert_eq!(relative.to_string_lossy(), "py-001/01-primary.jpg");
    }

    #[test]
    fn rejects_path_traversal_and_non_image_files() {
        assert!(safe_original_relative_path("assets/originals/../secret.jpg").is_err());
        assert!(safe_original_relative_path("assets/originals/py-001/data.json").is_err());
        assert!(safe_original_relative_path("/tmp/image.jpg").is_err());
    }

    #[test]
    fn converts_tiff_to_png_without_rewriting_source() {
        let source = std::env::temp_dir().join(format!(
            "pingyang-gallery-{}-preview.tiff",
            std::process::id()
        ));
        image::DynamicImage::new_rgb8(2, 2)
            .save_with_format(&source, image::ImageFormat::Tiff)
            .expect("test TIFF should be created");

        let bytes = browser_image_bytes(&source).expect("TIFF should convert to a browser preview");
        assert!(bytes.starts_with(b"\x89PNG\r\n\x1a\n"));
        assert!(source.exists());
        std::fs::remove_file(source).expect("test TIFF should be removed");
    }
}
