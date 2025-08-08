"""
my_http_server.py

This is a very simple HTTP server.

GVSU CIS 371 2025

# https://www.geeksforgeeks.org/reading-binary-files-in-python/ 
# https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/301 
# https://www.w3schools.com/python/module_os.asp for learning about os modules

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
    path = parts[1][1:]  # remove the first character of the path
    simple_directory_listing = ""  # assignment before reference to fix error 

    # If the requested document is a directory and does not end with a /, 
    # return a 301 and redirect to a correctly formed URL. 
    # (For example, if the path is /Pictures, redirect to /Pictures/.)
    if os.path.isdir(path):
        if not path.endswith("/"):
            # Redirect to the same path with a trailing '/'
            redirection = f'/{path}/'
            socket.send_text_line("HTTP/1.0 301 Moved Permanently")
            socket.send_text_line(f'Location: {redirection}')
            socket.send_text_line("Connection: Close")
            socket.send_text_line("")
            return

        # Return index.html, if present (and if index.html is a readable, regular file).
        index_html = os.path.join(path, "index.html")
        if os.path.exists(index_html):
            path = index_html

        # Otherwise, return a simple directory listing (with links). 
        # Important: Your link to subdirectories must end with '/', 
        # otherwise, the web browser won't properly reset the base directory. 
        # (In other words, your href needs Images/ not just Images.)
        else:
            simple_directory_listing = "<html><body><h1>Directory Listing</h1><ul>" # create header DIrectory listing and unordered list for links
            for link in os.listdir(path):
                linked_path = os.path.join(path, link)
                if os.path.isdir(linked_path):
                    link += "/" # add trailing / if it is a directory
                simple_directory_listing += f'<li><a href="{link}">{link}</a></li>' # create an anchor to those links, answer formulated from piazza question
            simple_directory_listing += "</ul><body></html>" # close everything up
            
            socket.send_text_line("HTTP/1.0 200 OK")
            socket.send_text_line("Content-Type: text/html")
            socket.send_text_line(f"Content-Length: {len(simple_directory_listing)+2}")
            socket.send_text_line("Connection: Close")
            socket.send_text_line("")  # <==============
            socket.send_text_line(simple_directory_listing)
            return
    
    # Assume the path is a file name.
    # If the file name exists, we will send it as a response.
    # Otherwise, send a 404.
    if os.path.exists(path):
        read_mode = "r"
        content_type = "text/plain"

        for ending in EXTENSION_MAP:  # go through the keys in dict with file extensions
            if path.endswith(ending):
                content_type = EXTENSION_MAP[ending]  # set content type to value of key
                break

        # zk You can just use binary mode for everything.  No need to have 
        # a separate binary and text path. 
        if path.endswith((".jpeg", ".jpg", ".png", ".gif", ".ico", ".pdf")):
            read_mode = "rb"

        file_size = os.path.getsize(path)
        with open(path, read_mode) as file:
            socket.send_text_line("HTTP/1.0 200 OK")
            socket.send_text_line(f"Content-Type: {content_type}")
            socket.send_text_line(f"Content-Length: {file_size}")
            socket.send_text_line(f"Connection: close")
            socket.send_text_line("")

            if read_mode == 'rb':
                socket.send_binary_data_from_file(file, file_size)

            else:
                while line := file.readline():
                    socket.send_text_line(line)
    else:
        message = f"<html><body>File '{path}' not found.</body></html>"

        socket.send_text_line("HTTP/1.0 404 NOT FOUND")
        socket.send_text_line("Content-Type: text/html")
        socket.send_text_line(f"Content-Length: {len(message)}")
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