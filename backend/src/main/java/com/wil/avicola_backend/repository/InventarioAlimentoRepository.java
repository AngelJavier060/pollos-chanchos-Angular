package com.wil.avicola_backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.wil.avicola_backend.model.InventarioAlimento;
import com.wil.avicola_backend.model.TypeFood;

/**
 * Repositorio para InventarioAlimento
 */
@Repository
public interface InventarioAlimentoRepository extends JpaRepository<InventarioAlimento, Long> {
    
    /**
     * Buscar inventario por tipo de alimento
     */
    Optional<InventarioAlimento> findByTipoAlimento(TypeFood tipoAlimento);
    
    /**
     * Buscar inventario por ID de tipo de alimento
     */
    @Query("SELECT i FROM InventarioAlimento i WHERE i.tipoAlimento.id = :tipoAlimentoId")
    Optional<InventarioAlimento> findByTipoAlimentoId(@Param("tipoAlimentoId") Long tipoAlimentoId);
    
    /**
     * Obtener inventarios con stock bajo (menor o igual al stock mínimo)
     */
    @Query("SELECT i FROM InventarioAlimento i WHERE i.cantidadStock <= i.stockMinimo")
    List<InventarioAlimento> findInventariosConStockBajo();
    
    /**
     * Obtener inventarios disponibles (con stock mayor a cero)
     */
    @Query("SELECT i FROM InventarioAlimento i WHERE i.cantidadStock > 0")
    List<InventarioAlimento> findInventariosDisponibles();
    
    /**
     * Verificar si existe inventario para un tipo de alimento
     */
    boolean existsByTipoAlimento(TypeFood tipoAlimento);
}
