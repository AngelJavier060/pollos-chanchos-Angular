package com.wil.avicola_backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.wil.avicola_backend.model.InventarioProducto;

@Repository
public interface InventarioProductoRepository extends JpaRepository<InventarioProducto, Long> {

    Optional<InventarioProducto> findByProductId(Long productId);

    boolean existsByProductId(Long productId);

    @Query("SELECT i FROM InventarioProducto i WHERE i.cantidadStock <= i.stockMinimo")
    List<InventarioProducto> findInventariosConStockBajo();

    @Query("SELECT i FROM InventarioProducto i WHERE i.cantidadStock > 0")
    List<InventarioProducto> findInventariosDisponibles();
}
