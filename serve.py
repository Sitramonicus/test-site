#!/usr/bin/env python3
"""
serve.py — simple local static file server.

Usage:
  python serve.py            # serves on port 8000
  python serve.py 3000       # serves on port 3000

Serves files from the folder containing this script.
"""
from http.server import SimpleHTTPRequestHandler
from socketserver import TCPServer
from pathlib import Path
import socket
import sys
import webbrowser

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
DIRECTORY = Path(__file__).resolve().parent

class LocalRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory=str(DIRECTORY), **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def end_headers(self):
        # Helpful for local development: allow cross-origin requests
        self.send_header('Access-Control-Allow-Origin', '*')
        # discourage aggressive caching while developing
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def log_message(self, fmt, *args):
        # shorter console logs
        print(f"{self.client_address[0]} - - [{self.log_date_time_string()}] {fmt % args}")

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # this does not actually send data, only resolves the outbound interface
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip

if __name__ == "__main__":
    address = ("0.0.0.0", PORT)
    handler = LocalRequestHandler
    with TCPServer(address, handler) as httpd:
        print(f"Serving directory: {DIRECTORY}")
        print(f"Local:   http://localhost:{PORT}/")
        print(f"Network: http://{get_local_ip()}:{PORT}/")
        # attempt to open browser at the local URL
        try:
            webbrowser.open(f"http://localhost:{PORT}/")
        except Exception:
            pass
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped by user.")
            httpd.server_close()
