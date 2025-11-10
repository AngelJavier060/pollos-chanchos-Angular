package com.wil.avicola_backend.repository.costos;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.wil.avicola_backend.model.costos.GastoOperacion;

@Repository
public interface GastoOperacionRepository extends JpaRepository<GastoOperacion, String> {
    List<GastoOperacion> findByFechaBetween(LocalDate desde, LocalDate hasta);
    List<GastoOperacion> findByLote_Id(String loteId);
    List<GastoOperacion> findByLote_Codigo(String loteCodigo);
}
