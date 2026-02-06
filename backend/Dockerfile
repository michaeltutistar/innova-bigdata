FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código de la aplicación
COPY . .

# Crear directorio para datos
RUN mkdir -p /app/data

# Exponer puerto
EXPOSE 8000

# Comando para ejecutar la aplicación
# Producción: sin --reload
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
