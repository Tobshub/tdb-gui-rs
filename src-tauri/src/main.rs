// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use httparse;
use once_cell;
use serde_json::Value;
use std::collections::HashMap;
use std::option::Option::Some;
use std::sync::{Arc, Mutex};
use tauri_plugin_window_state;
use tokio::net::TcpStream;
use tokio_tungstenite::tungstenite::handshake::client::generate_key;
use tokio_tungstenite::{connect_async, MaybeTlsStream, WebSocketStream};
use url::Url;

#[derive(serde::Deserialize)]
struct ConnectArgs {
    url: String,
    db_name: String,
    schema: String,
    username: String,
    password: String,
}

#[derive(serde::Deserialize)]
struct QueryArgs {
    action: String,
    table: String,
    data: HashMap<String, Value>,
}

static SOCKET_STREAMS: once_cell::sync::Lazy<
    Arc<Mutex<HashMap<String, WebSocketStream<MaybeTlsStream<TcpStream>>>>>,
> = once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));

#[tauri::command]
async fn connect(conn_id: String, args: ConnectArgs) {
    let url = Url::parse_with_params(
        &args.url,
        &[("db", &args.db_name), ("schema", &args.schema)],
    )
    .unwrap();

    let authorization = format!("{}:{}", args.username, args.password);
    let sec_websocket_key = generate_key();

    let req = httparse::Request {
        method: Some("GET"),
        path: Some(url.as_str()),
        version: Some(1),
        headers: &mut [
            httparse::Header {
                name: "authorization",
                value: authorization.as_bytes(),
            },
            // an error wanted me to set this, now I gave in and it just wants me to set more things
            httparse::Header {
                name: "sec-websocket-key",
                value: sec_websocket_key.as_bytes(),
            },
        ],
    };

    // TODO: handle {res}
    let (stream, res) = connect_async(req)
        .await
        .expect("Failed to establish websocket connection");

    println!("Connected: {:?}", res);

    SOCKET_STREAMS.lock().unwrap().insert(conn_id, stream);
}

#[tauri::command]
async fn query(conn_id: String, query_args: QueryArgs) {
    // TODO: get connection from global store
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![connect, query])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
