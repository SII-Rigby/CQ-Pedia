@echo off
cd /d "%~dp0"
echo 正在启动本地服务器...
echo 按 Ctrl+C 停止服务器
start /b python -m http.server 8000
timeout /t 2 /nobreak >nul
start http://localhost:8000/
pause >nul
