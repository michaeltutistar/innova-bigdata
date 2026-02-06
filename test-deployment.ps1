# Script de Prueba para Despliegue Local en Windows PowerShell
# Este script verifica y prueba la aplicación paso a paso

$ErrorActionPreference = "Stop"

function Print-Step {
    param([string]$Message)
    Write-Host "[PASO] $Message" -ForegroundColor Blue
}

function Print-Success {
    param([string]$Message)
    Write-Host "[✓] $Message" -ForegroundColor Green
}

function Print-Error {
    param([string]$Message)
    Write-Host "[✗] $Message" -ForegroundColor Red
}

function Print-Warning {
    param([string]$Message)
    Write-Host "[!] $Message" -ForegroundColor Yellow
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Prueba de Despliegue - innovabigdata" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Verificar Docker
Print-Step "1. Verificando Docker..."
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Print-Success "Docker instalado: $dockerVersion"
    } else {
        throw "Docker no está disponible"
    }
} catch {
    Print-Error "Docker no está instalado o no está corriendo"
    Write-Host "Por favor, instala Docker Desktop desde: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Paso 2: Verificar Docker Compose
Print-Step "2. Verificando Docker Compose..."
try {
    $composeVersion = docker-compose --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Print-Success "Docker Compose instalado: $composeVersion"
        $composeCmd = "docker-compose"
    } else {
        # Intentar con docker compose (plugin)
        $composeVersion = docker compose version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Print-Success "Docker Compose (plugin) instalado: $composeVersion"
            $composeCmd = "docker compose"
        } else {
            throw "Docker Compose no disponible"
        }
    }
} catch {
    Print-Error "Docker Compose no está instalado"
    exit 1
}

# Paso 3: Verificar archivos del proyecto
Print-Step "3. Verificando archivos del proyecto..."

$requiredFiles = @(
    "docker-compose.yml",
    "deploy.sh",
    "backend\Dockerfile",
    "backend\main.py",
    "backend\requirements.txt",
    "frontend\Dockerfile",
    "frontend\nginx.conf",
    "init.sql"
)

$missingFiles = 0
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Print-Success "Archivo encontrado: $file"
    } else {
        Print-Error "Archivo faltante: $file"
        $missingFiles++
    }
}

if ($missingFiles -gt 0) {
    Print-Error "Faltan $missingFiles archivos requeridos"
    exit 1
}

# Paso 4: Verificar que no haya contenedores corriendo
Print-Step "4. Verificando contenedores existentes..."
$existingContainers = docker ps -a --filter "name=innovabigdata" --format "{{.Names}}" 2>&1
if ($existingContainers -and $existingContainers.Count -gt 0) {
    Print-Warning "Hay contenedores existentes. Limpiando..."
    Invoke-Expression "$composeCmd down" 2>&1 | Out-Null
    Print-Success "Contenedores limpiados"
} else {
    Print-Success "No hay contenedores existentes"
}

# Paso 5: Construir imágenes
Print-Step "5. Construyendo imágenes Docker..."
Write-Host "Esto puede tardar varios minutos la primera vez..." -ForegroundColor Yellow
try {
    Invoke-Expression "$composeCmd build --no-cache"
    if ($LASTEXITCODE -eq 0) {
        Print-Success "Imágenes construidas correctamente"
    } else {
        throw "Error al construir imágenes"
    }
} catch {
    Print-Error "Error al construir imágenes"
    Write-Host "Revisa los errores arriba" -ForegroundColor Red
    exit 1
}

# Paso 6: Iniciar servicios
Print-Step "6. Iniciando servicios..."
try {
    Invoke-Expression "$composeCmd up -d"
    if ($LASTEXITCODE -eq 0) {
        Print-Success "Servicios iniciados"
    } else {
        throw "Error al iniciar servicios"
    }
} catch {
    Print-Error "Error al iniciar servicios"
    exit 1
}

# Paso 7: Esperar a que los servicios estén listos
Print-Step "7. Esperando a que los servicios estén listos..."
Write-Host "Esperando 15 segundos..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Paso 8: Verificar estado de contenedores
Print-Step "8. Verificando estado de contenedores..."
Invoke-Expression "$composeCmd ps"

# Verificar que todos los contenedores estén corriendo
$runningContainers = docker ps --filter "name=innovabigdata" --format "{{.Names}}" 2>&1
$containerCount = ($runningContainers | Measure-Object -Line).Lines
if ($containerCount -lt 3) {
    Print-Error "No todos los contenedores están corriendo (esperados: 3, encontrados: $containerCount)"
    Print-Step "Revisando logs..."
    Invoke-Expression "$composeCmd logs --tail=50"
    exit 1
}

Print-Success "Todos los contenedores están corriendo"

# Paso 9: Verificar salud de la base de datos
Print-Step "9. Verificando salud de la base de datos..."
Start-Sleep -Seconds 5
try {
    docker exec innovabigdata-db pg_isready -U postgres -d innovabigdata 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Print-Success "Base de datos está lista"
    } else {
        Print-Warning "Base de datos puede no estar lista aún"
    }
} catch {
    Print-Warning "No se pudo verificar la base de datos (puede necesitar más tiempo)"
}

# Paso 10: Verificar endpoint de health
Print-Step "10. Verificando endpoint de health..."
Start-Sleep -Seconds 5
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Print-Success "Endpoint /health responde correctamente"
        Write-Host $response.Content
    }
} catch {
    Print-Warning "Endpoint /health no responde aún (puede necesitar más tiempo)"
    Write-Host "Intenta acceder manualmente a: http://localhost:8000/health" -ForegroundColor Yellow
}

# Paso 11: Verificar frontend
Print-Step "11. Verificando frontend..."
Start-Sleep -Seconds 5
try {
    $response = Invoke-WebRequest -Uri "http://localhost:80" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Print-Success "Frontend responde correctamente"
    }
} catch {
    Print-Warning "Frontend no responde aún (puede necesitar más tiempo)"
    Write-Host "Intenta acceder manualmente a: http://localhost:80" -ForegroundColor Yellow
    Write-Host "Nota: En Windows, el puerto 80 puede requerir permisos de administrador" -ForegroundColor Yellow
    Write-Host "Si hay problemas, cambia el puerto en docker-compose.yml a 8080:80" -ForegroundColor Yellow
}

# Paso 12: Mostrar información de acceso
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Aplicación Desplegada" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend:    http://localhost:80" -ForegroundColor Green
Write-Host "API Docs:   http://localhost:8000/docs" -ForegroundColor Green
Write-Host "Health:     http://localhost:8000/health" -ForegroundColor Green
Write-Host ""
Write-Host "Credenciales por defecto:" -ForegroundColor Yellow
Write-Host "  Usuario: admin" -ForegroundColor White
Write-Host "  Contraseña: Admin2026!" -ForegroundColor White
Write-Host ""
Write-Host "Comandos útiles:" -ForegroundColor Cyan
Write-Host "  Ver logs:        docker-compose logs -f" -ForegroundColor White
Write-Host "  Ver estado:      docker-compose ps" -ForegroundColor White
Write-Host "  Detener:         docker-compose down" -ForegroundColor White
Write-Host "  Reiniciar:       docker-compose restart" -ForegroundColor White
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan

# Paso 13: Mostrar logs recientes
Print-Step "12. Mostrando logs recientes (últimas 20 líneas)..."
Write-Host ""
Invoke-Expression "$composeCmd logs --tail=20"

Write-Host ""
Print-Success "Prueba de despliegue completada"
Write-Host ""
Print-Warning "Nota: Si algún servicio no responde, espera unos segundos más y verifica los logs con: docker-compose logs"
Write-Host ""
Write-Host "Para abrir la aplicación en el navegador:" -ForegroundColor Cyan
Write-Host "  Start-Process 'http://localhost:80'" -ForegroundColor White
