# RDS con AWS Secrets Manager (contraseña automática)

Si tu RDS está configurado para rotar la contraseña con AWS Secrets Manager, el backend puede leer las credenciales del secret al arrancar y **no tendrás que actualizar el .env** cuando cambie la contraseña.

## 1. Configurar el .env en el servidor

En `/opt/innovabigdata/.env` añade (o descomenta):

```env
# Secret de RDS en Secrets Manager (nombre o ARN)
AWS_RDS_SECRET_NAME=nombre-de-tu-secret-rds
# O usa el ARN completo:
# AWS_RDS_SECRET_ARN=arn:aws:secretsmanager:us-east-2:TU_CUENTA:secret:nombre-del-secret-xxxxx

# Región donde está el secret (por defecto us-east-2)
AWS_REGION=us-east-2
```

Si el secret de RDS no incluye el campo `host` (algunos solo tienen username/password), añade también:

```env
RDS_HOST=proyecto-innova-postgres.xxxx.us-east-2.rds.amazonaws.com
RDS_DB=innovabigdata
```

**No pongas** `RDS_PASSWORD` ni `DATABASE_URL` con contraseña cuando uses Secrets Manager; el backend las tomará del secret.

## 2. Permiso IAM para la instancia EC2

La EC2 debe tener un **rol IAM** que permita leer el secret. Ejemplo de política:

```json
{
  "Version": "2012-1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:us-east-2:TU_CUENTA:secret:nombre-del-secret-*"
    }
  ]
}
```

Pasos en AWS:

1. **IAM → Roles** → Crear rol (o usar uno existente) → tipo **AWS service → EC2**.
2. Adjuntar una política con `secretsmanager:GetSecretValue` sobre el ARN de tu secret de RDS.
3. **EC2 → Instancias** → tu instancia → Acciones → Seguridad → Modificar rol IAM → asignar ese rol.

## 3. Reiniciar el backend

```bash
cd /opt/innovabigdata
sudo docker compose -f docker-compose.rds.yml up -d --force-recreate backend
```

Comprueba los logs:

```bash
sudo docker logs innovabigdata-backend --tail 25
```

Si aparece un error tipo "No se pudo obtener el secret", revisa el nombre/ARN del secret y los permisos IAM. Si no hay error de conexión a BD, el login debería funcionar con la contraseña actual del secret.

## Orden de prioridad del backend

1. Si existe **AWS_RDS_SECRET_ARN** o **AWS_RDS_SECRET_NAME** → obtiene user/password/host (y opcionalmente port, dbname) del secret y construye la URL con `sslmode=require`.
2. Si no → usa **RDS_HOST** + **RDS_PASSWORD** (y RDS_USER, RDS_DB, RDS_PORT) del .env.
3. Si no hay RDS_HOST → usa **DATABASE_URL** del .env.

Así, cuando Secrets Manager rote la contraseña, solo hace falta **reiniciar el contenedor** (o que se reinicie solo) para que tome la nueva contraseña; no hay que editar el .env.
