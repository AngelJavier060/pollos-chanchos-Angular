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

import com.wil.avicola_backend.model.PlanAsignacion;
import com.wil.avicola_backend.service.PlanAsignacionService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/plan-asignacion")
public class PlanAsignacionController {
    
    @Autowired
    private PlanAsignacionService planAsignacionService;
    
    /**
     * Crear una nueva asignación de plan (solo administradores)
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PlanAsignacion> createAsignacion(
            @Valid @RequestBody PlanAsignacion asignacionRequest,
            Principal principal) {
        
        Long assignedByUserId = getUserIdFromPrincipal(principal);
        return planAsignacionService.createAsignacion(asignacionRequest, assignedByUserId);
    }
    
    /**
     * Obtener asignaciones activas por usuario
     */
    @GetMapping("/usuario/{userId}")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('USER') and #userId == authentication.principal.id)")
    public ResponseEntity<List<PlanAsignacion>> getAsignacionesByUser(@PathVariable Long userId) {
        return planAsignacionService.getAsignacionesByUser(userId);
    }
    
    /**
     * Obtener mis asignaciones activas (usuario actual)
     */
    @GetMapping("/mis-asignaciones")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<List<PlanAsignacion>> getMisAsignaciones(Principal principal) {
        Long userId = getUserIdFromPrincipal(principal);
        return planAsignacionService.getAsignacionesByUser(userId);
    }
    
    /**
     * Obtener asignaciones que deben ejecutarse hoy para un usuario
     */
    @GetMapping("/usuario/{userId}/hoy")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('USER') and #userId == authentication.principal.id)")
    public ResponseEntity<List<PlanAsignacion>> getAsignacionesParaHoy(@PathVariable Long userId) {
        return planAsignacionService.getAsignacionesParaHoy(userId);
    }
    
    /**
     * Obtener mis asignaciones para hoy
     */
    @GetMapping("/mis-asignaciones/hoy")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<List<PlanAsignacion>> getMisAsignacionesParaHoy(Principal principal) {
        Long userId = getUserIdFromPrincipal(principal);
        return planAsignacionService.getAsignacionesParaHoy(userId);
    }
    
    /**
     * Obtener asignaciones por lote
     */
    @GetMapping("/lote/{loteId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('USER')")
    public ResponseEntity<List<PlanAsignacion>> getAsignacionesByLote(@PathVariable String loteId) {
        return planAsignacionService.getAsignacionesByLote(loteId);
    }
    
    /**
     * Actualizar el estado de una asignación
     */
    @PutMapping("/{asignacionId}/estado")
    @PreAuthorize("hasRole('ADMIN') or hasRole('USER')")
    public ResponseEntity<PlanAsignacion> updateAsignacionStatus(
            @PathVariable Long asignacionId,
            @RequestBody PlanAsignacion.Status nuevoStatus) {
        return planAsignacionService.updateAsignacionStatus(asignacionId, nuevoStatus);
    }
    
    /**
     * Obtener asignaciones con detalles del plan para un usuario
     */
    @GetMapping("/usuario/{userId}/con-detalles")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('USER') and #userId == authentication.principal.id)")
    public ResponseEntity<List<PlanAsignacion>> getAsignacionesWithPlanDetails(@PathVariable Long userId) {
        return planAsignacionService.getAsignacionesWithPlanDetails(userId);
    }
    
    /**
     * Obtener mis asignaciones con detalles del plan
     */
    @GetMapping("/mis-asignaciones/con-detalles")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<List<PlanAsignacion>> getMisAsignacionesWithPlanDetails(Principal principal) {
        Long userId = getUserIdFromPrincipal(principal);
        return planAsignacionService.getAsignacionesWithPlanDetails(userId);
    }
    
    /**
     * Eliminar una asignación (solo administradores)
     */
    @DeleteMapping("/{asignacionId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteAsignacion(@PathVariable Long asignacionId) {
        return planAsignacionService.deleteAsignacion(asignacionId);
    }
    
    /**
     * Método auxiliar para obtener el ID del usuario desde el Principal
     */
    private Long getUserIdFromPrincipal(Principal principal) {
        // TODO: Implementar extracción real del usuario desde el JWT o contexto de seguridad
        return 1L; // Valor por defecto para desarrollo
    }
} 