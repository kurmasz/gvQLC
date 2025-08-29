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
PORT = 8534 # Port to listen on (non-privileged ports are > 1023)

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
}

# If the the request is a directory we will use this function
# To displaay all the conetents inside of the directories.
# I send a header where saying that the request was
# Successful since we are able to get the contents
def list_directory_contents(path, socket):
    message = "<html><body><h1>Available Directories</h1><ul>"
    for item in os.listdir(path):
        message += f"<li>{item}</li>"

    socket.send_text_line("HTTP/1.0 200 OK")
    socket.send_text_line("Content-Type: text/html")
    socket.send_text_line(f"Content-Length: {len(message)}")
    socket.send_text_line(f"Connection: close")
    socket.send_text_line("")
    socket.send_text_line(message)



# This handles all of our requests, it's 
# still only single-threaded. So it can only
# support one request at a time.
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

    # Extract the path from the request.
    parts = request.split()
    
    path = parts[1][1:]  # remove the first character of the path
    
    # Assume the path is a file name.
    # If the file name exists, we will send it as a response.
    # Otherwise, send a 404.
    # Source: https://www.geeksforgeeks.org/python-os-path-isfile-method/
    if os.path.exists(path) and os.path.isfile(path):

        # We need to know the file size so we can send
        # the Content-Length header.
        file_size = os.path.getsize(path)

        # Determine the type of file being request
        # We want the extension of the file, so we splitext from our path.
        # Source: https://www.geeksforgeeks.org/python-os-path-splitext-method/
        # TODO: COULD CREATE A METHOD FOR THIS TO RETURN THE EXTENSION
        # BUT SINCE ITS ONE LINE MAYBE NOT...
        # zk I agree that there is no need for a method when it is just one line of code.
        _, extensionOfFile = os.path.splitext(path)

        # Debugging: http://localhost:8534/studentData/Pictures/catTyping.gif gives .gif
        # print(extensionOfFile)

        # We search through our extension map for our the extension request of file.
        # If that file extension doesn't exist then we fall back on "text/plain"
        # Source: https://www.w3schools.com/python/ref_dictionary_get.asp
        fileType = EXTENSION_MAP.get(extensionOfFile, "text/plain")

        # Debugging: http://localhost:8534/studentData/Pictures/catTyping.gif gives "image/gif"
        # print("The file type is: " + fileType + "\n")

        with open(path, "rb") as file:  # We need to add b for binary.
            socket.send_text_line("HTTP/1.0 200 OK")
            socket.send_text_line(f"Content-Type: {fileType}")
            socket.send_text_line(f"Content-Length: {file_size}")
            socket.send_text_line(f"Connection: close")
            socket.send_text_line("")  # <==========

            # Read and send one line at a time.
            # (This works because this server only handles text.)
            # while line := file.readline():
            # socket.send_text_line(line)

            # This allows us to send our other file types that aren't text...
            # We put in our parameters the file and the size to send.
            # We don't need to put an if statement as look through our extension map
            # and if it's not there then it's "text/plain"
            socket.send_binary_data_from_file(file, file_size)

    # Check if the path is a directory, if it is then....
    # If our directory already contains the slash, we display the directories that we can go into
    # Source: https://www.geeksforgeeks.org/python-os-path-isdir-method/
    elif os.path.isdir(path) and path.endswith("/"):  
        # We loop through the directory to see
        # if it contains "index.html"
        # If it does, we will redirect instead of listing the contents.      
        for item in os.listdir(path):
            if "index.html" in item:
                socket.send_text_line("HTTP/1.0 302 Found")
                socket.send_text_line(f"Location: /{path + "index.html"}")
                socket.send_text_line("Connection: close")
                socket.send_text_line("")
                break
        
        # Moved it to a function, but this lists all of the directories
        # content instead of showing nothing
        # or erroring out
        list_directory_contents(path, socket)
    
    # If our directory doesn't contain the slash, we need to add it and redirect
    # I decided to user 302 Found as "the browser when receiving this status will
    # automatically request the resource at the URL in LOCATION"
    # SOURCE: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/302    
    elif os.path.isdir(path) and not path.endswith("/"):
        socket.send_text_line("HTTP/1.0 302 Found")
        socket.send_text_line(f"Location: /{path + "/"}") # You need the first / otherwise the server will try to fix it and not be able to redirect...
        socket.send_text_line("Connection: close")
        socket.send_text_line("")
        
    # If it's not a file and not a directory, or if its a file misspelled
    # or a directory misspelled etc Send a 404 NOT FOUND,     
    else:
        message = f"<html><body>File/Directory '{path}' not found.</body></html>"

        socket.send_text_line("HTTP/1.0 404 NOT FOUND")
        socket.send_text_line("Content-Type: text/html")
        socket.send_text_line(f"Content-Length: {len(message) + 2}")  # +2 for CR/LF
        socket.send_text_line(f"Connection: close")
        socket.send_text_line("")
        socket.send_text_line(message)

    # Close our socket
    socket.close()
        
    print("=========\n")    

def main():
    """
    Parse arguments and set up the server socket
    """

    # Set up the argument parser
    parser = argparse.ArgumentParser(description="A simple plain text HTTP server")
    parser.add_argument(
        "--port", "-p", type=int, help="The port number to listen on", required=False
    )
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
