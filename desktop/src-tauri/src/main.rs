// Evita la ventana de consola en Windows al abrir la app.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    molinete_desktop_lib::run()
}
