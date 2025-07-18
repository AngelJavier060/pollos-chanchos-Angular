package com.wil.avicola_backend.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.wil.avicola_backend.dto.PlanDetalleResponseDto;
import com.wil.avicola_backend.model.PlanDetalle;
import com.wil.avicola_backend.service.PlanDetalleService;

@RestController
@RequestMapping("/api/plan-detalle")
public class PlanDetalleController {
    
    @Autowired
    private PlanDetalleService planDetalleService;
    
    /**
     * Endpoint de prueba
     */
    @GetMapping("/test")
    public ResponseEntity<String> testEndpoint() {
        return ResponseEntity.ok("Endpoint de plan detalle funcionando correctamente");
    }
    
    /**
     * Obtener todos los detalles de un plan específico
     */
    @GetMapping("/plan/{planId}")
    // @PreAuthorize("hasRole('ROLE_ADMIN') or hasRole('ROLE_USER')")
    public ResponseEntity<List<PlanDetalleResponseDto>> getDetallesByPlan(@PathVariable Long planId) {
        return planDetalleService.getDetallesByPlan(planId);
    }
    
    /**
     * Obtener un detalle específico
     */
    @GetMapping("/{detalleId}")
    // @PreAuthorize("hasRole('ROLE_ADMIN') or hasRole('ROLE_USER')")
    public ResponseEntity<PlanDetalleResponseDto> getDetalle(@PathVariable Long detalleId) {
        return planDetalleService.getDetalle(detalleId);
    }
    
    /**
     * Agregar nuevo detalle a un plan (solo administradores)
     */
    @PostMapping("/plan/{planId}")
    // @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<PlanDetalleResponseDto> addDetalleToPlan(
            @PathVariable Long planId,
            @RequestBody PlanDetalle detalleRequest,
            Principal principal) {
        
        return planDetalleService.addDetalleToPlan(planId, detalleRequest);
    }
    
    /**
     * Actualizar un detalle existente (solo administradores)
     */
    @PutMapping("/{detalleId}")
    // @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<PlanDetalleResponseDto> updateDetalle(
            @PathVariable Long detalleId,
            @RequestBody PlanDetalle detalleRequest) {
        
        return planDetalleService.updateDetalle(detalleId, detalleRequest);
    }
    
    /**
     * Eliminar un detalle (solo administradores)
     */
    @DeleteMapping("/{detalleId}")
    // @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<Void> deleteDetalle(@PathVariable Long detalleId) {
        return planDetalleService.deleteDetalle(detalleId);
    }
    
    /**
     * Validar si hay solapamiento de rangos en un plan
     */
    @PostMapping("/plan/{planId}/validar-rangos")
    // @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<Boolean> validarRangos(
            @PathVariable Long planId,
            @RequestBody ValidarRangosRequest request) {
        
        return planDetalleService.validarRangos(planId, request.getDayStart(), request.getDayEnd(), request.getExcludeId());
    }
    
    /**
     * Obtener el rango máximo de días de un plan
     */
    @GetMapping("/plan/{planId}/rango-maximo")
    // @PreAuthorize("hasRole('ROLE_ADMIN') or hasRole('ROLE_USER')")
    public ResponseEntity<Integer> getRangoMaximo(@PathVariable Long planId) {
        return planDetalleService.getRangoMaximo(planId);
    }
    
    // DTO para validación de rangos
    public static class ValidarRangosRequest {
        private Integer dayStart;
        private Integer dayEnd;
        private Long excludeId;
        
        // Getters y setters
        public Integer getDayStart() { return dayStart; }
        public void setDayStart(Integer dayStart) { this.dayStart = dayStart; }
        
        public Integer getDayEnd() { return dayEnd; }
        public void setDayEnd(Integer dayEnd) { this.dayEnd = dayEnd; }
        
        public Long getExcludeId() { return excludeId; }
        public void setExcludeId(Long excludeId) { this.excludeId = excludeId; }
    }
}
