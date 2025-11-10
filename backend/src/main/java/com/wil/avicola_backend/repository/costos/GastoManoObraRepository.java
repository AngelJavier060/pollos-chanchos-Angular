package com.wil.avicola_backend.repository.costos;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.wil.avicola_backend.model.costos.GastoManoObra;

@Repository
public interface GastoManoObraRepository extends JpaRepository<GastoManoObra, String> {
    List<GastoManoObra> findByFechaBetween(LocalDate desde, LocalDate hasta);
    List<GastoManoObra> findByLote_Id(String loteId);
    List<GastoManoObra> findByLote_Codigo(String loteCodigo);
}
