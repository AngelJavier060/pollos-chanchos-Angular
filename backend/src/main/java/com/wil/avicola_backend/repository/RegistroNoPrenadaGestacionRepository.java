package com.wil.avicola_backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.wil.avicola_backend.model.RegistroNoPrenadaGestacion;

public interface RegistroNoPrenadaGestacionRepository extends JpaRepository<RegistroNoPrenadaGestacion, Long> {

    List<RegistroNoPrenadaGestacion> findAllByOrderByFechaConfirmacionDesc();

    List<RegistroNoPrenadaGestacion> findByLoteIdAndNumeroEnLoteOrderByFechaConfirmacionDesc(
            String loteId, Integer numeroEnLote);
}
