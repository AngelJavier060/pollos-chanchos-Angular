package com.wil.avicola_backend.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.wil.avicola_backend.model.ConsumoManual;

@Repository
public interface ConsumoManualRepository extends JpaRepository<ConsumoManual, Long> {

    List<ConsumoManual> findByLoteIdAndFechaBetween(String loteId, LocalDate inicio, LocalDate fin);

    @Query("SELECT COALESCE(SUM(c.costoTotal), 0) FROM ConsumoManual c WHERE c.loteId = :loteId AND c.fecha BETWEEN :inicio AND :fin")
    java.math.BigDecimal sumCostoByLoteAndFechaBetween(@Param("loteId") String loteId,
                                                       @Param("inicio") LocalDate inicio,
                                                       @Param("fin") LocalDate fin);
}
