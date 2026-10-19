@echo off
chcp 65001 >nul
:: Pide permisos de administrador automaticamente
net session >nul 2>&1
if errorlevel 1 (
  powershell -Command "Start-Process '%~f0' -Verb RunAs"
  exit /b
)
echo Abriendo el puerto 3000 para que los celulares entren...
netsh advfirewall firewall delete rule name="Karaoke 3000" >nul 2>&1
netsh advfirewall firewall add rule name="Karaoke 3000" dir=in action=allow protocol=TCP localport=3000 profile=private
echo.
echo Listo. IMPORTANTE: tu WiFi debe estar como red "Privada":
echo   Configuracion ^> Red e Internet ^> Wi-Fi ^> ^(tu red^) ^> Tipo de perfil de red: Privada
echo.
pause
