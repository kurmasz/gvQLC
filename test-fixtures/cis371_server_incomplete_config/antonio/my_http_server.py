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
        ".ico": "image/vnd.microsoft.icon"
}

def get_content_type(path):
    """
    Given a file path, return the content type based on the file extension.
    """
    _, extension = os.path.splitext(path)
    return EXTENSION_MAP.get(extension, "text/plain")

def list_directory_contents(path):
    """
    Lists the contents of the directory. 
    (This is just here for demonstration purposes.)
    """
    contents = os.listdir(path)
    for item in contents:
        print(item)

def send_file(socket, path):
    """
    Send a file to the client.
    """
    file_size = os.path.getsize(path)
    content_type = get_content_type(path)
    # zk Actually, you can just treat all files as binary, since you are 
    # blindly sending the entire file. 
    mode = 'rb' if content_type.split('/')[0] != "text" else 'r'
    with open(path, mode) as file:
            print(f"Sending file {path} of size {file_size} and type {content_type}")
            socket.send_text_line("HTTP/1.0 200 OK")
            socket.send_text_line(f"Content-Type: {content_type}") # add the correct content type
            socket.send_text_line(f"Content-Length: {file_size}")
            socket.send_text_line(f"Connection: close")
            socket.send_text_line("")

            # Determine which way to send data
            if mode == 'r': # Text file
                # Read and send one line at a time.
                # (This works because this server only handles text.)    
                while line := file.readline():
                    socket.send_text_line(line)
            else: # Binary file
                socket.send_binary_data_from_file(file, file_size)
    
def send_directory(socket, path):
    """
    Send a directory listing to the client.
    """
    # Send a directory listing
    if path[-1] != '/':
        path += '/'
        socket.send_text_line("HTTP/1.0 301 MOVED PERMANENTLY")
        socket.send_text_line(f"Location: {path}")
        socket.send_text_line("Connection: close")
        socket.send_text_line("")
        return  # Stop further execution
    
    socket.send_text_line("HTTP/1.0 200 OK")

    print(f"Sending directory listing for {path}")
    print("Directory contents:")
    message = f"<html><body><h1>Directory listing for {path}</h1><ul>"
    for item in os.listdir(path):
        if item == "index.html":
            send_file(socket, path + item)
            return
        print(item)
        if os.path.isdir(item):
            message += f"<li><a href=\"{item}/\">{item}/</a></li>"
        else:
            message += f"<li><a href=\"{item}\">{item}</a></li>"
    message += "</ul></body></html>"

    socket.send_text_line("Content-Type: text/html")
    socket.send_text_line(f"Content-Length: {len(message) + 2}")
    socket.send_text_line(f"Connection: close")
    socket.send_text_line("")  # <======
    socket.send_text_line(message)

def handle_connection(connection):
    """
    Handle the "conversation" with a single client connection
    """
    socket = http_socket.HTTPSocket(connection)

    # Read and print the request (e.g. "GET / HTTP/1.0")
    request = socket.receive_text_line()
    if request == None:
        print("Incomplete Data, Client disconnected")
        return
    
    # print(f"Request: {request}")


    # Read and print the request headers
    while True:
        data = socket.receive_text_line().strip()
        if (not data) or (len(data) == 0):
                break
        # print(data)
    print('=======')

    # Extract the path from the request.
    parts = request.split()
    path = parts[1][1:]  # remove the first character of the path
    # print("Path:", path)

    # Assume the path is a file name.
    # If the file name exists, we will send it as a response.
    # Otherwise, send a 404.
    if os.path.exists(path):

        # We need to know the file size so we can send
        # the Content-Length header.
        if os.path.isfile(path):
            send_file(socket, path)
        elif os.path.isdir(path):
            send_directory(socket, path)
    else:
        print("File not found")
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
            print("connected")
            with connection:
                print(f"Connected by {addr}")
                handle_connection(connection)

if __name__ == "__main__":
    main()