package com.wil.avicola_backend.repository;

import com.wil.avicola_backend.entity.PlanEjecucionHistorial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PlanEjecucionHistorialRepository extends JpaRepository<PlanEjecucionHistorial, Long> {
    
    List<PlanEjecucionHistorial> findByPlanEjecucionIdOrderByFechaCambioDesc(Long planEjecucionId);
    
    List<PlanEjecucionHistorial> findByUsuarioIdAndFechaCambioBetween(
        Long usuarioId, 
        LocalDateTime fechaInicio, 
        LocalDateTime fechaFin
    );
    
    @Query("SELECT h FROM PlanEjecucionHistorial h WHERE h.planEjecucionId = :planEjecucionId AND h.campoModificado = :campo ORDER BY h.fechaCambio DESC")
    List<PlanEjecucionHistorial> findByPlanEjecucionIdAndCampo(
        @Param("planEjecucionId") Long planEjecucionId, 
        @Param("campo") String campo
    );
    
    @Query("SELECT h FROM PlanEjecucionHistorial h WHERE h.fechaCambio >= :fechaDesde ORDER BY h.fechaCambio DESC")
    List<PlanEjecucionHistorial> findHistorialReciente(@Param("fechaDesde") LocalDateTime fechaDesde);
}
