# Sistema Web MVP de Registro de Líderes y Sufragantes

Sistema web minimalista, ligero y altamente estable para el registro de líderes y sufragantes, con integración de verificación de cédulas a través de la API de Verifik.

## Características Principales

- **Autenticación segura** con JWT y roles de usuario (Superadmin/Operador)
- **Gestión de líderes** exclusivamente para superadmin
- **Registro de sufragantes** con validación automática mediante Verifik
- **Dashboard completo** con métricas en tiempo real
- **Exportación a Excel** de todos los datos
- **Arquitectura escalable** con Docker

## Requisitos del Sistema

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git

## Instalación y Configuración

### 1. Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd innovabigdata
```

### 2. Configurar Variables de Entorno

El archivo `docker-compose.yml` ya contiene las variables de entorno necesarias. Para producción, es recomendable crear un archivo `.env`:

```bash
# Backend
SECRET_KEY=tu_clave_secreta_muy_segura
DATABASE_URL=postgresql://postgres:password@db:5432/innovabigdata
VERIFIK_TOKEN=tu_token_de_verifik

# Frontend (opcional)
VITE_API_URL=https://tu-dominio.com/api
```

### 3. Iniciar los Servicios

```bash
# Construir e iniciar todos los servicios
docker-compose up -d --build

# Verificar estado de los servicios
docker-compose ps

# Ver logs
docker-compose logs -f
```

### 4. Acceder a la Aplicación

- **Frontend**: http://localhost:80
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Credenciales por Defecto

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Superadmin | admin | Admin2026! |

**IMPORTANTE**: Cambiar la contraseña del superadmin inmediatamente después del primer inicio de sesión.

## Estructura del Proyecto

```
innovabigdata/
├── docker-compose.yml          # Configuración de servicios Docker
├── init.sql                    # Esquema de base de datos
├── README.md                   # Este archivo
├── backend/
│   ├── Dockerfile              # Imagen Docker del backend
│   ├── requirements.txt        # Dependencias Python
│   └── main.py                 # Aplicación FastAPI
└── frontend/
    ├── Dockerfile              # Imagen Docker del frontend
    ├── nginx.conf              # Configuración Nginx
    ├── package.json            # Dependencias Node.js
    ├── vite.config.js          # Configuración Vite
    ├── tailwind.config.js      # Configuración TailwindCSS
    └── src/
        ├── main.jsx            # Punto de entrada React
        ├── index.css           # Estilos globales
        └── App.jsx             # Componente principal
```

## API Endpoints

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/login` | Inicio de sesión |
| POST | `/auth/register` | Crear usuario (superadmin) |
| GET | `/auth/me` | Usuario actual |

### Líderes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/leaders` | Listar líderes |
| POST | `/leaders` | Crear líder |
| PUT | `/leaders/{id}` | Actualizar líder |
| DELETE | `/leaders/{id}` | Desactivar líder |

### Sufragantes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/voters/verify` | Verificar cédula en Verifik |
| POST | `/voters` | Registrar sufragante |
| GET | `/voters` | Listar sufragantes |

### Dashboard

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/dashboard` | Métricas principales |
| GET | `/dashboard/municipios` | Sufragantes por municipio |
| GET | `/dashboard/lideres` | Sufragantes por líder |
| GET | `/export/xlsx` | Exportar a Excel |

## Base de Datos

### Tablas Principales

- **usuarios**: Gestión de usuarios y autenticación
- **lideres**: Información de líderes territoriales
- **sufragantes**: Registro de sufragantes con datos de Verifik

### Índices

La base de datos incluye índices optimizados para las consultas más frecuentes:
- Cédula de líderes y sufragantes
- Municipio y estado de validación
- Fecha de registro

## Integración con Verifik

El sistema se integra con la API de Verifik para validar cédulas colombianas. El flujo de registro de sufragantes incluye:

1. Validación local de la cédula
2. Consulta a la API de Verifik
3. Clasificación automática del registro
4. Población de datos de votación

### Estados de Validación

| Estado | Descripción |
|--------|-------------|
| verificado | Cédula válida y activa |
| inconsistente | Persona fallecida o cédula inválida |
| revision | Requiere revisión manual |

## Despliegue en AWS EC2

Para instrucciones detalladas de despliegue, consulta el archivo [DEPLOY.md](DEPLOY.md).

### Resumen Rápido

```bash
# 1. Conectar a EC2
ssh -i innovabigdata.pem ubuntu@<IP-PUBLICA>

# 2. Clonar proyecto
git clone <URL-DEL-REPOSITORIO> /opt/innovabigdata
cd /opt/innovabigdata

# 3. Instalar Docker
chmod +x deploy.sh
./deploy.sh install

# 4. Desplegar aplicación
./deploy.sh deploy

# 5. Verificar estado
./deploy.sh status
./deploy.sh logs
```

### Acceso a la Aplicación

- **Frontend**: http://<IP-PUBLICA>:80
- **API Docs**: http://<IP-PUBLICA>:8000/docs
- **Health Check**: http://<IP-PUBLICA>:8000/health

Para más detalles sobre configuración de dominio, SSL, respaldos y solución de problemas, consulta [DEPLOY.md](DEPLOY.md).

## Mantenimiento

### Respaldos de Base de Datos

Los respaldos se realizan automáticamente si está configurado RDS. Para respaldos manuales:

```bash
docker-compose exec db pg_dump -U postgres innovabigdata > backup.sql
```

### Actualización de la Aplicación

```bash
docker-compose pull
docker-compose up -d --build
docker-compose exec backend alembic upgrade head
```

### Monitoreo de Logs

```bash
# Logs de todos los servicios
docker-compose logs -f

# Logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

## Solución de Problemas

### Los contenedores no inician

```bash
# Verificar estado
docker-compose ps

# Ver errores
docker-compose logs

# Verificar puertos
sudo netstat -tlnp | grep -E '80|8000|5432'
```

### Error de conexión a base de datos

```bash
# Verificar que el contenedor DB esté corriendo
docker-compose logs db

# Probar conexión
docker-compose exec db pg_isready -U postgres
```

### La API de Verifik no responde

- Verificar que el token sea válido y no haya expirado
- Revisar los logs del backend para errores de conexión
- Verificar los límites de la API de Verifik

## Seguridad

- Contraseñas hasheadas con bcrypt
- Tokens JWT con expiración configurable
- CORS configurado para dominios específicos
- HTTPS habilitado en producción
- Backups automáticos de base de datos

## Licencia

Este proyecto es propiedad de InnovaBigData.

## Soporte

Para soporte técnico, contactar al equipo de desarrollo.
