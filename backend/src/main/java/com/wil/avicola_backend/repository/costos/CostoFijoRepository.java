package com.wil.avicola_backend.repository.costos;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.wil.avicola_backend.model.costos.CostoFijo;

@Repository
public interface CostoFijoRepository extends JpaRepository<CostoFijo, String> {
    List<CostoFijo> findByFechaBetween(LocalDate desde, LocalDate hasta);
    List<CostoFijo> findByLote_Id(String loteId);
    List<CostoFijo> findByLote_Codigo(String loteCodigo);
}
