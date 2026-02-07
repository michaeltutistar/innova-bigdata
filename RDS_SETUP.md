# Configuración RDS para el despliegue

## Datos de tu RDS (según tu pantalla)

| Dato | Valor |
|------|--------|
| **Endpoint** | `proyecto-innova-postgres.cduyc0g8khr3.us-east-2.rds.amazonaws.com` |
| **Puerto** | 5432 |
| **Usuario** | postgres |
| **Contraseña** | En AWS Secrets Manager (o la que te dieron al crear RDS) |
| **Acceso** | Solo desde dentro de la VPC (Internet Gateway desactivado) |

## 1. EC2 en la misma VPC

La instancia EC2 donde correrá Docker **debe estar en la misma VPC** que el RDS. Si creaste RDS y EC2 en la misma cuenta/región por defecto, suele ser así.

## 2. Grupo de seguridad de RDS

En **RDS → tu instancia → Conectividad y seguridad**, revisa el **grupo de seguridad** asociado. Ese grupo debe permitir **entrada (inbound)** en el puerto **5432** desde el **grupo de seguridad de tu EC2** (o desde el CIDR de la subred donde está la EC2), no desde 0.0.0.0/0.

Ejemplo en el grupo de seguridad del RDS:

- Tipo: PostgreSQL  
- Puerto: 5432  
- Origen: **ID del grupo de seguridad de la instancia EC2** (recomendado) o la subred de la EC2.

## 3. Obtener la contraseña (Secrets Manager)

Si quieres usar la contraseña que está en Secrets Manager desde la EC2:

```bash
aws secretsmanager get-secret-value \
  --secret-id 'arn:aws:secretsmanager:us-east-2:471914527766:secret:rds!db-e6b566b7-8d1c-4f79-850b-094238ec7648-Wvb96n' \
  --region us-east-2 \
  --query SecretString --output text | jq -r '.password'
```

En la EC2 debe estar instalado **AWS CLI** y configurado (por ejemplo con el usuario IAM `innovabigdata` con permisos para leer ese secret). Si prefieres no usar Secrets Manager, puedes poner la contraseña directamente en el `.env` (la que te dieron al crear RDS).

## 4. Crear la base de datos `innovabigdata`

Por defecto RDS tiene la base `postgres`. Hay que crear la base que usa la aplicación.

**Opción A – Desde tu PC (si tienes acceso a la VPC, p. ej. VPN o túnel)**

No aplica si RDS no tiene acceso público (tu caso). Sigue con la opción B.

**Opción B – Desde la instancia EC2 (recomendado)**

Cuando tengas la EC2 en la misma VPC y puedas conectarte por SSH:

```bash
# Conectar por SSH a la EC2
ssh -i tu-clave.pem ubuntu@<IP-EC2>

# Instalar cliente PostgreSQL (una vez)
sudo apt update && sudo apt install -y postgresql-client

# Conectar a RDS (sustituye PASSWORD por la contraseña real)
export PGPASSWORD='PASSWORD'
psql "host=proyecto-innova-postgres.cduyc0g8khr3.us-east-2.rds.amazonaws.com port=5432 dbname=postgres user=postgres sslmode=require" -c "CREATE DATABASE innovabigdata;"
```

Si la base ya existe, verás un error tipo “already exists”; puedes ignorarlo.

Luego, aplicar el esquema inicial (tablas + usuario admin):

```bash
psql "host=proyecto-innova-postgres.cduyc0g8khr3.us-east-2.rds.amazonaws.com port=5432 dbname=innovabigdata user=postgres sslmode=require" -f /opt/innovabigdata/init.sql
```

(Ajusta la ruta a `init.sql` si en la EC2 el proyecto está en otra carpeta.)

**Opción C – Desde AWS CloudShell (solo si RDS tuviera acceso público)**

En tu caso RDS no es accesible desde internet, así que CloudShell normalmente no podrá conectarse. Usa la opción B desde la EC2.

## 5. URL de conexión para la aplicación (backend en EC2)

En el `.env` del servidor (EC2) usarás algo así (todo en una línea, sin espacios):

```env
DATABASE_URL=postgresql://postgres:TU_PASSWORD@proyecto-innova-postgres.cduyc0g8khr3.us-east-2.rds.amazonaws.com:5432/innovabigdata?sslmode=require
```

Sustituye `TU_PASSWORD` por:

- La contraseña que obtienes de Secrets Manager (opción del apartado 3), o  
- La contraseña que te dieron al crear RDS (si la tienes guardada).

`sslmode=require` es suficiente para RDS y no requiere tener el archivo de certificado en el servidor.

## Resumen del “paso 2” que viste en RDS

El **paso 2** que muestra la consola es un comando `psql` de ejemplo que:

- Usa el endpoint que tienes.
- Lee la contraseña desde Secrets Manager.
- Usa SSL con verificación completa y un certificado en `/certs/global-bundle.pem`.

Para nuestro despliegue en Docker en EC2 no hace falta ejecutar ese comando tal cual. Nos basta con:

1. Tener la EC2 en la misma VPC que RDS.
2. Abrir el puerto 5432 en el grupo de seguridad del RDS desde la EC2.
3. Crear la base `innovabigdata` (una vez) desde la EC2.
4. Poner en `.env` la `DATABASE_URL` con el endpoint, usuario, contraseña y `?sslmode=require`.

Si quieres, el siguiente paso puede ser preparar el `docker-compose` y el `deploy.sh` para usar esta RDS (sin contenedor `db`) y el contenido exacto del `.env` para tu servidor AWS.
