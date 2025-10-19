"""
plain_text_server.py

This is a very simple HTTP server that can can respond to request for plain text files.

GVSU CIS 371 2025
Credit: GeeksforGeeks
"""
from socket import *
import socket as std_socket  # Alias the standard socket module
import os
import socket
import http_socket
import argparse
import mimetypes
HOST = "127.0.0.1"  # Standard loopback interface address (localhost)
PORT = 8534  # Port to listen on (non-privileged ports are > 1023)


# MIME type dictionary

def handle_connection(connection):
    """
    Handle the "conversation" with a single client connection
    """
    HTTP_socket = http_socket.HTTPSocket(connection)

    # Read and print the request (e.g., "GET /index.html HTTP/1.0")
    request = HTTP_socket.receive_text_line()
    print(f"Request: {request}")


    # Read and print the request headers
    while True:
        data = HTTP_socket.receive_text_line().strip()
        if (not data):
                break
        print(data)
    print('=======')

    

   # Split the request into parts
    parts = request.split()
    if len(parts) < 2:
        # zk Interesting addition. What made you think of checking for this? 
        HTTP_socket.send_text_line("HTTP/1.0 400 BAD REQUEST\r\nConnection: close\r\n\r\n")
        HTTP_socket.close()
        return
    # Extract the requested path from the second part of the request
    path = parts[1]

    # Check if the path is the root "/"
    if path == "/":
        file_path = "."  # Set file_path to the current directory if the request is for root
    else:
        # Otherwise, remove the leading slash
        file_path = path.lstrip('/')


    # Check if path is directory
    if os.path.isdir(file_path):
        if not path.endswith('/'):
            response = "HTTP/1.1 301 Moved\r\n"
            response += f"Location: /{file_path}/\r\n"  # Redirect with trailing slash
            response += f"Content-Length: 0\r\n\r\n"

            # zk Be careful when using both HTTP_socket and 
            # the "raw" connection. It could lead to subtle bugs. 
            connection.sendall(response.encode()) 
            return
          

        index = os.path.join(file_path, "index.html")
        if os.path.isfile(index):
            file_path = index  # Serve index.html
        
        else:
            items = os.listdir(file_path)
            html_content = "<html><body><h1>Directory listing</h1><ul>"
            # Loop through the directory and get the full file paths 
            for item in items:                
                # If the path is a directory
                if os.path.isdir(os.path.join(file_path, item)):
                    item += "/"  # Ensure subdirectories end with "/"
                html_content += f'<li><a href= "{item}/">{item} </a></li>'
            html_content += "</ul></body></html>"
            response = "HTTP/1.1 200 OK\r\n"
            response += "Content-Type: text/html\r\n"
            response += f"Content-Length: {len(html_content)}\r\n\r\n"
            connection.sendall(response.encode() + html_content.encode())
            return
        
    if os.path.isfile(file_path):
        file_size = os.path.getsize(file_path)
        mime_type, _ = mimetypes.guess_type(file_path)
        if mime_type is None:
            mime_type = "text/plain"

        # Define binary file extensions
        binary_types = {".jpg", ".jpeg", ".png", ".gif", ".pdf"}
        file_extension = os.path.splitext(file_path)[1].lower()

        # zk There is no need to treat text and binary differently here
        # Treating everything as binary will work fine. 
        if file_extension in binary_types:
            mode = 'rb'
            encoding = None
        else:
            mode = 'r'
            encoding = 'UTF-8'

        with open(file_path, mode, encoding=encoding) as file:
            # Send HTTP headers
            response = f"HTTP/1.1 200 OK\r\n"
            response += f"Content-Type: {mime_type}\r\n"
            response += f"Content-Length: {file_size}\r\nConnection: close\r\n\r\n"
            connection.sendall(response.encode())


             # Send file content
            if mode == 'rb':  # Binary file (images, PDFs)
                while chunk := file.read(1024):
                    connection.sendall(chunk)
            else:  # Text file (HTML, CSS, TXT)
                for line in file:
                    connection.sendall(line.encode())
        return
    # Send HTTP header
                  
    message = f"<html><body><h1>404 Not Found</h1><p>File '{file_path}' not found.</p></body></html>"
    response =("HTTP/1.1 404 NOT FOUND")
    response +=(f"Content-Length: {len(message)}")
    response += "Content-Type: text/html\r\n"
    response +=(f"Connection: close")
    HTTP_socket.send_text_line("")
    # Send the message body (404 error message)
    full_response = response.encode() + message.encode()
    connection.sendall(full_response)

    # Close the connection
    connection.close()

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

    print(f"Listening on port {port}")
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
