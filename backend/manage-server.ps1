# Script profesional para gestión del servidor backend
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "restart", "status", "kill-port")]
    [string]$Action,
    
    [int]$Port = 8088
)

function Get-ProcessOnPort {
    param([int]$Port)
    try {
        $netstat = netstat -ano | Select-String ":$Port "
        if ($netstat) {
            $pid = ($netstat -split '\s+')[-1]
            return Get-Process -Id $pid -ErrorAction SilentlyContinue
        }
    } catch {
        return $null
    }
    return $null
}

function Stop-ProcessOnPort {
    param([int]$Port)
    $process = Get-ProcessOnPort -Port $Port
    if ($process) {
        Write-Host "🔄 Deteniendo proceso en puerto $Port (PID: $($process.Id))" -ForegroundColor Yellow
        try {
            Stop-Process -Id $process.Id -Force
            Start-Sleep -Seconds 2
            Write-Host "✅ Proceso detenido exitosamente" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "❌ Error deteniendo proceso: $_" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "ℹ️ No hay proceso ejecutándose en puerto $Port" -ForegroundColor Blue
        return $true
    }
}

function Start-Backend {
    Write-Host "🚀 Iniciando backend..." -ForegroundColor Green
    
    # Verificar si Maven está disponible
    if (-not (Get-Command mvn -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Maven no encontrado. Asegúrate de que Maven esté instalado y en el PATH." -ForegroundColor Red
        exit 1
    }
    
    # Limpiar puerto si está ocupado
    Stop-ProcessOnPort -Port $Port
    
    # Iniciar servidor
    Write-Host "📦 Compilando y ejecutando con Maven..." -ForegroundColor Cyan
    mvn clean spring-boot:run
}

function Get-BackendStatus {
    $process = Get-ProcessOnPort -Port $Port
    if ($process) {
        Write-Host "🟢 Backend ejecutándose:" -ForegroundColor Green
        Write-Host "   - Puerto: $Port" -ForegroundColor White
        Write-Host "   - PID: $($process.Id)" -ForegroundColor White
        Write-Host "   - Proceso: $($process.ProcessName)" -ForegroundColor White
        Write-Host "   - Tiempo: $([math]::Round((Get-Date) - $process.StartTime).TotalMinutes, 1) minutos" -ForegroundColor White
        Write-Host "   - URL: http://localhost:$Port" -ForegroundColor Cyan
    } else {
        Write-Host "🔴 Backend no está ejecutándose en puerto $Port" -ForegroundColor Red
    }
}

# Ejecutar acción solicitada
switch ($Action) {
    "start" {
        Start-Backend
    }
    "stop" {
        if (Stop-ProcessOnPort -Port $Port) {
            Write-Host "🛑 Backend detenido" -ForegroundColor Yellow
        }
    }
    "restart" {
        Write-Host "🔄 Reiniciando backend..." -ForegroundColor Yellow
        Stop-ProcessOnPort -Port $Port
        Start-Sleep -Seconds 3
        Start-Backend
    }
    "status" {
        Get-BackendStatus
    }
    "kill-port" {
        Stop-ProcessOnPort -Port $Port
    }
}
