package com.wil.avicola_backend.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.wil.avicola_backend.model.VentaHuevo;

@Repository
public interface VentaHuevoRepository extends JpaRepository<VentaHuevo, Long> {
    List<VentaHuevo> findByFechaBetween(LocalDate from, LocalDate to);
    List<VentaHuevo> findByFecha(LocalDate fecha);
}
