#!/bin/bash

# Script de Prueba para Despliegue Local
# Este script verifica y prueba la aplicación paso a paso

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}[PASO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

echo "=========================================="
echo "  Prueba de Despliegue - innovabigdata"
echo "=========================================="
echo ""

# Paso 1: Verificar Docker
print_step "1. Verificando Docker..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    print_success "Docker instalado: $DOCKER_VERSION"
else
    print_error "Docker no está instalado"
    exit 1
fi

# Paso 2: Verificar Docker Compose
print_step "2. Verificando Docker Compose..."
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    print_success "Docker Compose instalado: $COMPOSE_VERSION"
elif docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version)
    print_success "Docker Compose (plugin) instalado: $COMPOSE_VERSION"
    ALIAS_COMPOSE="docker compose"
else
    print_error "Docker Compose no está instalado"
    exit 1
fi

# Usar el comando correcto
COMPOSE_CMD=${ALIAS_COMPOSE:-docker-compose}

# Paso 3: Verificar archivos del proyecto
print_step "3. Verificando archivos del proyecto..."

REQUIRED_FILES=(
    "docker-compose.yml"
    "deploy.sh"
    "backend/Dockerfile"
    "backend/main.py"
    "backend/requirements.txt"
    "frontend/Dockerfile"
    "frontend/nginx.conf"
    "init.sql"
)

MISSING_FILES=0
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "Archivo encontrado: $file"
    else
        print_error "Archivo faltante: $file"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

if [ $MISSING_FILES -gt 0 ]; then
    print_error "Faltan $MISSING_FILES archivos requeridos"
    exit 1
fi

# Paso 4: Verificar que no haya contenedores corriendo
print_step "4. Verificando contenedores existentes..."
EXISTING_CONTAINERS=$(docker ps -a --filter "name=innovabigdata" --format "{{.Names}}" | wc -l)
if [ "$EXISTING_CONTAINERS" -gt 0 ]; then
    print_warning "Hay contenedores existentes. Limpiando..."
    $COMPOSE_CMD down 2>/dev/null || true
    print_success "Contenedores limpiados"
else
    print_success "No hay contenedores existentes"
fi

# Paso 5: Construir imágenes
print_step "5. Construyendo imágenes Docker..."
if $COMPOSE_CMD build --no-cache; then
    print_success "Imágenes construidas correctamente"
else
    print_error "Error al construir imágenes"
    exit 1
fi

# Paso 6: Iniciar servicios
print_step "6. Iniciando servicios..."
if $COMPOSE_CMD up -d; then
    print_success "Servicios iniciados"
else
    print_error "Error al iniciar servicios"
    exit 1
fi

# Paso 7: Esperar a que los servicios estén listos
print_step "7. Esperando a que los servicios estén listos..."
sleep 15

# Paso 8: Verificar estado de contenedores
print_step "8. Verificando estado de contenedores..."
$COMPOSE_CMD ps

# Verificar que todos los contenedores estén corriendo
RUNNING_CONTAINERS=$(docker ps --filter "name=innovabigdata" --format "{{.Names}}" | wc -l)
if [ "$RUNNING_CONTAINERS" -lt 3 ]; then
    print_error "No todos los contenedores están corriendo"
    print_step "Revisando logs..."
    $COMPOSE_CMD logs --tail=50
    exit 1
fi

print_success "Todos los contenedores están corriendo"

# Paso 9: Verificar salud de la base de datos
print_step "9. Verificando salud de la base de datos..."
sleep 5
if docker exec innovabigdata-db pg_isready -U postgres -d innovabigdata &> /dev/null; then
    print_success "Base de datos está lista"
else
    print_error "Base de datos no está lista"
    docker exec innovabigdata-db pg_isready -U postgres -d innovabigdata
fi

# Paso 10: Verificar endpoint de health
print_step "10. Verificando endpoint de health..."
sleep 5
if curl -f http://localhost:8000/health &> /dev/null; then
    print_success "Endpoint /health responde correctamente"
    curl -s http://localhost:8000/health | head -5
else
    print_warning "Endpoint /health no responde aún (puede necesitar más tiempo)"
fi

# Paso 11: Verificar frontend
print_step "11. Verificando frontend..."
sleep 5
if curl -f http://localhost:80 &> /dev/null; then
    print_success "Frontend responde correctamente"
else
    print_warning "Frontend no responde aún (puede necesitar más tiempo)"
fi

# Paso 12: Mostrar información de acceso
echo ""
echo "=========================================="
echo "  Aplicación Desplegada"
echo "=========================================="
echo ""
echo "Frontend:    http://localhost:80"
echo "API Docs:   http://localhost:8000/docs"
echo "Health:     http://localhost:8000/health"
echo ""
echo "Credenciales por defecto:"
echo "  Usuario: admin"
echo "  Contraseña: Admin2026!"
echo ""
echo "Comandos útiles:"
echo "  Ver logs:        docker-compose logs -f"
echo "  Ver estado:      docker-compose ps"
echo "  Detener:         docker-compose down"
echo "  Reiniciar:       docker-compose restart"
echo ""
echo "=========================================="

# Paso 13: Mostrar logs recientes
print_step "12. Mostrando logs recientes (últimas 20 líneas)..."
echo ""
$COMPOSE_CMD logs --tail=20

echo ""
print_success "Prueba de despliegue completada"
echo ""
print_warning "Nota: Si algún servicio no responde, espera unos segundos más y verifica los logs con: docker-compose logs"
