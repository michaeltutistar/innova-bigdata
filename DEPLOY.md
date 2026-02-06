# Instrucciones de Despliegue en AWS EC2

## Configuración para Producción (obligatorio antes de desplegar)

Antes de ejecutar `./deploy.sh deploy` en EC2:

1. **Crear archivo `.env`** con las variables de producción (contraseñas, claves, tokens):
   ```bash
   cp .env.example .env
   nano .env   # o vim .env
   ```
2. **Reemplazar en `.env`**:
   - `POSTGRES_PASSWORD` y `DATABASE_URL` (misma contraseña segura).
   - `SECRET_KEY`: una clave larga y aleatoria para JWT (no dejar la de ejemplo).
   - `VERIFIK_TOKEN`: token real de la API Verifik.
   - `CORS_ORIGINS`: dominio real, p. ej. `https://innovabigdata.com,https://www.innovabigdata.com`.

Si `.env` no existe, el script creará uno desde `.env.example` y pedirá configurarlo antes de continuar.

---

## Paso 1: Conectar a la Instancia EC2

```bash
ssh -i innovabigdata.pem ubuntu@<IP-PUBLICA>
```

## Paso 2: Instalar Git y Clonar el Proyecto

```bash
sudo apt update
sudo apt install -y git
git clone <URL-DEL-REPOSITORIO> /opt/innovabigdata
cd /opt/innovabigdata
```

## Paso 3: Instalar Docker (si no está instalado)

```bash
chmod +x deploy.sh
./deploy.sh install
```

**Nota**: El script `install` instalará Docker, Docker Compose y todas las dependencias necesarias.

## Paso 4: Desplegar la Aplicación

```bash
./deploy.sh deploy
```

Este comando:
- Verifica que Docker esté instalado
- Crea la estructura de directorios necesaria
- Construye las imágenes Docker
- Inicia todos los servicios
- Muestra las URLs de acceso

## Paso 5: Verificar el Despliegue

```bash
# Verificar estado de los servicios
./deploy.sh status

# Ver logs en tiempo real
./deploy.sh logs

# Ver logs de un servicio específico
./deploy.sh logs backend
./deploy.sh logs frontend
./deploy.sh logs db
```

## Paso 6: Acceder a la Aplicación

- **Frontend**: http://<IP-PUBLICA>:80
- **Documentación API**: http://<IP-PUBLICA>:8000/docs
- **Health Check**: http://<IP-PUBLICA>:8000/health

## 📋 Comandos de Gestión

| Comando | Descripción |
|---------|-------------|
| `./deploy.sh status` | Verificar estado de servicios |
| `./deploy.sh logs` | Ver logs en tiempo real |
| `./deploy.sh backup` | Crear respaldo de BD |
| `./deploy.sh restore <archivo>` | Restaurar respaldo de BD |
| `./deploy.sh update` | Actualizar aplicación |
| `./deploy.sh restart` | Reiniciar servicios |
| `./deploy.sh stop` | Detener servicios |
| `./deploy.sh destroy` | Eliminar todo (cuidado) |
| `./deploy.sh help` | Mostrar ayuda |

### Ejemplos de Uso

```bash
# Crear respaldo de la base de datos
./deploy.sh backup

# Actualizar la aplicación desde Git
./deploy.sh update

# Reiniciar todos los servicios
./deploy.sh restart

# Ver logs solo del backend
./deploy.sh logs backend

# Detener todos los servicios
./deploy.sh stop
```

## 🔧 Configuración de Dominio

Para configurar el dominio `innovabigdata.com`:

### Opción 1: Usando AWS Route 53 y ACM (Recomendado)

1. **En AWS Route 53**: 
   - Crear registro A que apunte a la IP pública de EC2
   - O crear registro CNAME si usas un Load Balancer

2. **En AWS ACM (Certificate Manager)**:
   - Solicitar certificado SSL para el dominio `innovabigdata.com` y `www.innovabigdata.com`
   - Validar el certificado mediante DNS o email

3. **Configurar Application Load Balancer (ALB)**:
   - Crear un ALB en AWS
   - Asociar el certificado SSL del ACM
   - Configurar listeners:
     - Puerto 443 (HTTPS) con certificado SSL
     - Puerto 80 (HTTP) redirigiendo a HTTPS
   - Configurar target group apuntando al puerto 80 de la instancia EC2

4. **Actualizar Route 53**:
   - Cambiar el registro A para que apunte al DNS del Load Balancer

### Opción 2: Usando Certbot (Let's Encrypt)

Si prefieres usar Certbot directamente en la instancia EC2:

1. **Instalar Certbot**:
```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

2. **Configurar DNS**:
   - Asegúrate de que el dominio apunte a la IP pública de EC2

3. **Obtener certificado**:
```bash
sudo certbot certonly --standalone -d innovabigdata.com -d www.innovabigdata.com
```

4. **Configurar Nginx con SSL**:
   - Actualizar `frontend/nginx.conf` para incluir configuración SSL
   - Montar los certificados en el contenedor Docker
   - Actualizar `docker-compose.yml` para exponer puerto 443

5. **Renovar certificados automáticamente**:
```bash
sudo certbot renew --dry-run
```

**Nota**: Para usar Certbot con Docker, necesitarás configurar un volumen para los certificados y actualizar la configuración de nginx.

## 📊 Puertos y Servicios

| Puerto | Servicio | Descripción |
|--------|----------|-------------|
| 80 | Nginx | Servidor web frontend |
| 443 | Nginx (SSL) | Servidor web frontend con HTTPS |
| 8000 | FastAPI | API REST backend |
| 5432 | PostgreSQL | Base de datos |

## 🔒 Configuración de Firewall (UFW)

Asegúrate de tener los puertos necesarios abiertos:

```bash
# Permitir SSH
sudo ufw allow 22/tcp

# Permitir HTTP
sudo ufw allow 80/tcp

# Permitir HTTPS (si usas SSL directo)
sudo ufw allow 443/tcp

# Permitir acceso a la API (opcional, solo si necesitas acceso externo)
sudo ufw allow 8000/tcp

# Habilitar firewall
sudo ufw enable

# Verificar estado
sudo ufw status
```

**Nota**: En producción, es recomendable restringir el acceso al puerto 8000 solo desde el frontend usando grupos de seguridad de AWS.

## 🔐 Grupos de Seguridad en AWS EC2

Configura los grupos de seguridad en la consola de AWS:

1. **SSH (Puerto 22)**: Solo desde tu IP
2. **HTTP (Puerto 80)**: Desde cualquier lugar (0.0.0.0/0)
3. **HTTPS (Puerto 443)**: Desde cualquier lugar (0.0.0.0/0)
4. **API (Puerto 8000)**: Solo desde la IP de EC2 (127.0.0.1) o desde el ALB

## 🚀 Actualización Continua

Para mantener la aplicación actualizada:

```bash
# Actualizar desde Git y reconstruir
./deploy.sh update

# Esto automáticamente:
# 1. Crea un respaldo de la BD
# 2. Detiene los servicios
# 3. Actualiza el código desde Git
# 4. Reconstruye las imágenes
# 5. Reinicia los servicios
```

## 📦 Respaldos Automáticos

Los respaldos se guardan en `/opt/backups/innovabigdata/` y se eliminan automáticamente después de 7 días.

Para crear un respaldo manual:

```bash
./deploy.sh backup
```

Para restaurar un respaldo:

```bash
./deploy.sh restore backup_20260206_120000.sql.gz
```

## 🐛 Solución de Problemas

### Los servicios no inician

```bash
# Verificar logs
./deploy.sh logs

# Verificar estado
./deploy.sh status

# Verificar que Docker esté corriendo
sudo systemctl status docker
```

### Error de conexión a la base de datos

```bash
# Verificar que el contenedor DB esté corriendo
docker ps | grep db

# Ver logs de la base de datos
./deploy.sh logs db

# Probar conexión manual
docker exec -it innovabigdata-db psql -U postgres -d innovabigdata
```

### El frontend no carga

```bash
# Verificar logs del frontend
./deploy.sh logs frontend

# Verificar que el puerto 80 esté abierto
sudo netstat -tlnp | grep 80

# Verificar configuración de nginx
docker exec -it innovabigdata-frontend nginx -t
```

### La API no responde

```bash
# Verificar logs del backend
./deploy.sh logs backend

# Probar endpoint de health
curl http://localhost:8000/health

# Verificar variables de entorno
docker exec -it innovabigdata-backend env | grep DATABASE_URL
```

## 📝 Notas Importantes

1. **Credenciales por Defecto**: 
   - Usuario: `admin`
   - Contraseña: `Admin2026!`
   - **Cambiar inmediatamente después del primer despliegue**

2. **Variables de Entorno**: 
   - Revisar y actualizar las variables en `docker-compose.yml` antes de producción
   - Especialmente `SECRET_KEY` y contraseñas de base de datos

3. **Certificados SSL**: 
   - Los certificados de Let's Encrypt expiran cada 90 días
   - Configurar renovación automática con cron

4. **Monitoreo**: 
   - Considerar usar CloudWatch para monitorear la instancia EC2
   - Configurar alertas para uso de CPU, memoria y disco

5. **Escalabilidad**: 
   - Para mayor tráfico, considerar usar múltiples instancias con un Load Balancer
   - Usar RDS para la base de datos en lugar de contenedor Docker

## 🔄 Migración a Producción

Antes de poner en producción:

1. ✅ Cambiar todas las contraseñas por defecto
2. ✅ Actualizar `SECRET_KEY` en `docker-compose.yml`
3. ✅ Configurar dominio y SSL
4. ✅ Configurar respaldos automáticos (cron job)
5. ✅ Configurar monitoreo y alertas
6. ✅ Revisar configuración de seguridad (firewall, grupos de seguridad)
7. ✅ Probar restauración de respaldos
8. ✅ Documentar credenciales de forma segura
