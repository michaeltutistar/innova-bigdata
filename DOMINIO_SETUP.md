# Configurar www.innovabigdata.com en EC2

Pasos para servir la aplicación en **www.innovabigdata.com** (y **innovabigdata.com**) con HTTPS.

---

## 1. DNS: apuntar el dominio a la EC2

En el proveedor donde está el dominio (Route 53, Cloudflare, etc.) crea estos registros apuntando a la **IP pública de tu EC2** (ej. 18.222.118.226):

| Tipo | Nombre              | Valor        | TTL  |
|------|---------------------|-------------|------|
| A    | innovabigdata.com   | 18.222.118.226 | 300 |
| A    | www.innovabigdata.com | 18.222.118.226 | 300 |

**Route 53:** Crear registro → Tipo A → Nombre `innovabigdata.com` o `www.innovabigdata.com` → Valor = IP de la EC2.

Espera unos minutos y comprueba:

```bash
dig innovabigdata.com +short
dig www.innovabigdata.com +short
```

Deben devolver la IP de la EC2.

---

## 2. Abrir puertos 80 y 443 en el Security Group de la EC2

En AWS: EC2 → Security Groups → el de tu instancia → Inbound rules:

- **HTTP:** Tipo HTTP, Puerto 80, Origen 0.0.0.0/0
- **HTTPS:** Tipo HTTPS, Puerto 443, Origen 0.0.0.0/0

Guarda los cambios.

---

## 3. Obtener certificado SSL (Let's Encrypt) en la EC2

Conéctate por SSH a la EC2 y ejecuta (sustituye `tu-email@ejemplo.com`):

```bash
# Instalar Certbot (Amazon Linux 2023)
sudo dnf install -y certbot

# Detener solo el frontend para liberar el puerto 80
cd /opt/innovabigdata
sudo docker compose -f docker-compose.rds.yml stop frontend

# Obtener certificado (dominios innovabigdata.com y www.innovabigdata.com)
sudo certbot certonly --standalone \
  -d innovabigdata.com \
  -d www.innovabigdata.com \
  --email tu-email@ejemplo.com \
  --agree-tos \
  --non-interactive

# Crear directorio y copiar certificados
sudo mkdir -p /opt/innovabigdata/ssl
sudo cp /etc/letsencrypt/live/innovabigdata.com/fullchain.pem /opt/innovabigdata/ssl/
sudo cp /etc/letsencrypt/live/innovabigdata.com/privkey.pem /opt/innovabigdata/ssl/
sudo chmod 644 /opt/innovabigdata/ssl/fullchain.pem
sudo chmod 600 /opt/innovabigdata/ssl/privkey.pem
```

---

## 4. CORS y .env

En la EC2, edita el `.env` y añade las URLs del dominio a **CORS_ORIGINS** (separadas por coma, sin espacios):

```bash
sudo nano /opt/innovabigdata/.env
```

Ejemplo:

```bash
CORS_ORIGINS=https://www.innovabigdata.com,https://innovabigdata.com,http://18.222.118.226
```

Guarda y cierra.

---

## 5. Levantar la app con SSL (RDS + HTTPS)

En la EC2, sube los archivos `docker-compose.rds.ssl.yml` y `frontend/nginx.conf.ssl` si no están (o haz `git pull`). Luego:

```bash
cd /opt/innovabigdata

# Recrear backend para que cargue el nuevo CORS_ORIGINS
sudo docker compose -f docker-compose.rds.yml up -d backend

# Levantar con SSL (usa certificados en ./ssl)
export DOCKER_BUILDKIT=0
sudo docker compose -f docker-compose.rds.ssl.yml up -d --build

# Comprobar
sudo docker ps
```

Deberías ver `innovabigdata-frontend` con puertos 80 y 443, y `innovabigdata-backend` en 8000.

---

## 6. Probar

- **https://www.innovabigdata.com**
- **https://innovabigdata.com**
- **http://innovabigdata.com** y **http://www.innovabigdata.com** deben redirigir a HTTPS.

---

## 7. Renovar el certificado (cada ~90 días)

Let's Encrypt caduca en 90 días. Opción recomendada: script y cron.

```bash
sudo nano /opt/innovabigdata/renew-cert.sh
```

Contenido:

```bash
#!/bin/bash
set -e
certbot renew --quiet --deploy-hook "cp /etc/letsencrypt/live/innovabigdata.com/fullchain.pem /opt/innovabigdata/ssl/ && cp /etc/letsencrypt/live/innovabigdata.com/privkey.pem /opt/innovabigdata/ssl/"
cd /opt/innovabigdata
sudo docker compose -f docker-compose.rds.ssl.yml restart frontend
```

```bash
sudo chmod +x /opt/innovabigdata/renew-cert.sh
```

Para que certbot pueda usar el puerto 80 al renovar, conviene usar el plugin **webroot** en lugar de **standalone** (o detener el frontend solo durante la renovación). Alternativa: cron que detenga frontend, renueve y vuelva a levantar:

```bash
# Ejemplo de cron (renovar dos veces al día; certbot solo renueva si falta poco)
sudo crontab -e
# Añadir:
0 3,15 * * * /usr/bin/certbot renew --quiet && cp /etc/letsencrypt/live/innovabigdata.com/*.pem /opt/innovabigdata/ssl/ && cd /opt/innovabigdata && docker compose -f docker-compose.rds.ssl.yml restart frontend >> /var/log/certbot-renew.log 2>&1
```

---

## Resumen de archivos

| Archivo | Uso |
|---------|-----|
| `docker-compose.rds.yml` | Sin SSL (solo HTTP, puerto 80). |
| `docker-compose.rds.ssl.yml` | Con SSL (HTTP → HTTPS, puertos 80 y 443). Requiere `./ssl/fullchain.pem` y `./ssl/privkey.pem`. |
| `frontend/nginx.conf.ssl` | Configuración nginx con HTTPS y proxy `/api` al backend. |

Si algo falla, revisa logs del frontend y del backend:

```bash
sudo docker logs innovabigdata-frontend --tail 50
sudo docker logs innovabigdata-backend --tail 50
```
