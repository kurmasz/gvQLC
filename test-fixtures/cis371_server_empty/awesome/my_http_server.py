"""
my_http_server.py

This is a very simple HTTP server.

GVSU CIS 371 2025
"""

import os
import socket
import http_socket
# import argparse

HOST = "127.0.0.1"  # Standard loopback interface address (localhost)
PORT = 8534  # Port to listen on (non-privileged ports are > 1023)

# zk Better idea:  make this configurable.
ROOT_DIRECTORY = "."

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
        ".ico": "image/vnd.microsoft.icon"
}

#def list_directory_contents(path):
#    """
#    Lists the contents of the directory. 
#    (This is just here for demonstration purposes.)
#    """
#    contents = os.listdir(path)
#    for item in contents:
#        print(item)

def EXTENSION_MAP_Get(file_path):
    """
    Get the file path and type.
    """
    extension = os.path.splitext(file_path)[1] # split the file path and get the extension
    return EXTENSION_MAP.get(extension, "text/plain")

def list_directory_contents(path, url_path):
    """
    Lists the contents of the directory. 
    """
    files_in_directory = os.listdir(path)
    list_directory = "<html><body><h2>Directory listing for {}</h2><ul>".format(url_path) # listing for the directory
    for file in files_in_directory:
        file_path = os.path.join(path, file)
        if os.path.isdir(file_path):
            file += "/"
        list_directory += f'<li><a href="{file}">{file}</a></li>'
    list_directory += "</ul></body></html>"
    return list_directory

def handle_connection(client_socket):
    """
    Handle the "conversation" with a single client connection
    """
    http_sock = http_socket.HTTPSocket(client_socket)
    request = http_sock.receive_text_line()

    if not request:
        return

    method, path, _ = request.split(" ")

    if path == "/":
        path = "/index.html"

    file_path = os.path.join(ROOT_DIRECTORY, path.lstrip("/"))

    # handles 301 redirect
    if os.path.isdir(file_path):
        if not path.endswith("/"):
            http_sock.send_text_line("HTTP/1.1 301 Moved Permanently")
            http_sock.send_text_line(f"Location: {path}/")
            http_sock.send_text_line("Connection: close\r\n")
            return

        index_path = os.path.join(file_path, "index.html")
        if os.path.isfile(index_path):
            file_path = index_path
        else:
            # handles 200 OK
            content = list_directory_contents(file_path, path)
            http_sock.send_text_line("HTTP/1.1 200 OK")
            http_sock.send_text_line("Content-Type: text/html")
            http_sock.send_text_line(f"Content-Length: {len(content)}")
            http_sock.send_text_line("Connection: close\r\n")

            # zk When you use send_text_line, it adds two characters to the length (CR and LF)
            http_sock.send_text_line(content)
            return
    # handles 404 not found
    if not os.path.isfile(file_path):
        content = "<html><body><h1>404 Not Found</h1></body></html>"
        http_sock.send_text_line("HTTP/1.1 404 Not Found")
        http_sock.send_text_line("Content-Type: text/html")
        http_sock.send_text_line(f"Content-Length: {len(content)}")
        http_sock.send_text_line("Connection: close\r\n")
        http_sock.send_text_line(content)
        return
    # rb meaning read binary
    with open(file_path, "rb") as f:
        content = f.read()
    # handles 200 OK
    EXTENSION_MAP_file_type = EXTENSION_MAP_Get(file_path)
    http_sock.send_text_line("HTTP/1.1 200 OK")
    http_sock.send_text_line(f"Content-Type: {EXTENSION_MAP_file_type}")
    http_sock.send_text_line(f"Content-Length: {len(content)}")
    http_sock.send_text_line("Connection: close\r\n")

    client_socket.sendall(content)

def main():
    """
    Parse arguments and set up the server socket
    """ 
    # Set up the argument parser
    #parser = argparse.ArgumentParser(description="A simple plain text HTTP server")
    #parser.add_argument("--port", "-p", type=int, help="The port number to listen on", required=False)
    #parser.add_argument("--verbose", "-v", help="Enable verbose output", required=False)
    
    # Parse the command-line arguments
    #args = parser.parse_args()

    #port = PORT
    #if args.port:
        #port = args.port

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server_socket:
        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_socket.bind((HOST, PORT))
        server_socket.listen()
        while True:
            connection, addr = server_socket.accept()
            with connection:
                print(f"Connected by {addr}")
                handle_connection(connection)

if __name__ == "__main__":
    main()
