package com.wil.avicola_backend.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.wil.avicola_backend.model.InventarioEntradaProducto;

public interface InventarioEntradaProductoRepository extends JpaRepository<InventarioEntradaProducto, Long> {

    @Query("SELECT e FROM InventarioEntradaProducto e WHERE e.product.id = :productId AND (e.activo = true OR e.activo IS NULL)")
    List<InventarioEntradaProducto> findActivasPorProducto(@Param("productId") Long productId);

    @Query("SELECT e FROM InventarioEntradaProducto e WHERE e.product.id = :productId AND (e.activo = true OR e.activo IS NULL) AND e.fechaVencimiento IS NOT NULL AND e.fechaVencimiento < :hoy")
    List<InventarioEntradaProducto> findVencidasPorProducto(@Param("productId") Long productId, @Param("hoy") LocalDate hoy);

    @Query("SELECT e FROM InventarioEntradaProducto e WHERE e.product.id = :productId AND (e.activo = true OR e.activo IS NULL) AND e.fechaVencimiento IS NOT NULL AND e.fechaVencimiento BETWEEN :hoy AND :hasta")
    List<InventarioEntradaProducto> findPorVencerPorProducto(@Param("productId") Long productId, @Param("hoy") LocalDate hoy, @Param("hasta") LocalDate hasta);

    @Query("SELECT SUM(e.stockBaseRestante) FROM InventarioEntradaProducto e WHERE e.product.id = :productId AND (e.activo = true OR e.activo IS NULL)")
    Optional<java.math.BigDecimal> sumStockBaseRestante(@Param("productId") Long productId);

    // Global queries (todas las entradas)
    @Query("SELECT e FROM InventarioEntradaProducto e WHERE (e.activo = true OR e.activo IS NULL) AND e.fechaVencimiento IS NOT NULL AND e.fechaVencimiento < :hoy")
    List<InventarioEntradaProducto> findVencidasGlobal(@Param("hoy") LocalDate hoy);

    @Query("SELECT e FROM InventarioEntradaProducto e WHERE (e.activo = true OR e.activo IS NULL) AND e.fechaVencimiento IS NOT NULL AND e.fechaVencimiento BETWEEN :hoy AND :hasta")
    List<InventarioEntradaProducto> findPorVencerGlobal(@Param("hoy") LocalDate hoy, @Param("hasta") LocalDate hasta);

    // Agregado: suma de stock válido (no vencido) agrupado por producto
    @Query("SELECT e.product.id, COALESCE(SUM(e.stockBaseRestante), 0) " +
           "FROM InventarioEntradaProducto e " +
           "WHERE (e.activo = true OR e.activo IS NULL) " +
           "AND (e.fechaVencimiento IS NULL OR e.fechaVencimiento >= :hoy) " +
           "GROUP BY e.product.id")
    List<Object[]> sumValidStockGroupByProduct(@Param("hoy") LocalDate hoy);
}
