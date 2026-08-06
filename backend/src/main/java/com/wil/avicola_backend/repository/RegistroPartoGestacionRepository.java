package com.wil.avicola_backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.wil.avicola_backend.model.RegistroPartoGestacion;

public interface RegistroPartoGestacionRepository extends JpaRepository<RegistroPartoGestacion, Long> {

    List<RegistroPartoGestacion> findAllByOrderByFechaPartoDesc();

    List<RegistroPartoGestacion> findByLoteIdAndNumeroEnLoteOrderByNumeroPartoAsc(
            String loteId, Integer numeroEnLote);

    List<RegistroPartoGestacion> findByGestacionIdOrderByFechaPartoDesc(Long gestacionId);

    long countByLoteIdAndNumeroEnLote(String loteId, Integer numeroEnLote);

    @Query("SELECT COALESCE(MAX(p.numeroParto), 0) FROM RegistroPartoGestacion p "
            + "WHERE p.loteId = :loteId AND p.numeroEnLote = :numeroEnLote")
    int maxNumeroParto(@Param("loteId") String loteId, @Param("numeroEnLote") Integer numeroEnLote);
}
