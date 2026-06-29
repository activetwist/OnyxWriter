mod design_system_fs;
mod encrypted_storage;
mod menu;
mod okf_fs;

use design_system_fs::{
    delete_imported_design_system, list_imported_design_systems, read_design_system_import_file,
    read_design_system_settings, save_imported_design_system, write_design_system_settings,
};
use encrypted_storage::{
    encrypted_folder_info, initialize_encrypted_folder, list_encrypted_folder,
    read_encrypted_document, write_encrypted_document,
};
use okf_fs::{
    create_folder, create_markdown_file, delete_path, directory_has_entries, import_image_asset,
    initialize_workspace, inspect_workspace_folder, list_workspace, move_path, read_text_file,
    read_workspace_asset, rename_path, reveal_path, write_export_file, write_text_file,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            menu::install_app_menu(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_workspace,
            directory_has_entries,
            inspect_workspace_folder,
            initialize_workspace,
            import_image_asset,
            read_workspace_asset,
            read_text_file,
            write_text_file,
            write_export_file,
            reveal_path,
            create_folder,
            create_markdown_file,
            rename_path,
            move_path,
            delete_path,
            read_design_system_import_file,
            list_imported_design_systems,
            save_imported_design_system,
            delete_imported_design_system,
            read_design_system_settings,
            write_design_system_settings,
            initialize_encrypted_folder,
            encrypted_folder_info,
            list_encrypted_folder,
            read_encrypted_document,
            write_encrypted_document
        ])
        .run(tauri::generate_context!())
        .expect("error while running onyxwriter");
}
