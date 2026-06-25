use tauri::{
    menu::{Menu, MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder},
    App, Emitter, Manager, Runtime,
};

const MENU_EVENT: &str = "onyxwriter://menu-command";

struct CommandItem {
    id: &'static str,
    label: &'static str,
    accelerator: Option<&'static str>,
}

pub fn install_app_menu(app: &mut App) -> tauri::Result<()> {
    let handle = app.handle();
    let menu = build_app_menu(handle)?;
    app.set_menu(menu)?;
    app.on_menu_event(|app, event| {
        let command = event.id().0.as_str();
        if is_app_command(command) {
            let _ = app.emit(MENU_EVENT, serde_json::json!({ "command": command }));
        }
    });
    Ok(())
}

fn build_app_menu<R: Runtime>(manager: &impl Manager<R>) -> tauri::Result<Menu<R>> {
    MenuBuilder::new(manager)
        .item(&app_menu(manager)?)
        .item(&file_menu(manager)?)
        .item(&edit_menu(manager)?)
        .item(&format_menu(manager)?)
        .item(&insert_menu(manager)?)
        .item(&view_menu(manager)?)
        .item(&window_menu(manager)?)
        .item(&help_menu(manager)?)
        .build()
}

fn app_menu<R: Runtime>(manager: &impl Manager<R>) -> tauri::Result<tauri::menu::Submenu<R>> {
    #[cfg(target_os = "macos")]
    {
        return SubmenuBuilder::new(manager, "Onyx Writer")
            .item(&PredefinedMenuItem::about(manager, None, None)?)
            .separator()
            .item(&PredefinedMenuItem::services(manager, None)?)
            .separator()
            .item(&PredefinedMenuItem::hide(manager, None)?)
            .item(&PredefinedMenuItem::hide_others(manager, None)?)
            .separator()
            .item(&PredefinedMenuItem::quit(manager, None)?)
            .build();
    }

    #[cfg(not(target_os = "macos"))]
    SubmenuBuilder::new(manager, "Onyx Writer")
        .item(&PredefinedMenuItem::about(manager, None, None)?)
        .separator()
        .item(&PredefinedMenuItem::quit(manager, None)?)
        .build()
}

fn file_menu<R: Runtime>(manager: &impl Manager<R>) -> tauri::Result<tauri::menu::Submenu<R>> {
    let items = [
        CommandItem {
            id: "bundle.open",
            label: "Open Bundle...",
            accelerator: Some("CmdOrCtrl+O"),
        },
        CommandItem {
            id: "bundle.create",
            label: "Create Bundle...",
            accelerator: Some("CmdOrCtrl+Shift+O"),
        },
        CommandItem {
            id: "document.new",
            label: "New Document",
            accelerator: Some("CmdOrCtrl+N"),
        },
        CommandItem {
            id: "document.openRecent",
            label: "Open Recent Document",
            accelerator: None,
        },
        CommandItem {
            id: "folder.new",
            label: "New Folder",
            accelerator: Some("CmdOrCtrl+Shift+N"),
        },
        CommandItem {
            id: "document.share",
            label: "Share",
            accelerator: None,
        },
        CommandItem {
            id: "document.export",
            label: "Export...",
            accelerator: None,
        },
        CommandItem {
            id: "tab.close",
            label: "Close Tab",
            accelerator: Some("CmdOrCtrl+W"),
        },
        CommandItem {
            id: "document.save",
            label: "Save",
            accelerator: Some("CmdOrCtrl+S"),
        },
        CommandItem {
            id: "bundle.refresh",
            label: "Refresh Bundle",
            accelerator: Some("CmdOrCtrl+R"),
        },
    ];
    let mut menu = SubmenuBuilder::new(manager, "File");
    for (index, item) in items.iter().enumerate() {
        if index == 2 || index == 5 || index == 7 {
            menu = menu.separator();
        }
        menu = menu.item(&command_item(manager, item)?);
    }
    menu.build()
}

fn edit_menu<R: Runtime>(manager: &impl Manager<R>) -> tauri::Result<tauri::menu::Submenu<R>> {
    SubmenuBuilder::new(manager, "Edit")
        .item(&command_item(
            manager,
            &CommandItem {
                id: "editor.undo",
                label: "Undo",
                accelerator: Some("CmdOrCtrl+Z"),
            },
        )?)
        .item(&command_item(
            manager,
            &CommandItem {
                id: "editor.redo",
                label: "Redo",
                accelerator: Some("CmdOrCtrl+Shift+Z"),
            },
        )?)
        .separator()
        .item(&PredefinedMenuItem::cut(manager, None)?)
        .item(&PredefinedMenuItem::copy(manager, None)?)
        .item(&PredefinedMenuItem::paste(manager, None)?)
        .item(&PredefinedMenuItem::select_all(manager, None)?)
        .separator()
        .item(&command_item(
            manager,
            &CommandItem {
                id: "item.rename",
                label: "Rename",
                accelerator: None,
            },
        )?)
        .item(&command_item(
            manager,
            &CommandItem {
                id: "item.delete",
                label: "Delete",
                accelerator: None,
            },
        )?)
        .build()
}

fn format_menu<R: Runtime>(manager: &impl Manager<R>) -> tauri::Result<tauri::menu::Submenu<R>> {
    let items = [
        CommandItem {
            id: "editor.paragraph",
            label: "Paragraph",
            accelerator: Some("CmdOrCtrl+Alt+0"),
        },
        CommandItem {
            id: "editor.heading1",
            label: "Heading 1",
            accelerator: Some("CmdOrCtrl+Alt+1"),
        },
        CommandItem {
            id: "editor.heading2",
            label: "Heading 2",
            accelerator: Some("CmdOrCtrl+Alt+2"),
        },
        CommandItem {
            id: "editor.heading3",
            label: "Heading 3",
            accelerator: Some("CmdOrCtrl+Alt+3"),
        },
        CommandItem {
            id: "editor.bold",
            label: "Bold",
            accelerator: Some("CmdOrCtrl+B"),
        },
        CommandItem {
            id: "editor.italic",
            label: "Italic",
            accelerator: Some("CmdOrCtrl+I"),
        },
        CommandItem {
            id: "editor.strike",
            label: "Strikethrough",
            accelerator: Some("CmdOrCtrl+Shift+X"),
        },
        CommandItem {
            id: "editor.code",
            label: "Inline Code",
            accelerator: None,
        },
        CommandItem {
            id: "editor.bulletList",
            label: "Bullet List",
            accelerator: Some("CmdOrCtrl+Shift+8"),
        },
        CommandItem {
            id: "editor.orderedList",
            label: "Ordered List",
            accelerator: Some("CmdOrCtrl+Shift+7"),
        },
    ];
    let mut menu = SubmenuBuilder::new(manager, "Format");
    for (index, item) in items.iter().enumerate() {
        if index == 4 || index == 8 {
            menu = menu.separator();
        }
        menu = menu.item(&command_item(manager, item)?);
    }
    menu.build()
}

fn insert_menu<R: Runtime>(manager: &impl Manager<R>) -> tauri::Result<tauri::menu::Submenu<R>> {
    SubmenuBuilder::new(manager, "Insert")
        .item(&command_item(
            manager,
            &CommandItem {
                id: "editor.link",
                label: "Link...",
                accelerator: Some("CmdOrCtrl+K"),
            },
        )?)
        .item(&command_item(
            manager,
            &CommandItem {
                id: "editor.unlink",
                label: "Remove Link",
                accelerator: Some("CmdOrCtrl+Shift+K"),
            },
        )?)
        .separator()
        .item(&command_item(
            manager,
            &CommandItem {
                id: "editor.table",
                label: "Table",
                accelerator: None,
            },
        )?)
        .item(&command_item(
            manager,
            &CommandItem {
                id: "editor.image",
                label: "Image...",
                accelerator: None,
            },
        )?)
        .build()
}

fn view_menu<R: Runtime>(manager: &impl Manager<R>) -> tauri::Result<tauri::menu::Submenu<R>> {
    SubmenuBuilder::new(manager, "View")
        .item(&command_item(
            manager,
            &CommandItem {
                id: "mode.toggle",
                label: "Toggle Visual/Raw",
                accelerator: Some("CmdOrCtrl+`"),
            },
        )?)
        .item(&command_item(
            manager,
            &CommandItem {
                id: "mode.visual",
                label: "Visual Mode",
                accelerator: None,
            },
        )?)
        .item(&command_item(
            manager,
            &CommandItem {
                id: "mode.raw",
                label: "Raw Mode",
                accelerator: None,
            },
        )?)
        .separator()
        .item(&command_item(
            manager,
            &CommandItem {
                id: "graph.toggle",
                label: "Bundle Graph",
                accelerator: Some("CmdOrCtrl+Shift+G"),
            },
        )?)
        .item(&command_item(
            manager,
            &CommandItem {
                id: "explorer.toggle",
                label: "Toggle Explorer",
                accelerator: Some("CmdOrCtrl+Shift+E"),
            },
        )?)
        .item(&command_item(
            manager,
            &CommandItem {
                id: "validation.toggle",
                label: "Toggle Validation",
                accelerator: Some("CmdOrCtrl+Shift+M"),
            },
        )?)
        .build()
}

fn window_menu<R: Runtime>(manager: &impl Manager<R>) -> tauri::Result<tauri::menu::Submenu<R>> {
    let mut menu = SubmenuBuilder::new(manager, "Window")
        .item(&command_item(
            manager,
            &CommandItem {
                id: "tab.previous",
                label: "Previous Tab",
                accelerator: Some("Ctrl+Shift+Tab"),
            },
        )?)
        .item(&command_item(
            manager,
            &CommandItem {
                id: "tab.next",
                label: "Next Tab",
                accelerator: Some("Ctrl+Tab"),
            },
        )?);
    #[cfg(not(target_os = "linux"))]
    {
        menu = menu
            .separator()
            .item(&PredefinedMenuItem::minimize(manager, None)?);
    }
    menu.separator()
        .item(&PredefinedMenuItem::fullscreen(manager, None)?)
        .build()
}

fn help_menu<R: Runtime>(manager: &impl Manager<R>) -> tauri::Result<tauri::menu::Submenu<R>> {
    SubmenuBuilder::new(manager, "Help")
        .item(&command_item(
            manager,
            &CommandItem {
                id: "settings.open",
                label: "Onyx Writer Settings...",
                accelerator: Some("CmdOrCtrl+,"),
            },
        )?)
        .build()
}

fn command_item<R: Runtime>(
    manager: &impl Manager<R>,
    item: &CommandItem,
) -> tauri::Result<tauri::menu::MenuItem<R>> {
    let mut builder = MenuItemBuilder::with_id(item.id, item.label);
    if let Some(accelerator) = item.accelerator {
        builder = builder.accelerator(accelerator);
    }
    builder.build(manager)
}

fn is_app_command(command: &str) -> bool {
    command.contains('.')
}
