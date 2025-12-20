package com.wil.avicola_backend.repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.wil.avicola_backend.model.VentaAnimal;

@Repository
public interface VentaAnimalRepository extends JpaRepository<VentaAnimal, Long> {
    List<VentaAnimal> findByFechaBetween(LocalDate from, LocalDate to);
    List<VentaAnimal> findByFecha(LocalDate fecha);

    // Sumatorias de cantidades vendidas (excluye ventas anuladas)
    @Query("SELECT COALESCE(SUM(v.cantidad), 0) FROM VentaAnimal v WHERE v.estado = 'EMITIDA'")
    BigDecimal sumCantidadEmitida();

    @Query("SELECT COALESCE(SUM(v.cantidad), 0) FROM VentaAnimal v WHERE v.estado = 'EMITIDA' AND v.animalId = :animalId")
    BigDecimal sumCantidadEmitidaByAnimalId(@Param("animalId") Long animalId);

    @Query("SELECT COALESCE(SUM(v.cantidad), 0) FROM VentaAnimal v WHERE v.estado = 'EMITIDA' AND v.loteId = :loteId")
    BigDecimal sumCantidadEmitidaByLoteId(@Param("loteId") String loteId);

    // Ventas por lote
    List<VentaAnimal> findByLoteId(String loteId);

    // Ventas por lote y estado
    @Query("SELECT v FROM VentaAnimal v WHERE v.loteId = :loteId AND v.estado = :estado")
    List<VentaAnimal> findByLoteIdAndEstado(@Param("loteId") String loteId, @Param("estado") VentaAnimal.Estado estado);
}
