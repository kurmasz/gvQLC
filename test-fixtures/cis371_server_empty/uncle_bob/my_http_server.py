"""
my_http_server.py

This is a very simple HTTP server.

GVSU CIS 371 2025

"""

import os
import socket
import http_socket
import argparse

HOST = "127.0.0.1"  # Standard loopback interface address (localhost)
PORT = 8534  # Port to listen on (non-privileged ports are > 1023)

# Dictionary mapping extensions to mime types
# (Feel free to add to / modify this dictionary)
EXTENSION_MAP = {
        ".jpeg": "image/jpeg",
        ".jpg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".html": "text/html",
        ".htm": "text/html",
        ".pdf": "application/pdf",
        ".ico": "image/vnd.microsoft.icon",
        ".txt": "text/plain"
}


def list_directory_contents(path):
    """
    Lists the contents of the directory.
    (This is just here for demonstration purposes.)
    """
    contents = os.listdir(path)
    for item in contents:
        print(item)


def handle_connection(connection):
    """
    Handle the "conversation" with a single client connection
    """
    socket = http_socket.HTTPSocket(connection)

    # Read and print the request (e.g. "GET / HTTP/1.0")
    request = socket.receive_text_line()

    # Read and print the request headers
    while True:
        data = socket.receive_text_line().strip()
        if (not data) or (len(data) == 0):
            break
        print(data)
    print('=======')

    # Extract the path from the request.
    parts = request.split()
    if parts:
        path = parts[1][1:]  # remove the first character of the path
        if os.path.isdir(path) or os.path.isdir(f'{path}/') or path[-1] == '/':
            handle_dir(socket, path)
        else:
            handle_file(socket, path)
    socket.close()
    return


def handle_file(socket, path):
    # Assume the path is a file name.
    # If the file name exists, we will send it as a response.
    # Otherwise, send a 404.
    content_type = 'text/plain'

    if os.path.exists(path):
        # We need to know the file size so we can send
        # the Content-Length header.
        file_size = os.path.getsize(path)
        if path.count('.') >= 1:
            # zk Does this work if the file has multiple . in it?
            _, extension_type = path.split('.', 1)
            extension_type = '.' + extension_type
            if extension_type in EXTENSION_MAP:
                content_type = EXTENSION_MAP[extension_type]

        with open(path, 'rb') as file:
            socket.send_text_line("HTTP/1.0 200 OK")
            socket.send_text_line(f"Content-Type: {content_type}")
            socket.send_text_line(f"Content-Length: {file_size}")
            socket.send_text_line(f"Connection: close")
            socket.send_text_line("")

            # Read and send bytes
            socket.send_binary_data_from_file(file, file_size)

    else:
        message = f"<html><body>File '{path}' not found.</body></html>"

        socket.send_text_line("HTTP/1.0 404 NOT FOUND")
        socket.send_text_line(f"Content-Type: {content_type}")
        socket.send_text_line(f"Content-Length: {len(message) + 2}") # +2 for CR/LF
        socket.send_text_line(f"Connection: close")
        socket.send_text_line("")
        socket.send_text_line(message)


def handle_dir(socket, path):
    # Assume the path is a directory name.
    # If the directory name exists, we will send a directory listing as a response.
    # If the directory has a readable index.html file, we will send that instead.
    # If the directory name doesn't have a '/' at the end, send a 301 and redirect, so it does
    # Otherwise, if directory doesn't exist, send a 404.
    if path[-1:] != '/' and os.path.exists(f'{path}/'):
        message = f"<html><body>Directory path '{path}' doesn't end with '/'. Redirect to '{path}/'</body></html>"
        path = path + '/'
        base, split = path.split('/', 1)
        if not split:
            split = base + '/'
        socket.send_text_line("HTTP/1.0 301 Redirect")
        socket.send_text_line("Content-Type: text/plain")
        socket.send_text_line(f"Content-Length: {len(message) + 2}")  # +2 for CR/LF
        socket.send_text_line(f"Location: {split}")
        socket.send_text_line(f"Connection: close")
        socket.send_text_line("")
        socket.send_text_line(message)

        print(split)
        handle_dir(socket, path)
        return

    elif os.path.exists(f'{path}index.html'):
        handle_file(socket, f"{path}index.html")

    elif os.path.isdir(path):
        # We need to know the file size so we can send
        # the Content-Length header.

        directory_contents = os.listdir(path)
        html_lines = []
        directories = []
        files = []
        html_lines.append('<html>')
        html_lines.append('<body>')
        html_lines.append(f'<h1>Index for {path}</h1>')
        # zk Good idea adding the parent directory.
        html_lines.append(f'<a href="../">Parent Directory: ../</a>')

        for item in directory_contents:
            if os.path.isdir(f'{path}{item}/'):
                directories.append(item)
            else:
                files.append(item)
        for dir in directories:
            html_lines.append(f'<p><a href="{dir}/">{dir}/</a></p>')
        for file in files:
            html_lines.append(f'<p><a href="{file}">{file}</a></p>')
        html_lines.append('</body>')
        html_lines.append('</html>')
        body = "\n".join(html_lines)

        socket.send_text_line("HTTP/1.0 200 OK")
        socket.send_text_line(f"Content-Type: text/html")
        socket.send_text_line(f"Content-Length: {len(body)}")
        socket.send_text_line(f"Connection: close")
        socket.send_text_line("")

        socket.send_text_line(body)

    else:
        message = f"<html><body>Directory '{path}' not found.</body></html>"

        socket.send_text_line("HTTP/1.0 404 NOT FOUND")
        socket.send_text_line("Content-Type: text/plain")
        socket.send_text_line(f"Content-Length: {len(message) + 2}") # +2 for CR/LF
        socket.send_text_line(f"Connection: close")
        socket.send_text_line("")
        socket.send_text_line(message)


def main():
    """
    Parse arguments and set up the server socket
    """ 
    
    # Set up the argument parser
    parser = argparse.ArgumentParser(description="A simple plain text HTTP server")
    parser.add_argument("--port", "-p", type=int, help="The port number to listen on", required=False)
    # parser.add_argument("--verbose", "-v", help="Enable verbose output", required=False)
    
    # Parse the command-line arguments
    args = parser.parse_args()
    port = PORT
    if args.port:
        port = args.port

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server_socket:
        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_socket.bind((HOST, port))
        server_socket.listen()
        while True:
            connection, addr = server_socket.accept()
            #args.port = connection.getsockname()[1]
            #port = args.port
            with connection:
                print(f"Connected by {addr}")
                handle_connection(connection)


if __name__ == "__main__":
    main()

# Still not certain about workflow error for Connection Refused
