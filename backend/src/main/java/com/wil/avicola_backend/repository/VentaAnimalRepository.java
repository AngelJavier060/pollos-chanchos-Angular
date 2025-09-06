package com.wil.avicola_backend.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.wil.avicola_backend.model.VentaAnimal;

@Repository
public interface VentaAnimalRepository extends JpaRepository<VentaAnimal, Long> {
    List<VentaAnimal> findByFechaBetween(LocalDate from, LocalDate to);
    List<VentaAnimal> findByFecha(LocalDate fecha);
}
