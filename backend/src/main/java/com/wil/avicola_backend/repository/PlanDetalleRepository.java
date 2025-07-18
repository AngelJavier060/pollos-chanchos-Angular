package com.wil.avicola_backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.model.PlanDetalle;

@Repository
public interface PlanDetalleRepository extends JpaRepository<PlanDetalle, Long> {
    
    /**
     * Obtener todos los detalles de un plan específico
     */
    List<PlanDetalle> findByPlanAlimentacionIdOrderByDayStartAsc(Long planId);
    
    /**
     * Obtener detalles activos de un plan específico
     */
    @Query("SELECT pd FROM PlanDetalle pd WHERE pd.planAlimentacion.id = :planId AND pd.planAlimentacion.active = true ORDER BY pd.dayStart ASC")
    List<PlanDetalle> findByPlanAlimentacionIdAndActiveOrderByDayStartAsc(@Param("planId") Long planId);
    
    /**
     * Buscar detalles que contengan un día específico
     */
    @Query("SELECT pd FROM PlanDetalle pd WHERE pd.planAlimentacion.id = :planId AND :dayNumber BETWEEN pd.dayStart AND pd.dayEnd ORDER BY pd.dayStart ASC")
    List<PlanDetalle> findByPlanIdAndDayNumber(@Param("planId") Long planId, @Param("dayNumber") Integer dayNumber);
    
    /**
     * Verificar si existe solapamiento de rangos de días en un plan
     */
    @Query("SELECT CASE WHEN COUNT(pd) > 0 THEN true ELSE false END FROM PlanDetalle pd " +
           "WHERE pd.planAlimentacion.id = :planId " +
           "AND ((:dayStart BETWEEN pd.dayStart AND pd.dayEnd) " +
           "OR (:dayEnd BETWEEN pd.dayStart AND pd.dayEnd) " +
           "OR (pd.dayStart BETWEEN :dayStart AND :dayEnd)) " +
           "AND (:excludeId IS NULL OR pd.id != :excludeId)")
    boolean existsOverlappingRanges(@Param("planId") Long planId, 
                                   @Param("dayStart") Integer dayStart, 
                                   @Param("dayEnd") Integer dayEnd, 
                                   @Param("excludeId") Long excludeId);
    
    /**
     * Obtener detalles con información del producto
     */
    @Query("SELECT pd FROM PlanDetalle pd LEFT JOIN FETCH pd.product LEFT JOIN FETCH pd.planAlimentacion " +
           "WHERE pd.planAlimentacion.id = :planId ORDER BY pd.dayStart ASC")
    List<PlanDetalle> findByPlanIdWithProductInfo(@Param("planId") Long planId);
    
    /**
     * Obtener el rango máximo de días de un plan
     */
    @Query("SELECT MAX(pd.dayEnd) FROM PlanDetalle pd WHERE pd.planAlimentacion.id = :planId")
    Integer findMaxDayByPlanId(@Param("planId") Long planId);
    
    /**
     * Contar detalles por plan
     */
    long countByPlanAlimentacionId(Long planId);
    
    /**
     * Eliminar todos los detalles de un plan
     */
    @Transactional
    void deleteByPlanAlimentacionId(Long planId);
}
