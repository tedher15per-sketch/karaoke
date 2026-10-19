@echo off
net session >nul 2>&1
if errorlevel 1 (
  powershell -Command "Start-Process '%~f0' -Verb RunAs"
  exit /b
)
netsh advfirewall firewall delete rule name="Karaoke 3000"
echo Puerto 3000 cerrado.
pause
