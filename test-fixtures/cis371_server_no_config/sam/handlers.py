"""
handlers.py

Helper functions to handle various filetype requests.

Needed to support my function mapping modification to
the EXTENSION_MAP dict in my_http_server.py.

GVSU CIS 371 2025

"""

import os

from http_socket import HTTPSocket

DEFAULT_HEADERS = ["Connection: close", ""]
EXTENSION_MAP = {
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".html": "text/html",
    ".htm": "text/html",
    ".pdf": "application/pdf",
    ".ico": "image/vnd.microsoft.icon",
}
OK = "HTTP/1.0 200 OK"

def handle_headers(headers: list[str], socket: HTTPSocket):
    for header in headers:
        socket.send_text_line(header)

def handle_binary(path: str, filetype: str, socket: HTTPSocket):
    """
    Provided starter code modified for binary data
    """
    file_size = os.path.getsize(path)
    with open(path, 'rb') as file:
        handle_headers(
            headers= [
                OK,
                f"Content-Type: {EXTENSION_MAP[filetype]}",
                f"Content-Length: {file_size}",
            ] + DEFAULT_HEADERS,
            socket= socket
        )
        socket.send_binary_data_from_file(file, file_size)

def handle_text(path: str, filetype: str, socket: HTTPSocket):
    """
    Provided starter code, simply re-organized :^)
    """
    file_size = os.path.getsize(path)
    with open(path, 'r') as file:
        handle_headers(
            [
                OK,
                f"Content-Type: {EXTENSION_MAP.get(filetype, 'text/plain')}",
                f"Content-Length: {file_size}",
            ] + DEFAULT_HEADERS,
            socket= socket
        )

        while line := file.readline():
            socket.send_text_line(line)

def handle_directory(path: str, socket: HTTPSocket):
    """
    Helper function to handle directory requests.
    Will redirect with a 301 if needed, display the
    index.html if it exists, and list the directory
    contents otherwise.
    """
    if path[-1] != "/":
        path = "/" + path + "/"
        handle_headers(
            headers= [
                "HTTP/1.0 301 Moved Permanently",
                "Content-Type: text/plain",
                f"Content-Length: {len(path)}",
                f"location: {path}"
            ] + DEFAULT_HEADERS,
            socket= socket
        )
    elif os.path.exists(os.path.join(path, "index.html")):
        handle_text(
            os.path.join(path, "index.html"), ".html", socket
        )
    elif os.path.exists(os.path.join(path, "index.htm")):
        handle_text(
            os.path.join(path, "index.htm"), ".htm", socket
        )
    else:
        handle_headers(
            headers= [
                OK,
                f"Content-Type: text/html",
                f"Content-Length: {len(path)}",
                f"location: {path}"
            ] + DEFAULT_HEADERS,
            socket= socket
        )
        content = []
        for d in os.listdir(path):
            #Add a / if it's a dir
            if os.path.isdir(os.path.join(path, d)):
                content.append(f'<p><a href="{d}">{d}/</a></p>')
            else:
                content.append(f'<p><a href="{d}">{d}</a></p>')

        contents = "".join(content)
        message = f"<html><body><h1>Directory contents:</h1>{contents}</body></html>"
        socket.send_text_line(message)