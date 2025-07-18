package com.wil.avicola_backend.repository;

import com.wil.avicola_backend.model.Medicamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicamentoRepository extends JpaRepository<Medicamento, Long> {
    
    // Buscar medicamentos activos
    List<Medicamento> findByActivoTrue();
    
    // Buscar por nombre
    Medicamento findByNombre(String nombre);
    
    // Buscar por nombre que contenga
    List<Medicamento> findByNombreContainingIgnoreCase(String nombre);
    
    // Buscar por tipo
    List<Medicamento> findByTipo(String tipo);
    
    // Buscar medicamentos activos por tipo
    List<Medicamento> findByActivoTrueAndTipo(String tipo);
    
    // Buscar medicamentos activos ordenados por nombre
    List<Medicamento> findByActivoTrueOrderByNombre();
    
    // Buscar por tiempo de retiro
    List<Medicamento> findByTiempoRetiroLessThanEqual(Integer dias);
} 