@echo off
setlocal
set HOST=127.0.0.1
if "%PORT%"=="" set PORT=8787
python server.py
