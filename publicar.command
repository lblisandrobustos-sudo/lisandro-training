#!/bin/bash
# Doble click en Mac para publicar rutinas

cd "$(dirname "$0")"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  LISANDRO BUSTOS — Generador de Rutinas"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado."
    echo "   Descargalo en: https://nodejs.org"
    echo ""
    read -p "Presioná Enter para cerrar..."
    exit 1
fi

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias por primera vez..."
    npm install
    echo ""
fi

# Ejecutar el generador
node generar.js

echo ""
read -p "Presioná Enter para cerrar..."
