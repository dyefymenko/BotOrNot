#!/bin/bash

# Check if Python server should be run
if [ "$1" == "js" ]; then
  echo "Starting JavaScript server only..."
  node server.js
elif [ "$1" == "py" ]; then
  echo "Starting Python server only..."
  python server.py
else
  # Start both servers (JavaScript server in background, Python server in foreground)
  echo "Starting both JavaScript and Python servers..."
  echo "Note: Only one server can use the WebSocket port (8765) at a time"
  echo "To run a specific server, use: ./start.sh js or ./start.sh py"
  echo "Starting JavaScript server as the default..."
  node server.js
fi