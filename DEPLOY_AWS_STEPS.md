# Pasos para desplegar en AWS EC2 con RDS

Sigue estos pasos **en orden** desde tu PC y luego en la EC2.

---

## Antes de empezar

- EC2 y RDS en la **misma VPC**.
- Grupo de seguridad de **RDS**: entrada en puerto **5432** desde el grupo de seguridad de la EC2 (o subred de la EC2).
- Tienes la **IP pública de la EC2** y el archivo **.pem** para SSH.
- Repositorio del proyecto en Git (o subes el código por otra vía).

---

## Paso 1: Conectar por SSH a la EC2

Desde tu PC (reemplaza `TU_IP_EC2` y la ruta del .pem):

```bash
ssh -i ruta/a/tu-clave.pem ubuntu@TU_IP_EC2
```

Si el usuario de tu AMI es `ec2-user` (Amazon Linux), usa:

```bash
ssh -i ruta/a/tu-clave.pem ec2-user@TU_IP_EC2
```

---

## Paso 2: Instalar Docker en la EC2

```bash
sudo apt update
sudo apt install -y git
# Clonar el proyecto (sustituye por la URL real de tu repo)
sudo git clone https://github.com/TU_ORG/innovabigdata.git /opt/innovabigdata
cd /opt/innovabigdata

sudo chmod +x deploy.sh
sudo ./deploy.sh install
```

Si te pide confirmación para instalar Docker, acepta. Al terminar, Docker y Docker Compose quedarán instalados.

---

## Paso 3: Configurar el archivo .env (RDS y resto)

```bash
cd /opt/innovabigdata
sudo cp .env.aws.example .env
sudo nano .env
```

Edita y deja algo como esto (con tus valores reales):

- **TU_PASSWORD_RDS**: contraseña del usuario `postgres` de RDS (la que tienes en Secrets Manager o la que te dieron al crear RDS).
- **SECRET_KEY**: genera una clave larga aleatoria, por ejemplo en la EC2: `openssl rand -base64 32`.
- **VERIFIK_TOKEN**: token real de la API Verifik (si ya lo tienes).
- **CORS_ORIGINS**: si por ahora usas solo la IP de la EC2, pon: `http://TU_IP_EC2`. Si ya tienes dominio: `https://tudominio.com,https://www.tudominio.com,http://TU_IP_EC2`.

En **DATABASE_URL** y en **RDS_*** usa la misma contraseña de RDS. El endpoint ya está en .env.aws.example; no hace falta cambiarlo si es el mismo.

Guarda (Ctrl+O, Enter) y cierra el editor (Ctrl+X).

---

## Paso 4: Instalar cliente PostgreSQL y crear la base en RDS

Solo hay que hacerlo **una vez** (crear la base `innovabigdata` y aplicar `init.sql`):

```bash
cd /opt/innovabigdata
sudo apt install -y postgresql-client
sudo chmod +x scripts/init-rds.sh
sudo ./scripts/init-rds.sh
```

Ese script crea la base `innovabigdata` en RDS (si no existe) y ejecuta `init.sql` (tablas y usuario admin). Si algo falla, revisa que en `.env` estén bien `RDS_HOST`, `RDS_USER`, `RDS_PASSWORD` y `RDS_DB`.

---

## Paso 5: Desplegar la aplicación

```bash
cd /opt/innovabigdata
sudo ./deploy.sh deploy
```

El script detecta que tienes `RDS_HOST` en `.env` y usará `docker-compose.rds.yml` (solo backend + frontend, sin contenedor de base de datos). Construirá las imágenes y levantará los contenedores.

Al final deberías ver las URLs de acceso (Frontend, API Docs, Health).

---

## Paso 6: Comprobar que todo funciona

- **Frontend:** `http://TU_IP_EC2`
- **API (docs):** `http://TU_IP_EC2:8000/docs`
- **Health:** `http://TU_IP_EC2:8000/health`

Entra al frontend y prueba el login (usuario por defecto: `admin`, contraseña: `Admin2026!`). **Cámbiala en cuanto entres.**

---

## Paso 7: Grupos de seguridad de la EC2

En la consola de AWS, en el **grupo de seguridad de la EC2**, permite:

- **22** (SSH): tu IP (recomendado) o la que uses para administrar.
- **80** (HTTP): `0.0.0.0/0` para que se acceda al frontend.
- **443** (HTTPS): `0.0.0.0/0` si más adelante usas SSL.
- **8000** (API): solo si quieres acceder a la API desde fuera; si el frontend y el backend están en la misma EC2, no es necesario abrirlo.

---

## Comandos útiles después del despliegue

| Comando | Descripción |
|--------|-------------|
| `sudo ./deploy.sh status` | Estado de los contenedores |
| `sudo ./deploy.sh logs` | Ver logs (backend/frontend) |
| `sudo ./deploy.sh backup` | Respaldo de la BD en RDS (se guarda en `/opt/backups/innovabigdata/`) |
| `sudo ./deploy.sh restart` | Reiniciar backend y frontend |
| `sudo ./deploy.sh update` | Actualizar código (git pull), respaldo y volver a desplegar |

---

## Si algo falla

- **Backend no arranca:** `sudo ./deploy.sh logs backend`. Revisa que `DATABASE_URL` en `.env` sea correcta y que la EC2 pueda llegar al RDS (grupo de seguridad de RDS con 5432 desde la EC2).
- **No se puede conectar a RDS:** desde la EC2 prueba:  
  `psql "host=proyecto-innova-postgres.cduyc0g8khr3.us-east-2.rds.amazonaws.com port=5432 dbname=innovabigdata user=postgres sslmode=require"`  
  (con `PGPASSWORD=...` si hace falta). Si esto falla, el problema es red/seguridad o contraseña.
- **Frontend no carga:** `sudo ./deploy.sh logs frontend` y revisa que el puerto 80 esté abierto en el grupo de seguridad de la EC2.

Cuando tengas dominio, puedes configurar CORS y SSL según `DEPLOY.md` y `SSL_SETUP.md`.
