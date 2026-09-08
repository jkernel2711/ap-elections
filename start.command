#!/bin/bash
cd "$(dirname "$0")"
PORT=8081

if command -v python3 >/dev/null 2>&1; then
  PY=python3
elif command -v python >/dev/null 2>&1; then
  PY=python
elif command -v ruby >/dev/null 2>&1; then
  PY=
else
  osascript -e 'display dialog "This Mac needs Python 3 to open the site.\n\nInstall it from https://www.python.org/downloads/ then double-click start.command again." buttons {"OK"} default button 1 with title "AP elections"'
  exit 1
fi

if ! lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  if [ -n "$PY" ]; then
    nohup "$PY" -m http.server "$PORT" >/tmp/telugu-elections-http.log 2>&1 &
  else
    nohup ruby -run -e httpd . -p "$PORT" >/tmp/telugu-elections-http.log 2>&1 &
  fi
  disown 2>/dev/null || true
  sleep 1
fi

open "http://127.0.0.1:${PORT}/"
