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

# Defines the root directory
ROOT_DIRECTORY = "./"

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
    # Extract the second part (should be the path. EX: /path)
    path = parts[1]
    # Remove the leading slash from the path and combine it with the root directory
    full_path = os.path.join(ROOT_DIRECTORY, path.lstrip('/'))

    # Check if the path is a dir
    if os.path.isdir(full_path):
        if not path.endswith('/'):
            # Define the redirect path by adding a '/' at the end of the path
            redirect_path = path + '/'
            socket.send_text_line("HTTP/1.0 301 Moved Permanently") # 301 is the correct call for a redirect
            socket.send_text_line(f"Location: {redirect_path}") # Redirect path
            socket.send_text_line(f"Content-Length: 0")
            socket.send_text_line(f"Connection: close")
            socket.send_text_line("")
            socket.close()
            return
        
         # Create path for index.html file
        index_path = os.path.join(full_path, 'index.html')
        if os.path.isfile(index_path):
            # index.html is real, and is now the path
            full_path = index_path
        else:
            contents = os.listdir(full_path) # If there is no index.html, grab the dirs content
            listing = "<html><body><h1>Directory Listing</h1><ul>"

            for i in contents: # For each item in contents
                i_path = os.path.join(path, i)
                if os.path.isdir(os.path.join(full_path, i)): # path + i is a dir, append '/'
                    i_path += '/'
                listing += f'<li><a href="{i_path}">{i}</a></li>' # Add the item and a link to its path to the listing
            listing += '</ul></body></html>' # Complete the listing by closing the initial ul, html, and body tags

            socket.send_text_line("HTTP/1.0 200 OK")
            socket.send_text_line(f"Content-Type: text/html")
            socket.send_text_line(f"Content-Length: {len(listing)}")
            socket.send_text_line(f"Connection: close")
            socket.send_text_line("")

            # zk Another option would have been to add a flag or optional keyword parameter to send_text_line to suppress the CR_LF.
            socket.send_text(listing) # Implemented a bulk text-sending function
            socket.close()
            return

    # Assume the path is a file name. If the file name exists, we will send it as a response. Otherwise, send a 404.
    if os.path.isfile(full_path):
        file_size = os.path.getsize(full_path) # Grab the file size
        _, file_extension = os.path.splitext(full_path) # Grab the extension from the path
        # zk Add "text/plain" as a default for get.
        content_type = EXTENSION_MAP.get(file_extension) # Grab content type from our extension list
        with open(full_path, 'rb') as file:
            socket.send_text_line("HTTP/1.0 200 OK")
            socket.send_text_line(f"Content-Type: {content_type}")
            socket.send_text_line(f"Content-Length: {file_size}")
            socket.send_text_line(f"Connection: close")
            socket.send_text_line("")

            socket.send_binary_data_from_file(file, file_size) # Send binary data since we are dealing with more than just text
    else:
        message = f"<html><body>File '{full_path}' not found.</body></html>"

        socket.send_text_line("HTTP/1.0 404 FILE NOT FOUND")
        socket.send_text_line(f"Content-Type: text/html")
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