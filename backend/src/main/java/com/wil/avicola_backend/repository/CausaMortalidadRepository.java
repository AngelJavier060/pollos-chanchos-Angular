package com.wil.avicola_backend.repository;

import com.wil.avicola_backend.model.CausaMortalidad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CausaMortalidadRepository extends JpaRepository<CausaMortalidad, Long> {
    
    // Buscar causas activas
    List<CausaMortalidad> findByActivoTrue();
    
    // Buscar por nombre
    CausaMortalidad findByNombre(String nombre);
    
    // Buscar por nombre que contenga
    List<CausaMortalidad> findByNombreContainingIgnoreCase(String nombre);
    
    // Buscar causas activas ordenadas por nombre
    List<CausaMortalidad> findByActivoTrueOrderByNombre();
} 