import http.server
import socketserver
import os

PORT = 8000

class UTF8RequestHandler(http.server.SimpleHTTPRequestHandler):
    def guess_type(self, path):
        content_type = super().guess_type(path)
        if content_type.startswith('text/') or content_type == 'application/javascript':
            # Append charset=utf-8 if it's not already there
            if 'charset=' not in content_type:
                content_type += '; charset=utf-8'
        if path.endswith('.js'):
            content_type = 'application/javascript; charset=utf-8'
        return content_type

Handler = UTF8RequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print("Serving at port", PORT)
    httpd.serve_forever()
