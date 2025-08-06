package com.wil.avicola_backend.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.wil.avicola_backend.model.MovimientoInventario;
import com.wil.avicola_backend.model.MovimientoInventario.TipoMovimiento;

/**
 * Repositorio para MovimientoInventario
 */
@Repository
public interface MovimientoInventarioRepository extends JpaRepository<MovimientoInventario, Long> {
    
    /**
     * Obtener movimientos por inventario
     */
    @Query("SELECT m FROM MovimientoInventario m WHERE m.inventario.id = :inventarioId ORDER BY m.fechaMovimiento DESC")
    List<MovimientoInventario> findByInventarioIdOrderByFechaMovimientoDesc(@Param("inventarioId") Long inventarioId);
    
    /**
     * Obtener movimientos por lote
     */
    List<MovimientoInventario> findByLoteIdOrderByFechaMovimientoDesc(String loteId);
    
    /**
     * Obtener movimientos por tipo
     */
    List<MovimientoInventario> findByTipoMovimientoOrderByFechaMovimientoDesc(TipoMovimiento tipoMovimiento);
    
    /**
     * Obtener movimientos en rango de fechas
     */
    @Query("SELECT m FROM MovimientoInventario m WHERE m.fechaMovimiento BETWEEN :fechaInicio AND :fechaFin ORDER BY m.fechaMovimiento DESC")
    List<MovimientoInventario> findByFechaMovimientoBetweenOrderByFechaMovimientoDesc(
        @Param("fechaInicio") LocalDateTime fechaInicio, 
        @Param("fechaFin") LocalDateTime fechaFin
    );
    
    /**
     * Obtener últimos movimientos de consumo por lote
     */
    @Query("SELECT m FROM MovimientoInventario m WHERE m.loteId = :loteId AND m.tipoMovimiento = 'CONSUMO_LOTE' ORDER BY m.fechaMovimiento DESC")
    List<MovimientoInventario> findConsumosByLoteId(@Param("loteId") String loteId);
    
    /**
     * Sumar total consumido por lote y tipo de alimento
     */
    @Query("SELECT COALESCE(SUM(m.cantidad), 0) FROM MovimientoInventario m WHERE m.loteId = :loteId AND m.inventario.tipoAlimento.id = :tipoAlimentoId AND m.tipoMovimiento = 'CONSUMO_LOTE'")
    Double sumConsumoByLoteAndTipoAlimento(@Param("loteId") String loteId, @Param("tipoAlimentoId") Long tipoAlimentoId);
    
    /**
     * Obtener movimientos por inventario y tipo de movimiento
     */
    List<MovimientoInventario> findByInventarioAndTipoMovimiento(
        com.wil.avicola_backend.model.InventarioAlimento inventario, 
        TipoMovimiento tipoMovimiento
    );
    
    /**
     * Obtener todos los movimientos ordenados por fecha descendente
     */
    List<MovimientoInventario> findAllByOrderByFechaMovimientoDesc();
}
