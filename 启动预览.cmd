@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set "PORTFOLIO_NODE=C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%PORTFOLIO_NODE%" set "PORTFOLIO_NODE=node"
echo 正在启动 Pumpkin 作品集，请在浏览器打开下方 Local 地址。
echo 关闭此窗口可停止预览服务。
"%PORTFOLIO_NODE%" node_modules\vite\bin\vite.js --host 127.0.0.1
pause
