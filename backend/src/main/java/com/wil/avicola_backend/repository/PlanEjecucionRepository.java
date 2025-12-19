package com.wil.avicola_backend.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.wil.avicola_backend.model.PlanEjecucion;

@Repository
public interface PlanEjecucionRepository extends JpaRepository<PlanEjecucion, Long> {
    
    // Buscar ejecuciones por asignación
    List<PlanEjecucion> findByPlanAsignacionId(Long asignacionId);
    
    // Buscar ejecuciones por usuario y fecha
    List<PlanEjecucion> findByExecutedByUserIdAndExecutionDate(Long userId, LocalDate date);
    
    // Buscar ejecuciones pendientes por usuario
    List<PlanEjecucion> findByExecutedByUserIdAndStatus(Long userId, PlanEjecucion.Status status);
    
    // Buscar ejecuciones por asignación y estado
    List<PlanEjecucion> findByPlanAsignacionIdAndStatus(Long asignacionId, PlanEjecucion.Status status);
    
    // Verificar si ya existe una ejecución para un día específico
    boolean existsByPlanAsignacionIdAndDayNumber(Long asignacionId, Integer dayNumber);
    
    // Buscar ejecuciones por rango de fechas
    @Query("SELECT pe FROM PlanEjecucion pe " +
           "WHERE pe.executedByUser.id = :userId " +
           "AND pe.executionDate BETWEEN :startDate AND :endDate " +
           "ORDER BY pe.executionDate DESC")
    List<PlanEjecucion> findByUserAndDateRange(@Param("userId") Long userId, 
                                              @Param("startDate") LocalDate startDate, 
                                              @Param("endDate") LocalDate endDate);
    
    // Obtener estadísticas de ejecución por asignación
    @Query("SELECT pe.status, COUNT(pe) FROM PlanEjecucion pe " +
           "WHERE pe.planAsignacion.id = :asignacionId " +
           "GROUP BY pe.status")
    List<Object[]> getExecutionStatsByAssignment(@Param("asignacionId") Long asignacionId);
    
    // Buscar ejecuciones con detalles del plan
    @Query("SELECT pe FROM PlanEjecucion pe " +
           "LEFT JOIN FETCH pe.planDetalle pd " +
           "LEFT JOIN FETCH pd.product " +
           "WHERE pe.planAsignacion.id = :asignacionId " +
           "ORDER BY pe.dayNumber")
    List<PlanEjecucion> findByAsignacionWithDetails(@Param("asignacionId") Long asignacionId);
    
    /**
     * Obtener ejecuciones por asignación ordenadas por fecha
     */
    List<PlanEjecucion> findByPlanAsignacionIdOrderByExecutionDateAsc(Long asignacionId);
    
    /**
     * Obtener ejecuciones por usuario en una fecha específica con detalles
     */
    @Query("SELECT pe FROM PlanEjecucion pe " +
           "LEFT JOIN FETCH pe.planDetalle pd " +
           "LEFT JOIN FETCH pd.product " +
           "LEFT JOIN FETCH pe.planAsignacion pa " +
           "LEFT JOIN FETCH pa.lote " +
           "WHERE pe.executedByUser.id = :userId " +
           "AND pe.executionDate = :date " +
           "ORDER BY pe.dayNumber ASC")
    List<PlanEjecucion> findByUserAndDateWithDetails(@Param("userId") Long userId, @Param("date") LocalDate date);
    
    /**
     * Obtener ejecuciones pendientes por usuario
     */
    @Query("SELECT pe FROM PlanEjecucion pe " +
           "LEFT JOIN FETCH pe.planDetalle pd " +
           "LEFT JOIN FETCH pd.product " +
           "LEFT JOIN FETCH pe.planAsignacion pa " +
           "LEFT JOIN FETCH pa.lote " +
           "WHERE pe.executedByUser.id = :userId " +
           "AND pe.status = 'PENDIENTE' " +
           "AND pe.executionDate <= :currentDate " +
           "ORDER BY pe.executionDate ASC, pe.dayNumber ASC")
    List<PlanEjecucion> findPendingExecutionsByUser(@Param("userId") Long userId, @Param("currentDate") LocalDate currentDate);
    
    /**
     * Verificar si existe una ejecución específica
     */
    @Query("SELECT CASE WHEN COUNT(pe) > 0 THEN true ELSE false END FROM PlanEjecucion pe " +
           "WHERE pe.planAsignacion.id = :asignacionId " +
           "AND pe.planDetalle.id = :detalleId " +
           "AND pe.dayNumber = :dayNumber")
    boolean existsByAsignacionAndDetalleAndDay(@Param("asignacionId") Long asignacionId, 
                                              @Param("detalleId") Long detalleId, 
                                              @Param("dayNumber") Integer dayNumber);
    
    /**
     * Obtener ejecución específica
     */
    Optional<PlanEjecucion> findByPlanAsignacionIdAndPlanDetalleIdAndDayNumber(Long asignacionId, Long detalleId, Integer dayNumber);
    
    /**
     * Contar ejecuciones completadas para una asignación
     */
    @Query("SELECT COUNT(pe) FROM PlanEjecucion pe " +
           "WHERE pe.planAsignacion.id = :asignacionId " +
           "AND pe.status = 'EJECUTADO'")
    Long countCompletedExecutionsByAsignacion(@Param("asignacionId") Long asignacionId);
    
    // 🔥 CONSULTA PERSONALIZADA PARA HISTORIAL CON JOIN FETCH (incluye Race y Animal para filtro por especie)
    @Query("SELECT pe FROM PlanEjecucion pe " +
           "LEFT JOIN FETCH pe.planAsignacion pa " +
           "LEFT JOIN FETCH pa.lote l " +
           "LEFT JOIN FETCH l.race r " +
           "LEFT JOIN FETCH r.animal a " +
           "LEFT JOIN FETCH pe.executedByUser u " +
           "WHERE pe.executionDate BETWEEN :fechaInicio AND :fechaFin " +
           "ORDER BY pe.createDate DESC, pe.executionDate DESC")
    List<PlanEjecucion> findHistorialWithDetails(@Param("fechaInicio") LocalDate fechaInicio, 
                                                 @Param("fechaFin") LocalDate fechaFin);
    
    // 🔥 CONSULTA PARA OBTENER TODOS LOS REGISTROS CON DETALLES
    @Query("SELECT pe FROM PlanEjecucion pe " +
           "LEFT JOIN FETCH pe.planAsignacion pa " +
           "LEFT JOIN FETCH pa.lote l " +
           "LEFT JOIN FETCH l.race r " +
           "LEFT JOIN FETCH r.animal a " +
           "LEFT JOIN FETCH pe.executedByUser u " +
           "ORDER BY pe.createDate DESC, pe.executionDate DESC")
    List<PlanEjecucion> findAllWithDetails();
}