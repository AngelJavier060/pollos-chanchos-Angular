package com.wil.avicola_backend.repository.costos;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.wil.avicola_backend.model.costos.GastoSanidad;

@Repository
public interface GastoSanidadRepository extends JpaRepository<GastoSanidad, String> {
    List<GastoSanidad> findByFechaBetween(LocalDate desde, LocalDate hasta);
    List<GastoSanidad> findByLote_Id(String loteId);
    List<GastoSanidad> findByLote_Codigo(String loteCodigo);

    List<GastoSanidad> findByLote_IdAndFechaBetween(String loteId, LocalDate desde, LocalDate hasta);
    List<GastoSanidad> findByLote_CodigoAndFechaBetween(String loteCodigo, LocalDate desde, LocalDate hasta);

    List<GastoSanidad> findByProximaFechaBetween(LocalDate desde, LocalDate hasta);
    List<GastoSanidad> findByLote_IdAndProximaFechaBetween(String loteId, LocalDate desde, LocalDate hasta);
    List<GastoSanidad> findByLote_CodigoAndProximaFechaBetween(String loteCodigo, LocalDate desde, LocalDate hasta);
}
