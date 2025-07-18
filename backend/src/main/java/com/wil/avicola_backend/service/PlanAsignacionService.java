package com.wil.avicola_backend.service;

import java.time.LocalDate;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.Lote;
import com.wil.avicola_backend.model.PlanAlimentacion;
import com.wil.avicola_backend.model.PlanAsignacion;
import com.wil.avicola_backend.model.Usuario;
import com.wil.avicola_backend.repository.LoteRepository;
import com.wil.avicola_backend.repository.PlanAlimentacionRepository;
import com.wil.avicola_backend.repository.PlanAsignacionRepository;
import com.wil.avicola_backend.repository.UsuarioRepository;

@Service
@Transactional
public class PlanAsignacionService {
    
    private static final Logger logger = LoggerFactory.getLogger(PlanAsignacionService.class);
    
    @Autowired
    private PlanAsignacionRepository planAsignacionRepository;
    
    @Autowired
    private PlanAlimentacionRepository planAlimentacionRepository;
    
    @Autowired
    private LoteRepository loteRepository;
    
    @Autowired
    private UsuarioRepository usuarioRepository;
    
    /**
     * Crear una nueva asignación de plan a lote y usuario
     */
    public ResponseEntity<PlanAsignacion> createAsignacion(PlanAsignacion asignacionRequest, Long assignedByUserId) {
        try {
            // Validar que el plan existe y está activo
            PlanAlimentacion plan = planAlimentacionRepository.findById(asignacionRequest.getPlanAlimentacion().getId())
                .orElseThrow(() -> new RequestException("No existe el plan de alimentación especificado"));
            
            if (!plan.getActive()) {
                throw new RequestException("El plan de alimentación no está activo");
            }
            
            // Validar que el lote existe
            Lote lote = loteRepository.findById(asignacionRequest.getLote().getId())
                .orElseThrow(() -> new RequestException("No existe el lote especificado"));
            
            // Validar que el usuario asignado existe
            Usuario usuarioAsignado = usuarioRepository.findById(asignacionRequest.getAssignedUser().getId())
                .orElseThrow(() -> new RequestException("No existe el usuario asignado"));
            
            // Validar que el usuario que asigna existe
            Usuario usuarioAsignador = usuarioRepository.findById(assignedByUserId)
                .orElseThrow(() -> new RequestException("No existe el usuario que realiza la asignación"));
            
            // Verificar que no exista una asignación activa del mismo plan para el mismo lote
            if (planAsignacionRepository.existsByLoteIdAndPlanAlimentacionIdAndStatus(
                    lote.getId(), plan.getId(), PlanAsignacion.Status.ACTIVO)) {
                throw new RequestException("Ya existe una asignación activa de este plan para el lote especificado");
            }
            
            // Validar fechas
            if (asignacionRequest.getEndDate() != null && 
                asignacionRequest.getEndDate().isBefore(asignacionRequest.getStartDate())) {
                throw new RequestException("La fecha de fin no puede ser anterior a la fecha de inicio");
            }
            
            // Crear la asignación
            PlanAsignacion nuevaAsignacion = PlanAsignacion.builder()
                .planAlimentacion(plan)
                .lote(lote)
                .assignedUser(usuarioAsignado)
                .assignedByUser(usuarioAsignador)
                .startDate(asignacionRequest.getStartDate())
                .endDate(asignacionRequest.getEndDate())
                .status(PlanAsignacion.Status.ACTIVO)
                .build();
            
            PlanAsignacion asignacionGuardada = planAsignacionRepository.save(nuevaAsignacion);
            
            logger.info("Asignación creada: Plan '{}' asignado al lote '{}' para usuario '{}'", 
                       plan.getName(), lote.getName(), usuarioAsignado.getUsername());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(asignacionGuardada);
            
        } catch (RequestException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Error al crear asignación: {}", e.getMessage());
            throw new RequestException("Error al crear la asignación del plan");
        }
    }
    
    /**
     * Obtener asignaciones activas por usuario
     */
    public ResponseEntity<List<PlanAsignacion>> getAsignacionesByUser(Long userId) {
        try {
            if (!usuarioRepository.existsById(userId)) {
                throw new RequestException("No existe el usuario especificado");
            }
            
            List<PlanAsignacion> asignaciones = planAsignacionRepository
                .findByAssignedUserIdAndStatus(userId, PlanAsignacion.Status.ACTIVO);
            
            return ResponseEntity.ok(asignaciones);
            
        } catch (Exception e) {
            logger.error("Error al obtener asignaciones por usuario: {}", e.getMessage());
            throw new RequestException("Error al obtener las asignaciones del usuario");
        }
    }
    
    /**
     * Obtener asignaciones que deben ejecutarse hoy para un usuario
     */
    public ResponseEntity<List<PlanAsignacion>> getAsignacionesParaHoy(Long userId) {
        try {
            List<PlanAsignacion> asignaciones = planAsignacionRepository
                .findActiveAssignmentsForUser(userId, LocalDate.now());
            
            return ResponseEntity.ok(asignaciones);
            
        } catch (Exception e) {
            logger.error("Error al obtener asignaciones para hoy: {}", e.getMessage());
            throw new RequestException("Error al obtener las asignaciones para hoy");
        }
    }
    
    /**
     * Obtener asignaciones por lote
     */
    public ResponseEntity<List<PlanAsignacion>> getAsignacionesByLote(String loteId) {
        try {
            if (!loteRepository.existsById(loteId)) {
                throw new RequestException("No existe el lote especificado");
            }
            
            List<PlanAsignacion> asignaciones = planAsignacionRepository.findByLoteId(loteId);
            return ResponseEntity.ok(asignaciones);
            
        } catch (Exception e) {
            logger.error("Error al obtener asignaciones por lote: {}", e.getMessage());
            throw new RequestException("Error al obtener las asignaciones del lote");
        }
    }
    
    /**
     * Actualizar el estado de una asignación
     */
    public ResponseEntity<PlanAsignacion> updateAsignacionStatus(Long asignacionId, PlanAsignacion.Status nuevoStatus) {
        try {
            PlanAsignacion asignacion = planAsignacionRepository.findById(asignacionId)
                .orElseThrow(() -> new RequestException("No existe la asignación especificada"));
            
            asignacion.setStatus(nuevoStatus);
            
            // Si se completa, establecer fecha de fin
            if (nuevoStatus == PlanAsignacion.Status.COMPLETADO && asignacion.getEndDate() == null) {
                asignacion.setEndDate(LocalDate.now());
            }
            
            PlanAsignacion asignacionActualizada = planAsignacionRepository.save(asignacion);
            
            logger.info("Estado de asignación actualizado a: {}", nuevoStatus);
            return ResponseEntity.ok(asignacionActualizada);
            
        } catch (Exception e) {
            logger.error("Error al actualizar estado de asignación: {}", e.getMessage());
            throw new RequestException("Error al actualizar el estado de la asignación");
        }
    }
    
    /**
     * Obtener asignaciones con detalles del plan
     */
    public ResponseEntity<List<PlanAsignacion>> getAsignacionesWithPlanDetails(Long userId) {
        try {
            List<PlanAsignacion> asignaciones = planAsignacionRepository
                .findActiveAssignmentsWithPlanDetails(userId);
            
            return ResponseEntity.ok(asignaciones);
            
        } catch (Exception e) {
            logger.error("Error al obtener asignaciones con detalles: {}", e.getMessage());
            throw new RequestException("Error al obtener las asignaciones con detalles");
        }
    }
    
    /**
     * Eliminar una asignación (solo si no tiene ejecuciones)
     */
    public ResponseEntity<Void> deleteAsignacion(Long asignacionId) {
        try {
            PlanAsignacion asignacion = planAsignacionRepository.findById(asignacionId)
                .orElseThrow(() -> new RequestException("No existe la asignación especificada"));
            
            // Verificar que no tenga ejecuciones
            if (asignacion.getEjecuciones() != null && !asignacion.getEjecuciones().isEmpty()) {
                throw new RequestException("No se puede eliminar la asignación porque tiene ejecuciones registradas");
            }
            
            planAsignacionRepository.deleteById(asignacionId);
            
            logger.info("Asignación eliminada: {}", asignacionId);
            return ResponseEntity.ok().build();
            
        } catch (Exception e) {
            logger.error("Error al eliminar asignación: {}", e.getMessage());
            throw new RequestException("Error al eliminar la asignación");
        }
    }
} 