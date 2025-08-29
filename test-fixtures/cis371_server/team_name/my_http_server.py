"""
my_http_server.py

This is a very simple HTTP server.

GVSU CIS 371 2025

"""

import os
import socket
import urllib.parse
import http_socket
import argparse
import urllib

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

def return_directory_items(socket, path, status_code):
    links = []

    for item in os.listdir(path):
        link = urllib.parse.quote(item)
        links.append(f"<a href=\"{link}\">{item}</a><br>")

    # zk Another idea would be "<br>".join(links) instead of a br at the end of every one. 
    html_directory_document = "<html><body>" + "".join(links) + "</body></html>"
    content_length = len(html_directory_document.encode("utf-8"))

    socket.send_text_line(f"HTTP/1.0 {status_code} OK")
    socket.send_text_line(f"Content-Type: text/html")
    socket.send_text_line(f"Location: /{path}")
    socket.send_text_line(f"Content-Length: {content_length}")
    socket.send_text_line(f"Connection: close")
    socket.send_text_line("")  #<===========

    socket.send_text_line(html_directory_document)

    return

def handle_connection(connection):
    """
    Handle the "conversation" with a single client connection
    """
    socket = http_socket.HTTPSocket(connection)

    # Read and print the request (e.g. "GET / HTTP/1.0")
    request = socket.receive_text_line()
    print(f"Request: {request}")


    # Read and print the request headers
    while True:
        data = socket.receive_text_line().strip()
        if (not data) or (len(data) == 0):
                break
        print(data)
    print('=======')

    # Extract the path from the request.
    parts = request.split()
    path = parts[1][1:]  # remove the first character of the path

    # Assume the path is a file name.
    # If the file name exists, we will send it as a response.
    # Otherwise, send a 404.
    if os.path.exists(path):
        status_code = "200"
        print(f"PATH HERE: {path}")

        if os.path.isdir(path):
            if path[-1] != "/":
                path += "/"
                status_code = "301"

            if os.path.exists(f"{path}/index.html"):
                path += "index.html"
            else:
                return_directory_items(socket, path, status_code)

                socket.close()
                return

        # We need to know the file size so we can send
        # the Content-Length header.
        file_size = os.path.getsize(path)
        file_extension = os.path.splitext(path)[1] 
        if file_extension not in EXTENSION_MAP:
            content_type = "text/plain"
        else:
            content_type = EXTENSION_MAP[file_extension]

        status_message = "OK"

        if status_code == "301":
            status_message = "Moved Permanently"

        with open(path, 'rb') as file:
            socket.send_text_line(f"HTTP/1.0 {status_code} {status_message}")
            socket.send_text_line(f"Content-Type: {content_type}")
            socket.send_text_line(f"Location: /{path}")
            socket.send_text_line(f"Content-Length: {file_size}")
            socket.send_text_line(f"Connection: close")
            socket.send_text_line("")

            # Read and send one line at a time.
            # (This works because this server only handles text.)    
            socket.send_binary_data_from_file(file, file_size)
    else:
        message = f"<html><body>File '{path}' not found.</body></html>"

        socket.send_text_line("HTTP/1.0 404 NOT FOUND")
        socket.send_text_line("Content-Type: text/html")
        socket.send_text_line(f"Content-Length: {len(message) + 2}") # +2 for CR/LF
        socket.send_text_line(f"Connection: close")
        socket.send_text_line("")
        socket.send_text_line(message)

    socket.close()

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
            with connection:
                print(f"Connected by {addr}")
                handle_connection(connection)

if __name__ == "__main__":
    main()