package com.wil.avicola_backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.wil.avicola_backend.model.RegistroGestacion;

public interface RegistroGestacionRepository extends JpaRepository<RegistroGestacion, Long> {

    List<RegistroGestacion> findAllByOrderByFechaInseminacionDesc();

    Optional<RegistroGestacion> findByLoteIdAndNumeroEnLoteAndActivaTrue(String loteId, Integer numeroEnLote);

    boolean existsByLoteIdAndNumeroEnLoteAndActivaTrueAndIdNot(String loteId, Integer numeroEnLote, Long id);

    boolean existsByLoteIdAndNumeroEnLoteAndActivaTrue(String loteId, Integer numeroEnLote);
}
