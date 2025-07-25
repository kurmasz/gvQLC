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
STUDENT_DATA_DIR = os.path.abspath(".")

# Dictionary mapping extensions to mime types
# (Feel free to  add to / modify this dictionary)
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

def generate_directory_listing(path):
    """Generates an HTML directory listing with links."""
    files = os.listdir(path)
    links = []

    # generates a link for each file in the directory
    for file in files: 
        file_path = os.path.join(path, file)
        # zk Instead of repeating the string, just add a variable 
        # named slash and set it to "/" or ""
        if os.path.isdir(file_path):
            link = f'<li><a href="{file}/">{file}/</a></li>'
        else:
            link = f'<li><a href="{file}">{file}</a></li>'
        links.append(link)

    # zk Nice use of "here doc"
    html_content = f"""
    <html>
        <body>
            <h1>Directory Listing</h1>
            <ul>
                {''.join(links)}
            </ul>
        </body>
    </html>
    """
    return html_content

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
  
    # redirect if directory does not end with '/'
    if os.path.isdir(os.path.join(STUDENT_DATA_DIR, parts[1].strip("/"))) and not parts[1].endswith('/'):
        socket.send_text_line("HTTP/1.0 301 Moved Permanently")
        socket.send_text_line(f"Location: {parts[1]}/")
        socket.send_text_line("Content-Length: 0")
        socket.send_text_line("Connection: close")
        socket.send_text_line("")
        socket.close()
        return

    # directory pathing
    path = os.path.join(STUDENT_DATA_DIR, parts[1].lstrip("/"))
    if os.path.isdir(path):
        # if path has index, set the path to the index.
        index_path = os.path.join(path, "index.html")
        if os.path.isfile(index_path):
            path = index_path
        else:
            # otherwise, send directory listing
            message = generate_directory_listing(path)
            socket.send_text_line("HTTP/1.0 200 OK")
            socket.send_text_line("Content-Type: text/html")
            socket.send_text_line(f"Content-Length: {len(message)}")
            socket.send_text_line("Connection: close")
            socket.send_text_line("")
            socket.send_text_line(message)
            socket.close()
            return 

    # Assume the path is a file name.
    # If the file name exists, we will send it as a response.
    # Otherwise, send a 404.
    if os.path.exists(path):
        _, ext = os.path.splitext(path) #Source: https://stackoverflow.com/questions/541390/extracting-extension-from-filename
        content_type = EXTENSION_MAP.get(ext.lower()) 
       
        # We need to know the file size so we can send
        # the Content-Length header.
        file_size = os.path.getsize(path)
        with open(path, "rb") as file:
            socket.send_text_line("HTTP/1.0 200 OK")
            socket.send_text_line(f"Content-Type: {content_type}")
            socket.send_text_line(f"Content-Length: {file_size}")
            socket.send_text_line(f"Connection: close")
            socket.send_text_line("") # <======
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