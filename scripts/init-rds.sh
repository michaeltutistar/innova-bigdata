#!/bin/bash
# Crear base de datos innovabigdata en RDS y ejecutar init.sql
# Ejecutar UNA VEZ desde la EC2 (misma VPC que RDS).
# Uso: ./scripts/init-rds.sh
# Requiere: .env con RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB (o DATABASE_URL)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

if [ ! -f .env ]; then
    echo "Error: No existe .env. Copie .env.aws.example a .env y configure RDS_HOST, RDS_USER, RDS_PASSWORD."
    exit 1
fi

# Cargar variables (valores con # deben estar entre comillas en .env)
set -a
source .env 2>/dev/null || true
set +a

RDS_HOST="${RDS_HOST:-}"
RDS_USER="${RDS_USER:-postgres}"
RDS_PASSWORD="${RDS_PASSWORD:-}"
RDS_DB="${RDS_DB:-innovabigdata}"

if [ -z "$RDS_HOST" ] || [ -z "$RDS_PASSWORD" ]; then
    echo "Error: En .env defina RDS_HOST, RDS_PASSWORD (y opcionalmente RDS_USER, RDS_DB)."
    exit 1
fi

echo "Conectando a RDS: $RDS_HOST"
echo "Creando base de datos '$RDS_DB' (si ya existe se omite)..."

export PGPASSWORD="$RDS_PASSWORD"
psql "host=$RDS_HOST port=5432 dbname=postgres user=$RDS_USER sslmode=require" -v ON_ERROR_STOP=0 -c "CREATE DATABASE $RDS_DB;" 2>/dev/null || true

echo "Aplicando init.sql..."
psql "host=$RDS_HOST port=5432 dbname=$RDS_DB user=$RDS_USER sslmode=require" -v ON_ERROR_STOP=1 -f init.sql

unset PGPASSWORD
echo "Listo. Base '$RDS_DB' creada e inicializada."
