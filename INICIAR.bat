@echo off
chcp 65001 >nul
title Karaoke Party
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [X] No tienes Node.js. Descargalo de https://nodejs.org ^(version LTS^) y vuelve a abrir este archivo.
  pause
  exit /b
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo [OK] Se creo el archivo .env  ^(editalo para poner tu API key y PIN^)
)

if not exist "node_modules" (
  echo Instalando dependencias, solo la primera vez...
  call npm install
  if errorlevel 1 ( echo [X] Fallo npm install & pause & exit /b )
)

start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000/screen"
node server.js
pause
