@echo off
cd /d "%~dp0"
set PORT=8081
netstat -ano | findstr ":8081 " | findstr "LISTENING" >nul
if errorlevel 1 (
  start "AP elections" /min python -m http.server 8081
  timeout /t 2 /nobreak >nul
)
start "" "http://127.0.0.1:8081/"
