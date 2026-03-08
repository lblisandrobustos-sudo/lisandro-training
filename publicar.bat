@echo off
chcp 65001 > nul
title Generador de Rutinas - Lisandro Bustos

echo.
echo  ============================================
echo   LISANDRO BUSTOS - Generador de Rutinas
echo  ============================================
echo.

where node > nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js no esta instalado.
    echo  Descargalo en: https://nodejs.org
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo  Instalando dependencias por primera vez...
    echo.
    npm install
    echo.
)

echo  Generando rutinas...
echo.
node generar.js

echo.
echo  Presiona cualquier tecla para cerrar...
pause > nul
