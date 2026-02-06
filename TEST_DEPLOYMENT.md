# Guía Paso a Paso para Probar la Aplicación

Esta guía te ayudará a probar la aplicación web paso a paso, tanto localmente como en AWS EC2.

## 🖥️ Prueba Local (Desarrollo)

### Requisitos Previos

1. **Docker Desktop** instalado y corriendo
2. **Git** instalado
3. **Terminal** (PowerShell en Windows, Terminal en Mac/Linux)

### Paso 1: Verificar Docker

```bash
# Verificar que Docker esté instalado
docker --version

# Verificar que Docker esté corriendo
docker ps
```

Si Docker no está instalado, descárgalo desde: https://www.docker.com/products/docker-desktop

### Paso 2: Clonar/Navegar al Proyecto

```bash
# Si ya tienes el proyecto clonado, navega a él
cd "b:\SISTEMA VOTACIONES\innovabigdataproduccion"

# Si necesitas clonarlo:
# git clone <URL-DEL-REPOSITORIO>
# cd innovabigdata
```

### Paso 3: Verificar Archivos

```bash
# Verificar que existan los archivos necesarios
ls docker-compose.yml
ls deploy.sh
ls backend/Dockerfile
ls frontend/Dockerfile
```

### Paso 4: Construir las Imágenes

```bash
# Construir todas las imágenes Docker
docker-compose build --no-cache
```

Este paso puede tardar varios minutos la primera vez ya que descarga todas las dependencias.

### Paso 5: Iniciar los Servicios

```bash
# Iniciar todos los servicios en segundo plano
docker-compose up -d
```

### Paso 6: Verificar Estado

```bash
# Ver el estado de todos los contenedores
docker-compose ps
```

Deberías ver 3 contenedores corriendo:
- `innovabigdata-backend`
- `innovabigdata-frontend`
- `innovabigdata-db`

### Paso 7: Esperar a que los Servicios Estén Listos

```bash
# Esperar unos segundos para que los servicios inicien
# Luego verificar los logs
docker-compose logs --tail=50
```

### Paso 8: Probar los Endpoints

#### 8.1 Health Check del Backend

```bash
# En PowerShell (Windows)
Invoke-WebRequest -Uri http://localhost:8000/health

# En Bash (Mac/Linux)
curl http://localhost:8000/health
```

Deberías recibir una respuesta JSON con el estado del servicio.

#### 8.2 Documentación de la API

Abre en tu navegador:
```
http://localhost:8000/docs
```

Deberías ver la documentación interactiva de Swagger/OpenAPI.

#### 8.3 Frontend

Abre en tu navegador:
```
http://localhost:80
```

O si el puerto 80 requiere permisos:
```
http://localhost:8080
```
(Si necesitas cambiar el puerto, edita `docker-compose.yml`)

### Paso 9: Probar Login

1. Abre el frontend en el navegador
2. Usa las credenciales por defecto:
   - **Usuario**: `admin`
   - **Contraseña**: `Admin2026!`

### Paso 10: Ver Logs en Tiempo Real

```bash
# Ver todos los logs
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Paso 11: Detener los Servicios

```bash
# Detener todos los servicios
docker-compose down

# Detener y eliminar volúmenes (elimina datos de BD)
docker-compose down -v
```

---

## ☁️ Prueba en AWS EC2

### Paso 1: Conectar a la Instancia EC2

```bash
# Reemplaza <IP-PUBLICA> con la IP de tu instancia
ssh -i innovabigdata.pem ubuntu@<IP-PUBLICA>
```

### Paso 2: Instalar Git y Clonar

```bash
sudo apt update
sudo apt install -y git
git clone <URL-DEL-REPOSITORIO> /opt/innovabigdata
cd /opt/innovabigdata
```

### Paso 3: Instalar Docker

```bash
chmod +x deploy.sh
sudo ./deploy.sh install
```

Este comando instalará Docker y todas las dependencias necesarias.

### Paso 4: Desplegar la Aplicación

```bash
sudo ./deploy.sh deploy
```

Este comando:
- Verifica Docker
- Crea directorios necesarios
- Construye las imágenes
- Inicia todos los servicios

### Paso 5: Verificar el Despliegue

```bash
# Ver estado de servicios
sudo ./deploy.sh status

# Ver logs
sudo ./deploy.sh logs
```

### Paso 6: Acceder a la Aplicación

Desde tu navegador local:

- **Frontend**: `http://<IP-PUBLICA>:80`
- **API Docs**: `http://<IP-PUBLICA>:8000/docs`
- **Health Check**: `http://<IP-PUBLICA>:8000/health`

### Paso 7: Configurar Firewall

```bash
# Permitir puertos necesarios
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS (si usas SSL)
sudo ufw enable
```

### Paso 8: Verificar desde el Navegador

1. Abre `http://<IP-PUBLICA>:80` en tu navegador
2. Deberías ver la página de login
3. Inicia sesión con:
   - Usuario: `admin`
   - Contraseña: `Admin2026!`

---

## 🧪 Script de Prueba Automatizado

He creado un script `test-deployment.sh` que automatiza todas las verificaciones:

```bash
# En Linux/Mac
chmod +x test-deployment.sh
./test-deployment.sh

# En Windows (usando Git Bash o WSL)
bash test-deployment.sh
```

Este script:
1. ✅ Verifica Docker y Docker Compose
2. ✅ Verifica archivos del proyecto
3. ✅ Limpia contenedores anteriores
4. ✅ Construye las imágenes
5. ✅ Inicia los servicios
6. ✅ Verifica que todos los contenedores estén corriendo
7. ✅ Verifica la salud de la base de datos
8. ✅ Prueba los endpoints
9. ✅ Muestra información de acceso

---

## 🔍 Solución de Problemas

### Error: "Port 80 is already in use"

```bash
# Ver qué está usando el puerto 80
# En Windows PowerShell:
netstat -ano | findstr :80

# En Linux/Mac:
sudo lsof -i :80

# Cambiar el puerto en docker-compose.yml
# Cambiar "80:80" por "8080:80"
```

### Error: "Cannot connect to Docker daemon"

```bash
# Verificar que Docker Desktop esté corriendo
# En Windows: Abre Docker Desktop
# En Linux:
sudo systemctl start docker
```

### Los contenedores no inician

```bash
# Ver logs detallados
docker-compose logs

# Verificar recursos del sistema
docker stats

# Reiniciar Docker Desktop (Windows) o servicio Docker (Linux)
```

### La base de datos no conecta

```bash
# Verificar que el contenedor DB esté corriendo
docker ps | grep db

# Ver logs de la base de datos
docker-compose logs db

# Probar conexión manual
docker exec -it innovabigdata-db psql -U postgres -d innovabigdata
```

### El frontend muestra error 502

```bash
# Verificar que el backend esté corriendo
docker-compose ps backend

# Ver logs del backend
docker-compose logs backend

# Verificar que el backend responda
curl http://localhost:8000/health
```

---

## ✅ Checklist de Verificación

- [ ] Docker instalado y corriendo
- [ ] Archivos del proyecto presentes
- [ ] Imágenes Docker construidas sin errores
- [ ] Todos los contenedores están corriendo (3 contenedores)
- [ ] Base de datos responde (`pg_isready`)
- [ ] Backend responde (`/health` endpoint)
- [ ] Frontend carga en el navegador
- [ ] Puedo hacer login con credenciales por defecto
- [ ] La documentación de la API es accesible (`/docs`)

---

## 📝 Notas Importantes

1. **Primera ejecución**: La primera vez que construyas las imágenes puede tardar 10-15 minutos
2. **Puertos**: Asegúrate de que los puertos 80 y 8000 no estén en uso
3. **Memoria**: Docker necesita al menos 2GB de RAM disponible
4. **Credenciales**: Cambia las credenciales por defecto después de la primera prueba
5. **Producción**: No uses estas configuraciones directamente en producción sin revisar seguridad

---

## 🎯 Próximos Pasos

Una vez que la aplicación esté funcionando:

1. ✅ Probar todas las funcionalidades
2. ✅ Verificar integración con Verifik
3. ✅ Configurar dominio y SSL (ver `SSL_SETUP.md`)
4. ✅ Configurar respaldos automáticos
5. ✅ Revisar configuración de seguridad
6. ✅ Cambiar credenciales por defecto
