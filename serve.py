"""Ryukyu World: run the game on this computer.

Double-click start.bat (Windows) or start.command (Mac), or run:  python serve.py
It serves this folder, tells the browser never to keep old copies, and opens the game.
"""
import http.server, os, socket, sys, threading, webbrowser

os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = dict(http.server.SimpleHTTPRequestHandler.extensions_map)
    extensions_map.update({'.js': 'text/javascript', '.json': 'application/json', '.html': 'text/html; charset=utf-8'})

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')      # always load the files that are in the folder now
        super().end_headers()

    def log_message(self, fmt, *args):
        if args and str(args[1] if len(args) > 1 else '').startswith(('4', '5')):
            super().log_message(fmt, *args)                # only print problems

def free_port(first):
    for port in range(first, first + 30):
        with socket.socket() as s:
            try:
                s.bind(('127.0.0.1', port)); return port
            except OSError:
                continue
    raise SystemExit('No free port found near %d.' % first)

if not os.path.exists('index.html'):
    raise SystemExit('index.html is not in this folder. Run this from the folder that holds index.html.')
port = free_port(int(sys.argv[1]) if len(sys.argv) > 1 else 8765)
url = 'http://127.0.0.1:%d/' % port
server = http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler)
print('Ryukyu World is running at', url)
print('Leave this window open while you play. Close it to stop.')
if '--no-open' not in sys.argv:
    threading.Timer(.4, lambda: webbrowser.open(url)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
