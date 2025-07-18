package com.wil.avicola_backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.wil.avicola_backend.model.PlanAlimentacion;

@Repository
public interface PlanAlimentacionRepository extends CrudRepository<PlanAlimentacion, Long> {
    
    // Buscar planes activos por animal
    List<PlanAlimentacion> findByAnimalIdAndActiveTrue(Long animalId);
    
    // Buscar planes creados por un usuario específico
    List<PlanAlimentacion> findByCreatedByUserIdAndActiveTrue(Long userId);
    
    // Buscar por nombre (para evitar duplicados)
    boolean existsByNameAndAnimalId(String name, Long animalId);
    
    // Buscar por nombre excluyendo un ID específico (para actualizaciones)
    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM PlanAlimentacion p " +
           "WHERE p.name = :name AND p.animal.id = :animalId AND p.id != :excludeId")
    boolean existsByNameAndAnimalIdExcludingId(@Param("name") String name, 
                                              @Param("animalId") Long animalId, 
                                              @Param("excludeId") Long excludeId);
    
    // Buscar todos los planes activos
    List<PlanAlimentacion> findByActiveTrueOrderByCreateDateDesc();
    
    // Buscar planes por animal con detalles
    @Query("SELECT DISTINCT p FROM PlanAlimentacion p " +
           "LEFT JOIN FETCH p.detalles " +
           "WHERE p.animal.id = :animalId AND p.active = true")
    List<PlanAlimentacion> findByAnimalIdWithDetails(@Param("animalId") Long animalId);
    
    // Buscar todos los planes activos con animal y usuario creador (fetch join para evitar LazyInitializationException)
    @Query("SELECT p FROM PlanAlimentacion p LEFT JOIN FETCH p.animal LEFT JOIN FETCH p.createdByUser WHERE p.active = true ORDER BY p.createDate DESC")
    List<PlanAlimentacion> findByActiveTrueWithAnimalAndUserOrderByCreateDateDesc();
    
    // TEMPORAL: Buscar TODOS los planes (activos e inactivos) con animal y usuario creador para debugging
    @Query("SELECT p FROM PlanAlimentacion p LEFT JOIN FETCH p.animal LEFT JOIN FETCH p.createdByUser ORDER BY p.createDate DESC")
    List<PlanAlimentacion> findAllWithAnimalAndUserOrderByCreateDateDesc();
}