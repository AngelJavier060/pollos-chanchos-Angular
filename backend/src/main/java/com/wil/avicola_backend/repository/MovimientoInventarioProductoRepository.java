package com.wil.avicola_backend.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.wil.avicola_backend.model.MovimientoInventarioProducto;

@Repository
public interface MovimientoInventarioProductoRepository extends JpaRepository<MovimientoInventarioProducto, Long> {

    @Query("SELECT m FROM MovimientoInventarioProducto m WHERE m.inventarioProducto.product.id = :productId ORDER BY m.fechaMovimiento DESC")
    List<MovimientoInventarioProducto> findByProductId(@Param("productId") Long productId);

    @Query("SELECT m FROM MovimientoInventarioProducto m WHERE m.fechaMovimiento BETWEEN :inicio AND :fin ORDER BY m.fechaMovimiento DESC")
    List<MovimientoInventarioProducto> findByFechaBetween(@Param("inicio") LocalDateTime inicio,
                                                          @Param("fin") LocalDateTime fin);

    @Query("SELECT m FROM MovimientoInventarioProducto m WHERE m.loteId = :loteId ORDER BY m.fechaMovimiento DESC")
    List<MovimientoInventarioProducto> findByLoteIdOrderByFechaMovimientoDesc(@Param("loteId") String loteId);

    @Query("SELECT COALESCE(SUM(m.cantidad), 0) FROM MovimientoInventarioProducto m " +
           "WHERE m.loteId = :loteId " +
           "AND m.tipoMovimiento = :tipo " +
           "AND m.inventarioProducto.product.typeFood.id = :tipoAlimentoId")
    java.math.BigDecimal sumConsumoByLoteAndTipoAlimento(@Param("loteId") String loteId,
                                                         @Param("tipoAlimentoId") Long tipoAlimentoId,
                                                         @Param("tipo") MovimientoInventarioProducto.TipoMovimiento tipo);

    // Agregado: suma de cantidades por producto para un conjunto de tipos de movimiento
    @Query("SELECT m.inventarioProducto.product.id, COALESCE(SUM(m.cantidad), 0) " +
           "FROM MovimientoInventarioProducto m " +
           "WHERE m.tipoMovimiento IN :tipos " +
           "GROUP BY m.inventarioProducto.product.id")
    List<Object[]> sumCantidadByTiposGroupByProduct(@Param("tipos") List<MovimientoInventarioProducto.TipoMovimiento> tipos);
}
