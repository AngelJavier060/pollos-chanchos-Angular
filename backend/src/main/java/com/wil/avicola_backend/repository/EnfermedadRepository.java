package com.wil.avicola_backend.repository;

import com.wil.avicola_backend.model.Enfermedad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EnfermedadRepository extends JpaRepository<Enfermedad, Long> {
    
    // Buscar enfermedades activas
    List<Enfermedad> findByActivoTrue();
    
    // Buscar por nombre
    Enfermedad findByNombre(String nombre);
    
    // Buscar por nombre que contenga
    List<Enfermedad> findByNombreContainingIgnoreCase(String nombre);
    
    // Buscar enfermedades contagiosas
    List<Enfermedad> findByContagiosaTrue();
    
    // Buscar enfermedades activas y contagiosas
    List<Enfermedad> findByActivoTrueAndContagiosaTrue();
    
    // Buscar enfermedades activas ordenadas por nombre
    List<Enfermedad> findByActivoTrueOrderByNombre();
} 