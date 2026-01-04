@echo off
echo Killing any process using port 5001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5001') do (
    echo Killing process %%a
    taskkill /f /pid %%a 2>nul
)
echo Done. Port 5001 should now be free.
pause
