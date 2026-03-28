@echo off
REM Installation script for EventZen Event Service
REM Run this script to set up the event-service backend

echo 🚀 Setting up EventZen Event Service...

REM Navigate to event-service directory
cd /d "%~dp0"

echo 📦 Installing npm dependencies...
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm not found. Please install Node.js first.
    pause
    exit /b 1
)

npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

echo.
echo 🔧 Event Service Setup Complete!
echo.
echo 📋 Next Steps:
echo 1. Ensure MongoDB is running on localhost:27017
echo 2. Start the service with: npm run dev (development) or npm start (production)
echo 3. Service will run on: http://localhost:3002
echo.
echo 🔗 API Endpoints:
echo - Health Check: http://localhost:3002/health
echo - Events API: http://localhost:3002/api/v1/events
echo - Upcoming Events: http://localhost:3002/api/v1/events/upcoming
echo.
echo 📚 Documentation: http://localhost:3002/api/v1/docs

pause