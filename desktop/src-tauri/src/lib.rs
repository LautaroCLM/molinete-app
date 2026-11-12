//! Molinete para Windows: una ventana que carga la web publicada.
//!
//! - La app muestra https://molinete-pi.vercel.app, así que cada cambio que se publica en la web
//!   llega solo a todos los gimnasios (la web avisa "hay una nueva actualización").
//! - Este programa solo se reinstala cuando cambia la ventana en sí: para eso busca versiones
//!   nuevas del instalador al abrir y ofrece instalarlas.
//! - Sin acceso nativo para la web remota: todo lo nativo (descargas, enlaces externos, actualizador)
//!   lo maneja este código.

use tauri::webview::DownloadEvent;
use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_updater::UpdaterExt;

/// Dirección de la web de Molinete (debe coincidir con `dist/index.html`).
const HOST_APP: &str = "molinete-pi.vercel.app";

/// Páginas que se pueden mostrar dentro de la ventana; todo lo demás se abre en el navegador.
fn es_interna(url: &Url) -> bool {
    match url.scheme() {
        "tauri" | "about" | "blob" | "data" => true,
        "http" | "https" => {
            let host = url.host_str().unwrap_or("");
            if host == "tauri.localhost" || host == "localhost" || host == "127.0.0.1" {
                return true;
            }
            host == HOST_APP
        }
        _ => false,
    }
}

/// Busca una versión nueva del instalador y pregunta si instalarla.
async fn buscar_actualizacion(app: AppHandle) {
    let Ok(updater) = app.updater() else { return };
    let Ok(Some(update)) = updater.check().await else { return };

    let mensaje = format!(
        "Hay una nueva actualización de Molinete (versión {}).\n\nSe instala en unos segundos y la aplicación se reinicia sola.",
        update.version
    );
    let app_dialogo = app.clone();
    app.dialog()
        .message(mensaje)
        .title("Actualización disponible")
        .kind(MessageDialogKind::Info)
        .buttons(MessageDialogButtons::OkCancelCustom("Instalar ahora".into(), "Más tarde".into()))
        .show(move |instalar| {
            if !instalar {
                return;
            }
            tauri::async_runtime::spawn(async move {
                if update.download_and_install(|_, _| {}, || {}).await.is_ok() {
                    app_dialogo.restart();
                } else {
                    app_dialogo
                        .dialog()
                        .message("No pudimos instalar la actualización. Probá de nuevo más tarde.")
                        .title("Molinete")
                        .kind(MessageDialogKind::Warning)
                        .show(|_| {});
                }
            });
        });
}

pub fn run() {
    tauri::Builder::default()
        // Una sola ventana: si se abre de nuevo, se trae la que ya está al frente.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(ventana) = app.get_webview_window("main") {
                let _ = ventana.unminimize();
                let _ = ventana.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let para_navegar = app.handle().clone();
            let para_descargas = app.handle().clone();

            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("Molinete")
                .inner_size(1360.0, 840.0)
                .min_inner_size(1024.0, 680.0)
                .center()
                .maximized(true)
                // Enlaces a otros sitios (WhatsApp, mapas, etc.): al navegador, no dentro de la app.
                .on_navigation(move |url| {
                    if es_interna(url) {
                        true
                    } else {
                        let _ = para_navegar.opener().open_url(url.as_str(), None::<&str>);
                        false
                    }
                })
                // Descargas (Excel): se guardan en Descargas y se muestra el archivo en el Explorador.
                .on_download(move |_webview, evento| {
                    if let DownloadEvent::Finished { path: Some(ruta), success: true, .. } = evento {
                        let _ = para_descargas.opener().reveal_item_in_dir(ruta);
                    }
                    true
                })
                .build()?;

            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                buscar_actualizacion(app_handle).await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error al iniciar Molinete");
}
