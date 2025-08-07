package com.wil.avicola_backend.controller;

import java.security.Principal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.wil.avicola_backend.dto.PlanAlimentacionRequestDto;
import com.wil.avicola_backend.dto.PlanAlimentacionUpdateDto;
import com.wil.avicola_backend.dto.PlanAlimentacionResponseDto;
import com.wil.avicola_backend.dto.PlanDetalleRequestDto;
import com.wil.avicola_backend.dto.PlanDetalleResponseDto;
import com.wil.avicola_backend.model.PlanAlimentacion;
import com.wil.avicola_backend.model.PlanDetalle;
import com.wil.avicola_backend.service.PlanAlimentacionService;
import com.wil.avicola_backend.service.PlanDetalleService;

import jakarta.validation.Valid;

/**
 * Controlador REST para la gestión de Planes de Alimentación
 * 
 * ESTE ES EL ÚNICO CONTROLADOR VÁLIDO PARA PLAN-ALIMENTACION
 * (Se eliminó el legacy PlanAlimentController que causaba conflictos)
 */
@RestController
@RequestMapping("/api/plan-alimentacion")
public class PlanAlimentacionController {
    
    @Autowired
    private PlanAlimentacionService planAlimentacionService;
    
    @Autowired
    private PlanDetalleService planDetalleService;
    
    /**
     * Endpoint de prueba sin autenticación para debuggear
     */
    @GetMapping("/test")
    public ResponseEntity<String> testEndpoint() {
        System.out.println("🟢 TEST ENDPOINT - Plan alimentación funcionando");
        return ResponseEntity.ok("Endpoint de prueba funcionando correctamente");
    }
    
    /**
     * Endpoint de diagnóstico para verificar configuración de seguridad
     */
    @GetMapping("/debug/security")
    public ResponseEntity<String> debugSecurity() {
        System.out.println("=== 🔍 DEBUG SECURITY CONFIG ===");
        System.out.println("Timestamp: " + java.time.LocalDateTime.now());
        System.out.println("Contexto seguridad: " + org.springframework.security.core.context.SecurityContextHolder.getContext());
        System.out.println("Autenticación: " + org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication());
        System.out.println("Usuario: " + (org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication() != null ? 
            org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName() : "null"));
        
        return ResponseEntity.ok("Debug security - Check logs");
    }
    
    /**
     * Endpoint de prueba PUT para diagnosticar el problema 403
     */
    @PutMapping("/test/{id}")
    public ResponseEntity<String> testPutEndpoint(@PathVariable Long id, @RequestBody String data) {
        System.out.println("=== DEBUG TEST PUT ===");
        System.out.println("ID recibido: " + id);
        System.out.println("Datos recibidos: " + data);
        System.out.println("Método PUT funcionando correctamente");
        return ResponseEntity.ok("PUT funcionando - ID: " + id + ", Data: " + data);
    }
    
    /**
     * ✅ NUEVO: Obtener TODAS las etapas de TODOS los planes para vista general
     */
    @GetMapping("/etapas/vista-general")
    public ResponseEntity<List<PlanDetalleResponseDto>> getVistaGeneralEtapas() {
        System.out.println("🔍 GET /api/plan-alimentacion/etapas/vista-general - Vista general de todas las etapas");
        return planDetalleService.getAllEtapasFromAllPlanes();
    }
    
    /**
     * ✅ NUEVO: Obtener estadísticas generales de etapas
     */
    @GetMapping("/etapas/estadisticas")
    public ResponseEntity<Map<String, Object>> getEstadisticasEtapas() {
        System.out.println("📊 GET /api/plan-alimentacion/etapas/estadisticas - Estadísticas generales");
        return planDetalleService.getEtapasEstadisticas();
    }
    
    /**
     * Obtener todos los planes de alimentación activos
     */
    @GetMapping
    public ResponseEntity<List<PlanAlimentacionResponseDto>> getAllPlanes() {
        System.out.println("🔍 GET /api/plan-alimentacion - Obteniendo todos los planes");
        return planAlimentacionService.getAllPlanes();
    }
    
    /**
     * TEMPORAL: Obtener TODOS los planes (incluyendo inactivos) para debugging
     */
    @GetMapping("/all-including-inactive")
    public ResponseEntity<List<PlanAlimentacionResponseDto>> getAllPlanesIncludingInactive() {
        System.out.println("🔍 GET /api/plan-alimentacion/all-including-inactive");
        return planAlimentacionService.getAllPlanesIncludingInactive();
    }
    
    /**
     * Obtener planes por animal específico
     */
    @GetMapping("/animal/{animalId}")
    public ResponseEntity<List<PlanAlimentacion>> getPlanesByAnimal(@PathVariable Long animalId) {
        System.out.println("🔍 GET /api/plan-alimentacion/animal/" + animalId);
        return planAlimentacionService.getPlanesByAnimal(animalId);
    }
    
    /**
     * Obtener un plan específico con sus detalles
     */
    @GetMapping("/{planId}")
    public ResponseEntity<PlanAlimentacion> getPlanWithDetails(@PathVariable Long planId) {
        System.out.println("🔍 GET /api/plan-alimentacion/" + planId);
        return planAlimentacionService.getPlanWithDetails(planId);
    }
    
    /**
     * Crear un nuevo plan de alimentación
     */
    @PostMapping
    public ResponseEntity<PlanAlimentacion> createPlan(
            @Valid @RequestBody PlanAlimentacionRequestDto planRequest,
            Principal principal) {
        
        System.out.println("=== ✅ POST /api/plan-alimentacion - CREAR PLAN ===");
        System.out.println("📝 Datos recibidos: " + planRequest);
        System.out.println("📝 Principal: " + (principal != null ? principal.getName() : "null"));
        
        // Usuario hardcodeado para depuración (cambiar en producción)
        Long userId = 1L; 
        
        try {
            ResponseEntity<PlanAlimentacion> response = planAlimentacionService.createPlanFromDto(planRequest, userId);
            System.out.println("✅ Plan creado exitosamente - Status: " + response.getStatusCode());
            return response;
        } catch (Exception e) {
            System.err.println("❌ Error creando plan: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
    
    /**
     * Actualizar un plan existente - ENDPOINT PRINCIPAL QUE ESTÁ FALLANDO
     */
    @PutMapping("/{planId}")
    public ResponseEntity<PlanAlimentacionResponseDto> updatePlan(
            @PathVariable Long planId,
            @Valid @RequestBody PlanAlimentacionUpdateDto planRequest) {
        
        System.out.println("=== 🔄 PUT /api/plan-alimentacion/" + planId + " - ACTUALIZAR PLAN ===");
        System.out.println("📝 Plan ID: " + planId);
        System.out.println("📝 Datos recibidos: " + planRequest);
        System.out.println("📝 Thread: " + Thread.currentThread().getName());
        System.out.println("📝 Timestamp: " + java.time.LocalDateTime.now());
        
        // Verificar contexto de seguridad (debe ser null para rutas públicas)
        var authContext = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        System.out.println("📝 Contexto autenticación: " + (authContext != null ? authContext.getClass().getSimpleName() : "NULL"));
        
        try {
            ResponseEntity<PlanAlimentacionResponseDto> response = planAlimentacionService.updatePlanFromDto(planId, planRequest);
            System.out.println("✅ Plan actualizado exitosamente - Status: " + response.getStatusCode());
            return response;
        } catch (Exception e) {
            System.err.println("❌ Error actualizando plan: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
    
    /**
     * Desactivar un plan
     */
    @DeleteMapping("/{planId}")
    public ResponseEntity<Void> deactivatePlan(@PathVariable Long planId) {
        System.out.println("🗑️ DELETE /api/plan-alimentacion/" + planId + " - Desactivar plan");
        return planAlimentacionService.deactivatePlan(planId);
    }
    
    /**
     * Eliminar permanentemente un plan (hard delete) - SOLO PARA DEBUG
     */
    @DeleteMapping("/{planId}/hard")
    public ResponseEntity<Void> hardDeletePlan(@PathVariable Long planId) {
        System.out.println("🗑️ DELETE /api/plan-alimentacion/" + planId + "/hard - Eliminar permanentemente");
        return planAlimentacionService.hardDeletePlan(planId);
    }
    
    // ========== ENDPOINTS PARA DETALLES DEL PLAN ==========
    
    /**
     * Obtener detalles de un plan - CORREGIDO PARA EVITAR ERRORES DE SERIALIZACIÓN
     */
    @GetMapping("/{planId}/detalles")
    public ResponseEntity<List<PlanDetalleResponseDto>> getDetallesByPlan(@PathVariable Long planId) {
        System.out.println("=== 🔍 GET DETALLES DEBUG ===");
        System.out.println("Plan ID: " + planId);
        System.out.println("Timestamp: " + java.time.LocalDateTime.now());
        System.out.println("Contexto seguridad: " + org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication());
        System.out.println("Thread: " + Thread.currentThread().getName());
        
        try {
            ResponseEntity<List<PlanDetalleResponseDto>> response = planDetalleService.getDetallesByPlan(planId);
            System.out.println("✅ Detalles obtenidos exitosamente. Cantidad: " + 
                (response.getBody() != null ? response.getBody().size() : 0));
            return response;
        } catch (Exception e) {
            System.err.println("❌ Error en getDetallesByPlan: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
    
    /**
     * TEST: Endpoint simple para verificar que la ruta de detalles funciona
     */
    @GetMapping("/{planId}/detalles/test")
    public ResponseEntity<String> testDetalles(@PathVariable Long planId) {
        System.out.println("🧪 TEST DETALLES - Plan ID: " + planId);
        return ResponseEntity.ok("Test detalles funcionando para plan " + planId);
    }
    
    /**
     * Agregar detalle a un plan
     */
    @PostMapping("/{planId}/detalles")
    public ResponseEntity<PlanDetalleResponseDto> addDetalleToPlan(
            @PathVariable Long planId,
            @Valid @RequestBody PlanDetalleRequestDto detalleRequest) {
        System.out.println("➕ POST /api/plan-alimentacion/" + planId + "/detalles - HABILITADO");
        System.out.println("📝 Datos recibidos: " + detalleRequest);
        
        // Convertir DTO a entidad
        PlanDetalle planDetalle = detalleRequest.toEntity();
        
        return planDetalleService.addDetalleToPlan(planId, planDetalle);
    }
    
    /**
     * Actualizar un detalle del plan
     */
    @PutMapping("/{planId}/detalles/{detalleId}")
    public ResponseEntity<PlanDetalleResponseDto> updateDetalle(
            @PathVariable Long planId,
            @PathVariable Long detalleId,
            @Valid @RequestBody PlanDetalleRequestDto detalleRequest) {
        System.out.println("🔄 PUT /api/plan-alimentacion/" + planId + "/detalles/" + detalleId + " - HABILITADO");
        System.out.println("📝 Datos recibidos: " + detalleRequest);
        
        // Convertir DTO a entidad
        PlanDetalle planDetalle = detalleRequest.toEntity();
        
        // Usar el método del servicio que devuelve PlanDetalleResponseDto
        return planDetalleService.updateDetalle(detalleId, planDetalle);
    }
    
    /**
     * Eliminar un detalle del plan
     */
    @DeleteMapping("/{planId}/detalles/{detalleId}")
    public ResponseEntity<Void> removeDetalleFromPlan(
            @PathVariable Long planId,
            @PathVariable Long detalleId) {
        System.out.println("🗑️ DELETE /api/plan-alimentacion/" + planId + "/detalles/" + detalleId + " - HABILITADO");
        return planDetalleService.removeDetalleFromPlan(planId, detalleId);
    }
    
    // ========== ENDPOINTS PARA CONSULTA DE ALIMENTACIÓN DIARIA ==========
    
    /**
     * Obtener qué productos debe consumir un lote en una fecha específica
     */
    @GetMapping("/asignacion/{asignacionId}/productos-dia")
    public ResponseEntity<List<PlanDetalle>> getProductosParaDia(
            @PathVariable Long asignacionId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        
        System.out.println("📅 GET productos para fecha: " + fecha + ", asignación: " + asignacionId);
        List<PlanDetalle> productos = planAlimentacionService.getProductosParaDia(asignacionId, fecha);
        return ResponseEntity.ok(productos);
    }
    
    /**
     * Obtener productos para hoy
     */
    @GetMapping("/asignacion/{asignacionId}/productos-hoy")
    public ResponseEntity<List<PlanDetalle>> getProductosParaHoy(@PathVariable Long asignacionId) {
        System.out.println("📅 GET productos para HOY, asignación: " + asignacionId);
        List<PlanDetalle> productos = planAlimentacionService.getProductosParaDia(asignacionId, LocalDate.now());
        return ResponseEntity.ok(productos);
    }
    
    /**
     * Validar si un rango de días es válido para un plan
     */
    @GetMapping("/{planId}/validar-rango")
    public ResponseEntity<Boolean> validarRango(
            @PathVariable Long planId,
            @RequestParam Integer dayStart,
            @RequestParam Integer dayEnd,
            @RequestParam(required = false) Long animalId,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Long excludeId) {
        System.out.println("🔍 Validando rango " + dayStart + "-" + dayEnd + " para plan " + planId);
        return planDetalleService.validarRangos(planId, dayStart, dayEnd, excludeId);
    }
    
    /**
     * Obtener información de solapamientos para un rango
     */
    @GetMapping("/{planId}/info-solapamiento")
    public ResponseEntity<String> infoSolapamiento(
            @PathVariable Long planId,
            @RequestParam Integer dayStart,
            @RequestParam Integer dayEnd) {
        System.out.println("📊 Información de solapamiento para rango " + dayStart + "-" + dayEnd + " en plan " + planId);
        
        // Este endpoint puede devolver información detallada sobre qué etapas existentes podrían solaparse
        try {
            return ResponseEntity.ok("Información de solapamiento procesada");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al procesar información de solapamiento");
        }
    }
    
    /**
     * Endpoint de diagnóstico específico para el error 403 en PUT
     */
    @PutMapping("/diagnose/{id}")
    public ResponseEntity<String> diagnosePutIssue(@PathVariable Long id, @RequestBody String rawData) {
        System.out.println("=== 🩺 DIAGNÓSTICO PUT ISSUE ===");
        System.out.println("ID: " + id);
        System.out.println("Raw data: " + rawData);
        System.out.println("Autenticación actual: " + org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication());
        System.out.println("Usuario: " + (org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication() != null ? 
            org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName() : "null"));
        System.out.println("Roles: " + (org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication() != null ? 
            org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getAuthorities() : "null"));
        
        return ResponseEntity.ok("Diagnóstico exitoso para ID: " + id + " - Data: " + rawData);
    }
    
    /**
     * Registrar consumo de alimento con deducción automática de inventario
     * 
     * @param requestData Datos del consumo
     * @param principal Usuario autenticado
     * @return ResponseEntity con resultado
     */
    @PostMapping("/registrar-consumo")
    public ResponseEntity<?> registrarConsumoAlimento(
            @RequestBody Map<String, Object> requestData, 
            Principal principal) {
        
        System.out.println("🍽️ POST /api/plan-alimentacion/registrar-consumo");
        System.out.println("   - Request data: " + requestData);
        System.out.println("   - Usuario: " + (principal != null ? principal.getName() : "Anónimo"));
        
        try {
            // Extraer parámetros del request - CORREGIDO para manejar UUID
            String loteId = requestData.get("loteId").toString(); // UUID como string
            Long tipoAlimentoId = Long.valueOf(requestData.get("tipoAlimentoId").toString());
            
            // Manejar cantidad como String o Number
            Object cantidadObj = requestData.get("cantidadKg");
            java.math.BigDecimal cantidadKg;
            if (cantidadObj instanceof Number) {
                cantidadKg = java.math.BigDecimal.valueOf(((Number) cantidadObj).doubleValue());
            } else {
                cantidadKg = new java.math.BigDecimal(cantidadObj.toString());
            }
            
            String observaciones = (String) requestData.get("observaciones");
            String usuarioRegistro = principal != null ? principal.getName() : "Usuario desconocido";
            
            // Llamar al servicio
            return planAlimentacionService.registrarConsumoAlimento(
                loteId, tipoAlimentoId, cantidadKg, usuarioRegistro, observaciones
            );
            
        } catch (Exception e) {
            System.err.println("❌ Error en endpoint registrar-consumo: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                .body(Map.of(
                    "success", false,
                    "error", "Error procesando solicitud: " + e.getMessage()
                ));
        }
    }
    
    // ============================================================================
    // ENDPOINTS DE INVENTARIO - SISTEMA PROFESIONAL DE CONTROL DE STOCK
    // ============================================================================
    
    /**
     * Obtener todos los inventarios disponibles con stock actual
     */
    @GetMapping("/inventarios")
    public ResponseEntity<?> obtenerInventarios() {
        System.out.println("📦 Consultando inventarios disponibles...");
        
        try {
            var inventarios = planAlimentacionService.obtenerTodosLosInventarios();
            System.out.println("✅ Inventarios obtenidos: " + inventarios.size());
            return ResponseEntity.ok(inventarios);
            
        } catch (Exception e) {
            System.err.println("❌ Error obteniendo inventarios: " + e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Error obteniendo inventarios: " + e.getMessage()));
        }
    }
    
    /**
     * Obtener historial de movimientos de inventario por lote
     */
    @GetMapping("/movimientos/lote/{loteId}")
    public ResponseEntity<?> obtenerMovimientosPorLote(@PathVariable String loteId) {
        System.out.println("📋 Consultando movimientos para lote: " + loteId);
        
        try {
            var movimientos = planAlimentacionService.obtenerMovimientosPorLote(loteId);
            System.out.println("✅ Movimientos obtenidos: " + movimientos.size());
            return ResponseEntity.ok(movimientos);
            
        } catch (Exception e) {
            System.err.println("❌ Error obteniendo movimientos: " + e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Error obteniendo movimientos: " + e.getMessage()));
        }
    }
    
    /**
     * Obtener total consumido por lote y tipo de alimento
     */
    @GetMapping("/consumo-total/lote/{loteId}/alimento/{tipoAlimentoId}")
    public ResponseEntity<?> obtenerTotalConsumidoPorLote(
            @PathVariable String loteId, 
            @PathVariable Long tipoAlimentoId) {
        
        System.out.println("🔍 Consultando consumo total - Lote: " + loteId + ", Alimento: " + tipoAlimentoId);
        
        try {
            Double totalConsumido = planAlimentacionService.obtenerTotalConsumidoPorLote(loteId, tipoAlimentoId);
            System.out.println("✅ Total consumido: " + totalConsumido + " kg");
            return ResponseEntity.ok(totalConsumido);
            
        } catch (Exception e) {
            System.err.println("❌ Error obteniendo total consumido: " + e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Error obteniendo total consumido: " + e.getMessage()));
        }
    }
    
    /**
     * Obtener inventarios con stock bajo (alertas)
     */
    @GetMapping("/inventarios/stock-bajo")
    public ResponseEntity<?> obtenerInventariosStockBajo() {
        System.out.println("⚠️ Consultando inventarios con stock bajo...");
        
        try {
            var stockBajo = planAlimentacionService.obtenerInventariosStockBajo();
            System.out.println("✅ Inventarios con stock bajo: " + stockBajo.size());
            return ResponseEntity.ok(stockBajo);
            
        } catch (Exception e) {
            System.err.println("❌ Error obteniendo stock bajo: " + e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Error obteniendo stock bajo: " + e.getMessage()));
        }
    }
    
    /**
     * Crear datos de ejemplo para el inventario (TEMPORAL - SOLO PARA DEMOSTRACIÓN)
     */
    @PostMapping("/inventarios/crear-datos-ejemplo")
    public ResponseEntity<?> crearDatosEjemplo() {
        System.out.println("🎯 Creando datos de ejemplo para inventario...");
        
        try {
            var resultado = planAlimentacionService.crearDatosEjemploInventario();
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Datos de ejemplo creados exitosamente",
                "inventarios_creados", resultado
            ));
            
        } catch (Exception e) {
            System.err.println("❌ Error creando datos de ejemplo: " + e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Error creando datos de ejemplo: " + e.getMessage()));
        }
    }
}
