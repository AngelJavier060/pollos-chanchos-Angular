package com.wil.avicola_backend.controller;

import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import com.wil.avicola_backend.model.MovimientoInventarioProducto;

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
import com.wil.avicola_backend.service.PlanAlimentacionServiceSimplificado;
import com.wil.avicola_backend.service.PlanDetalleService;
import com.wil.avicola_backend.service.MaterializacionInventarioService;
import com.wil.avicola_backend.error.RequestException;

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
    private PlanAlimentacionServiceSimplificado planAlimentacionServiceSimplificado;
    
    @Autowired
    private PlanDetalleService planDetalleService;
    
    @Autowired
    private MaterializacionInventarioService materializacionInventarioService;
    
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
    public ResponseEntity<?> createPlan(
            @Valid @RequestBody PlanAlimentacionRequestDto planRequest,
            Principal principal) {
        
        System.out.println("=== ✅ POST /api/plan-alimentacion - CREAR PLAN ===");
        System.out.println("📝 Datos recibidos: " + planRequest);
        System.out.println("📝 Principal: " + (principal != null ? principal.getName() : "null"));
        
        // Usuario hardcodeado para depuración (cambiar en producción)
        Long userId = 1L; 
        
        try {
            ResponseEntity<?> response = planAlimentacionService.createPlanFromDto(planRequest, userId);
            System.out.println("✅ Plan creado exitosamente - Status: " + response.getStatusCode());
            return response;
        } catch (RequestException rex) {
            System.err.println("⚠️ Error de validación creando plan: " + rex.getMessage());
            return ResponseEntity.badRequest().body(java.util.Map.of(
                "success", false,
                "error", rex.getMessage()
            ));
        } catch (Exception e) {
            System.err.println("❌ Error creando plan: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(java.util.Map.of(
                "success", false,
                "error", "Error interno creando plan: " + (e.getMessage() != null ? e.getMessage() : "ver logs")
            ));
        }
    }
    
    /**
     * Actualizar un plan existente - ENDPOINT PRINCIPAL QUE ESTÁ FALLANDO
     */
    @PutMapping("/{planId}")
    public ResponseEntity<?> updatePlan(
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
            ResponseEntity<?> response = planAlimentacionService.updatePlanFromDto(planId, planRequest);
            System.out.println("✅ Plan actualizado exitosamente - Status: " + response.getStatusCode());
            return response;
        } catch (RequestException rex) {
            System.err.println("⚠️ Error de validación actualizando plan: " + rex.getMessage());
            return ResponseEntity.badRequest().body(java.util.Map.of(
                "success", false,
                "error", rex.getMessage()
            ));
        } catch (Exception e) {
            System.err.println("❌ Error actualizando plan: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(java.util.Map.of(
                "success", false,
                "error", "Error interno actualizando plan: " + (e.getMessage() != null ? e.getMessage() : "ver logs")
            ));
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
            // Extraer parámetros del request - robusto ante nulos/strings vacíos
            String loteId = (requestData != null && requestData.get("loteId") != null)
                ? requestData.get("loteId").toString().trim()
                : null; // UUID como string
            Long tipoAlimentoId = null;
            if (requestData.containsKey("tipoAlimentoId") && requestData.get("tipoAlimentoId") != null &&
                !requestData.get("tipoAlimentoId").toString().trim().isEmpty()) {
                tipoAlimentoId = Long.valueOf(requestData.get("tipoAlimentoId").toString());
            }
            
            // Manejar cantidad como String o Number (validar null antes de parsear)
            Object cantidadObj = requestData.get("cantidadKg");
            if (cantidadObj == null) {
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "cantidadKg es requerido"
                ));
            }
            java.math.BigDecimal cantidadKg;
            if (cantidadObj instanceof Number) {
                cantidadKg = java.math.BigDecimal.valueOf(((Number) cantidadObj).doubleValue());
            } else {
                cantidadKg = new java.math.BigDecimal(cantidadObj.toString());
            }
            
            String observaciones = (String) requestData.get("observaciones");
            // Fecha opcional del registro (yyyy-MM-dd)
            java.time.LocalDate fechaRegistro = null;
            if (requestData.containsKey("fecha") && requestData.get("fecha") != null) {
                try {
                    String f = requestData.get("fecha").toString();
                    if (f != null && !f.isBlank()) {
                        fechaRegistro = java.time.LocalDate.parse(f);
                    }
                } catch (Exception ex) {
                    System.err.println("⚠️ Fecha inválida recibida en registrar-consumo: " + requestData.get("fecha"));
                }
            }
            String usuarioRegistro = principal != null ? principal.getName() : "Usuario desconocido";
            
            // productId opcional para descuento dirigido por producto
            Long productId = null;
            if (requestData.containsKey("productId") && requestData.get("productId") != null) {
                try {
                    productId = Long.valueOf(requestData.get("productId").toString());
                } catch (Exception ignore) {}
            }

            // NUEVO: permitir trabajar solo con nombre_producto
            // Si viene nombreProductoId o nombreProducto, RESOLVER siempre productId desde ese nombre
            // (toma prioridad sobre un productId que pueda venir del plan) para garantizar descuento correcto.
            Long nombreProductoId = null;
            String nombreProducto = null;
            try {
                if (requestData.containsKey("nombreProductoId") && requestData.get("nombreProductoId") != null) {
                    nombreProductoId = Long.valueOf(requestData.get("nombreProductoId").toString());
                }
            } catch (Exception ignore) {}
            if (requestData.containsKey("nombreProducto") && requestData.get("nombreProducto") != null) {
                nombreProducto = requestData.get("nombreProducto").toString();
            }
            // Solo resolver por nombre si AÚN no tenemos productId. Si el front ya envía productId,
            // lo respetamos para no cambiar al usuario de producto (p.ej. Maíz ID 14 vs Maiz ID 3).
            if (productId == null && ((nombreProductoId != null) || (nombreProducto != null && !nombreProducto.isBlank()))) {
                try {
                    Long pid = materializacionInventarioService.asegurarProductoEInventarioDesdeNombre(
                        nombreProductoId,
                        nombreProducto,
                        null,
                        usuarioRegistro,
                        "Materialización automática por consumo"
                    );
                    productId = pid; // prioridad solo si antes era null
                    System.out.println("✅ productId resuelto por nombre_producto => " + pid + " (nombre='" + nombreProducto + "')");
                } catch (Exception ex) {
                    System.err.println("❌ No se pudo resolver productId desde nombreProducto: '" + nombreProducto + "' | Causa: " + ex.getMessage());
                    // Fallback: si tenemos tipoAlimentoId, consumir por TIPO para no romper el flujo
                    if (tipoAlimentoId != null) {
                        System.out.println("↩️ Fallback a consumo POR TIPO. tipoAlimentoId=" + tipoAlimentoId);
                        return planAlimentacionServiceSimplificado.registrarConsumoAlimento(
                            loteId, tipoAlimentoId, cantidadKg, usuarioRegistro, observaciones
                        );
                    }
                    // Sin tipo: responder mensaje claro
                    return ResponseEntity.ok(Map.of(
                        "success", false,
                        "error", "Producto no encontrado para '" + nombreProducto + "'. Regístrelo en Configuración > Productos o seleccione un Tipo de Alimento."
                    ));
                }
            }

            if (productId != null) {
                System.out.println("📌 Consumo por PRODUCTO. productId seleccionado = " + productId);
                // ✅ USAR SERVICIO SIMPLIFICADO - RESUELVE EL ERROR 400
                System.out.println("🔧 Usando servicio simplificado para evitar error de sanitización");
                return planAlimentacionServiceSimplificado.registrarConsumoAlimentoPorProducto(
                    loteId, tipoAlimentoId, productId, cantidadKg, usuarioRegistro, observaciones, fechaRegistro
                );
            } else {
                // ✅ USAR SERVICIO SIMPLIFICADO TAMBIÉN PARA TIPO DE ALIMENTO
                System.out.println("🔧 Usando servicio simplificado para registro por tipo");
                return planAlimentacionServiceSimplificado.registrarConsumoAlimento(
                    loteId, tipoAlimentoId, cantidadKg, usuarioRegistro, observaciones, fechaRegistro
                );
            }
            
        } catch (Exception e) {
            System.err.println("❌ Error en endpoint registrar-consumo: " + e.getMessage());
            e.printStackTrace();
            // Nunca devolver 400 aquí para no romper el flujo del frontend
            return ResponseEntity.ok(
                Map.of(
                    "success", false,
                    "error", "Error procesando solicitud: " + e.getMessage()
                )
            );
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
     * Obtener detalle de productos consumidos por lote para un registro específico
     * Filtra por fecha/hora exacta del registro para mostrar SOLO los productos de ese registro
     * @param loteId ID del lote
     * @param fechaHora Fecha y hora del registro (formato ISO: yyyy-MM-ddTHH:mm:ss)
     */
    @GetMapping("/consumos-detalle/lote/{loteId}")
    public ResponseEntity<?> obtenerConsumosDetallePorLote(
            @PathVariable String loteId,
            @RequestParam(required = false) String fechaHora) {
        
        System.out.println("📦 Consultando detalle de consumos para lote: " + loteId + " fechaHora: " + fechaHora);
        
        try {
            var movimientos = planAlimentacionService.obtenerMovimientosPorLote(loteId);
            
            // Parsear fecha/hora si se proporcionó
            java.time.LocalDateTime fechaHoraRegistro = null;
            if (fechaHora != null && !fechaHora.isBlank()) {
                try {
                    // Intentar parsear como ISO datetime
                    fechaHoraRegistro = java.time.LocalDateTime.parse(fechaHora.replace(" ", "T"));
                } catch (Exception e1) {
                    try {
                        // Intentar parsear solo como fecha (agregar hora inicio)
                        fechaHoraRegistro = java.time.LocalDate.parse(fechaHora).atStartOfDay();
                    } catch (Exception e2) {
                        System.err.println("⚠️ No se pudo parsear fechaHora: " + fechaHora);
                    }
                }
            }
            
            // Lista para almacenar movimientos del registro específico
            List<Map<String, Object>> resultado = new java.util.ArrayList<>();
            
            for (var mov : movimientos) {
                if (mov.getTipoMovimiento() != MovimientoInventarioProducto.TipoMovimiento.CONSUMO_LOTE) {
                    continue;
                }
                
                // Si se especificó fechaHora, filtrar por ventana de tiempo (±2 minutos)
                if (fechaHoraRegistro != null && mov.getFechaMovimiento() != null) {
                    java.time.LocalDateTime movFecha = mov.getFechaMovimiento();
                    java.time.LocalDateTime inicio = fechaHoraRegistro.minusMinutes(2);
                    java.time.LocalDateTime fin = fechaHoraRegistro.plusMinutes(2);
                    
                    if (movFecha.isBefore(inicio) || movFecha.isAfter(fin)) {
                        continue; // Fuera de la ventana de tiempo del registro
                    }
                }
                
                String nombreProducto = "Producto desconocido";
                Long productoId = null;
                
                if (mov.getInventarioProducto() != null && mov.getInventarioProducto().getProduct() != null) {
                    nombreProducto = mov.getInventarioProducto().getProduct().getName();
                    productoId = mov.getInventarioProducto().getProduct().getId();
                }
                
                // NO agrupar - cada movimiento es un producto consumido individual
                Map<String, Object> datos = new java.util.HashMap<>();
                datos.put("nombre", nombreProducto);
                datos.put("productoId", productoId);
                datos.put("cantidad", mov.getCantidad().setScale(2, java.math.RoundingMode.HALF_UP).doubleValue());
                datos.put("unidad", "kg");
                resultado.add(datos);
            }
            
            // Ordenar por nombre
            resultado.sort((a, b) -> ((String) a.get("nombre")).compareToIgnoreCase((String) b.get("nombre")));
            
            System.out.println("✅ Productos consumidos encontrados: " + resultado.size());
            resultado.forEach(p -> System.out.println("   - " + p.get("nombre") + ": " + p.get("cantidad") + " kg"));
            
            return ResponseEntity.ok(resultado);
            
        } catch (Exception e) {
            System.err.println("❌ Error obteniendo detalle de consumos: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.ok(new java.util.ArrayList<>()); // Devolver lista vacía en lugar de error
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
