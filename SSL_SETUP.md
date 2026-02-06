# Configuración SSL para innovabigdata.com

## Opción 1: Usando AWS Application Load Balancer (Recomendado)

Esta es la opción más recomendada para producción en AWS.

### Pasos:

1. **Crear certificado en AWS Certificate Manager (ACM)**
   - Ve a AWS Console > Certificate Manager
   - Solicitar certificado público
   - Agregar dominios: `innovabigdata.com` y `www.innovabigdata.com`
   - Validar mediante DNS (crear registros CNAME en Route 53)

2. **Crear Application Load Balancer**
   - Tipo: Application Load Balancer
   - Esquema: Internet-facing
   - IP: IPv4
   - Listeners:
     - Puerto 443 (HTTPS) con certificado SSL del ACM
     - Puerto 80 (HTTP) redirigiendo a HTTPS

3. **Crear Target Group**
   - Tipo: Instancias
   - Puerto: 80
   - Protocolo: HTTP
   - Health check: `/health` en puerto 8000

4. **Registrar instancia EC2 en el Target Group**

5. **Configurar Route 53**
   - Crear registro A (Alias) apuntando al Load Balancer
   - Para `innovabigdata.com` y `www.innovabigdata.com`

### Ventajas:
- ✅ Certificados gestionados automáticamente por AWS
- ✅ Renovación automática
- ✅ Mejor rendimiento y escalabilidad
- ✅ No requiere configuración en la instancia EC2

---

## Opción 2: Usando Certbot (Let's Encrypt) en EC2

Si prefieres manejar SSL directamente en la instancia EC2.

### Pasos:

1. **Configurar DNS**
   ```bash
   # Asegúrate de que el dominio apunte a la IP pública de EC2
   # Verificar con:
   dig innovabigdata.com
   ```

2. **Instalar Certbot**
   ```bash
   sudo apt update
   sudo apt install -y certbot
   ```

3. **Obtener certificados (modo standalone)**
   ```bash
   # Detener el contenedor frontend temporalmente
   cd /opt/innovabigdata
   ./deploy.sh stop
   
   # Obtener certificados
   sudo certbot certonly --standalone \
     -d innovabigdata.com \
     -d www.innovabigdata.com \
     --email tu-email@ejemplo.com \
     --agree-tos \
     --non-interactive
   ```

4. **Crear directorio para certificados**
   ```bash
   sudo mkdir -p /opt/innovabigdata/ssl
   sudo cp /etc/letsencrypt/live/innovabigdata.com/fullchain.pem /opt/innovabigdata/ssl/
   sudo cp /etc/letsencrypt/live/innovabigdata.com/privkey.pem /opt/innovabigdata/ssl/
   sudo chmod 644 /opt/innovabigdata/ssl/fullchain.pem
   sudo chmod 600 /opt/innovabigdata/ssl/privkey.pem
   ```

5. **Usar docker-compose con SSL**
   ```bash
   # Copiar configuración SSL de nginx
   cp frontend/nginx.conf.ssl frontend/nginx.conf
   
   # Usar docker-compose con SSL
   docker-compose -f docker-compose.ssl.yml up -d --build
   ```

6. **Configurar renovación automática**
   ```bash
   # Crear script de renovación
   sudo nano /opt/innovabigdata/renew-cert.sh
   ```

   Contenido del script:
   ```bash
   #!/bin/bash
   certbot renew --quiet
   cp /etc/letsencrypt/live/innovabigdata.com/fullchain.pem /opt/innovabigdata/ssl/
   cp /etc/letsencrypt/live/innovabigdata.com/privkey.pem /opt/innovabigdata/ssl/
   cd /opt/innovabigdata
   docker-compose -f docker-compose.ssl.yml restart frontend
   ```

   ```bash
   sudo chmod +x /opt/innovabigdata/renew-cert.sh
   
   # Agregar a crontab (renovar cada 12 horas)
   sudo crontab -e
   # Agregar línea:
   0 */12 * * * /opt/innovabigdata/renew-cert.sh >> /var/log/certbot-renew.log 2>&1
   ```

### Notas Importantes:

- Los certificados de Let's Encrypt expiran cada 90 días
- La renovación debe ejecutarse antes de la expiración
- El modo standalone requiere que el puerto 80 esté libre temporalmente
- Considera usar `--webroot` en lugar de `--standalone` si tienes un servidor web corriendo

---

## Verificación SSL

Después de configurar SSL, verifica que funcione correctamente:

```bash
# Verificar certificado
openssl s_client -connect innovabigdata.com:443 -servername innovabigdata.com

# Verificar con curl
curl -I https://innovabigdata.com

# Verificar con navegador
# Visita https://innovabigdata.com y verifica el candado verde
```

## Troubleshooting

### Error: "Port 80 is already in use"
- Detén el contenedor frontend antes de obtener certificados
- O usa el método `--webroot` si tienes nginx corriendo

### Error: "Failed to obtain certificate"
- Verifica que el DNS apunte correctamente a la IP de EC2
- Verifica que el puerto 80 esté abierto en el firewall
- Verifica los grupos de seguridad en AWS

### Certificado expirado
- Renovar manualmente: `sudo certbot renew`
- Verificar renovación automática en crontab
- Reiniciar contenedor después de renovar
