package com.wil.avicola_backend.repository.costos;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.wil.avicola_backend.model.costos.GastoLogistica;

@Repository
public interface GastoLogisticaRepository extends JpaRepository<GastoLogistica, String> {
    List<GastoLogistica> findByFechaBetween(LocalDate desde, LocalDate hasta);
    List<GastoLogistica> findByLote_Id(String loteId);
    List<GastoLogistica> findByLote_Codigo(String loteCodigo);
}
