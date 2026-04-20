@echo off
:: =============================================================================
:: BrainBuzz Project Runner
:: =============================================================================
:: This batch file provides multiple ways to run the BrainBuzz application:
:: 1. Docker Compose (default) - Runs all services in containers
:: 2. Local Development - Runs frontend and backend separately
:: 3. Production Build - Builds and runs the application
::
:: Usage:
::   run.bat                    - Run with Docker Compose (default)
::   run.bat local              - Run locally without Docker
::   run.bat build              - Build Docker images
::   run.bat start              - Start Docker containers
::   run.bat stop               - Stop Docker containers
::   run.bat logs               - View Docker logs
::   run.bat frontend           - Run only frontend
::   run.bat backend            - Run only backend
::   run.bat python             - Run only Python service
::   run.bat clean              - Clean up Docker resources
:: =============================================================================

SETLOCAL EnableDelayedExpansion

:: Colors for output
set "GREEN=0A"
set "YELLOW=0E"
set "RED=0C"
set "BLUE=09"
set "RESET=07"

:: Default values
set "MODE=docker"
set "ACTION=start"
set "FRONTEND_PORT=3000"
set "BACKEND_PORT=5001"
set "PYTHON_PORT=5002"

:: Parse command line arguments
if "%~1"=="" goto :set_default
if /i "%~1"=="local" set "MODE=local" & set "ACTION=start"
if /i "%~1"=="build" set "ACTION=build"
if /i "%~1"=="start" set "ACTION=start"
if /i "%~1"=="stop" set "ACTION=stop"
if /i "%~1"=="logs" set "ACTION=logs"
if /i "%~1"=="frontend" set "ACTION=frontend"
if /i "%~1"=="backend" set "ACTION=backend"
if /i "%~1"=="python" set "ACTION=python"
if /i "%~1"=="clean" set "ACTION=clean"

:: Check for second argument (e.g., "run.bat local frontend")
if not "%~2"=="" set "ACTION=%~2"

:: Set default action based on mode
if /i "%ACTION%"=="start" if /i "%MODE%"=="local" set "ACTION=run_local"

:: =============================================================================
:: Display header
:: =============================================================================
:display_header
call :color_text %BLUE% "=============================================================================="
echo.
call :color_text %GREEN% "                    BrainBuzz Project Runner"
echo.
call :color_text %BLUE% "=============================================================================="
echo.
call :color_text %YELLOW% "Mode: %MODE%"
call :color_text %YELLOW% "Action: %ACTION%"
echo.
call :color_text %BLUE% "=============================================================================="
echo.

:: =============================================================================
:: Main execution
:: =============================================================================

if /i "%ACTION%"=="run_local" goto :run_local
if /i "%ACTION%"=="frontend" goto :run_frontend
if /i "%ACTION%"=="backend" goto :run_backend
if /i "%ACTION%"=="python" goto :run_python
if /i "%ACTION%"=="build" goto :build_docker
if /i "%ACTION%"=="start" goto :start_docker
if /i "%ACTION%"=="stop" goto :stop_docker
if /i "%ACTION%"=="logs" goto :show_logs
if /i "%ACTION%"=="clean" goto :clean_docker

:: Default action
if /i "%MODE%"=="local" goto :run_local
if /i "%MODE%"=="docker" goto :start_docker

:: =============================================================================
:: Run application locally (without Docker)
:: =============================================================================
:run_local
call :color_text %GREEN% "Starting BrainBuzz in local development mode..."
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    call :color_text %RED% "ERROR: Node.js is not installed or not in PATH"
    call :color_text %YELLOW% "Please install Node.js from https://nodejs.org/"
    pause
    exit /b 1
)

:: Check if npm is installed
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    call :color_text %RED% "ERROR: npm is not installed or not in PATH"
    pause
    exit /b 1
)

:: Check if Python is installed
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    call :color_text %RED% "ERROR: Python is not installed or not in PATH"
    call :color_text %YELLOW% "Please install Python from https://www.python.org/"
    pause
    exit /b 1
)

:: Check if pip is installed
where pip >nul 2>&1
if %ERRORLEVEL% neq 0 (
    call :color_text %RED% "ERROR: pip is not installed"
    pause
    exit /b 1
)

:: Install Python dependencies
call :color_text %BLUE% "Installing Python dependencies..."
cd "%~dp0backend\python_service"
if exist "requirements.txt" (
    pip install -r requirements.txt
    if %ERRORLEVEL% neq 0 (
        call :color_text %RED% "Failed to install Python dependencies"
        pause
        exit /b 1
    )
)
cd "%~dp0"

:: Install Node.js dependencies for backend
call :color_text %BLUE% "Installing Node.js backend dependencies..."
cd "%~dp0backend"
if exist "package.json" (
    call :color_text %YELLOW% "Running: npm install"
    npm install
    if %ERRORLEVEL% neq 0 (
        call :color_text %RED% "Failed to install Node.js backend dependencies"
        pause
        exit /b 1
    )
)
cd "%~dp0"

:: Install Node.js dependencies for frontend
call :color_text %BLUE% "Installing Node.js frontend dependencies..."
cd "%~dp0frontend"
if exist "package.json" (
    call :color_text %YELLOW% "Running: npm install"
    npm install
    if %ERRORLEVEL% neq 0 (
        call :color_text %RED% "Failed to install Node.js frontend dependencies"
        pause
        exit /b 1
    )
)
cd "%~dp0"

:: Start Python service in background
call :color_text %GREEN% "Starting Python service on port %PYTHON_PORT%..."
start "Python Service" cmd /k "cd "%~dp0backend\python_service" && python app.py"

:: Wait a moment for Python service to start
timeout /t 3 >nul

:: Start Node.js backend in background
call :color_text %GREEN% "Starting Node.js backend on port %BACKEND_PORT%..."
start "Node.js Backend" cmd /k "cd "%~dp0backend" && npm run dev"

:: Wait a moment for backend to start
timeout /t 3 >nul

:: Start Vite frontend in background
call :color_text %GREEN% "Starting Vite frontend on port %FRONTEND_PORT%..."
start "Vite Frontend" cmd /k "cd "%~dp0frontend" && npm run dev"

echo.
call :color_text %GREEN% "All services started successfully!"
echo.
call :color_text %YELLOW% "Frontend: http://localhost:%FRONTEND_PORT%"
call :color_text %YELLOW% "Backend:  http://localhost:%BACKEND_PORT%"
call :color_text %YELLOW% "Python:   http://localhost:%PYTHON_PORT%"
echo.
call :color_text %BLUE% "=============================================================================="
echo.
call :color_text %YELLOW% "Press Ctrl+C in each terminal window to stop individual services."
echo.
call :color_text %BLUE% "=============================================================================="

:: Keep the batch file running
:wait_loop
timeout /t 30 >nul
goto :wait_loop

:: =============================================================================
:: Run only frontend
:: =============================================================================
:run_frontend
call :color_text %GREEN% "Starting Vite frontend..."
cd "%~dp0frontend"
if exist "package.json" (
    npm run dev
) else (
    call :color_text %RED% "ERROR: package.json not found in frontend directory"
    pause
    exit /b 1
)
exit /b 0

:: =============================================================================
:: Run only backend
:: =============================================================================
:run_backend
call :color_text %GREEN% "Starting Node.js backend..."
cd "%~dp0backend"
if exist "package.json" (
    npm run dev
) else (
    call :color_text %RED% "ERROR: package.json not found in backend directory"
    pause
    exit /b 1
)
exit /b 0

:: =============================================================================
:: Run only Python service
:: =============================================================================
:run_python
call :color_text %GREEN% "Starting Python service..."
cd "%~dp0backend\python_service"
python app.py
exit /b 0

:: =============================================================================
:: Build Docker images
:: =============================================================================
:build_docker
call :color_text %GREEN% "Building Docker images..."
docker-compose build
if %ERRORLEVEL% neq 0 (
    call :color_text %RED% "Failed to build Docker images"
    pause
    exit /b 1
)
call :color_text %GREEN% "Docker images built successfully!"
exit /b 0

:: =============================================================================
:: Start Docker containers
:: =============================================================================
:start_docker
call :color_text %GREEN% "Starting Docker containers..."
docker-compose up -d
if %ERRORLEVEL% neq 0 (
    call :color_text %RED% "Failed to start Docker containers"
    pause
    exit /b 1
)

:: Wait for containers to start
call :color_text %BLUE% "Waiting for containers to start..."
timeout /t 10 >nul

:: Show container status
call :color_text %GREEN% "Docker containers started!"
echo.
call :color_text %BLUE% "Container Status:"
docker-compose ps

echo.
call :color_text %GREEN% "All services are running!"
call :color_text %YELLOW% "Frontend: http://localhost:%FRONTEND_PORT%"
call :color_text %YELLOW% "Backend:  http://localhost:%BACKEND_PORT%"
call :color_text %YELLOW% "Python:   http://localhost:%PYTHON_PORT%"
call :color_text %YELLOW% "Check logs with: run.bat logs"
echo.
call :color_text %BLUE% "=============================================================================="
exit /b 0

:: =============================================================================
:: Stop Docker containers
:: =============================================================================
:stop_docker
call :color_text %GREEN% "Stopping Docker containers..."
docker-compose down
if %ERRORLEVEL% neq 0 (
    call :color_text %RED% "Failed to stop Docker containers"
    pause
    exit /b 1
)
call :color_text %GREEN% "Docker containers stopped!"
exit /b 0

:: =============================================================================
:: Show Docker logs
:: =============================================================================
:show_logs
call :color_text %GREEN% "Showing Docker logs..."
echo.
call :color_text %YELLOW% "Press Ctrl+C to stop viewing logs and return to menu."
echo.
:: Show logs for all services
docker-compose logs -f
if %ERRORLEVEL% neq 0 (
    call :color_text %RED% "Failed to show Docker logs"
    pause
    exit /b 1
)
exit /b 0

:: =============================================================================
:: Clean Docker resources
:: =============================================================================
:clean_docker
call :color_text %GREEN% "Cleaning Docker resources..."
echo.
call :color_text %YELLOW% "This will remove stopped containers, unused networks, and volumes."
echo.
choice /M "Do you want to continue" /C YN
if %ERRORLEVEL% equ 2 exit /b 0

docker system prune -a --volumes -f
if %ERRORLEVEL% neq 0 (
    call :color_text %RED% "Failed to clean Docker resources"
    pause
    exit /b 1
)
call :color_text %GREEN% "Docker resources cleaned successfully!"
exit /b 0

:: =============================================================================
:: Color text function
:: =============================================================================
:color_text
setlocal
set "color=%~1"
set "text=%~2"
echo [33m%text%[0m
endlocal
:: Note: Actual color implementation would use ANSI codes or Windows API
:: This is a placeholder for the batch file
:: In a real implementation, you'd use more complex methods to change text color

echo %text%

exit /b 0

:: =============================================================================
:: Set default action
:: =============================================================================
:set_default
set "ACTION=start"
goto :display_header
