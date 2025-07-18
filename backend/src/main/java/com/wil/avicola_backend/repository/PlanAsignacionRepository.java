package com.wil.avicola_backend.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.model.PlanAsignacion;

@Repository
public interface PlanAsignacionRepository extends CrudRepository<PlanAsignacion, Long> {
    
    // Buscar asignaciones activas por usuario
    List<PlanAsignacion> findByAssignedUserIdAndStatus(Long userId, PlanAsignacion.Status status);
    
    // Buscar asignaciones por lote
    List<PlanAsignacion> findByLoteId(String loteId);
    
    // Buscar asignaciones activas por lote
    List<PlanAsignacion> findByLoteIdAndStatus(String loteId, PlanAsignacion.Status status);
    
    // Buscar asignaciones por plan
    List<PlanAsignacion> findByPlanAlimentacionId(Long planId);
    
    // Buscar asignaciones por plan y estado
    List<PlanAsignacion> findByPlanAlimentacionIdAndStatus(Long planId, PlanAsignacion.Status status);
    
    // Eliminar asignaciones por plan
    @Transactional
    void deleteByPlanAlimentacionId(Long planId);
    
    // Buscar asignaciones que deben ejecutarse hoy
    @Query("SELECT pa FROM PlanAsignacion pa " +
           "WHERE pa.assignedUser.id = :userId " +
           "AND pa.status = 'ACTIVO' " +
           "AND pa.startDate <= :today " +
           "AND (pa.endDate IS NULL OR pa.endDate >= :today)")
    List<PlanAsignacion> findActiveAssignmentsForUser(@Param("userId") Long userId, 
                                                     @Param("today") LocalDate today);
    
    // Buscar asignaciones con detalles del plan
    @Query("SELECT DISTINCT pa FROM PlanAsignacion pa " +
           "LEFT JOIN FETCH pa.planAlimentacion p " +
           "LEFT JOIN FETCH p.detalles " +
           "WHERE pa.assignedUser.id = :userId AND pa.status = 'ACTIVO'")
    List<PlanAsignacion> findActiveAssignmentsWithPlanDetails(@Param("userId") Long userId);
    
    // Verificar si ya existe una asignación activa para un lote y plan específico
    boolean existsByLoteIdAndPlanAlimentacionIdAndStatus(String loteId, Long planId, PlanAsignacion.Status status);
    
    // Buscar asignaciones activas por usuario ordenadas por fecha
    List<PlanAsignacion> findByAssignedUserIdAndStatusOrderByCreateDateDesc(Long userId, PlanAsignacion.Status status);
    
    // Buscar asignaciones por estado ordenadas por fecha
    List<PlanAsignacion> findByStatusOrderByCreateDateDesc(PlanAsignacion.Status status);
    
    // Buscar asignaciones por lote ordenadas por fecha
    List<PlanAsignacion> findByLoteIdOrderByCreateDateDesc(String loteId);
    
    // Verificar si existe asignación activa para plan y lote
    boolean existsByPlanAlimentacionIdAndLoteIdAndStatus(Long planId, String loteId, PlanAsignacion.Status status);
    
    // Buscar asignación con todos los detalles
    @Query("SELECT pa FROM PlanAsignacion pa " +
           "LEFT JOIN FETCH pa.planAlimentacion p " +
           "LEFT JOIN FETCH p.detalles " +
           "LEFT JOIN FETCH pa.lote " +
           "LEFT JOIN FETCH pa.assignedUser " +
           "LEFT JOIN FETCH pa.assignedByUser " +
           "WHERE pa.id = :asignacionId")
    java.util.Optional<PlanAsignacion> findByIdWithAllDetails(@Param("asignacionId") Long asignacionId);
}