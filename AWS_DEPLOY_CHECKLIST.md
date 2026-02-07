# Despliegue en AWS – Checklist y datos necesarios

## ✅ Lo que ya tienes (resumen)

| Dato | Uso |
|------|-----|
| **Cuenta AWS** | ID 471914527766 |
| **IAM** | Usuario `innovabigdata` – acceso consola / CLI |
| **RDS PostgreSQL** | Usuario: `postgres`, contraseña: *(la que compartiste)* – base de datos gestionada |
| **Método** | Docker en EC2 |

**Seguridad:** No subas el archivo `.env` ni las contraseñas al repositorio. En el servidor crea `.env` a mano o con un gestor de secretos.

---

## ❓ Lo que necesito para dejarte todo listo

### 1. Dominio (obligatorio para producción)

- **Nombre del dominio** que usarás para la aplicación (ej: `innovabigdata.com`).
- Se usará para:
  - **CORS** en el backend (orígenes permitidos).
  - **Nginx** (server_name).
  - **SSL** (certificado para ese dominio).

Si por ahora solo vas a usar la **IP de EC2**, puedo dejarte la configuración con IP y luego adaptamos cuando tengas dominio.

---

### 2. RDS – Endpoint y base de datos

- **Endpoint (hostname) de tu instancia RDS**, por ejemplo:  
  `innovabigdata.xxxxxxxxxx.us-east-1.rds.amazonaws.com`  
  Lo ves en: **AWS Console → RDS → Bases de datos → tu instancia → Conectividad y seguridad.**

- Confirmar si **la base de datos `innovabigdata` ya existe** en RDS:
  - Si **sí**: solo necesito el endpoint para la `DATABASE_URL`.
  - Si **no**: te indico el comando (o script) para crearla y ejecutar `init.sql` la primera vez.

---

### 3. EC2 – Acceso y red

- **IP pública de la instancia EC2** (o DNS si ya tienes un nombre apuntando a ella).  
  Para: documentar en los pasos de despliegue y, si aplica, configurar DNS/ALB.

- **Par de claves (.pem)** para SSH:  
  - Que tengas el archivo (ej: `innovabigdata.pem`) y que el grupo de seguridad permita SSH (puerto 22) desde tu IP.

- **Usuario SSH** de la AMI (normalmente `ubuntu` para Ubuntu, `ec2-user` para Amazon Linux).  
  Lo usaré en los comandos de conexión del checklist.

---

### 4. Repositorio del proyecto

- **URL del repositorio Git** (GitHub, GitLab, etc.) desde el que clonarás en EC2, por ejemplo:  
  `https://github.com/tu-org/innovabigdata.git`  
  Si el repo es privado, en EC2 tendrás que configurar SSH key o token para poder hacer `git clone` y `git pull`.

---

## 🔶 Opcional

| Elemento | ¿Necesario? | Notas |
|----------|-------------|--------|
| **S3** | No | La aplicación no usa S3. Opcional solo si quieres guardar respaldos de la BD en un bucket. |
| **Certificado SSL (ACM)** | Recomendado con dominio | Si usas dominio, lo ideal es certificado en ACM y ALB (o Nginx + Certbot en EC2). |
| **Application Load Balancer** | Recomendado con dominio | Para terminar SSL en el ALB y apuntar el dominio al ALB en lugar de a la IP de EC2. |
| **Route 53** | Si usas dominio | Para registrar el dominio o crear la zona y el registro A/CNAME hacia EC2 o ALB. |

---

## 📋 Próximos pasos (cuando me des los datos)

1. **Crear `docker-compose` para RDS**  
   - Sin contenedor `db`; solo backend + frontend.  
   - Backend con `DATABASE_URL` apuntando a tu RDS.

2. **Archivo `.env.example` para AWS**  
   - Con placeholders para: `DATABASE_URL` (RDS), `SECRET_KEY`, `CORS_ORIGINS`, `VERIFIK_*`, etc.  
   - Sin contraseñas reales.

3. **Ajustar `deploy.sh` (o script equivalente)**  
   - Para usar el compose con RDS.  
   - Respaldo de BD: ejecutar `pg_dump` contra RDS desde EC2 (no contra contenedor `db`).

4. **Documentar pasos concretos**  
   - Conectar por SSH a EC2.  
   - Clonar repo, crear `.env`, ejecutar deploy.  
   - Abrir puertos (80, 443, 8000 si aplica) en el grupo de seguridad.  
   - Opcional: dominio, SSL, ALB.

5. **Primera vez en RDS**  
   - Crear base `innovabigdata` si no existe.  
   - Ejecutar `init.sql` (tablas + usuario admin).

---

## Resumen: qué enviarme

Respóndeme con:

1. **Dominio** (o indicar “solo IP por ahora”).
2. **Endpoint RDS** (hostname completo).
3. **¿La base `innovabigdata` ya existe en RDS?** (sí/no).
4. **IP pública de EC2** (o “la configuro después”).
5. **Usuario SSH de la instancia** (ej: `ubuntu`).
6. **URL del repositorio Git** del proyecto.
7. **(Opcional)** ¿Quieres respaldos automáticos a S3? (sí/no).

Con eso preparo los archivos y los pasos exactos para subir el proyecto a tu servidor AWS.
