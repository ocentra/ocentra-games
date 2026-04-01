use std::io::{Read, Write};
use std::net::TcpListener;
use tauri::Emitter;

const OAUTH_CALLBACK_PORT: u16 = 8765;

/// Starts a one-shot localhost TCP server for OAuth callback on a fixed port
/// so the redirect URI can be registered in Google Cloud Console.
/// Emits "oauth://url" with the full callback URL when the redirect arrives.
#[tauri::command]
pub fn start_oauth_server(app: tauri::AppHandle) -> Result<u16, String> {
    let listener = TcpListener::bind(("127.0.0.1", OAUTH_CALLBACK_PORT))
        .map_err(|e| format!("bind failed: {e}"))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("local_addr: {e}"))?
        .port();

    tauri::async_runtime::spawn_blocking(move || {
        match listener.accept() {
            Ok((mut stream, _)) => {
                let mut buf = [0u8; 8192];
                let n = stream.read(&mut buf).unwrap_or(0);
                let raw = String::from_utf8_lossy(&buf[..n]);

                // First line: "GET /?code=xxx HTTP/1.1"
                let callback_url = raw
                    .lines()
                    .next()
                    .and_then(|l| l.split_whitespace().nth(1))
                    .map(|path| format!("http://127.0.0.1:{port}{path}"))
                    .unwrap_or_default();

                // Close the browser tab gracefully
                let body =
                    "<html><body><h2>Sign-in complete. You can close this tab.</h2></body></html>";
                let response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    body.len(),
                    body
                );
                let _ = stream.write_all(response.as_bytes());
                let _ = stream.flush();

                app.emit("oauth://url", callback_url).ok();
            }
            Err(e) => {
                app.emit("oauth://url", format!("error://{e}")).ok();
            }
        }
    });

    Ok(port)
}
