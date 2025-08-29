"""
my_http_server.py

This is a very simple HTTP server.

GVSU CIS 371 2025

"""

import os
import socket
import argparse

from http_socket import HTTPSocket
from handlers import handle_headers, handle_binary, handle_text, handle_directory, DEFAULT_HEADERS

HOST = "127.0.0.1"  # Standard loopback interface address (localhost)
PORT = 8534  # Port to listen on (non-privileged ports are > 1023)

# Dictionary mapping extensions to mime types
# (Feel free to add to / modify this dictionary)

# zk There is actually no need to handle text and binary separately.
# Just treat it all as binary.
EXTENSION_MAP = {
    ".jpeg": handle_binary,
    ".jpg": handle_binary,
    ".png": handle_binary,
    ".gif": handle_binary,
    ".html": handle_binary,
    ".htm": handle_text,
    ".pdf": handle_binary,
    ".ico": handle_binary,
}

def list_directory_contents(path):
    """
    Lists the contents of the directory. 
    (This is just here for demonstration purposes.)
    """
    contents = os.listdir(path)
    for item in contents:
        print(item)

def handle_request(path: str, socket: HTTPSocket):
    """
    Helper function to determine what action the server should take.
    """
    if os.path.isdir(path):
        handle_directory(path, socket)
    else:
        filetype = os.path.splitext(path)[-1]
        handler = EXTENSION_MAP.get(filetype, handle_text)
        handler(path, filetype, socket)

def handle_connection(connection):
    """
    Handle the "conversation" with a single client connection
    """
    socket = HTTPSocket(connection)

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
        handle_request(path, socket)
    # Band-aid solution to fix requests to the root dir
    elif path == "/" or path == "":
        handle_request(os.getcwd() + "/", socket)
    else:
        message = f"<html><body>File '{path}' not found.</body></html>"
        handle_headers(
            headers= [
                "HTTP/1.0 404 NOT FOUND",
                "Content-Type: text/html",
                f"Content-Length: {len(message) + 2}", # +2 for CR/LF,
            ] + DEFAULT_HEADERS,
            socket= socket
        )
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