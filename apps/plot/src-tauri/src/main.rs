// 릴리스에서 콘솔 창이 뜨지 않게 — 지우지 말 것
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    portdock_plot_lib::run()
}
