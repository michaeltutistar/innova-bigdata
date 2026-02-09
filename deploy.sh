#!/bin/bash

# Script de Despliegue para AWS EC2
# Sistema de Registro de Líderes y Sufragantes

set -e  # Salir en caso de error

# Colores para输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de impresión
print_step() {
    echo -e "${BLUE}[PASO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[ÉXITO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[ADVERTENCIA]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Variables de configuración
PROJECT_NAME="innovabigdata"
DOCKER_COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="/opt/backups/${PROJECT_NAME}"
LOG_FILE="/var/log/${PROJECT_NAME}-deploy.log"

# Si .env tiene RDS_HOST, usamos RDS (docker-compose.rds.yml)
set_compose_file() {
    if [ -f .env ] && grep -q '^RDS_HOST=' .env 2>/dev/null; then
        export COMPOSE_FILE=docker-compose.rds.yml
    else
        export COMPOSE_FILE=docker-compose.yml
    fi
}

# Detectar Docker Compose (v2 plugin o v1 standalone)
set_compose_cmd() {
    if docker compose version &>/dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
}

# Función para mostrar ayuda
show_help() {
    echo "Uso: $0 [opción]"
    echo ""
    echo "Opciones:"
    echo "  install     Instalar Docker y dependencias"
    echo "  deploy      Desplegar la aplicación (usa RDS si .env tiene RDS_HOST)"
    echo "  quick       Despliegue rápido: git pull + build con caché + up (para probar cambios en la URL)"
    echo "  update      Actualizar la aplicación"
    echo "  backup      Crear respaldo de la base de datos"
    echo "  restore     Restaurar respaldo de la base de datos"
    echo "  status      Verificar estado de los servicios"
    echo "  logs        Ver logs de la aplicación"
    echo "  stop        Detener todos los servicios"
    echo "  restart     Reiniciar servicios"
    echo "  destroy     Eliminar todos los contenedores y volúmenes"
    echo "  help        Mostrar esta ayuda"
    echo ""
}

# Verificar que se ejecute como root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "Este script debe ejecutarse como root o con sudo"
        exit 1
    fi
}

# Verificar que Docker esté instalado
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker no está instalado. Ejecute: $0 install"
        exit 1
    fi
    set_compose_cmd
    if ! $COMPOSE_CMD version &>/dev/null; then
        print_error "Docker Compose no está instalado. Ejecute: $0 install"
        exit 1
    fi
}

# Verificar archivo .env para producción
check_env() {
    if [ ! -f .env ]; then
        if [ -f .env.aws.example ]; then
            cp .env.aws.example .env
            print_warning "Se creó .env desde .env.aws.example. Configure RDS, SECRET_KEY, CORS, etc. y vuelva a ejecutar."
        elif [ -f .env.example ]; then
            cp .env.example .env
            print_warning "Se creó .env desde .env.example. Configure los valores reales y vuelva a ejecutar."
        else
            print_error "No existe .env. Cree .env con las variables necesarias (puede usar .env.aws.example para RDS)."
        fi
        exit 1
    fi
    # Comprobar que no quedan valores de ejemplo
    if grep -q "cambiar_password_seguro\|cambiar_en_produccion\|generar_clave_secreta" .env 2>/dev/null; then
        print_warning "Revise .env: hay valores de ejemplo que debe reemplazar por valores reales antes de producción."
    fi
}

# Instalar Docker y dependencias
install_docker() {
    print_step "Instalando Docker y Docker Compose..."

    if command -v dnf &>/dev/null; then
        # Amazon Linux 2023 / RHEL / Fedora (curl-minimal ya viene instalado, no instalar curl)
        dnf update -y -q
        dnf install -y docker
        systemctl start docker
        systemctl enable docker
        # Docker Compose plugin (v2)
        mkdir -p /usr/local/lib/docker/cli-plugins
        curl -sSL "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m)" -o /usr/local/lib/docker/cli-plugins/docker-compose
        chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
        ln -sf /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose 2>/dev/null || true
    else
        # Debian / Ubuntu
        apt-get update -qq
        apt-get upgrade -y -qq
        apt-get install -y -qq apt-transport-https ca-certificates curl gnupg lsb-release git vim htop
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        apt-get update -qq
        apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
        systemctl start docker
        systemctl enable docker
    fi

    if [ -n "$SUDO_USER" ]; then
        usermod -aG docker $SUDO_USER 2>/dev/null || true
    fi
    print_success "Docker instalado correctamente"
}

# Crear estructura de directorios
setup_directories() {
    print_step "Creando estructura de directorios..."

    # Crear directorio del proyecto
    mkdir -p /opt/${PROJECT_NAME}
    mkdir -p ${BACKUP_DIR}

    # Crear directorio para datos persistentes
    mkdir -p /opt/${PROJECT_NAME}/data

    print_success "Directorios creados"
}

# Desplegar la aplicación
deploy() {
    print_step "Desplegando ${PROJECT_NAME}..."

    check_docker
    setup_directories

    # Cambiar al directorio del proyecto
    cd /opt/${PROJECT_NAME}
    set_compose_file

    # Verificar que existe el archivo compose
    if [ ! -f "docker-compose.yml" ] && [ ! -f "docker-compose.rds.yml" ]; then
        print_error "No se encontró docker-compose.yml ni docker-compose.rds.yml"
        exit 1
    fi

    # Verificar .env para producción
    check_env

    # Detener servicios existentes
    print_step "Deteniendo servicios anteriores..."
    $COMPOSE_CMD down --remove-orphans 2>/dev/null || true

    # Construir e iniciar servicios (builder clásico si buildx no está disponible)
    print_step "Construyendo contenedores..."
    export DOCKER_BUILDKIT=0
    $COMPOSE_CMD build --no-cache

    print_step "Iniciando servicios..."
    $COMPOSE_CMD up -d

    # Esperar a que los servicios estén listos
    print_step "Esperando a que los servicios estén listos..."
    sleep 10

    set_compose_file
    # Verificar estado
    if $COMPOSE_CMD ps | grep -q "Up"; then
        print_success "Aplicación desplegada correctamente"

        # Mostrar estado
        $COMPOSE_CMD ps

        echo ""
        echo "================================"
        echo "  Aplicación Desplegada"
        echo "================================"
        echo "Frontend: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'localhost'):80"
        echo "API Docs: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'localhost'):8000/docs"
        echo "Health:   http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'localhost'):8000/health"
        echo "================================"
    else
        print_error "Error al desplegar la aplicación"
        $COMPOSE_CMD logs
        exit 1
    fi
}

# Actualizar la aplicación
update() {
    print_step "Actualizando ${PROJECT_NAME}..."

    check_docker
    cd /opt/${PROJECT_NAME}
    set_compose_file

    # Hacer respaldo antes de actualizar (solo si hay BD: local o RDS)
    print_step "Creando respaldo antes de actualizar..."
    backup

    # Detener servicios
    print_step "Deteniendo servicios..."
    $COMPOSE_CMD down

    # Actualizar código
    if [ -d ".git" ]; then
        print_step "Actualizando código desde Git..."
        git pull origin main
    fi

    # Reconstruir y reiniciar (builder clásico)
    print_step "Reconstruyendo contenedores..."
    export DOCKER_BUILDKIT=0
    $COMPOSE_CMD build --no-cache

    print_step "Iniciando servicios..."
    $COMPOSE_CMD up -d

    # Esperar
    sleep 10

    print_success "Aplicación actualizada"
}

# Despliegue rápido: git pull + build (con caché) + up. Para probar cambios en la URL.
quick_deploy() {
    print_step "Despliegue rápido (git pull + build + up)..."

    check_docker
    cd /opt/${PROJECT_NAME}
    set_compose_cmd

    # Usar SSL si existe docker-compose.rds.ssl.yml y certificados
    if [ -f "docker-compose.rds.ssl.yml" ] && [ -f "ssl/fullchain.pem" ]; then
        export COMPOSE_FILE=docker-compose.rds.ssl.yml
        print_step "Usando SSL (www.innovabigdata.com)"
    else
        set_compose_file
    fi

    if [ ! -f "docker-compose.yml" ] && [ ! -f "docker-compose.rds.yml" ] && [ -z "$COMPOSE_FILE" ]; then
        print_error "No se encontró archivo docker-compose"
        exit 1
    fi

    # Actualizar código desde Git
    if [ -d ".git" ]; then
        print_step "Actualizando código (git pull)..."
        BRANCH=$(git branch --show-current 2>/dev/null || echo "master")
        if ! git pull origin "$BRANCH"; then
            print_warning "git pull falló. El código en la EC2 puede estar desactualizado. Compruebe con: git pull origin $BRANCH"
        fi
    fi

    # Build con caché (más rápido; usar 'deploy' o 'update' para --no-cache si hace falta)
    print_step "Construyendo contenedores (con caché)..."
    export DOCKER_BUILDKIT=0
    $COMPOSE_CMD build

    print_step "Iniciando servicios..."
    $COMPOSE_CMD up -d

    sleep 5
    if $COMPOSE_CMD ps | grep -q "Up"; then
        print_success "Despliegue rápido listo. Prueba en la URL."
        $COMPOSE_CMD ps
    else
        print_error "Algo falló. Revisa: $COMPOSE_CMD logs"
        exit 1
    fi
}

# Crear respaldo de la base de datos
backup() {
    print_step "Creando respaldo de la base de datos..."

    cd /opt/${PROJECT_NAME}
    mkdir -p ${BACKUP_DIR}
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

    if [ -f .env ] && grep -q '^RDS_HOST=' .env 2>/dev/null; then
        # Respaldo contra RDS (desde la EC2)
        set -a; source .env 2>/dev/null; set +a
        if ! command -v pg_dump &>/dev/null; then
            print_warning "Instalando postgresql-client para respaldo RDS..."
            apt-get update -qq && apt-get install -y -qq postgresql-client
        fi
        export PGPASSWORD="${RDS_PASSWORD:-}"
        pg_dump -h "${RDS_HOST}" -U "${RDS_USER:-postgres}" "${RDS_DB:-innovabigdata}" --no-owner --no-acl > "${BACKUP_FILE}" || { unset PGPASSWORD; print_error "Error al hacer respaldo RDS"; exit 1; }
        unset PGPASSWORD
    else
        check_docker
        set_compose_file
        $COMPOSE_CMD exec -T db pg_dump -U postgres innovabigdata > ${BACKUP_FILE}
    fi

    gzip ${BACKUP_FILE}
    print_success "Respaldo creado: ${BACKUP_FILE}.gz"
    find ${BACKUP_DIR} -name "backup_*.sql.gz" -mtime +7 -delete
    print_success "Respaldo completado"
}

# Restaurar respaldo
restore() {
    print_step "Restaurando respaldo..."

    if [ -z "$2" ]; then
        print_error "Debe especificar el archivo de respaldo"
        echo "Uso: $0 restore archivo_backup.sql.gz"
        exit 1
    fi

    BACKUP_FILE="$2"

    if [ ! -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
        print_error "No se encontró el archivo: ${BACKUP_DIR}/${BACKUP_FILE}"
        exit 1
    fi

    check_docker

    cd /opt/${PROJECT_NAME}

    # Detener servicios
    $COMPOSE_CMD stop backend

    # Descomprimir si es necesario
    if [[ ${BACKUP_FILE} == *.gz ]]; then
        gunzip -c ${BACKUP_DIR}/${BACKUP_FILE} | $COMPOSE_CMD exec -T db psql -U postgres -d innovabigdata
    else
        $COMPOSE_CMD exec -T db psql -U postgres -d innovabigdata < ${BACKUP_DIR}/${BACKUP_FILE}
    fi

    # Iniciar servicios
    $COMPOSE_CMD start backend

    print_success "Respaldo restaurado correctamente"
}

# Verificar estado
status() {
    print_step "Verificando estado de ${PROJECT_NAME}..."
    check_docker
    cd /opt/${PROJECT_NAME}
    set_compose_cmd
    set_compose_file
    $COMPOSE_CMD ps
}

# Ver logs
logs() {
    print_step "Mostrando logs..."
    check_docker
    cd /opt/${PROJECT_NAME}
    set_compose_cmd
    set_compose_file
    if [ -n "$2" ]; then
        $COMPOSE_CMD logs -f "$2"
    else
        $COMPOSE_CMD logs -f --tail=100
    fi
}

# Detener servicios
stop() {
    print_step "Deteniendo servicios..."
    check_docker
    cd /opt/${PROJECT_NAME}
    set_compose_cmd
    set_compose_file
    $COMPOSE_CMD down

    print_success "Servicios detenidos"
}

# Reiniciar servicios
restart() {
    print_step "Reiniciando servicios..."
    check_docker
    cd /opt/${PROJECT_NAME}
    set_compose_cmd
    set_compose_file
    $COMPOSE_CMD restart

    print_success "Servicios reiniciados"
}

# Destruir todo
destroy() {
    print_warning "Esta acción eliminará todos los contenedores, volúmenes y datos"
    read -p "¿Está seguro? (escriba 'SI' para continuar): " CONFIRM

    if [ "$CONFIRM" != "SI" ]; then
        print_warning "Operación cancelada"
        exit 0
    fi

    print_step "Eliminando contenedores y volúmenes..."
    check_docker
    cd /opt/${PROJECT_NAME}
    set_compose_cmd
    set_compose_file
    $COMPOSE_CMD down -v

    print_success "Contenedores y volúmenes eliminados"
}

# Función principal
main() {
    # Registrar inicio
    echo "================================"
    echo "  Despliegue ${PROJECT_NAME}"
    echo "  $(date)"
    echo "================================"
    echo ""

    # Parsear argumentos
    case "${1:-help}" in
        install)
            check_root
            install_docker
            ;;
        deploy)
            check_root
            deploy
            ;;
        quick)
            check_root
            quick_deploy
            ;;
        update)
            check_root
            update
            ;;
        backup)
            check_root
            backup
            ;;
        restore)
            check_root
            restore "$@"
            ;;
        status)
            check_docker
            status
            ;;
        logs)
            check_docker
            logs "$@"
            ;;
        stop)
            check_root
            stop
            ;;
        restart)
            check_root
            restart
            ;;
        destroy)
            check_root
            destroy
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Opción no válida: $1"
            show_help
            exit 1
            ;;
    esac

    echo ""
    print_success "Operación completada"
}

# Ejecutar
main "$@"
