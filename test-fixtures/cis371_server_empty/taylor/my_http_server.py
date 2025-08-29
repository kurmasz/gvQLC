"""
my_http_server.py

This is a very simple HTTP server.

GVSU CIS 371 2025

"""

from enum import Enum
import os
import socket
import http_socket
import argparse

HOST = "127.0.0.1"  # Standard loopback interface address (localhost)
PORT = 8534  # Port to listen on (non-privileged ports are > 1023)
CURRENT_BASE_DIR = ""

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

# zk Good idea.
class HTTPStatus(Enum):
    OK = "200 OK"
    NOT_FOUND = "404 NOT FOUND"
    MOVED_PERMANENTLY = "301 Moved Permanently"

def list_directory_contents(path):
    """
    Lists the contents of the directory. 
    (This is just here for demonstration purposes.)
    """
    contents = os.listdir(path)
    for item in contents:
        print(item)

def get_content_type(path):
    if os.path.isdir(path):
        return "text/html"

    file_extension = os.path.splitext(path)[1]
    # zk You can use the .get() method to do the same thing.
    # get allows you to specify a default. 
    if file_extension in EXTENSION_MAP.keys():
        return EXTENSION_MAP[file_extension]
    else:
        return "text/plain"

def send_content_headers(socket, status, content_length, content_type=None, location=None):
    socket.send_text_line(f"HTTP/1.0 {status.value}")
    if location and status == HTTPStatus.MOVED_PERMANENTLY:
        socket.send_text_line(f"Location: {location}")
    elif content_type:
        socket.send_text_line(f"Content-Type: {content_type}")
    socket.send_text_line(f"Content-Length: {content_length}")
    socket.send_text_line(f"Connection: close")
    socket.send_text_line("")  #<======

def send_directory(socket, path):
    global CURRENT_BASE_DIR

    # get the contents of the directory
    contents = os.listdir(path)
    if "index.html" in contents:
        CURRENT_BASE_DIR = path
        sudo_path = os.path.join(path, "index.html")

        with open(sudo_path, 'r') as file:
            send_content_headers(socket, HTTPStatus.OK, os.path.getsize(sudo_path), "text/html")
            
            # Read and send one line at a time.
            while line := file.readline():
                socket.send_text_line(line)
    else:
        generated_html = f"""<!DOCTYPE html>
        <html><body>"""
        for item in contents:
            # zk Another idea:  Just have a variable 'slash' that is 
            # either '' or '/'.  Then you don't need to duplicate the 
            # generated_html += line.
            if os.path.isdir(os.path.join(path, item)):
                generated_html += f'<a href="/{path}/{item}/">{item}/</a><br>'
            else:
                generated_html += f'<a href="/{path}/{item}">{item}</a><br>'
        generated_html += "</body></html>"
        
        send_content_headers(socket, HTTPStatus.OK, len(generated_html), "text/html")
        socket.send_text_line(generated_html)

def send_binary_content(socket, path, content_type):
    with open(path, 'rb') as file:
        send_content_headers(socket, HTTPStatus.OK, os.path.getsize(path), content_type)
        socket.send_binary_data_from_file(file, os.path.getsize(path))
        
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

    # For subsequent requests if there was an index.html file, need base directory to resolve the correct path
    # Otherwise, the path will be invalid since it is relevant to the
    if CURRENT_BASE_DIR and not os.path.exists(path):
        path = os.path.join(CURRENT_BASE_DIR, path)

    # Assume the path is a file name.
    # If the file name exists, we will send it as a response.
    # Otherwise, send a 404.
    if os.path.exists(path):
        # Determine the content type
        content_type = get_content_type(path)

        # send the index.html or generate directory listing if it is a directory 
        if os.path.isdir(path):
            if not path.endswith("/"):
                send_content_headers(socket, HTTPStatus.MOVED_PERMANENTLY, 0, location=f"/{path}/")
            else:
                send_directory(socket, path)

        # zk You don't need a separate path for text and binary.
        # when sending entire files, just treat everything as binary. 
        elif "text" not in content_type:
            send_binary_content(socket, path, content_type)
        else:
            # We need to know the file size so we can send
            # the Content-Length header.
            file_size = os.path.getsize(path)
            with open(path, 'r') as file:
                send_content_headers(socket, HTTPStatus.OK, file_size, content_type)

                # Read and send one line at a time.
                # (This works because this server only handles text.)
                if "text" in content_type:
                    while line := file.readline():
                        socket.send_text_line(line)
    else:
        message = f"<html><body>File '{path}' not found.</body></html>"
        send_content_headers(socket, HTTPStatus.NOT_FOUND, len(message) + 2, "text/html") # +2 for CR/LF
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