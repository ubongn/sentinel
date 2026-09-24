@echo off
echo ========================================
echo  Sentinel7702 Relay Server
echo ========================================
echo.
echo Starting relay server on port 3001...
echo.

cd /d "%~dp0"

:: Check if node_modules exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

:: Start the relay server
echo Relay server starting...
echo.
echo API Endpoints:
echo   POST /api/delegate - Add/Remove EIP-7702 delegation
echo   GET  /api/health   - Health check
echo.
echo Press Ctrl+C to stop the server
echo.
node server.cjs